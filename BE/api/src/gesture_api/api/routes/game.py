import asyncio
from contextlib import suppress
from typing import Annotated

from fastapi import APIRouter, Header, WebSocket, WebSocketDisconnect, status
from gesture_api.api.schemas.base import ApiResponse, ok
from gesture_api.api.schemas.game import (
    AnimsetResponse,
    BattleActionResponse,
    BattleStateResponse,
    CreateGuestPlayerRequest,
    GuestPlayerResponse,
    LeaderboardItemResponse,
    LoadoutResponse,
    MatchHistoryItemResponse,
    PlayerProfileResponse,
    QueueRequest,
    QueueStatusResponse,
    SkillResponse,
    SkillsetResponse,
    SubmitBattleActionRequest,
    SurrenderResponse,
    UpdateLoadoutRequest,
    WsTokenResponse,
)
from gesture_api.api.schemas.websocket import (
    BattleActionResultEvent,
    BattleErrorEvent,
    BattleErrorPayload,
    BattleSubmitActionEvent,
    deserialize_battle_event,
    extract_battle_request_id,
    serialize_battle_event,
)
from gesture_api.domain.errors import DomainError
from gesture_api.domain.game import BattleSession
from gesture_api.repositories.game_state import game_state_repository
from gesture_api.services.battle_websocket import (
    BattleWebSocketEventHandler,
    battle_connection_manager,
    build_ended_event,
    build_match_found_event,
    build_match_ready_event,
    build_started_event,
    build_state_updated_event,
    build_surrendered_event,
    build_timeout_event,
)
from pydantic import ValidationError

router = APIRouter()
api_router = APIRouter(prefix="/api/v1", tags=["game"])
PlayerIdHeader = Annotated[str, Header(alias="X-Player-Id")]


@api_router.post(
    "/players/guest",
    response_model=ApiResponse[GuestPlayerResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_guest_player(request: CreateGuestPlayerRequest) -> ApiResponse[GuestPlayerResponse]:
    player = game_state_repository.create_guest_player(request.nickname)
    return ok(GuestPlayerResponse.from_record(player))


@api_router.get("/players/me", response_model=ApiResponse[PlayerProfileResponse])
def get_my_profile(player_id: PlayerIdHeader) -> ApiResponse[PlayerProfileResponse]:
    player = game_state_repository.get_player(player_id)
    if player is None:
        raise DomainError("PLAYER_NOT_FOUND", "Player not found", "Unknown player.", 404)
    return ok(PlayerProfileResponse.from_record(player))


@api_router.get("/skillsets", response_model=ApiResponse[list[SkillsetResponse]])
def list_skillsets() -> ApiResponse[list[SkillsetResponse]]:
    skillsets = [
        SkillsetResponse(
            skillset_id=skillset.skillset_id,
            name=skillset.name,
            skills=[SkillResponse.from_definition(skill) for skill in skillset.skills],
        )
        for skillset in game_state_repository.list_skillsets()
    ]
    return ok(skillsets)


@api_router.get("/animsets", response_model=ApiResponse[list[AnimsetResponse]])
def list_animsets() -> ApiResponse[list[AnimsetResponse]]:
    animsets = [
        AnimsetResponse.from_definition(animset)
        for animset in game_state_repository.list_animsets()
    ]
    return ok(animsets)


@api_router.post("/players/me/loadout", response_model=ApiResponse[LoadoutResponse])
def update_my_loadout(
    request: UpdateLoadoutRequest,
    player_id: PlayerIdHeader,
) -> ApiResponse[LoadoutResponse]:
    player = game_state_repository.update_loadout(
        player_id=player_id,
        skillset_id=request.skillset_id,
        animset_id=request.animset_id,
    )
    if player is None:
        raise DomainError("INVALID_LOADOUT", "Invalid loadout", "Loadout cannot be equipped.", 400)
    return ok(LoadoutResponse.from_record(player))


@api_router.post("/matchmaking/queue", response_model=ApiResponse[QueueStatusResponse])
async def enter_matchmaking_queue(
    _: QueueRequest,
    player_id: PlayerIdHeader,
) -> ApiResponse[QueueStatusResponse]:
    player = game_state_repository.get_player(player_id)
    if player is None:
        raise DomainError("PLAYER_NOT_FOUND", "Player not found", "Unknown player.", 404)
    if not player.loadout_configured:
        raise DomainError(
            "LOADOUT_REQUIRED",
            "Loadout required",
            "Save a valid loadout before entering matchmaking.",
            400,
        )
    was_already_queued = game_state_repository.get_queue_entry(player_id) is not None
    queue_state = game_state_repository.enter_queue(player_id)
    if queue_state is None:
        raise DomainError("PLAYER_NOT_FOUND", "Player not found", "Unknown player.", 404)
    queue_status, queued_at, battle = queue_state
    if battle is not None:
        return ok(
            QueueStatusResponse(
                queue_status="MATCHED",
                queued_at=queued_at,
                match_id=battle.match_id,
                battle_session_id=battle.battle_session_id,
            )
        )
    if queued_at is None:
        raise DomainError(
            "QUEUE_STATE_INVALID",
            "Queue state invalid",
            "Queue state is invalid.",
            500,
        )
    if not was_already_queued and battle_connection_manager.is_connected(player_id):
        await battle_connection_manager.send_event(player_id, build_match_ready_event(queued_at))
    battle = game_state_repository.create_match_for_player(player_id, allow_practice=False)
    if battle is not None:
        await emit_battle_handoff(battle)
        return ok(
            QueueStatusResponse(
                queue_status="MATCHED",
                queued_at=queued_at,
                match_id=battle.match_id,
                battle_session_id=battle.battle_session_id,
            )
        )
    return ok(
        QueueStatusResponse(
            queue_status=queue_status,
            queued_at=queued_at,
        )
    )


@api_router.delete("/matchmaking/queue", response_model=ApiResponse[QueueStatusResponse])
def leave_matchmaking_queue(player_id: PlayerIdHeader) -> ApiResponse[QueueStatusResponse]:
    battle = game_state_repository.get_player_battle(player_id)
    if battle is not None:
        return ok(
            QueueStatusResponse(
                queue_status="MATCHED",
                match_id=battle.match_id,
                battle_session_id=battle.battle_session_id,
            )
        )
    game_state_repository.leave_queue(player_id)
    return ok(QueueStatusResponse(queue_status="IDLE"))


@api_router.get("/matchmaking/status", response_model=ApiResponse[QueueStatusResponse])
def get_matchmaking_status(player_id: PlayerIdHeader) -> ApiResponse[QueueStatusResponse]:
    battle = game_state_repository.get_player_battle(player_id)
    if battle is not None:
        return ok(
            QueueStatusResponse(
                queue_status="MATCHED",
                match_id=battle.match_id,
                battle_session_id=battle.battle_session_id,
            )
        )
    queued_at = game_state_repository.get_queue_entry(player_id)
    if queued_at is not None:
        return ok(QueueStatusResponse(queue_status="SEARCHING", queued_at=queued_at))
    return ok(QueueStatusResponse(queue_status="IDLE"))


@api_router.get("/battles/{battle_session_id}", response_model=ApiResponse[BattleStateResponse])
def get_battle(
    battle_session_id: str,
    player_id: PlayerIdHeader,
) -> ApiResponse[BattleStateResponse]:
    game_state_repository.resolve_timeout_if_due(battle_session_id)
    battle = game_state_repository.get_battle(battle_session_id)
    if battle is None:
        raise DomainError("BATTLE_NOT_FOUND", "Battle not found", "Unknown battle session.", 404)
    return ok(BattleStateResponse.from_session(battle, player_id))


@api_router.post(
    "/battles/{battle_session_id}/actions",
    response_model=ApiResponse[BattleActionResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_battle_action(
    battle_session_id: str,
    request: SubmitBattleActionRequest,
) -> ApiResponse[BattleActionResponse]:
    timed_out_battle = await resolve_due_timeout_and_emit(battle_session_id)
    if timed_out_battle is not None:
        return ok(
            BattleActionResponse(
                battle_session_id=battle_session_id,
                turn_number=request.turn_number,
                action_id=request.action_id,
                status="REJECTED",
                reason="TURN_TIMEOUT",
                battle=BattleStateResponse.from_session(timed_out_battle, request.player_id),
            )
        )
    action_status, battle, reason = game_state_repository.submit_action(
        battle_session_id=battle_session_id,
        player_id=request.player_id,
        turn_number=request.turn_number,
        action_id=request.action_id,
        gesture_sequence=request.gesture_sequence,
    )
    response_status = "ACCEPTED" if action_status == "accepted" else "REJECTED"
    response = ok(
        BattleActionResponse(
            battle_session_id=battle_session_id,
            turn_number=request.turn_number,
            action_id=request.action_id,
            status=response_status,
            reason=reason,
            battle=BattleStateResponse.from_session(battle, request.player_id) if battle else None,
        )
    )
    if battle is not None:
        if action_status == "accepted":
            await emit_battle_resolution_events(battle, source_action_id=request.action_id)
        elif reason == "TURN_TIMEOUT" and battle.ended_reason == "TIMEOUT":
            await emit_battle_resolution_events(
                battle,
                timed_out_player_id=battle.loser_player_id,
            )
    return response


@api_router.post(
    "/battles/{battle_session_id}/surrender",
    response_model=ApiResponse[SurrenderResponse],
)
async def surrender_battle(
    battle_session_id: str,
    player_id: PlayerIdHeader,
) -> ApiResponse[SurrenderResponse]:
    existing_battle = game_state_repository.get_battle(battle_session_id)
    was_active = existing_battle is not None and existing_battle.status == "ACTIVE"
    battle = game_state_repository.surrender(battle_session_id, player_id)
    if battle is None:
        raise DomainError("BATTLE_NOT_FOUND", "Battle not found", "Unknown battle session.", 404)
    if was_active and battle.status == "ENDED":
        timed_out_player_id = (
            battle.loser_player_id if battle.ended_reason == "TIMEOUT" else None
        )
        surrendered_player_id = (
            player_id if battle.ended_reason == "SURRENDER" else None
        )
        await emit_battle_resolution_events(
            battle,
            timed_out_player_id=timed_out_player_id,
            surrendered_player_id=surrendered_player_id,
        )
    return ok(SurrenderResponse.from_session(battle, player_id))


@api_router.get("/matches/history", response_model=ApiResponse[list[MatchHistoryItemResponse]])
def list_match_history(player_id: PlayerIdHeader) -> ApiResponse[list[MatchHistoryItemResponse]]:
    rows = game_state_repository.list_match_history(player_id)
    return ok([MatchHistoryItemResponse.model_validate(row) for row in rows])


@api_router.get("/ratings/leaderboard", response_model=ApiResponse[list[LeaderboardItemResponse]])
def get_leaderboard() -> ApiResponse[list[LeaderboardItemResponse]]:
    players = game_state_repository.list_leaderboard_players()
    return ok(
        [
            LeaderboardItemResponse(
                rank=index + 1,
                player_id=player.player_id,
                nickname=player.nickname,
                rating=player.rating,
            )
            for index, player in enumerate(players[:20])
        ]
    )


@api_router.get("/ws-token", response_model=ApiResponse[WsTokenResponse])
def create_ws_token(player_id: PlayerIdHeader) -> ApiResponse[WsTokenResponse]:
    if game_state_repository.get_player(player_id) is None:
        raise DomainError("PLAYER_NOT_FOUND", "Player not found", "Unknown player.", 404)
    return ok(WsTokenResponse(ws_token=f"wst_{player_id}", expires_in=300))


@router.websocket("/ws")
async def battle_websocket(websocket: WebSocket, token: str | None = None) -> None:
    player_id = get_player_id_from_ws_token(token)
    if player_id is None:
        await websocket.close(code=1008)
        return
    handler = BattleWebSocketEventHandler(game_state_repository)
    await websocket.accept()
    await battle_connection_manager.connect(player_id, websocket)
    timeout_task = asyncio.create_task(watch_player_battle_timeout(player_id))
    try:
        await replay_player_matchmaking_state(player_id)
        while True:
            try:
                message = await websocket.receive_json()
            except WebSocketDisconnect:
                return
            except ValueError:
                await websocket.send_json(
                    serialize_battle_event(
                        BattleErrorEvent(
                            payload=BattleErrorPayload(
                                code="INVALID_JSON",
                                message="Message must be valid JSON.",
                            )
                        )
                    )
                )
                continue

            try:
                event = deserialize_battle_event(message)
            except ValidationError:
                await websocket.send_json(
                    serialize_battle_event(
                        BattleErrorEvent(
                            request_id=extract_battle_request_id(message),
                            payload=BattleErrorPayload(
                                code="INVALID_EVENT",
                                message="Unsupported or invalid battle event.",
                            ),
                        )
                    )
                )
                continue

            if isinstance(event, BattleSubmitActionEvent):
                timed_out, timed_out_battle, timed_out_player_id = (
                    game_state_repository.resolve_timeout_if_due(
                        event.payload.battle_session_id
                    )
                )
                if timed_out and timed_out_battle is not None and timed_out_player_id is not None:
                    await websocket.send_json(
                        serialize_battle_event(
                            BattleActionResultEvent(
                                request_id=event.request_id,
                                payload=BattleActionResponse(
                                    battle_session_id=event.payload.battle_session_id,
                                    turn_number=event.payload.turn_number,
                                    action_id=event.payload.action_id,
                                    status="REJECTED",
                                    reason="TURN_TIMEOUT",
                                    battle=BattleStateResponse.from_session(
                                        timed_out_battle,
                                        event.payload.player_id,
                                    ),
                                ),
                            )
                        )
                    )
                    await emit_battle_resolution_events(
                        timed_out_battle,
                        timed_out_player_id=timed_out_player_id,
                    )
                    continue

            response = handler.handle(event)
            await websocket.send_json(serialize_battle_event(response))
            if isinstance(event, BattleSubmitActionEvent) and isinstance(
                response,
                BattleActionResultEvent,
            ):
                battle = game_state_repository.get_battle(event.payload.battle_session_id)
                if battle is None:
                    continue
                if response.payload.status == "ACCEPTED":
                    await emit_battle_resolution_events(
                        battle,
                        source_action_id=event.payload.action_id,
                    )
                elif response.payload.reason == "TURN_TIMEOUT" and battle.ended_reason == "TIMEOUT":
                    await emit_battle_resolution_events(
                        battle,
                        timed_out_player_id=battle.loser_player_id,
                    )
    finally:
        timeout_task.cancel()
        with suppress(asyncio.CancelledError):
            await timeout_task
        battle_connection_manager.disconnect(player_id, websocket)


def get_player_id_from_ws_token(token: str | None) -> str | None:
    if token is None or not token.startswith("wst_"):
        return None
    player_id = token.removeprefix("wst_")
    return player_id if game_state_repository.get_player(player_id) is not None else None


async def replay_player_matchmaking_state(player_id: str) -> None:
    battle = game_state_repository.get_player_battle(player_id)
    if battle is not None:
        await emit_battle_handoff(battle, player_ids=(player_id,))
        return
    latest_battle = game_state_repository.get_latest_player_battle(player_id)
    if latest_battle is not None and latest_battle.status == "ENDED":
        if battle_connection_manager.is_connected(player_id):
            await battle_connection_manager.send_event(
                player_id,
                build_ended_event(latest_battle, player_id),
            )
        return
    queued_at = game_state_repository.get_queue_entry(player_id)
    if queued_at is None:
        return
    await battle_connection_manager.send_event(player_id, build_match_ready_event(queued_at))
    battle = game_state_repository.create_match_for_player(player_id, allow_practice=False)
    if battle is not None:
        await emit_battle_handoff(battle)


async def emit_battle_handoff(
    battle: BattleSession,
    player_ids: tuple[str, ...] | None = None,
) -> None:
    recipients = player_ids if player_ids is not None else battle.player_ids
    for participant_id in recipients:
        if not battle_connection_manager.is_connected(participant_id):
            continue
        await battle_connection_manager.send_event(
            participant_id,
            build_match_found_event(battle, participant_id),
        )
        await battle_connection_manager.send_event(
            participant_id,
            build_started_event(battle, participant_id),
        )


async def emit_battle_resolution_events(
    battle: BattleSession,
    source_action_id: str | None = None,
    timed_out_player_id: str | None = None,
    surrendered_player_id: str | None = None,
) -> None:
    for participant_id in battle.player_ids:
        if not battle_connection_manager.is_connected(participant_id):
            continue
        if battle.status == "ENDED":
            if timed_out_player_id is not None:
                await battle_connection_manager.send_event(
                    participant_id,
                    build_timeout_event(
                        battle,
                        participant_id,
                        timed_out_player_id,
                    ),
                )
            if surrendered_player_id is not None:
                await battle_connection_manager.send_event(
                    participant_id,
                    build_surrendered_event(
                        battle,
                        participant_id,
                        surrendered_player_id,
                    ),
                )
            await battle_connection_manager.send_event(
                participant_id,
                build_ended_event(battle, participant_id),
            )
            continue
        if source_action_id is None:
            continue
        await battle_connection_manager.send_event(
            participant_id,
            build_state_updated_event(
                battle,
                participant_id,
                source_action_id=source_action_id,
            ),
        )


async def resolve_due_timeout_and_emit(battle_session_id: str) -> BattleSession | None:
    timed_out, battle, timed_out_player_id = game_state_repository.resolve_timeout_if_due(
        battle_session_id
    )
    if not timed_out or battle is None or timed_out_player_id is None:
        return None
    await emit_battle_resolution_events(
        battle,
        timed_out_player_id=timed_out_player_id,
    )
    return battle


async def watch_player_battle_timeout(player_id: str) -> None:
    while True:
        await asyncio.sleep(0.1)
        battle = game_state_repository.get_player_battle(player_id)
        if battle is None:
            continue
        await resolve_due_timeout_and_emit(battle.battle_session_id)


router.include_router(api_router)

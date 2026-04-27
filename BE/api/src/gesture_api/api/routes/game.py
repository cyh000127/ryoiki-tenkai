from datetime import UTC, datetime
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
    BattleErrorEvent,
    BattleErrorPayload,
    deserialize_battle_event,
    extract_battle_request_id,
    serialize_battle_event,
)
from gesture_api.domain.errors import DomainError
from gesture_api.repositories.game_state import game_state_repository
from gesture_api.services.battle_websocket import BattleWebSocketEventHandler
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
def enter_matchmaking_queue(
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
    battle = game_state_repository.enter_queue(player_id)
    if battle is None:
        raise DomainError("PLAYER_NOT_FOUND", "Player not found", "Unknown player.", 404)
    return ok(
        QueueStatusResponse(
            queue_status="MATCHED",
            queued_at=datetime.now(UTC),
            match_id=battle.match_id,
            battle_session_id=battle.battle_session_id,
        )
    )


@api_router.delete("/matchmaking/queue", response_model=ApiResponse[QueueStatusResponse])
def leave_matchmaking_queue(player_id: PlayerIdHeader) -> ApiResponse[QueueStatusResponse]:
    game_state_repository.leave_queue(player_id)
    return ok(QueueStatusResponse(queue_status="IDLE"))


@api_router.get("/matchmaking/status", response_model=ApiResponse[QueueStatusResponse])
def get_matchmaking_status(player_id: PlayerIdHeader) -> ApiResponse[QueueStatusResponse]:
    battle = game_state_repository.get_player_battle(player_id)
    if battle is None:
        return ok(QueueStatusResponse(queue_status="IDLE"))
    return ok(
        QueueStatusResponse(
            queue_status="MATCHED",
            match_id=battle.match_id,
            battle_session_id=battle.battle_session_id,
        )
    )


@api_router.get("/battles/{battle_session_id}", response_model=ApiResponse[BattleStateResponse])
def get_battle(
    battle_session_id: str,
    player_id: PlayerIdHeader,
) -> ApiResponse[BattleStateResponse]:
    battle = game_state_repository.get_battle(battle_session_id)
    if battle is None:
        raise DomainError("BATTLE_NOT_FOUND", "Battle not found", "Unknown battle session.", 404)
    return ok(BattleStateResponse.from_session(battle, player_id))


@api_router.post(
    "/battles/{battle_session_id}/actions",
    response_model=ApiResponse[BattleActionResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
def submit_battle_action(
    battle_session_id: str,
    request: SubmitBattleActionRequest,
) -> ApiResponse[BattleActionResponse]:
    action_status, battle, reason = game_state_repository.submit_action(
        battle_session_id=battle_session_id,
        player_id=request.player_id,
        turn_number=request.turn_number,
        action_id=request.action_id,
        gesture_sequence=request.gesture_sequence,
    )
    response_status = "ACCEPTED" if action_status == "accepted" else "REJECTED"
    return ok(
        BattleActionResponse(
            battle_session_id=battle_session_id,
            turn_number=request.turn_number,
            action_id=request.action_id,
            status=response_status,
            reason=reason,
            battle=BattleStateResponse.from_session(battle, request.player_id) if battle else None,
        )
    )


@api_router.post(
    "/battles/{battle_session_id}/surrender",
    response_model=ApiResponse[SurrenderResponse],
)
def surrender_battle(
    battle_session_id: str,
    player_id: PlayerIdHeader,
) -> ApiResponse[SurrenderResponse]:
    battle = game_state_repository.surrender(battle_session_id, player_id)
    if battle is None:
        raise DomainError("BATTLE_NOT_FOUND", "Battle not found", "Unknown battle session.", 404)
    return ok(SurrenderResponse.from_session(battle, player_id))


@api_router.get("/matches/history", response_model=ApiResponse[list[MatchHistoryItemResponse]])
def list_match_history(player_id: PlayerIdHeader) -> ApiResponse[list[MatchHistoryItemResponse]]:
    rows = [
        MatchHistoryItemResponse.model_validate(row)
        for row in game_state_repository.match_history
        if row["player_id"] == player_id
    ]
    return ok(rows)


@api_router.get("/ratings/leaderboard", response_model=ApiResponse[list[LeaderboardItemResponse]])
def get_leaderboard() -> ApiResponse[list[LeaderboardItemResponse]]:
    players = sorted(
        game_state_repository.players.values(),
        key=lambda player: player.rating,
        reverse=True,
    )
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
    if not is_valid_ws_token(token):
        await websocket.close(code=1008)
        return
    handler = BattleWebSocketEventHandler(game_state_repository)
    await websocket.accept()
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

        await websocket.send_json(serialize_battle_event(handler.handle(event)))


def is_valid_ws_token(token: str | None) -> bool:
    if token is None or not token.startswith("wst_"):
        return False
    player_id = token.removeprefix("wst_")
    return game_state_repository.get_player(player_id) is not None


router.include_router(api_router)

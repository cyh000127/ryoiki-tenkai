from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Protocol

from gesture_api.domain.game import PlayerRecord
from gesture_api.models.game_state import GamePlayerOrm, MatchAuditOrm, MatchHistoryOrm
from sqlalchemy.orm import Session


@dataclass
class GameStatePersistenceSnapshot:
    players: list[PlayerRecord]
    match_history: list[dict[str, object]]
    match_audits: dict[str, list[dict[str, object]]]


class GameStateStorageAdapter(Protocol):
    def load(self) -> GameStatePersistenceSnapshot | None:
        raise NotImplementedError

    def save(self, snapshot: GameStatePersistenceSnapshot) -> None:
        raise NotImplementedError


class NullGameStateStorageAdapter:
    def load(self) -> GameStatePersistenceSnapshot | None:
        return None

    def save(self, snapshot: GameStatePersistenceSnapshot) -> None:
        return None


class JsonGameStateStorageAdapter:
    def __init__(self, persistence_path: Path) -> None:
        self.persistence_path = persistence_path

    def load(self) -> GameStatePersistenceSnapshot | None:
        if not self.persistence_path.exists():
            return None

        payload = json.loads(self.persistence_path.read_text(encoding="utf-8"))

        return GameStatePersistenceSnapshot(
            players=[
                PlayerRecord(**player_row)
                for player_row in payload.get("players", [])
            ],
            match_history=[
                self._deserialize_history_row(row)
                for row in payload.get("match_history", [])
            ],
            match_audits={
                battle_session_id: [
                    self._deserialize_audit_row(row)
                    for row in audit_rows
                ]
                for battle_session_id, audit_rows in payload.get("match_audits", {}).items()
            },
        )

    def save(self, snapshot: GameStatePersistenceSnapshot) -> None:
        self.persistence_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "players": [
                {
                    "player_id": player.player_id,
                    "guest_token": player.guest_token,
                    "nickname": player.nickname,
                    "rating": player.rating,
                    "wins": player.wins,
                    "losses": player.losses,
                    "equipped_skillset_id": player.equipped_skillset_id,
                    "equipped_animset_id": player.equipped_animset_id,
                    "loadout_configured": player.loadout_configured,
                }
                for player in snapshot.players
            ],
            "match_history": [
                self._serialize_history_row(row)
                for row in snapshot.match_history
            ],
            "match_audits": {
                battle_session_id: [
                    self._serialize_audit_row(row)
                    for row in audit_rows
                ]
                for battle_session_id, audit_rows in snapshot.match_audits.items()
            },
        }
        temp_path = self.persistence_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
        temp_path.replace(self.persistence_path)

    def _serialize_history_row(self, row: dict[str, object]) -> dict[str, object]:
        return {
            **row,
            "played_at": self._serialize_datetime(row["played_at"]),
        }

    def _deserialize_history_row(self, row: dict[str, object]) -> dict[str, object]:
        return {
            **row,
            "played_at": self._deserialize_datetime(row["played_at"]),
        }

    def _serialize_audit_row(self, row: dict[str, object]) -> dict[str, object]:
        return {
            **row,
            "created_at": self._serialize_datetime(row["created_at"]),
        }

    def _deserialize_audit_row(self, row: dict[str, object]) -> dict[str, object]:
        return {
            **row,
            "created_at": self._deserialize_datetime(row["created_at"]),
        }

    def _serialize_datetime(self, value: object) -> str:
        if not isinstance(value, datetime):
            raise TypeError("Expected datetime value.")
        return value.isoformat()

    def _deserialize_datetime(self, value: object) -> datetime:
        if not isinstance(value, str):
            raise TypeError("Expected datetime string.")
        return datetime.fromisoformat(value)


class SqlGameStateStorageAdapter:
    def __init__(self, session_factory: Callable[[], Session]) -> None:
        self._session_factory = session_factory

    def load(self) -> GameStatePersistenceSnapshot | None:
        with self._session_factory() as session:
            players = [
                PlayerRecord(
                    player_id=row.player_id,
                    guest_token=row.guest_token,
                    nickname=row.nickname,
                    rating=row.rating,
                    wins=row.wins,
                    losses=row.losses,
                    equipped_skillset_id=row.equipped_skillset_id,
                    equipped_animset_id=row.equipped_animset_id,
                    loadout_configured=row.loadout_configured,
                )
                for row in session.query(GamePlayerOrm).all()
            ]
            if not players:
                return None

            match_history = [
                {
                    "match_id": row.match_id,
                    "battle_session_id": row.battle_session_id,
                    "player_id": row.player_id,
                    "opponent_id": row.opponent_id,
                    "result": row.result,
                    "skillset_id": row.skillset_id,
                    "rating_change": row.rating_change,
                    "rating_after": row.rating_after,
                    "ended_reason": row.ended_reason,
                    "turn_count": row.turn_count,
                    "played_at": row.played_at,
                }
                for row in session.query(MatchHistoryOrm).all()
            ]
            match_audits: dict[str, list[dict[str, object]]] = {}
            audit_rows = session.query(MatchAuditOrm).order_by(
                MatchAuditOrm.battle_session_id,
                MatchAuditOrm.turn_number,
                MatchAuditOrm.audit_id,
            )
            for row in audit_rows:
                match_audits.setdefault(row.battle_session_id, []).append(
                    {
                        "turn_number": row.turn_number,
                        "actor_player_id": row.actor_player_id,
                        "message": row.message,
                        "created_at": row.created_at,
                    }
                )

        return GameStatePersistenceSnapshot(
            players=players,
            match_history=match_history,
            match_audits=match_audits,
        )

    def save(self, snapshot: GameStatePersistenceSnapshot) -> None:
        with self._session_factory() as session:
            try:
                session.query(MatchAuditOrm).delete()
                session.query(MatchHistoryOrm).delete()
                session.query(GamePlayerOrm).delete()
                session.add_all(self._build_player_rows(snapshot.players))
                session.add_all(self._build_history_rows(snapshot.match_history))
                session.add_all(self._build_audit_rows(snapshot.match_audits))
                session.commit()
            except Exception:
                session.rollback()
                raise

    def _build_player_rows(self, players: list[PlayerRecord]) -> list[GamePlayerOrm]:
        return [
            GamePlayerOrm(
                player_id=player.player_id,
                guest_token=player.guest_token,
                nickname=player.nickname,
                rating=player.rating,
                wins=player.wins,
                losses=player.losses,
                equipped_skillset_id=player.equipped_skillset_id,
                equipped_animset_id=player.equipped_animset_id,
                loadout_configured=player.loadout_configured,
            )
            for player in players
        ]

    def _build_history_rows(self, rows: list[dict[str, object]]) -> list[MatchHistoryOrm]:
        return [
            MatchHistoryOrm(
                history_id=f"{row['battle_session_id']}:{row['player_id']}",
                match_id=str(row["match_id"]),
                battle_session_id=str(row["battle_session_id"]),
                player_id=str(row["player_id"]),
                opponent_id=str(row["opponent_id"]),
                result=str(row["result"]),
                skillset_id=str(row["skillset_id"]),
                rating_change=int(row["rating_change"]),
                rating_after=int(row["rating_after"]),
                ended_reason=str(row["ended_reason"]),
                turn_count=int(row["turn_count"]),
                played_at=self._expect_datetime(row["played_at"]),
            )
            for row in rows
        ]

    def _build_audit_rows(
        self,
        audits: dict[str, list[dict[str, object]]],
    ) -> list[MatchAuditOrm]:
        return [
            MatchAuditOrm(
                audit_id=f"{battle_session_id}:{index}",
                battle_session_id=battle_session_id,
                turn_number=int(row["turn_number"]),
                actor_player_id=str(row["actor_player_id"]),
                message=str(row["message"]),
                created_at=self._expect_datetime(row["created_at"]),
            )
            for battle_session_id, rows in audits.items()
            for index, row in enumerate(rows)
        ]

    def _expect_datetime(self, value: object) -> datetime:
        if not isinstance(value, datetime):
            raise TypeError("Expected datetime value.")
        return value

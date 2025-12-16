"""Add role/points to report_abilities and normalize existing data

Revision ID: 004
Revises: ae2ac093f5ac
Create Date: 2025-12-16
"""

from __future__ import annotations

from datetime import datetime
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "ae2ac093f5ac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _uuid36() -> str:
    return str(uuid.uuid4())


def upgrade() -> None:
    op.add_column("report_abilities", sa.Column("role", sa.String(length=16), nullable=True))
    op.add_column(
        "report_abilities",
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
    )

    bind = op.get_bind()

    # Fetch active abilities ordered by display_order (used to fill missing to 3)
    abilities_rows = bind.execute(
        text("SELECT id FROM abilities WHERE is_active = 1 ORDER BY display_order ASC, id ASC")
    ).fetchall()
    ability_ids_ordered = [row[0] for row in abilities_rows]

    # Normalize every report to have exactly 3 abilities, then set role/points:
    # - 1st: strong (+2)
    # - 2nd/3rd: sub (+1)
    report_rows = bind.execute(text("SELECT id, created_at, updated_at FROM reports")).fetchall()
    for report_id, report_created_at, report_updated_at in report_rows:
        rows = bind.execute(
            text(
                """
                SELECT ra.id, ra.ability_id
                FROM report_abilities ra
                LEFT JOIN abilities a ON a.id = ra.ability_id
                WHERE ra.report_id = :rid
                ORDER BY ra.created_at ASC, COALESCE(a.display_order, 999) ASC, ra.id ASC
                """
            ),
            {"rid": report_id},
        ).fetchall()

        # Drop extras beyond 3
        for ra_id, _ability_id in rows[3:]:
            bind.execute(text("DELETE FROM report_abilities WHERE id = :id"), {"id": ra_id})

        kept_ability_ids = [r[1] for r in rows[:3]]

        # Fill missing up to 3
        missing = 3 - len(kept_ability_ids)
        if missing > 0:
            to_add: list[str] = []
            for aid in ability_ids_ordered:
                if len(to_add) >= missing:
                    break
                if aid in kept_ability_ids or aid in to_add:
                    continue
                to_add.append(aid)

            now = datetime.utcnow()
            created_at = report_created_at or now
            updated_at = report_updated_at or now

            for aid in to_add:
                bind.execute(
                    text(
                        """
                        INSERT INTO report_abilities (id, report_id, ability_id, role, points, created_at, updated_at)
                        VALUES (:id, :rid, :aid, :role, :points, :ca, :ua)
                        """
                    ),
                    {
                        "id": _uuid36(),
                        "rid": report_id,
                        "aid": aid,
                        "role": None,
                        "points": 0,
                        "ca": created_at,
                        "ua": updated_at,
                    },
                )

        # Assign role/points deterministically (after fill/delete)
        final_rows = bind.execute(
            text(
                """
                SELECT ra.id
                FROM report_abilities ra
                LEFT JOIN abilities a ON a.id = ra.ability_id
                WHERE ra.report_id = :rid
                ORDER BY ra.created_at ASC, COALESCE(a.display_order, 999) ASC, ra.id ASC
                LIMIT 3
                """
            ),
            {"rid": report_id},
        ).fetchall()

        if not final_rows:
            continue

        # First is strong
        bind.execute(
            text("UPDATE report_abilities SET role = 'strong', points = 2 WHERE id = :id"),
            {"id": final_rows[0][0]},
        )
        # Next are sub
        for row in final_rows[1:]:
            bind.execute(
                text("UPDATE report_abilities SET role = 'sub', points = 1 WHERE id = :id"),
                {"id": row[0]},
            )

    # Remove server default (keep DB clean)
    op.alter_column("report_abilities", "points", server_default=None)


def downgrade() -> None:
    op.drop_column("report_abilities", "points")
    op.drop_column("report_abilities", "role")




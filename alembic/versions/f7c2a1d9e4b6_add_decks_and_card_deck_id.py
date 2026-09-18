"""add decks and card deck relationship

Revision ID: f7c2a1d9e4b6
Revises: d4e059c6517f
Create Date: 2026-09-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7c2a1d9e4b6"
down_revision: Union[str, Sequence[str], None] = "d4e059c6517f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "decks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("cards", sa.Column("deck_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_cards_deck_id",
        "cards",
        "decks",
        ["deck_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_cards_deck_id", "cards", type_="foreignkey")
    op.drop_column("cards", "deck_id")
    op.drop_table("decks")

"""merge legacy streak and deck schema heads

Revision ID: c1d7e3f9a2b4
Revises: f7c2a1d9e4b6, fb8e0f341762
Create Date: 2026-09-16

"""
from typing import Sequence, Union


revision: str = "c1d7e3f9a2b4"
down_revision: Union[str, Sequence[str], None] = ("f7c2a1d9e4b6", "fb8e0f341762")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
"""Add seminar_lab table and student relation

Revision ID: 002
Revises: 001
Create Date: 2024-12-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create seminar_labs table
    op.create_table(
        'seminar_labs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('teacher_id', sa.String(36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # Add seminar_lab_id to students table
    op.add_column(
        'students',
        sa.Column('seminar_lab_id', sa.String(36), nullable=True)
    )
    op.create_foreign_key(
        'fk_students_seminar_lab_id',
        'students',
        'seminar_labs',
        ['seminar_lab_id'],
        ['id']
    )


def downgrade() -> None:
    # Remove foreign key and column from students
    op.drop_constraint('fk_students_seminar_lab_id', 'students', type_='foreignkey')
    op.drop_column('students', 'seminar_lab_id')

    # Drop seminar_labs table
    op.drop_table('seminar_labs')

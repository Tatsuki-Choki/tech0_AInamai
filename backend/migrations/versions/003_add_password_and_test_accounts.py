"""Add password_hash field and test accounts

Revision ID: 003
Revises: 002
Create Date: 2024-12-10

"""
from typing import Sequence, Union
from datetime import datetime
import uuid

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Pre-computed password hashes (bcrypt)
# teacher123 -> $2b$12$rOXdYKfb99CqXg7l1xOwKOUqifXoz.hdMmDAPxYxOJGoERsfnKC2.
# student123 -> $2b$12$9xsNDfTqPrLF85LJJgkxWe4nfnq17O6C6iLloy166oIQVn5b2NP5S
TEACHER_PASSWORD_HASH = "$2b$12$rOXdYKfb99CqXg7l1xOwKOUqifXoz.hdMmDAPxYxOJGoERsfnKC2."
STUDENT_PASSWORD_HASH = "$2b$12$9xsNDfTqPrLF85LJJgkxWe4nfnq17O6C6iLloy166oIQVn5b2NP5S"


def upgrade() -> None:
    # Add password_hash column to users table
    op.add_column(
        'users',
        sa.Column('password_hash', sa.String(255), nullable=True)
    )

    # Create test teacher account
    # Email: teacher@test.com
    # Password: teacher123
    teacher_user_id = str(uuid.uuid4())
    teacher_profile_id = str(uuid.uuid4())
    now = datetime.utcnow()
    password_hash = TEACHER_PASSWORD_HASH

    # Insert test teacher user
    op.execute(
        sa.text("""
            INSERT INTO users (id, email, name, role, is_active, password_hash, created_at, updated_at)
            VALUES (:id, :email, :name, :role, :is_active, :password_hash, :created_at, :updated_at)
        """).bindparams(
            id=teacher_user_id,
            email="teacher@test.com",
            name="テスト先生",
            role="teacher",
            is_active=True,
            password_hash=password_hash,
            created_at=now,
            updated_at=now,
        )
    )

    # Insert teacher profile
    op.execute(
        sa.text("""
            INSERT INTO teachers (id, user_id, department, created_at, updated_at)
            VALUES (:id, :user_id, :department, :created_at, :updated_at)
        """).bindparams(
            id=teacher_profile_id,
            user_id=teacher_user_id,
            department="探究学習担当",
            created_at=now,
            updated_at=now,
        )
    )

    # Create test student account
    # Email: student@test.com
    # Password: student123
    student_user_id = str(uuid.uuid4())
    student_profile_id = str(uuid.uuid4())
    streak_id = str(uuid.uuid4())
    student_password_hash = STUDENT_PASSWORD_HASH

    # Insert test student user
    op.execute(
        sa.text("""
            INSERT INTO users (id, email, name, role, is_active, password_hash, created_at, updated_at)
            VALUES (:id, :email, :name, :role, :is_active, :password_hash, :created_at, :updated_at)
        """).bindparams(
            id=student_user_id,
            email="student@test.com",
            name="テスト生徒",
            role="student",
            is_active=True,
            password_hash=student_password_hash,
            created_at=now,
            updated_at=now,
        )
    )

    # Insert student profile
    op.execute(
        sa.text("""
            INSERT INTO students (id, user_id, grade, class_name, student_number, created_at, updated_at)
            VALUES (:id, :user_id, :grade, :class_name, :student_number, :created_at, :updated_at)
        """).bindparams(
            id=student_profile_id,
            user_id=student_user_id,
            grade=2,
            class_name="A",
            student_number="01",
            created_at=now,
            updated_at=now,
        )
    )

    # Insert streak record for test student
    op.execute(
        sa.text("""
            INSERT INTO streak_records (id, student_id, current_streak, max_streak, created_at, updated_at)
            VALUES (:id, :student_id, :current_streak, :max_streak, :created_at, :updated_at)
        """).bindparams(
            id=streak_id,
            student_id=student_profile_id,
            current_streak=0,
            max_streak=0,
            created_at=now,
            updated_at=now,
        )
    )


def downgrade() -> None:
    # Remove test accounts
    op.execute(
        sa.text("DELETE FROM streak_records WHERE student_id IN (SELECT id FROM students WHERE user_id IN (SELECT id FROM users WHERE email = 'student@test.com'))")
    )
    op.execute(
        sa.text("DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email = 'student@test.com')")
    )
    op.execute(
        sa.text("DELETE FROM teachers WHERE user_id IN (SELECT id FROM users WHERE email = 'teacher@test.com')")
    )
    op.execute(
        sa.text("DELETE FROM users WHERE email IN ('teacher@test.com', 'student@test.com')")
    )

    # Remove password_hash column
    op.drop_column('users', 'password_hash')

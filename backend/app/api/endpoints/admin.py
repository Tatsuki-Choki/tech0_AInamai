from fastapi import APIRouter, HTTPException, BackgroundTasks
import subprocess
import os
import sys
import asyncio
from alembic.config import Config
from alembic import command
import io
from contextlib import redirect_stdout, redirect_stderr

router = APIRouter()

def run_alembic_in_thread():
    # Helper to run in thread
    # Use absolute path to find alembic.ini from wwwroot
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    ini_path = os.path.join(base_dir, "alembic.ini")
    
    alembic_cfg = Config(ini_path)
    # Ensure script_location points to migrations folder
    migrations_dir = os.path.join(base_dir, "migrations")
    alembic_cfg.set_main_option("script_location", migrations_dir)
    
    stdout = io.StringIO()
    stderr = io.StringIO()
    
    # redirect_stdout is not thread-safe if other threads write to stdout, 
    # but for this admin task it is acceptable.
    # Note: Alembic might re-configure logging which could interfere.
    try:
        with redirect_stdout(stdout), redirect_stderr(stderr):
            print(f"DEBUG: base_dir={base_dir}")
            print(f"DEBUG: ini_path={ini_path}")
            print(f"DEBUG: migrations_dir={migrations_dir}")
            print(f"DEBUG: Configured script_location={alembic_cfg.get_main_option('script_location')}")
            command.upgrade(alembic_cfg, "head")
        return "success", stdout.getvalue(), stderr.getvalue()
    except Exception as e:
        return "error", stdout.getvalue(), str(e)

@router.post("/migrate")
async def run_migrations():
    results = {}
    
    # Set PYTHONPATH
    env = os.environ.copy()
    cwd = os.getcwd()
    if cwd not in sys.path:
        sys.path.append(cwd)

    # 1. Run Alembic Upgrade (in thread to avoid blocking loop and allow internal asyncio.run)
    try:
        loop = asyncio.get_running_loop()
        status, out, err = await loop.run_in_executor(None, run_alembic_in_thread)
        
        results["alembic"] = {
            "status": status,
            "stdout": out,
            "stderr": err if status == "success" else f"{out}\n{err}"
        }
    except Exception as e:
        results["alembic"] = {
            "status": "error",
            "error": str(e)
        }

    # 2. Run Seeds
    try:
        from app.db.seed import run_seed
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            await run_seed()
        results["seed"] = {
            "status": "success",
            "stdout": stdout.getvalue()
        }
    except Exception as e:
        results["seed"] = {
            "status": "error",
            "error": str(e)
        }

    try:
        from app.db.seed_demo import seed_demo_data
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            await seed_demo_data()
        results["demo"] = {
            "status": "success",
            "stdout": stdout.getvalue()
        }
    except Exception as e:
        results["demo"] = {
            "status": "error",
            "error": str(e)
        }
        
    return results

from app.core.security import get_password_hash
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.models.user import User
from sqlalchemy import select
from pydantic import BaseModel

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    await db.commit()
    
    return {"status": "success", "message": f"Password for {request.email} reset"}

from app.models.research import ResearchTheme, ThemeStatus
from app.models.user import Student

from app.core.config import settings

@router.post("/assign-theme")
async def assign_test_theme(email: str = "student@test.com", db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if not user:
        return {"status": "error", "message": "User not found"}
        
    # Find student
    result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = result.scalars().first()
    if not student:
        # Create student profile if missing (should exist though)
        student = Student(user_id=user.id, grade=1, class_name="A", student_number="1")
        db.add(student)
        await db.flush()
        
    # Check theme for CURRENT fiscal year
    current_fy = settings.get_current_fiscal_year()
    result = await db.execute(select(ResearchTheme).where(
        ResearchTheme.student_id == student.id,
        ResearchTheme.fiscal_year == current_fy
    ))
    theme = result.scalars().first()
    
    if not theme:
        theme = ResearchTheme(
            student_id=student.id,
            title="Debugging Theme",
            description="Created for testing report submission",
            fiscal_year=current_fy,
            status=ThemeStatus.IN_PROGRESS
        )
        db.add(theme)
        await db.commit()
        return {"status": "success", "message": f"Theme created for FY{current_fy}"}
    
    return {"status": "success", "message": f"Theme already exists for FY{current_fy}"}

@router.post("/seed-dummy")
async def run_dummy_seed(background_tasks: BackgroundTasks):
    """Run the interactive dummy data seed script."""
    from app.db.seed_dummy_interactive import seed_dummy_interactive
    
    background_tasks.add_task(seed_dummy_interactive)
    
    return {"status": "accepted", "message": "Dummy seed started in background"}

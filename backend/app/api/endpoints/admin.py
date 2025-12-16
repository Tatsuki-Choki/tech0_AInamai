from fastapi import APIRouter, HTTPException
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

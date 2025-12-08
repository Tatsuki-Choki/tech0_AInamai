from fastapi import APIRouter

from app.api.endpoints import auth, users, themes, reports, master, ai, dashboard, analysis

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(themes.router)
api_router.include_router(reports.router)
api_router.include_router(analysis.router)  # /reports/analyze, /reports/calendar, /reports/summary
api_router.include_router(master.router)
api_router.include_router(ai.router)
api_router.include_router(dashboard.router)

from fastapi import APIRouter

from app.api.endpoints import auth, users, themes, reports, master, ai, dashboard, analysis, teacher_themes, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(themes.router)
api_router.include_router(teacher_themes.router)  # Teacher theme management
api_router.include_router(analysis.router)  # /reports/analyze, /reports/calendar, /reports/summary - must be before reports.router
api_router.include_router(reports.router)
api_router.include_router(master.router)
api_router.include_router(ai.router)
api_router.include_router(dashboard.router)
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Debugging Azure Deployment - Walkthrough

## Issue Diagnosis
User reported issues with "Abilities not detected" and "Report submission failure" on the deployed environment.

### Findings
1.  **AI Failure**: `deploy_backend.sh` was using placeholders for `GEMINI_API_KEY` (`YOUR_GEMINI_API_KEY`), causing AI authentication to fail.
2.  **Database Connection**: The application was trying to connect to a MySQL database on `localhost` (from default config), which is invalid on Azure.
3.  **Migration Issues**: Several migration files (`002`, `004`, `ae2...`) contained SQL operations (like `ALTER COLUMN` or `op.create_foreign_key`) that are incompatible with SQLite unless running in batch mode.

## Fixes Implemented
1.  **Credentials**: Updated `deploy_backend.sh` to inject the correct `GEMINI_API_KEY` and other credentials.
2.  **Database**: Switched the deployed database to **SQLite** by setting `DATABASE_URL` to `sqlite+aiosqlite:////home/site/wwwroot/tankyu.db`.
3.  **Code Patches**:
    - Updated `app/db/session.py` and `alembic/env.py` to correctly bypass URL parsing for SQLite connection strings (fixing `ValueError` during connection).
    - Added `aiosqlite` to `requirements.txt`.
    - Patched `startup.sh` to use the correct `alembic upgrade head` command.
4.  **Migration Refactoring**: Modified `backend/alembic/versions/*.py` to use `batch_alter_table`, ensuring compatibility with SQLite.

## Verification
- **Local Verification**:
    - Configured local environment to match Azure (SQLite).
    - Ran all migrations successfully.
    - Executed seed scripts (`seed.py` and `seed_demo.py`) successfully.
- **Deployment**:
    - Deployed fixed backend to Azure.
    - Verified `/health` endpoint is UP (`{"status":"healthy"}`).

## Next Steps for User
Please login to the deployed application and retry the report submission test.
- **Frontend**: https://koya-app-frontend-dev.azurewebsites.net
- **Backend Health**: https://koya-app-backend-dev.azurewebsites.net/health

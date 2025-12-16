# Deployment Plan

## Goal
Deploy the latest version of the application (Frontend & Backend) to Azure App Service to reflect recent local changes.

## Proposed Changes
No code changes are required for deployment. The deployment will be executed using the existing shell scripts.

### Backend Deployment
- **Script**: `backend/deploy_backend.sh`
- **Target**: `koya-app-backend-dev` (Azure App Service)
- **Process**:
    1. Prepare source code (zip `app`, `alembic`, `requirements.txt`, etc.).
    2. Configure App Service settings (Env vars: `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`, etc.).
    3. Upload zip package to Azure.

### Frontend Deployment
- **Script**: `frontend/deploy_frontend.sh`
- **Target**: `koya-app-frontend-dev` (Azure App Service)
- **Process**:
    1. Build the React application (`npm run build`).
    2. Prepare deployment package (copy `dist`, create `server.cjs` and `package.json`).
    3. Configure App Service settings (Startup command, Node version).
    4. Upload zip package to Azure.

## Verification Plan
### Automated Verification
- Monitor the deployment status using `az webapp deployment list`.
- Check the application logs if necessary.

### Manual Verification
- Access the frontend URL: https://koya-app-frontend-dev.azurewebsites.net
- Access the backend URL: https://koya-app-backend-dev.azurewebsites.net/docs
- Verify key functionalities (Login, Report creation) on the deployed environment.

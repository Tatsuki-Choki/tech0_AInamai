# Deploy Updated Code - Walkthrough

## Deployment Summary
Both Frontend and Backend changes have been successfully deployed to the Azure Dev environment.

### Backend
- **Target**: `koya-app-backend-dev.azurewebsites.net`
- **Status**: Deployed & Healthy
- **Verification**:
    - `/docs` endpoint is accessible.
    - `/health` endpoint returns `{"status":"healthy"}`.
    - **Deployment Log**: Site started successfully.

### Frontend
- **Target**: `koya-app-frontend-dev.azurewebsites.net`
- **Status**: Deployed
- **Verification**:
    - Application loads successfully (HTML/Assets).
    - **Deployment Log**: Build and deployment successful.

## Verification
You can access the updated environment here:
- **Frontend**: [https://koya-app-frontend-dev.azurewebsites.net](https://koya-app-frontend-dev.azurewebsites.net)
- **Backend API Docs**: [https://koya-app-backend-dev.azurewebsites.net/docs](https://koya-app-backend-dev.azurewebsites.net/docs)

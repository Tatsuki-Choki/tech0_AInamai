# Implementation Plan - Deployment & Verification (Updated)

## Goal
Verify the deployed application on Azure with specific test accounts (`student1@test.com`, `teacher@test.com`).

## Status
- **Backend**: Deployed with `greenlet` fix and new `seed_demo.py` for rich data generation.
- **Frontend**: Deploying with UI overflow fixes (`min-w-0`).
- **Data**: `seed_demo.py` now generates:
    - `student@test.com` / `teacher@test.com`
    - Research Theme & Linked Teacher
    - 15+ Reports with `ReportAbility` (Critical for Charts)
    - Varied Ability Scores (Critical for Radar/Scatter)

## Proposed Changes
### Backend
#### [NEW] [seed_demo.py](file:///Users/tatsuki/Documents/Workspace/tech0_AInamai/backend/app/db/seed_demo.py)
- Comprehensive seeder replacing `create_test_users.py`.
- Generates Users, Profiles, Research Themes, Reports, and Report-Ability links.

#### [MODIFY] [requirements.txt](file:///Users/tatsuki/Documents/Workspace/tech0_AInamai/backend/requirements.txt)
- Added `greenlet` to fix Azure async SQLAlchemy error.

#### [MODIFY] [startup.sh](file:///Users/tatsuki/Documents/Workspace/tech0_AInamai/backend/startup.sh)
- Updated to run `app.db.seed_demo`.

### Frontend
#### [MODIFY] [TeacherDashboard.tsx](file:///Users/tatsuki/Documents/Workspace/tech0_AInamai/frontend/src/features/teacher/TeacherDashboard.tsx)
- Fixed text overflow in student list using `min-w-0` and `shrink-0`.

## Verification Plan
1. **Teacher Dashboard**: Verify Scatter Plot and Radar Chart display data (no longer "Data insufficient" or empty).
2. **Student Calendar**: Verify calendar shows reports (fixing "0 records" issue).
3. **Report Submission**: Create a NEW report and verify it increments the count.

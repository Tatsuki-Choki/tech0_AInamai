# Claude Code Project Rules

## Development Rules

### API Testing Before Frontend Implementation
When implementing or fixing API endpoints:
1. **Always test the backend endpoint first** using curl or similar tools before making frontend changes
2. Verify the response format and data structure matches expectations
3. Test error cases and edge cases
4. Only proceed with frontend implementation after backend is confirmed working

Example curl test:
```bash
# Start backend server first
cd backend && uvicorn app.main:app --reload --port 8000

# Test endpoint (in another terminal)
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "テストメッセージ"}'
```

### Code Quality
- Run linting and type checks before committing
- Use proper logging instead of print statements
- Follow existing code patterns and conventions

### Security
- Never commit secrets or API keys
- Validate all user inputs
- Use proper authentication checks

### Timezone Handling (Japan Standard Time)
This application is designed for Japanese users (JST, UTC+9).
- **Backend**: Store all timestamps in UTC, use `datetime.utcnow()` for storage
- **Backend**: Use JST for date-based business logic (e.g., streak calculations)
  - Use `get_jst_today()` in `reports.py` for date calculations
- **Frontend**: Convert UTC timestamps to JST for display
  - Use utilities from `src/lib/timezone.ts`
  - `toJSTDateString()` for date grouping
  - `formatJSTDateTime()` for formatted display

## Project Structure
- `/backend` - FastAPI backend with Python
- `/frontend` - React frontend with TypeScript
- `/docs` - Documentation

## Common Commands

### Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

### Database
```bash
cd backend
alembic upgrade head  # Run migrations
```

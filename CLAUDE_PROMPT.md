# Deployment Task for AI Assistant

## Context
I have a Next.js frontend + Express backend application called Caelith that needs to be deployed to Railway. The frontend is already deployed and working at https://www.caelith.tech (f1xc8s3n.up.railway.app), but the backend API is missing, causing "Failed to fetch" errors.

## Current Status
- ✅ Local development works perfectly (localhost:3000)
- ✅ Backend code is fixed and builds successfully
- ✅ Code is committed and pushed to GitHub (repo: julianlaycock/caelith)
- ❌ Production backend not deployed on Railway
- ❌ Production login fails with "Failed to fetch"

## Project Location
C:\Users\julia\projects\private-asset-registry_Caelith_v2

## Railway Account
- Email: julianlaycock94@gmail.com
- Password: Gapesalu46020@
- Project: Already exists with frontend deployed

## What Needs to Be Done

Deploy the backend service to Railway with these exact specifications:

### 1. Add PostgreSQL Database
- Service: PostgreSQL (latest version)
- Railway will auto-generate DATABASE_URL

### 2. Deploy Backend Service
- Source: GitHub repo "julianlaycock/caelith"
- Branch: main
- Build Command: `npm run build:backend`
- Start Command: `npm run start:backend`
- Root Directory: `/` (project root)

### 3. Environment Variables for Backend Service

Required variables:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-in-production-min-32-chars-long
CORS_ORIGINS=https://www.caelith.tech,https://f1xc8s3n.up.railway.app
DATABASE_URL=(copy from PostgreSQL service Connection URL)
ANTHROPIC_API_KEY=(read from .env file in project directory)
OPENAI_API_KEY=(read from .env file in project directory)
```

The .env file is located at:
`C:\Users\julia\projects\private-asset-registry_Caelith_v2\.env`

### 4. Update Frontend Service Variables

After backend is deployed and you have the backend Railway URL, update the existing frontend service (f1xc8s3n.up.railway.app) with these variables:

```
NEXT_PUBLIC_API_URL=/api
BACKEND_API_REWRITE_TARGET=https://<backend-railway-url>/api
NEXT_PUBLIC_SSR_API_URL=https://<backend-railway-url>/api
```

Replace `<backend-railway-url>` with the actual Railway domain assigned to the backend service.

### 5. Redeploy Frontend

After updating frontend environment variables, trigger a redeploy of the frontend service.

## Success Criteria

1. Backend service shows "Active" status in Railway
2. Backend health endpoint responds: `https://<backend-url>/health`
3. Frontend can successfully call backend API
4. Login works at https://www.caelith.tech/login with credentials:
   - Email: admin@caelith.com
   - Password: Admin1234

## Testing

Test the deployment with this command:
```bash
curl -X POST https://www.caelith.tech/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@caelith.com","password":"Admin1234"}'
```

Expected response: JSON with user object and JWT token.

## Important Notes

- Backend builds successfully locally (already verified)
- All TypeScript errors have been fixed
- package.json has the correct start scripts
- Railway.toml configuration file exists in project root
- Database migrations will run automatically on first start
- The admin user is already seeded in the database

## Files Available for Reference

- `DEPLOY_TO_RAILWAY.md` - Detailed deployment guide
- `EXACT_STEPS.md` - Step-by-step manual instructions
- `DO_THIS_NOW.txt` - Quick reference checklist
- `railway.toml` - Railway configuration
- `LOGIN_CREDENTIALS.md` - Credentials reference

## If Railway CLI Approach

If using Railway CLI (requires API token):
1. Login: `railway login --browserless` (needs token from https://railway.app/account/tokens)
2. Link: `railway link` (select Caelith project)
3. Add PostgreSQL: `railway add --database postgres`
4. Set variables: `railway variables set KEY=VALUE`
5. Deploy: `railway up`

## If Dashboard Approach

Use Railway web dashboard at https://railway.app - follow the manual steps in DO_THIS_NOW.txt or EXACT_STEPS.md.

## Expected Timeline

- PostgreSQL provisioning: ~30 seconds
- Backend build & deploy: ~2-3 minutes
- Frontend redeploy: ~1-2 minutes
- **Total: ~5 minutes**

## Deliverable

Confirm when deployment is complete and login is working at https://www.caelith.tech/login

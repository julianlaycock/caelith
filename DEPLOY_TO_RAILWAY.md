# Deploy Caelith Backend to Railway - Step by Step

## Quick Setup (5 minutes)

### Option 1: Using Railway Dashboard (Simplest)

#### Step 1: Get Railway API Token
1. Open: https://railway.app/account/tokens
2. Login with: julianlaycock94@gmail.com
3. Click **"Create Token"**
4. Name it: "Caelith Deployment"
5. Copy the token (you'll only see it once)

#### Step 2: Set Token in CLI
```bash
# Paste your token when prompted
railway login --browserless
```

Or set it directly:
```bash
set RAILWAY_TOKEN=<your-token-here>
```

#### Step 3: Link to Your Project
```bash
cd C:\Users\julia\projects\private-asset-registry_Caelith_v2
railway link
```
Select your existing Caelith project from the list.

#### Step 4: Add PostgreSQL Database
```bash
railway add --database postgres
```

#### Step 5: Deploy Backend
```bash
# Build backend
npm run build:backend

# Deploy
railway up
```

#### Step 6: Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set JWT_SECRET=change-this-in-production-min-32-chars-long
railway variables set CORS_ORIGINS=https://www.caelith.tech,https://f1xc8s3n.up.railway.app
railway variables set ANTHROPIC_API_KEY=<copy-from-.env>
railway variables set OPENAI_API_KEY=<copy-from-.env>
```

Get DATABASE_URL from Railway:
```bash
railway variables get DATABASE_URL
```

Then set it in your backend service.

#### Step 7: Run Migrations
```bash
railway run npm run migrate
railway run npm run seed
```

---

### Option 2: Manual Dashboard Setup (No CLI needed)

#### 1. Login to Railway
- Go to: https://railway.app/login
- Email: julianlaycock94@gmail.com
- Password: Gapesalu46020@

#### 2. Find Your Caelith Project
- Click on your project in the dashboard

#### 3. Add PostgreSQL
- Click **"+ New"**
- Select **"Database"** → **"PostgreSQL"**
- Wait for it to provision (~30 seconds)

#### 4. Add Backend Service
- Click **"+ New"** again
- Select **"GitHub Repo"**
- Choose your caelith repository
- Railway will auto-detect it's a Node.js project

#### 5. Configure Backend Service
Click on the new backend service, then:

**Settings → Build:**
- Build Command: `npm run build:backend`
- Start Command: `npm run start:backend`

**Settings → Variables:**
Add these one by one:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-in-production-min-32-chars-long
CORS_ORIGINS=https://www.caelith.tech,https://f1xc8s3n.up.railway.app
ANTHROPIC_API_KEY=<your-anthropic-key>
OPENAI_API_KEY=<your-openai-key>
```

**For DATABASE_URL:**
- Click on the PostgreSQL service
- Go to **"Connect"** tab
- Copy the **"Postgres Connection URL"**
- Go back to backend service → Variables
- Add: `DATABASE_URL=<paste-the-url>`

#### 6. Deploy
- Click **"Deploy"** button
- Wait 2-3 minutes for build to complete

#### 7. Update Frontend Service
- Click on your frontend service (the one running at f1xc8s3n.up.railway.app)
- Go to **"Variables"**
- Update/Add:
```
NEXT_PUBLIC_API_URL=/api
BACKEND_API_REWRITE_TARGET=https://<your-backend-url>/api
```

To find your backend URL:
- Click backend service → "Settings" → "Domains"
- Copy the Railway-provided URL (something like `xxx.up.railway.app`)

- Click **"Redeploy"**

#### 8. Test
```bash
curl https://www.caelith.tech/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@caelith.com","password":"Admin1234"}'
```

Should return a JWT token.

---

## Troubleshooting

**If backend won't start:**
- Check logs: Click service → "Deployments" → Latest → "View Logs"
- Common issues:
  - Missing DATABASE_URL
  - Wrong build/start commands
  - Node version mismatch

**If frontend can't reach backend:**
- Verify BACKEND_API_REWRITE_TARGET matches backend URL exactly
- Check CORS_ORIGINS includes frontend domain
- Ensure backend health endpoint works: `curl <backend-url>/health`

---

## Success Checklist
- [ ] PostgreSQL database running
- [ ] Backend service deployed and healthy
- [ ] Frontend service redeployed with correct env vars
- [ ] Login works at www.caelith.tech
- [ ] API returns 200 OK for `/api/auth/login`

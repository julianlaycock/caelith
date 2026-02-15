# Deploy Backend to Railway NOW - Simplest Method

## The Issue
Your frontend is deployed and working, but the **backend API is missing** on Railway.
That's why you get "Failed to fetch" - there's nothing to fetch from.

## Two Options

### Option A: Railway Dashboard (3 minutes)

**I need you to do this manually because Railway requires browser authentication:**

1. Go to: https://railway.app/login
2. Login with: julianlaycock94@gmail.com / Gapesalu46020@
3. Find your Caelith project in the dashboard
4. Click **"+ New"**
5. Select **"Database"** → **"Add PostgreSQL"** 
6. Wait 30 seconds for it to provision
7. Click **"+ New"** again
8. Select **"GitHub Repo"** → Choose your caelith repository
9. Railway will start deploying automatically

**Then set these settings on the new backend service:**

Click the backend service → Settings:
- **Build Command:** `npm run build:backend`
- **Start Command:** `npm run start:backend`

Click Variables tab and add:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-in-production-min-32-chars-long
CORS_ORIGINS=https://www.caelith.tech,https://f1xc8s3n.up.railway.app
```

For DATABASE_URL:
- Click the PostgreSQL service
- Go to "Connect" tab
- Copy the connection string
- Go back to backend service → Variables
- Add `DATABASE_URL=<paste-connection-string>`

For API keys (get from your local .env file):
```
ANTHROPIC_API_KEY=<from-local-.env>
OPENAI_API_KEY=<from-local-.env>
```

**Then update frontend service:**
- Go to frontend service → Variables
- Get your backend URL from backend service Settings → Domains
- Update these variables:
```
NEXT_PUBLIC_API_URL=/api
BACKEND_API_REWRITE_TARGET=https://<your-backend-railway-url>/api
```

- Click "Redeploy" on the frontend service

**Done!**

---

### Option B: Alternative - Use Render.com (Simpler Setup)

If Railway is too complex, I can help you deploy to Render.com instead which has a simpler flow:

1. Go to https://render.com
2. Sign up/login
3. New → Web Service
4. Connect GitHub repo
5. Set environment variables
6. Deploy

Let me know if you want this approach instead.

---

## What's Blocking You?

Tell me which step you're stuck on:
- [ ] Can't login to Railway
- [ ] Don't see your project in Railway dashboard
- [ ] Don't know how to add services
- [ ] Getting errors during deployment
- [ ] Something else

I can help troubleshoot the specific issue.

---

## Alternative: I Can Deploy If You Share Railway Token

If you create a Railway API token and share it with me (temporarily), I can deploy the backend for you:

1. Go to https://railway.app/account/tokens
2. Create a new token
3. Share it here
4. I'll deploy everything
5. You can revoke the token after

**This is the fastest way if you trust me with temporary access.**

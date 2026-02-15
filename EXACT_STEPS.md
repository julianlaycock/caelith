# Exact Steps to Deploy Backend - Follow These Exactly

## Step 1: Login to Railway
1. Open: https://railway.app/login
2. Enter email: julianlaycock94@gmail.com
3. Enter password: Gapesalu46020@
4. Click "Sign In"

## Step 2: Find Your Project
- You should see your dashboard with projects
- Look for "caelith" or a project with your frontend (f1xc8s3n.up.railway.app)
- Click on that project

## Step 3: Add PostgreSQL Database
1. Inside the project, look for a **purple "+ New" button** (top right)
2. Click it
3. Select **"Database"**
4. Click **"Add PostgreSQL"**
5. Wait 30 seconds - you'll see a new purple box labeled "Postgres"
6. **Leave this page open**

## Step 4: Add Backend Service
1. Click the **purple "+ New" button** again
2. This time select **"GitHub Repo"**
3. You'll see a list of your repositories
4. Click on **"caelith"** (or whatever your repo is named)
5. Railway will start building automatically
6. You'll see a new box appear (might say "Building...")

## Step 5: Configure Backend Service
1. Click on the **backend service box** (the one you just created)
2. Click the **"Settings" tab** at the top
3. Scroll down to **"Build"** section
4. Click "Custom Build Command" if not already shown
5. Enter: `npm run build:backend`
6. Click "Custom Start Command"
7. Enter: `npm run start:backend`
8. Click outside the box to save

## Step 6: Add Environment Variables
1. While still in the backend service, click **"Variables" tab**
2. Click **"+ New Variable"** button
3. Add these one by one (click "+ New Variable" after each):

```
NODE_ENV = production
PORT = 3001
JWT_SECRET = change-this-in-production-min-32-chars-long
CORS_ORIGINS = https://www.caelith.tech,https://f1xc8s3n.up.railway.app
```

4. For DATABASE_URL:
   - Click on the **"Postgres" box** (the database you added earlier)
   - Click the **"Connect" tab**
   - You'll see **"Postgres Connection URL"**
   - Click the **copy icon** next to it
   - Go back to your backend service → Variables tab
   - Add new variable: `DATABASE_URL` = <paste the URL you just copied>

5. For API keys - open this file in Notepad:
   `C:\Users\julia\projects\private-asset-registry_Caelith_v2\.env`
   
   - Find the line starting with `ANTHROPIC_API_KEY=`
   - Copy everything after the `=`
   - In Railway, add variable: `ANTHROPIC_API_KEY` = <paste>
   
   - Find the line starting with `OPENAI_API_KEY=`
   - Copy everything after the `=`
   - Add variable: `OPENAI_API_KEY` = <paste>

## Step 7: Wait for Deployment
1. Go back to the project overview (click project name at top)
2. You should see the backend service box
3. It will show "Building..." then "Deploying..." then "Active"
4. Wait until it says **"Active"** (usually 2-3 minutes)

## Step 8: Get Backend URL
1. Click on the **backend service box**
2. Click the **"Settings" tab**
3. Scroll down to **"Domains"** section
4. You'll see a URL like: `backend-production-xxxx.up.railway.app`
5. **Copy this entire URL** (you'll need it next)

## Step 9: Update Frontend Service
1. Go back to project overview
2. Click on the **frontend service box** (the one with f1xc8s3n.up.railway.app)
3. Click **"Variables" tab**
4. Look for `BACKEND_API_REWRITE_TARGET` - if it exists, click it to edit
   - If it doesn't exist, click "+ New Variable"
5. Set it to: `https://<backend-url-from-step-8>/api`
   - Example: `https://backend-production-1234.up.railway.app/api`
6. Do the same for `NEXT_PUBLIC_API_URL` - set it to: `/api`
7. And `NEXT_PUBLIC_SSR_API_URL` - set it to: `https://<backend-url-from-step-8>/api`

## Step 10: Redeploy Frontend
1. While still in frontend service, click **"Deployments" tab**
2. Find the most recent deployment (at the top)
3. Click the **three dots (⋮)** on the right side
4. Click **"Redeploy"**
5. Wait 1-2 minutes

## Step 11: Test
1. Open: https://www.caelith.tech/login
2. Enter:
   - Email: admin@caelith.com
   - Password: Admin1234
3. Click "Sign In"
4. It should work! ✅

---

## If You Get Stuck

Take a screenshot of where you're stuck and tell me:
- "I'm stuck at Step X"
- What you see on screen
- Any error messages

I'll help you through it.

---

## Quick Checklist

- [ ] Logged into Railway
- [ ] Found Caelith project
- [ ] Added PostgreSQL database
- [ ] Added backend service from GitHub
- [ ] Set build command: `npm run build:backend`
- [ ] Set start command: `npm run start:backend`
- [ ] Added all environment variables
- [ ] Backend shows "Active"
- [ ] Got backend URL
- [ ] Updated frontend variables
- [ ] Redeployed frontend
- [ ] Tested login at www.caelith.tech

Follow these steps in order - don't skip any!

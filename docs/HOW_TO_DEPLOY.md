# Deploy AI Judge — Full Guide

## Step 1: Get Free API Keys

### Groq (Primary AI) — FREE forever
1. console.groq.com → Sign up with Google
2. API Keys → Create Key
3. Key starts with: gsk_...

### Gemini (Backup AI) — FREE forever
1. aistudio.google.com → Sign in with Google
2. Get API Key → Create
3. Key starts with: AIza...

### MongoDB Atlas (Database) — FREE forever
1. cloud.mongodb.com → Create free account
2. New Project → Create Cluster (M0 Free)
3. Connect → Drivers → Copy URI

## Step 2: Run Locally

### Terminal 1 — Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your keys
python app.py
# Runs at http://localhost:5000

### Terminal 2 — Frontend
cd frontend
npm install
echo REACT_APP_API_URL=http://localhost:5000/api > .env.local
npm start
# Opens http://localhost:3000

## Step 3: Deploy Backend to Render.com (FREE)
1. Push project to GitHub
2. render.com → New → Web Service
3. Connect GitHub repo → Root Directory: backend
4. Build: pip install -r requirements.txt
5. Start: gunicorn app:app
6. Add Environment Variables from .env
7. Deploy → Get URL: https://ai-judge-api.onrender.com

## Step 4: Deploy Frontend to Vercel (FREE)
1. vercel.com → New Project → Import GitHub repo
2. Root Directory: frontend
3. Add env var:
   REACT_APP_API_URL = https://ai-judge-api.onrender.com/api
4. Deploy → Get URL: https://ai-judge.vercel.app

## Done! Your live website is ready.

## .env File Template
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aijudge
JWT_SECRET=any-random-long-string-here-min-32-chars
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://ai-judge.vercel.app
PORT=5000

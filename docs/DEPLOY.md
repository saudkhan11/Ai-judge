# AI Judge v4 Final — Deploy in 10 Minutes

## Step 1: Get free API keys (5 mins)
- Groq:   console.groq.com   → Sign up → API Keys → Create → copy gsk_xxx
- Gemini: aistudio.google.com → Sign in → Get API Key → copy AIza...
- Mongo:  cloud.mongodb.com   → Free cluster → Connect → copy URI

## Step 2: Fill .env (backend/.env)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aijudge
JWT_SECRET=any-random-string-min-32-chars
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://your-app.vercel.app
PORT=5000

## Step 3: Run locally
Terminal 1:  cd backend && pip install -r requirements.txt && python app.py
Terminal 2:  cd frontend && npm install && echo REACT_APP_API_URL=http://localhost:5000/api > .env.local && npm start

## Step 4: Deploy backend to Render.com (free)
1. Push to GitHub
2. render.com → New Web Service → connect repo
3. Root: backend | Build: pip install -r requirements.txt | Start: gunicorn app:app
4. Add all env vars → Deploy → get https://ai-judge-api.onrender.com

## Step 5: Deploy frontend to Vercel (free)
1. vercel.com → New Project → import repo
2. Root: frontend
3. Env var: REACT_APP_API_URL=https://ai-judge-api.onrender.com/api
4. Deploy → get https://ai-judge.vercel.app

Done! Live website running.

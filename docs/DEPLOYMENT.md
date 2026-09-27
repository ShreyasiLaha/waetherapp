# Deployment Guide — RituGrid Production & Cloud Hosting

This document details how to host RituGrid on 100% free-tier cloud platforms for hackathon demonstration.

---

## Architecture Overview
- **Backend Serving Layer**: FastAPI (`src/api.py`) running via Uvicorn.
- **Frontend Dashboard**: High-density HTML5 + Leaflet.js command center mounted directly at `/dashboard/` (or `/`).
- **Data & Models**: Pre-computed NetCDF outputs and scikit-learn models bundled in repository or mounted volume.

---

## Option 1: Render.com (Recommended Free Hosting)
1. Fork or push repository to GitHub.
2. Sign in to [Render.com](https://render.com) (free tier).
3. Click **New +** $\to$ **Web Service** $\to$ Connect your GitHub repo (`ShreyasiLaha/waetherapp`).
4. Configure service:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn src.api:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Click **Create Web Service**. Once deployed, access:
   - Dashboard: `https://<your-render-subdomain>.onrender.com/dashboard/`
   - API Docs: `https://<your-render-subdomain>.onrender.com/docs`

---

## Option 2: Docker Container (Any VPS or Cloud Provider)
```bash
# 1. Build image
docker build -t ritugrid:latest .

# 2. Run container
docker run -d -p 8000:8000 --name ritugrid-app ritugrid:latest

# 3. Verify health
curl http://localhost:8000/health
```

---

## Option 3: Local Offline / On-Premises NCMRWF Demonstration
For offline or on-premises presentation without internet dependency:
```bash
# 1. Start backend server
python scripts/serve_api.py

# 2. Open dashboard in any browser
# http://127.0.0.1:8000/dashboard/
# or open dashboard/index.html directly
```

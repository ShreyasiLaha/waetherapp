"""
RituGrid — API Server Launcher
scripts/serve_api.py

Starts the FastAPI backend on port 8000.
Usage:
  python scripts/serve_api.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn

if __name__ == "__main__":
    print("Starting RituGrid API server at http://127.0.0.1:8000")
    print("Docs available at http://127.0.0.1:8000/docs")
    uvicorn.run(
        "src.api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )

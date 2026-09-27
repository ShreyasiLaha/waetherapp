"""
RituGrid Phase 2 — Training Orchestrator
Trains blending models for all variables then runs batch inference.
Single entry point for Phase 2.
"""
import sys
import logging
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.blending_model import train_blender
from src.config import VARIABLES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("RITUGRID PHASE 2 — TRAINING ALL BLENDING MODELS")
    log.info("Loss function: Quantile (alpha=0.90) — penalises extreme under-prediction")
    log.info("=" * 60)
    for var in VARIABLES:
        train_blender(var)
    log.info("All blending models trained and saved to /models/")

"""
RituGrid Adaptive Blending Model
Trains per-variable, per-lead-time-aware gradient-boosted blending model.
Uses quantile loss (pinball loss) at 90th & 95th percentile to penalise
under-prediction of extreme values — mandated by Rules.md §3 and TRD.md §4.

Architecture:
  Input  → [model_nwp1_value, model_nwp2_value, model_ai1_value,
             cross_model_variance, day_of_year, lead_time_hours, lat, lon]
  Output → blended_value (regression), weights extracted via SHAP-style attribution
"""
import logging
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

from src.config import (
    FEATURES_DIR,
    MODELS_DIR,
    SOURCE_MODELS,
    VARIABLES,
    LEAD_TIMES,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

FEATURE_COLS = [
    "model_nwp1_value",
    "model_nwp2_value",
    "model_ai1_value",
    "cross_model_variance",
    "day_of_year",
    "lead_time_hours",
    "lat",
    "lon",
]
TARGET_COL = "truth_value"


def pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, quantile: float) -> float:
    """Pinball (quantile) loss for monitoring — TRD.md §4."""
    diff = y_true - y_pred
    return float(np.mean(np.where(diff >= 0, quantile * diff, (quantile - 1) * diff)))


def make_pipeline(var_name: str) -> Pipeline:
    """
    Build sklearn Pipeline with StandardScaler + GradientBoostingRegressor.
    Loss='quantile' at alpha=0.90 penalises under-prediction of extremes — explicitly
    fulfils the prohibition on plain MSE/L2 loss in Rules.md §3 / TRD.md §4.
    """
    # Use quantile loss — explicitly NOT squared_error (MSE) per Rules.md §3
    gbr = GradientBoostingRegressor(
        loss="quantile",
        alpha=0.90,           # 90th-percentile → heavy penalty on under-prediction
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        min_samples_leaf=20,
        random_state=42,
    )
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", gbr),
    ])
    return pipeline


def fill_missing_models(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fallback: If a model column is all-NaN (simulated feed outage),
    fill with mean of available models so training still works.
    Weight redistribution at inference time is handled by serving layer (Rules.md §6).
    """
    model_cols = ["model_nwp1_value", "model_nwp2_value", "model_ai1_value"]
    for col in model_cols:
        if df[col].isna().all():
            other_cols = [c for c in model_cols if c != col]
            df[col] = df[other_cols].mean(axis=1)
        else:
            df[col] = df[col].fillna(df[model_cols].mean(axis=1))
    return df


def derive_weights(
    df_row: pd.Series,
    pipeline: Pipeline,
    var_name: str,
) -> dict[str, float]:
    """
    Derive per-model weights for a single grid cell by perturbing each model's
    contribution. This is a lightweight sensitivity-based attribution:
    hold all models at their value, then zero-out each model and measure
    the drop in predicted value relative to total range.
    """
    base_features = df_row[FEATURE_COLS].values.reshape(1, -1)
    base_pred = pipeline.predict(base_features)[0]

    contributions = {}
    for model_id, col in zip(SOURCE_MODELS, ["model_nwp1_value", "model_nwp2_value", "model_ai1_value"]):
        perturbed = base_features.copy()
        col_idx = FEATURE_COLS.index(col)
        perturbed[0, col_idx] = 0.0  # zero-out this model
        perturbed_pred = pipeline.predict(perturbed)[0]
        contributions[model_id] = abs(base_pred - perturbed_pred)

    total = sum(contributions.values())
    if total < 1e-9:
        # Equal weights fallback
        return {m: 1.0 / len(SOURCE_MODELS) for m in SOURCE_MODELS}

    return {m: contributions[m] / total for m in SOURCE_MODELS}


def train_blender(var_name: str) -> Pipeline | None:
    """
    Train the adaptive blending model for a given variable.
    Returns the trained pipeline or None on failure.
    """
    feat_path = FEATURES_DIR / f"features_{var_name}.parquet"
    if not feat_path.exists():
        log.error("features_%s.parquet not found. Run build_features.py first.", var_name)
        return None

    log.info("Training blending model for variable: %s", var_name)
    df = pd.read_parquet(feat_path)
    df = fill_missing_models(df)

    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df[TARGET_COL].values.astype(np.float32)

    # Stratified split keeping temporal integrity — use last date as holdout
    last_date = df["date"].max()
    test_mask = df["date"] == last_date
    X_train, y_train = X[~test_mask], y[~test_mask]
    X_test,  y_test  = X[test_mask],  y[test_mask]

    pipeline = make_pipeline(var_name)
    pipeline.fit(X_train, y_train)

    # ── Skill evaluation ──────────────────────────────────────────────────
    y_pred = pipeline.predict(X_test)
    rmse   = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    pb90   = pinball_loss(y_test, y_pred, 0.90)
    pb95   = pinball_loss(y_test, y_pred, 0.95)

    # Also compute individual model RMSEs as baseline comparison
    rmse_nwp1 = float(np.sqrt(mean_squared_error(y_test, X_test[:, 0])))
    rmse_nwp2 = float(np.sqrt(mean_squared_error(y_test, X_test[:, 1])))
    rmse_ai1  = float(np.sqrt(mean_squared_error(y_test, X_test[:, 2])))

    log.info("  Blended RMSE     : %.4f  (Pinball@90: %.4f  Pinball@95: %.4f)", rmse, pb90, pb95)
    log.info("  NWP1 (baseline)  : %.4f", rmse_nwp1)
    log.info("  NWP2 (baseline)  : %.4f", rmse_nwp2)
    log.info("  AI1  (baseline)  : %.4f", rmse_ai1)

    best_baseline = min(rmse_nwp1, rmse_nwp2, rmse_ai1)
    if rmse < best_baseline:
        log.info("  [PASS] Blended RMSE beats best individual model by %.4f", best_baseline - rmse)
    else:
        log.warning("  [WARN] Blended RMSE (%.4f) does not yet beat best baseline (%.4f). Tuning needed.", rmse, best_baseline)

    # ── Save model ────────────────────────────────────────────────────────
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / f"blender_{var_name}_v1.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)
    log.info("[OK] Saved model: %s", model_path.name)

    return pipeline

"""
Train ML models on synthetic city history and persist to disk.
- Forecast model:  GradientBoostingRegressor per (zone, metric)
                   features: lag1, lag2, lag3, lag24, hour, dow, is_weekend,
                             temp, humidity, wind
- Anomaly model:   IsolationForest per metric_type
- City score:      RandomForestRegressor over per-metric severity weights
"""
from __future__ import annotations
import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest, RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from data_generator import (
    generate_history, add_severity, ZONES, METRICS, SEVERITY_WEIGHT
)

ARTIFACT_DIR = Path(__file__).parent / "artifacts"
ARTIFACT_DIR.mkdir(exist_ok=True)


def build_supervised(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["zone_id", "metric_type", "ts"]).copy()
    df["lag1"] = df.groupby(["zone_id", "metric_type"])["value"].shift(1)
    df["lag2"] = df.groupby(["zone_id", "metric_type"])["value"].shift(2)
    df["lag3"] = df.groupby(["zone_id", "metric_type"])["value"].shift(3)
    df["lag24"] = df.groupby(["zone_id", "metric_type"])["value"].shift(24)
    df["roll6"] = df.groupby(["zone_id", "metric_type"])["value"].shift(1).rolling(6).mean().reset_index(0, drop=True)
    df = df.dropna()
    return df


def train_forecast(df: pd.DataFrame) -> dict:
    df = build_supervised(df)
    feats = ["lag1", "lag2", "lag3", "lag24", "roll6", "hour", "dow", "is_weekend", "temp_c", "humidity", "wind_ms"]
    models = {}
    metrics_report = {}
    for zone in ZONES:
        for metric in METRICS:
            sub = df[(df.zone_id == zone) & (df.metric_type == metric)]
            if len(sub) < 100:
                continue
            split = int(len(sub) * 0.85)
            train, test = sub.iloc[:split], sub.iloc[split:]
            X_train, y_train = train[feats].values, train["value"].values
            X_test, y_test = test[feats].values, test["value"].values
            mdl = GradientBoostingRegressor(
                n_estimators=120, max_depth=3, learning_rate=0.08, random_state=0
            )
            mdl.fit(X_train, y_train)
            pred = mdl.predict(X_test)
            mae = float(mean_absolute_error(y_test, pred))
            mape = float(np.mean(np.abs((y_test - pred) / np.maximum(y_test, 1e-3))) * 100)
            key = f"{zone}__{metric}"
            models[key] = mdl
            metrics_report[key] = {"mae": round(mae, 3), "mape": round(mape, 2), "n_train": int(len(train))}
    joblib.dump({"models": models, "features": feats}, ARTIFACT_DIR / "forecast.joblib")
    return metrics_report


def train_anomaly(df: pd.DataFrame) -> dict:
    feats = ["value", "hour", "dow", "temp_c", "humidity", "wind_ms"]
    detectors = {}
    report = {}
    for metric in METRICS:
        sub = df[df.metric_type == metric]
        if len(sub) < 100:
            continue
        clf = IsolationForest(
            n_estimators=120, contamination=0.02, random_state=0
        )
        clf.fit(sub[feats].values)
        scores = clf.score_samples(sub[feats].values)
        threshold = float(np.quantile(scores, 0.02))
        detectors[metric] = clf
        report[metric] = {"n_train": int(len(sub)), "score_threshold": round(threshold, 4)}
    joblib.dump({"detectors": detectors, "features": feats}, ARTIFACT_DIR / "anomaly.joblib")
    return report


def train_city_score(df: pd.DataFrame) -> dict:
    df = add_severity(df)
    pivot = (
        df.groupby(["ts", "zone_id", "metric_type"])["severity_w"]
        .mean().reset_index()
        .pivot_table(index="ts", columns=["zone_id", "metric_type"], values="severity_w")
        .fillna(30.0)
    )
    pivot.columns = [f"{z}_{m}" for z, m in pivot.columns]
    target = 100 - pivot.mean(axis=1)
    X = pivot.values
    y = target.values
    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    mdl = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=0, n_jobs=-1)
    mdl.fit(X_train, y_train)
    pred = mdl.predict(X_test)
    mae = float(mean_absolute_error(y_test, pred))
    joblib.dump(
        {"model": mdl, "feature_order": list(pivot.columns)},
        ARTIFACT_DIR / "city_score.joblib"
    )
    return {"mae": round(mae, 3), "features": len(pivot.columns), "rows": len(X)}


def main():
    print("[train] generating synthetic history…")
    df = generate_history(days=30, seed=42)
    print(f"[train] history rows: {len(df):,}")
    print("[train] training forecast models…")
    f_report = train_forecast(df)
    print(f"[train] trained {len(f_report)} per-(zone,metric) forecasters")
    print("[train] training anomaly detectors…")
    a_report = train_anomaly(df)
    print("[train] training city score regressor…")
    s_report = train_city_score(df)
    summary = {
        "trained_at": pd.Timestamp.utcnow().isoformat(),
        "rows": int(len(df)),
        "forecast_avg_mape": round(
            float(np.mean([v["mape"] for v in f_report.values()])), 2
        ),
        "forecast_avg_mae": round(
            float(np.mean([v["mae"] for v in f_report.values()])), 3
        ),
        "city_score": s_report,
        "anomaly": a_report,
        "n_forecasters": len(f_report),
    }
    with open(ARTIFACT_DIR / "training_summary.json", "w") as fh:
        json.dump(summary, fh, indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

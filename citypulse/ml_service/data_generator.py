"""
Synthetic historical data generator for training city metric models.
Generates 30 days of hourly data per (zone, metric_type) with realistic
diurnal patterns, weekly seasonality, weather coupling, and noise.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

ZONES = ["north", "south", "east", "west", "central"]
METRICS = ["traffic", "energy", "air", "water", "waste", "transport"]

ZONE_BIAS = {
    "north": 1.05,
    "south": 0.85,
    "east": 1.20,
    "west": 0.80,
    "central": 1.30,
}

METRIC_BASE = {
    "traffic": 55.0,
    "energy": 320.0,
    "air": 110.0,
    "water": 55.0,
    "waste": 55.0,
    "transport": 60.0,
}

METRIC_AMP = {
    "traffic": 35.0,
    "energy": 180.0,
    "air": 70.0,
    "water": 25.0,
    "waste": 30.0,
    "transport": 35.0,
}


def _diurnal(hour: int, metric: str) -> float:
    if metric == "traffic" or metric == "transport":
        am = np.exp(-((hour - 9) ** 2) / 6.0)
        pm = np.exp(-((hour - 19) ** 2) / 8.0)
        return 0.4 + 0.9 * (am + pm)
    if metric == "energy":
        evening = np.exp(-((hour - 20) ** 2) / 14.0)
        midday = 0.4 * np.exp(-((hour - 14) ** 2) / 30.0)
        return 0.5 + 0.9 * (evening + midday)
    if metric == "air":
        morning = np.exp(-((hour - 9) ** 2) / 8.0)
        evening = np.exp(-((hour - 21) ** 2) / 12.0)
        return 0.5 + 0.7 * (morning + evening)
    if metric == "water":
        morning = np.exp(-((hour - 7) ** 2) / 4.0)
        evening = np.exp(-((hour - 19) ** 2) / 5.0)
        return 1.2 - 0.4 * (morning + evening)
    if metric == "waste":
        return 0.6 + 0.02 * hour
    return 1.0


def generate_history(days: int = 30, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    end = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    hours = pd.date_range(start, end, freq="h", inclusive="left")

    rows = []
    for zone in ZONES:
        for metric in METRICS:
            base = METRIC_BASE[metric] * ZONE_BIAS[zone]
            amp = METRIC_AMP[metric]
            for ts in hours:
                h = ts.hour
                dow = ts.weekday()
                weekday_factor = 0.85 if dow >= 5 else 1.0
                seasonal = _diurnal(h, metric)
                weather_temp = 22 + 8 * np.sin(2 * np.pi * (h - 14) / 24) + rng.normal(0, 1.2)
                weather_humidity = 60 + 20 * np.cos(2 * np.pi * h / 24) + rng.normal(0, 3)
                weather_wind = max(0.5, 3 + rng.normal(0, 1.5))
                noise = rng.normal(0, amp * 0.07)
                value = base * weekday_factor * seasonal + noise
                if metric == "air":
                    value += max(0, (weather_humidity - 60)) * 0.4
                    value -= weather_wind * 1.5
                if metric == "energy":
                    value += max(0, weather_temp - 28) * 6.0
                if metric == "water":
                    value -= max(0, weather_temp - 30) * 0.4
                value = max(1.0, value)
                rows.append({
                    "ts": ts,
                    "zone_id": zone,
                    "metric_type": metric,
                    "value": float(value),
                    "hour": h,
                    "dow": dow,
                    "is_weekend": int(dow >= 5),
                    "temp_c": float(weather_temp),
                    "humidity": float(weather_humidity),
                    "wind_ms": float(weather_wind),
                })
    df = pd.DataFrame(rows)

    n_anomalies = int(0.005 * len(df))
    idx = rng.choice(len(df), n_anomalies, replace=False)
    df.loc[idx, "value"] *= rng.uniform(2.0, 3.5, n_anomalies)
    df["is_anomaly"] = 0
    df.loc[idx, "is_anomaly"] = 1
    return df


def severity_from_value(metric: str, v: float) -> str:
    if metric == "traffic":
        return "low" if v < 40 else "medium" if v < 60 else "high" if v < 80 else "critical"
    if metric == "energy":
        return "low" if v < 200 else "medium" if v < 350 else "high" if v < 450 else "critical"
    if metric == "air":
        return "low" if v < 50 else "medium" if v < 100 else "high" if v < 150 else "critical"
    if metric == "water":
        return "low" if v > 60 else "medium" if v > 40 else "high" if v > 25 else "critical"
    if metric == "waste":
        return "low" if v < 50 else "medium" if v < 70 else "high" if v < 85 else "critical"
    return "low" if v < 40 else "medium" if v < 60 else "high" if v < 75 else "critical"


SEVERITY_WEIGHT = {"low": 5, "medium": 30, "high": 65, "critical": 95}


def add_severity(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["severity"] = df.apply(lambda r: severity_from_value(r["metric_type"], r["value"]), axis=1)
    df["severity_w"] = df["severity"].map(SEVERITY_WEIGHT)
    return df

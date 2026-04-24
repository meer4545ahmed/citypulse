"""
Real data-cleaning layer.
Implements: schema validation, type coercion, sanity bounds,
            unit normalization, z-score outlier flag, missing-value
            imputation (rolling median), and a quality score.
"""
from __future__ import annotations
from typing import Any
import math
import numpy as np

SANITY_BOUNDS = {
    "traffic":  (0.0, 200.0),
    "energy":   (0.0, 800.0),
    "air":      (0.0, 1000.0),
    "water":    (0.0, 100.0),
    "waste":    (0.0, 100.0),
    "transport":(0.0, 100.0),
    "temp_c":   (-20.0, 55.0),
    "humidity": (0.0, 100.0),
    "wind_ms":  (0.0, 60.0),
}


def to_float(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def normalize_units(metric_type: str, value: float, unit: str | None) -> float:
    if value is None:
        return value
    u = (unit or "").lower().strip()
    if metric_type == "temp_c" and u in ("f", "°f", "fahrenheit"):
        return (value - 32.0) * 5.0 / 9.0
    if metric_type == "wind_ms" and u in ("kmh", "km/h", "kph"):
        return value / 3.6
    if metric_type == "wind_ms" and u in ("mph",):
        return value * 0.44704
    if metric_type == "air" and u in ("ppm",):
        return value * 1000.0
    return value


def clip_to_bounds(metric_type: str, value: float | None) -> tuple[float | None, str | None]:
    if value is None:
        return None, "missing"
    bounds = SANITY_BOUNDS.get(metric_type)
    if not bounds:
        return value, None
    lo, hi = bounds
    if value < lo or value > hi:
        return max(lo, min(hi, value)), "clipped_out_of_range"
    return value, None


def impute_missing(history: list[float]) -> float | None:
    arr = [x for x in history if x is not None and not (isinstance(x, float) and math.isnan(x))]
    if not arr:
        return None
    return float(np.median(arr[-12:]))


def zscore_flag(history: list[float], current: float, k: float = 3.5) -> bool:
    arr = np.array([x for x in history if x is not None], dtype=float)
    if len(arr) < 8:
        return False
    med = np.median(arr)
    mad = np.median(np.abs(arr - med)) + 1e-6
    z = 0.6745 * (current - med) / mad
    return abs(z) > k


def clean_reading(
    metric_type: str,
    raw_value: Any,
    unit: str | None = None,
    history: list[float] | None = None,
) -> dict:
    history = history or []
    flags: list[str] = []
    imputed = False
    v = to_float(raw_value)
    if v is None:
        v = impute_missing(history)
        imputed = v is not None
        if imputed:
            flags.append("imputed_median")
    else:
        v = normalize_units(metric_type, v, unit)
        v, bound_flag = clip_to_bounds(metric_type, v)
        if bound_flag:
            flags.append(bound_flag)

    suspect = False
    if v is not None and history:
        if zscore_flag(history, v):
            suspect = True
            flags.append("suspect_outlier")

    completeness = 0.0 if v is None else (0.6 if imputed else 1.0)
    confidence = max(0.0, completeness - (0.3 if suspect else 0.0))

    return {
        "value": None if v is None else round(float(v), 3),
        "imputed": imputed,
        "suspect": suspect,
        "flags": flags,
        "quality": {
            "completeness": round(completeness, 2),
            "confidence": round(confidence, 2),
        },
    }

#!/usr/bin/env python3
"""One-shot: convert shipped XGBoost JSON models to ONNX for Node runtime (onnxruntime-node).

Requires: pip install xgboost onnxmltools
Run from repo root: python3 tools/export-onnx.py
"""

from pathlib import Path

import xgboost as xgb
from onnxmltools.convert import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Models" / "onnx"
XGB_DIR = ROOT / "Models" / "XGBoost_Models"


def export(pattern: str, out_name: str) -> None:
    paths = sorted(XGB_DIR.glob(pattern))
    if not paths:
        raise SystemExit(f"No model matching {pattern} under {XGB_DIR}")
    path = paths[-1]
    booster = xgb.Booster()
    booster.load_model(str(path))
    n = booster.num_features()
    initial_type = [("input", FloatTensorType([None, n]))]
    onnx_model = convert_xgboost(booster, initial_types=initial_type, target_opset=15)
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / out_name
    target.write_bytes(onnx_model.SerializeToString())
    print(f"Wrote {target} ({target.stat().st_size} bytes, n_features={n}) from {path.name}")


def main() -> None:
    export("*ML*.json", "xgb_ML.onnx")
    export("*UO*.json", "xgb_UO.onnx")


if __name__ == "__main__":
    main()

# NBA Sports Betting Using Machine Learning
<img src="https://github.com/kyleskom/NBA-Machine-Learning-Sports-Betting/blob/master/Screenshots/output.png" width="1010" height="292" />

## Overview
This project predicts NBA game winners and totals (over/under) using team stats and sportsbook odds. It pulls current team stats from the NBA API, builds matchup features, runs **ONNX-exported XGBoost** models via Node, and prints optional expected value and Kelly Criterion sizing.

## Features
- Moneyline and totals predictions (XGBoost via ONNX in TypeScript).
- Expected value and optional Kelly Criterion (`-kc`).
- Odds from supported sportsbooks via `-odds=<book>` (required).

## Requirements
- **Node.js 20+**

## Install
```bash
npm install
```

## Usage
```bash
npm run typecheck   # optional
npm test
npm run build       # emits dist-lib/

npm run predict -- -xgb -odds=fanduel   # example
```

Optional: `-kc` for Kelly Criterion. **`--all` / `-A`** still enables legacy-style flags for compatibility, but **only XGBoost runs**; `-nn` is not supported.

Supported sportsbooks include: `fanduel`, `draftkings`, `betmgm`, `pointsbet`, `caesars`, `wynn`, `bet_rivers_ny`

### Layout
- **`src/`** — NBA stats, schedule, SBR odds, features, ONNX inference, CLI (`src/cli/main.ts`).
- **`src/utils/`** — Kelly criterion and expected value.
- **`Models/onnx/`** — `xgb_ML.onnx`, `xgb_UO.onnx` consumed at runtime.
- **`tests/ts/`** — Vitest specs for betting math.

### Regenerating ONNX from JSON models
If you have XGBoost JSON models under `Models/XGBoost_Models/`, you can convert them with Python (install `xgboost` and `onnxmltools`):

```bash
python3 tools/export-onnx.py
```

## Contributing
Contributions are welcome. If you change model behavior or feature construction, update tests and this README as needed.

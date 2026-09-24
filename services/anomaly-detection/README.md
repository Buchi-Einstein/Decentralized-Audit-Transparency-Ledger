# ML Anomaly Detection Service for AuditLedger

Implements real-time machine-learning anomaly detection across contract execution metrics, API traffic patterns, and infrastructure behavior.

## Components

1. **Training Pipeline (`pipeline/trainer.py`)**:
   - Collects metric feature vectors (invocation rates, error rates, latency spikes, gas outliers).
   - Trains an unsupervised multivariate anomaly estimator.
   - Serializes trained model parameters to lightweight JSON artifacts.

2. **Model Serving (`serving/server.py`)**:
   - Ultra low-latency HTTP endpoint (`POST /v1/score`) evaluating incoming vectors in `< 5ms`.
   - Returns normalized anomaly scores (`0.0 - 1.0`), severity classification, and feature attribution.

3. **Alert Integration (`alerting/dispatcher.py`)**:
   - Evaluates score thresholds (Warning >= 0.65, Critical >= 0.85).
   - Dispatches structured incidents with root-cause feature breakdowns.
   - Exports Prometheus metrics for alerting rule evaluation.

## Quick Start

### Train Baseline Model
```bash
python3 -m services.anomaly-detection.pipeline.trainer
```

### Run Serving Endpoint
```bash
python3 -m services.anomaly-detection.serving.server
```

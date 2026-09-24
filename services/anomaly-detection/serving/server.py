"""
Low-latency Anomaly Detection Model Server (#464 #467 #465 #463)

Provides HTTP endpoints for online scoring of contract metrics and API behavior.
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict
from ..pipeline.trainer import AnomalyModelTrainer, FeatureExtractor


class AnomalyServingService:
    def __init__(self, model_path: str):
        self.model = AnomalyModelTrainer.load_model(model_path)

    def score(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        vector = FeatureExtractor.extract_vector(metrics)
        score, is_anomaly, contributions = self.model.score_sample(vector)

        severity = "NORMAL"
        if is_anomaly:
            severity = "CRITICAL" if score > 0.85 else "WARNING"

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "severity": severity,
            "feature_contributions": contributions,
            "evaluated_features": FeatureExtractor.FEATURE_NAMES,
        }


def create_request_handler(service: AnomalyServingService):
    class AnomalyHTTPHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/v1/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                resp = {"status": "UP", "trained_at": service.model.trained_at}
                self.wfile.write(json.dumps(resp).encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()

        def do_POST(self):
            if self.path == "/v1/score":
                content_len = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_len)
                try:
                    payload = json.loads(body.decode("utf-8"))
                    result = service.score(payload.get("metrics", {}))
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()

    return AnomalyHTTPHandler

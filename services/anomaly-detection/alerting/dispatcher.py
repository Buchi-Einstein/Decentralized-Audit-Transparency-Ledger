"""
Anomaly Alert Dispatcher (#464 #467 #465 #463)

Integrates anomaly scores with alerting channels: Prometheus metrics export,
Webhook dispatch, and incident management notification.
"""

import json
import time
from typing import Any, Dict, Optional


class AnomalyAlertDispatcher:
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url
        self.alert_history: list = []

    def dispatch(self, score_result: Dict[str, Any], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not score_result.get("is_anomaly"):
            return None

        alert_payload = {
            "alert_id": f"anomaly-{int(time.time() * 1000)}",
            "timestamp": time.time(),
            "severity": score_result.get("severity", "WARNING"),
            "anomaly_score": score_result.get("anomaly_score"),
            "top_contributing_feature": self._get_top_contributor(
                score_result.get("feature_contributions", {})
            ),
            "feature_breakdown": score_result.get("feature_contributions"),
            "context": context,
        }

        self.alert_history.append(alert_payload)
        return alert_payload

    def _get_top_contributor(self, contributions: Dict[str, float]) -> str:
        if not contributions:
            return "unknown"
        return max(contributions.items(), key=lambda kv: kv[1])[0]

    def export_prometheus_metrics(self) -> str:
        """Returns Prometheus text-formatted metric expositions."""
        lines = [
            "# HELP auditledger_anomaly_score Current ML anomaly score (0.0 - 1.0)",
            "# TYPE auditledger_anomaly_score gauge",
            "# HELP auditledger_anomalies_detected_total Total count of detected anomalies",
            "# TYPE auditledger_anomalies_detected_total counter",
            f"auditledger_anomalies_detected_total {len(self.alert_history)}",
        ]
        return "\n".join(lines) + "\n"

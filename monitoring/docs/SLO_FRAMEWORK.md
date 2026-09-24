# AuditLedger Service Level Objectives (SLO) & SLI Framework

This document outlines the Service Level Indicators (SLIs), Service Level Objectives (SLOs), error budgets, and alerting architecture across all AuditLedger production services.

## Overview of Defined SLOs

| Service | Objective | SLI Metric | Target | Error Budget (30d) |
| :--- | :--- | :--- | :--- | :--- |
| **AuditLedger API** | Availability | Non-5xx HTTP responses / Total valid requests | 99.9% | 0.1% (43.2 min downtime) |
| **AuditLedger API** | Latency | Response time < 200ms | 99.0% | 1.0% |
| **Bridge Relayer** | Delivery Success | Confirmed relayed events / Total events | 99.95% | 0.05% |
| **Bridge Relayer** | Sync Freshness | Delay < 5.0 seconds | 99.0% | 1.0% |
| **Verification Engine**| Accuracy | Deterministic proof checks / Total requests | 99.99% | 0.01% |
| **Verification Engine**| Latency | Proof verification < 100ms | 95.0% | 5.0% |

## Multi-Window Multi-Burn-Rate Alerting Strategy

Following Google SRE best practices, alerts fire only when error budgets are being burned at rates that threaten quarterly/monthly commitments:

1. **Page (Critical) Alert**:
   - **14.4x Burn Rate** over 1 hour (2% budget consumed in 1h) **AND** 5-minute confirmation window.
2. **Page (Critical) Alert**:
   - **6.0x Burn Rate** over 6 hours (5% budget consumed in 6h) **AND** 30-minute confirmation window.
3. **Ticket (Warning) Alert**:
   - **3.0x Burn Rate** over 24 hours (10% budget consumed in 24h) **AND** 2-hour confirmation window.
4. **Exhaustion Alert**:
   - Triggered when overall 30-day error budget remaining drops below 10%.

## Dashboards & Rules

- **Prometheus Rules**: `monitoring/prometheus/slo_alerts.yml`
- **SLO Definitions**: `monitoring/slo/slo-definitions.yaml`
- **Grafana Dashboard**: `monitoring/grafana/dashboards/slo-observability-dashboard.json`

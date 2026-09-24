use serde::{Deserialize, Serialize};

/// Health status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

/// Readiness check for a dependency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessCheck {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<i64>,
}

/// Readiness status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessStatus {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checks: Option<std::collections::HashMap<String, ReadinessCheck>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

/// Cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hits: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub misses: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_requests: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hit_rate: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_reset: Option<String>,
}

/// An audit event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub submitter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prev_hash: Option<String>,
}

/// Paginated list of events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventListResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<Event>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
}

/// Contract statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_events: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_max_logs: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub events_by_type: Option<std::collections::HashMap<String, i64>>,
}

/// Export response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<Event>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<i64>,
}

/// Invalidate cache response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvalidateCacheResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<InvalidateCacheData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvalidateCacheData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}
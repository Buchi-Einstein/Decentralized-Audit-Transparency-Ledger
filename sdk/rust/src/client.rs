use crate::errors::{Error, Result};
use crate::models::*;
use reqwest::Client as ReqwestClient;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// AuditLedger REST API client
#[derive(Clone)]
pub struct Client {
    inner: Arc<Inner>,
}

struct Inner {
    http_client: ReqwestClient,
    base_url: String,
    user_agent: String,
}

impl Client {
    /// Create a new AuditLedger client
    ///
    /// # Arguments
    ///
    /// * `base_url` - The base URL of the AuditLedger API (e.g., "http://localhost:3002/v1")
    ///
    /// # Returns
    ///
    /// A new Client instance or an error if the URL is invalid
    pub fn new(base_url: &str) -> Result<Self> {
        let parsed_url = reqwest::Url::parse(base_url)?;
        let base_url = parsed_url.as_str().to_string();

        let http_client = ReqwestClient::builder()
            .user_agent("audit-ledger-rs/0.1.0")
            .build()?;

        Ok(Self {
            inner: Arc::new(Inner {
                http_client,
                base_url: base_url.trim_end_matches('/').to_string(),
                user_agent: "audit-ledger-rs/0.1.0".to_string(),
            }),
        })
    }

    /// Create a new client with custom configuration
    ///
    /// # Arguments
    ///
    /// * `base_url` - The base URL of the AuditLedger API
    /// * `http_client` - Custom reqwest client to use
    ///
    /// # Returns
    ///
    /// A new Client instance
    pub fn with_http_client(base_url: &str, http_client: ReqwestClient) -> Result<Self> {
        let parsed_url = reqwest::Url::parse(base_url)?;
        let base_url = parsed_url.as_str().to_string();

        Ok(Self {
            inner: Arc::new(Inner {
                http_client,
                base_url: base_url.trim_end_matches('/').to_string(),
                user_agent: "audit-ledger-rs/0.1.0".to_string(),
            }),
        })
    }

    /// Get the base URL
    pub fn base_url(&self) -> &str {
        &self.inner.base_url
    }

    /// Perform a GET request and deserialize the response
    async fn get<T: for<'de> serde::Deserialize<'de>>(
        &self,
        path: &str,
    ) -> Result<T> {
        let url = format!("{}{}", self.inner.base_url, path);
        let response = self
            .inner
            .http_client
            .get(&url)
            .header(reqwest::header::USER_AGENT, &self.inner.user_agent)
            .send()
            .await?;

        let status = response.status().as_u16();
        if !status.is_success() {
            let text = response.text().await?;
            return Err(Error::ApiError {
                status_code: status,
                message: text,
            });
        }

        let json = response.json::<T>().await?;
        Ok(json)
    }

    /// Perform a POST request and deserialize the response
    async fn post<T: for<'de> serde::Deserialize<'de>>(
        &self,
        path: &str,
        body: Option<&impl serde::Serialize>,
    ) -> Result<T> {
        let url = format!("{}{}", self.inner.base_url, path);
        let mut request = self
            .inner
            .http_client
            .post(&url)
            .header(reqwest::header::USER_AGENT, &self.inner.user_agent);

        if let Some(body) = body {
            request = request.json(body);
        }

        let response = request.send().await?;

        let status = response.status().as_u16();
        if !status.is_success() {
            let text = response.text().await?;
            return Err(Error::ApiError {
                status_code: status,
                message: text,
            });
        }

        let json = response.json::<T>().await?;
        Ok(json)
    }

    /// Perform a GET request that returns raw bytes
    async fn get_bytes(&self, path: &str) -> Result<bytes::Bytes> {
        let url = format!("{}{}", self.inner.base_url, path);
        let response = self
            .inner
            .http_client
            .get(&url)
            .header(reqwest::header::USER_AGENT, &self.inner.user_agent)
            .send()
            .await?;

        let status = response.status().as_u16();
        if !status.is_success() {
            let text = response.text().await?;
            return Err(Error::ApiError {
                status_code: status,
                message: text,
            });
        }

        let bytes = response.bytes().await?;
        Ok(bytes)
    }

    /// Get health status
    pub async fn health(&self) -> Result<HealthStatus> {
        self.get("/healthz").await
    }

    /// Get readiness status
    pub async fn readiness(&self) -> Result<ReadinessStatus> {
        self.get("/readyz").await
    }

    /// Get Prometheus metrics
    pub async fn metrics(&self) -> Result<String> {
        let bytes = self.get_bytes("/metrics").await?;
        Ok(String::from_utf8_lossy(&bytes).into_owned())
    }

    /// Get cache statistics
    pub async fn cache_stats(&self) -> Result<CacheStats> {
        self.get("/cache/stats").await
    }

    /// Invalidate cache
    pub async fn invalidate_cache(&self) -> Result<InvalidateCacheResponse> {
        self.post("/cache/invalidate", None::<&()>).await
    }

    /// List events with pagination and filtering
    pub async fn list_events(
        &self,
        limit: Option<u64>,
        offset: Option<u64>,
        filters: HashMap<String, String>,
    ) -> Result<EventListResponse> {
        let mut url = format!("{}/events", self.inner.base_url);
        let mut query_params = Vec::new();

        if let Some(limit) = limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = offset {
            query_params.push(format!("offset={}", offset));
        }
        for (key, value) in filters {
            query_params.push(format!("{}={}", reqwest::form::UrlEncoded::parse(&key)?, reqwest::form::UrlEncoded::parse(&value)?));
        }

        if !query_params.is_empty() {
            url.push_str(&format!("?{}", query_params.join("&")));
        }

        self.get(&url.trim_end_matches('?')).await
    }

    /// Get event by index
    pub async fn get_event(&self, index: u64) -> Result<Event> {
        let path = format!("/events/{}", index);
        let resp: EventResponse = self.get(&path).await?;
        Ok(resp.data)
    }

    /// Get events by type
    pub async fn get_events_by_type(
        &self,
        event_type: &str,
        limit: Option<u64>,
        offset: Option<u64>,
    ) -> Result<EventListResponse> {
        let mut url = format!("{}/events/type/{}", self.inner.base_url, event_type);
        let mut query_params = Vec::new();

        if let Some(limit) = limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = offset {
            query_params.push(format!("offset={}", offset));
        }

        if !query_params.is_empty() {
            url.push_str(&format!("?{}", query_params.join("&")));
        }

        self.get(&url.trim_end_matches('?')).await
    }

    /// Search events
    pub async fn search_events(
        &self,
        limit: Option<u64>,
        offset: Option<u64>,
        filters: HashMap<String, String>,
    ) -> Result<EventListResponse> {
        let mut url = format!("{}/events/search", self.inner.base_url);
        let mut query_params = Vec::new();

        if let Some(limit) = limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = offset {
            query_params.push(format!("offset={}", offset));
        }
        for (key, value) in filters {
            query_params.push(format!("{}={}", key, value));
        }

        if !query_params.is_empty() {
            url.push_str(&format!("?{}", query_params.join("&")));
        }

        self.get(&url.trim_end_matches('?')).await
    }

    /// Export events as JSON
    pub async fn export_events_json(
        &self,
        limit: Option<u64>,
        offset: Option<u64>,
        fields: Option<String>,
        filter: Option<String>,
    ) -> Result<ExportResponse> {
        let mut url = format!("{}/export/events.json", self.inner.base_url);
        let mut query_params = Vec::new();

        if let Some(limit) = limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = offset {
            query_params.push(format!("offset={}", offset));
        }
        if let Some(fields) = fields {
            query_params.push(format!("fields={}", fields));
        }
        if let Some(filter) = filter {
            query_params.push(format!("filter={}", filter));
        }

        if !query_params.is_empty() {
            url.push_str(&format!("?{}", query_params.join("&")));
        }

        self.get(&url.trim_end_matches('?')).await
    }

    /// Export events as CSV
    pub async fn export_events_csv(
        &self,
        limit: Option<u64>,
        offset: Option<u64>,
        fields: Option<String>,
        filter: Option<String>,
    ) -> Result<Vec<u8>> {
        let mut url = format!("{}/export/events.csv", self.inner.base_url);
        let mut query_params = Vec::new();

        if let Some(limit) = limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = offset {
            query_params.push(format!("offset={}", offset));
        }
        if let Some(fields) = fields {
            query_params.push(format!("fields={}", fields));
        }
        if let Some(filter) = filter {
            query_params.push(format!("filter={}", filter));
        }

        if !query_params.is_empty() {
            url.push_str(&format!("?{}", query_params.join("&")));
        }

        let bytes = self.get_bytes(&url.trim_end_matches('?')).await?;
        Ok(bytes.to_vec())
    }

    /// Export events as a stream
    pub async fn export_events_stream(
        &self,
        limit: Option<u64>,
        offset: Option<u64>,
        fields: Option<String>,
    ) -> Result<reqwest::Response> {
        let mut url = format!("{}/export/events/stream", self.inner.base_url);
        let mut query_params = Vec::new();

        if let Some(limit) = limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = offset {
            query_params.push(format!("offset={}", offset));
        }
        if let Some(fields) = fields {
            query_params.push(format!("fields={}", fields));
        }

        if !query_params.is_empty() {
            url.push_str(&format!("?{}", query_params.join("&")));
        }

        let response = self
            .inner
            .http_client
            .get(&url.trim_end_matches('?'))
            .header(reqwest::header::USER_AGENT, &self.inner.user_agent)
            .send()
            .await?;

        let status = response.status().as_u16();
        if !status.is_success() {
            let text = response.text().await?;
            return Err(Error::ApiError {
                status_code: status,
                message: text,
            });
        }

        Ok(response)
    }

    /// Get export progress
    pub async fn export_progress(&self) -> Result<Vec<u8>> {
        let bytes = self.get_bytes("/export/progress").await?;
        Ok(bytes.to_vec())
    }

    /// Get contract statistics
    pub async fn get_statistics(&self) -> Result<Statistics> {
        self.get("/stats").await
    }
}

/// Response wrapper for single event
#[derive(Debug, serde::Deserialize)]
struct EventResponse {
    data: Event,
}
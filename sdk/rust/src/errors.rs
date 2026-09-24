use thiserror::Error;

/// SDK errors
#[derive(Debug, Error)]
pub enum Error {
    /// HTTP client error
    #[error("HTTP client error: {0}")]
    Reqwest(#[from] reqwest::Error),

    /// JSON serialization/deserialization error
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    /// URL parsing error
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),

    /// API returned an error
    #[error("API error (status {}): {}", status_code, message)]
    ApiError {
        status_code: u16,
        message: String,
    },

    /// Unexpected response
    #[error("Unexpected response: {0}")]
    UnexpectedResponse(String),
}

/// Result type for SDK operations
pub type Result<T> = std::result::Result<T, Error>;
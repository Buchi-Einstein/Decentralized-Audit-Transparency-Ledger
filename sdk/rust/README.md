# AuditLedger Rust SDK

A Rust client library for interacting with the AuditLedger REST API with async support.

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
audit-ledger-sdk = { git = "https://github.com/daddygokings-art/Decentralized-Audit-Transparency-Ledger" }
```

Or if you've published it to crates.io:

```toml
[dependencies]
audit-ledger-sdk = "0.1.0"
```

## Usage

```rust
use audit_ledger_sdk::{Client, Result};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Create a new client
    let client = Client::new("http://localhost:3002/v1")?;
    
    // Check health
    let health = client.health().await?;
    println!("Health status: {}", health.status);
    
    // Get statistics
    let stats = client.get_statistics().await?;
    println!("Total events: {}", stats.total_events.unwrap_or(0));
    
    // List events
    let events = client.list_events(Some(10), Some(0), std::collections::HashMap::new()).await?;
    println!("Found {} events", events.data.as_ref().map(|v| v.len()).unwrap_or(0));
    
    Ok(())
}
```

## Features

- Full async/await support using Tokio
- Serde integration for JSON serialization/deserialization
- Zero-cost abstractions
- Comprehensive error handling
- Configurable HTTP client
- Full API coverage
- Thread-safe client (Clone cheaply)

## API Coverage

- Health checks (`/healthz`, `/readyz`)
- Metrics (`/metrics`)
- Cache management (`/cache/stats`, `/cache/invalidate`)
- Events (`/events`, `/events/search`, `/events/{index}`, `/events/type/{type}`)
- Exports (`/export/events.json`, `/export/events.csv`, `/export/events/stream`, `/export/progress`)
- Statistics (`/stats`)

## Running Tests

```bash
cargo test
```

## License

MIT OR Apache-2.0
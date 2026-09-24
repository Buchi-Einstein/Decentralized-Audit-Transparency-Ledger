# AuditLedger Go SDK

A Go client library for interacting with the AuditLedger REST API.

## Installation

```bash
go get github.com/daddygokings-art/Decentralized-Audit-Transparency-Ledger/sdk/go
```

## Usage

```go
package main

import (
	"context"
	"fmt"
	"log"

	auditledger "github.com/daddygokings-art/Decentralized-Audit-Transparency-Ledger/sdk/go"
)

func main() {
	// Create a new client
	client, err := auditledger.NewClient("http://localhost:3002/v1")
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}
	defer client.Close()

	// Check health
	health, _, err := client.Health(context.Background())
	if err != nil {
		log.Fatalf("Health check failed: %v", err)
	}
	fmt.Printf("Health status: %s\n", health.Status)

	// Get statistics
	stats, _, err := client.GetStatistics(context.Background())
	if err != nil {
		log.Fatalf("Failed to get statistics: %v", err)
	}
	fmt.Printf("Total events: %d\n", stats.TotalEvents)

	// List events
	events, _, err := client.ListEvents(context.Background(), 10, 0, nil)
	if err != nil {
		log.Fatalf("Failed to list events: %v", err)
	}
	fmt.Printf("Found %d events\n", len(events.Data))
}
```

## Features

- Full coverage of AuditLedger REST API endpoints
- Context support for cancellation and timeouts
- Automatic JSON marshalling/unmarshalling
- Error handling with detailed API error responses
- Configurable HTTP client (timeout, custom transport, etc.)
- Zero dependencies (uses only Go standard library)

## API Coverage

- Health checks (`/healthz`, `/readyz`)
- Metrics (`/metrics`)
- Cache management (`/cache/stats`, `/cache/invalidate`)
- Events (`/events`, `/events/search`, `/events/{index}`, `/events/type/{type}`)
- Exports (`/export/events.json`, `/export/events.csv`, `/export/events/stream`, `/export/progress`)
- Statistics (`/stats`)

## Running Tests

```bash
go test ./...
```

## License

MIT
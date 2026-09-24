# AuditLedger API SDK Reference Documentation

This documentation is automatically generated from the OpenAPI specification and includes code snippets for all supported SDKs.

## API Version: 1.1.0

*Last updated: $(date +%Y-%m-%d)*

## Table of Contents

1. [Health Endpoints](#health-endpoints)
2. [Metrics Endpoint](#metrics-endpoint)
3. [Cache Endpoints](#cache-endpoints)
4. [Events Endpoints](#events-endpoints)
5. [Export Endpoints](#export-endpoints)
6. [Statistics Endpoint](#statistics-endpoint)

## Health Endpoints

### Get Health Status
`GET /healthz`

Check if the service is alive.

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Service is alive |

#### SDK Snippets

**Go**
```go
health, resp, err := client.Health(context.Background())
if err != nil {
    log.Fatalf("Failed to get health: %v", err)
}
fmt.Printf("Health status: %s\n", health.Status)
```

**Rust**
```rust
let health = client.health().await?;
println!("Health status: {}", health.status);
```

**Java**
```java
HealthStatus health = client.getHealth();
System.out.println("Health status: " + health.getStatus());
```

**Kotlin**
```kotlin
val health = client.getHealth()
println("Health status: ${health.status}")
```

### Get Readiness Status
`GET /readyz`

Check if the service is ready to serve requests (includes dependency checks).

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Service is ready |
| 503 | Service is not ready |

#### SDK Snippets

**Go**
```go
readiness, resp, err := client.Readiness(context.Background())
if err != nil {
    log.Fatalf("Failed to get readiness: %v", err)
}
fmt.Printf("Readiness status: %s\n", readiness.Status)
```

**Rust**
```rust
let readiness = client.readiness().await?;
println!("Readiness status: {}", readiness.status);
```

**Java**
```java
ReadinessStatus readiness = client.getReadiness();
System.out.println("Readiness status: " + readiness.getStatus());
```

**Kotlin**
```kotlin
val readiness = client.getReadiness()
println("Readiness status: ${readiness.status}")
```

## Metrics Endpoint

### Get Prometheus Metrics
`GET /metrics`

Get Prometheus-compatible metrics.

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Metrics in Prometheus text format |

#### SDK Snippets

**Go**
```go
metrics, resp, err := client.Metrics(context.Background())
if err != nil {
    log.Fatalf("Failed to get metrics: %v", err)
}
fmt.Printf("Metrics:\n%s\n", metrics)
```

**Rust**
```rust
let metrics = client.metrics().await?;
println!("Metrics:\n{}", metrics);
```

**Java**
```java
String metrics = client.getMetrics();
System.out.println("Metrics:\n" + metrics);
```

**Kotlin**
```kotlin
val metrics = client.getMetrics()
println("Metrics:\n$metrics")
```

## Cache Endpoints

### Get Cache Statistics
`GET /cache/stats`

Get contract statistics.

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Contract statistics |

#### SDK Snippets

**Go**
```go
cacheStats, resp, err := client.CacheStats(context.Background())
if err != nil {
    log.Fatalf("Failed to get cache stats: %v", err)
}
fmt.Printf("Cache stats: hits=%d misses=%d total=%d hitRate=%.2f lastReset=%s\n", 
    cacheStats.Hits, cacheStats.Misses, cacheStats.TotalRequest, cacheStats.HitRate, cacheStats.LastReset)
```

**Rust**
```rust
let cacheStats = client.cache_stats().await?;
println!("Cache stats: hits={} misses={} total={} hit_rate={} last_reset={}", 
    cacheStats.hits.unwrap_or(0), cacheStats.misses.unwrap_or(0), 
    cacheStats.total_requests.unwrap_or(0), 
    cacheStats.hit_rate.as_deref().unwrap_or("N/A"), 
    cacheStats.last_reset.as_deref().unwrap_or("N/A"));
```

**Java**
```java
CacheStats cacheStats = client.getCacheStats();
System.out.printf("Cache stats: hits=%d misses=%d total=%d hitRate=%s lastReset=%s%n",
    cacheStats.getHits(), cacheStats.getMisses(), cacheStats.getTotalRequests(),
    cacheStats.getHitRate(), cacheStats.getLastReset());
```

**Kotlin**
```kotlin
val cacheStats = client.getCacheStats()
println("Cache stats: hits=${cacheStats.hits} misses=${cacheStats.misses} total=${cacheStats.totalRequests} hitRate=${cacheStats.hitRate} lastReset=${cacheStats.lastReset}")
```

### Invalidate Cache
`POST /cache/invalidate`

Reset all cache statistics and force fresh responses on next requests.

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Cache invalidated |

#### SDK Snippets

**Go**
```go
invalidateResp, resp, err := client.InvalidateCache(context.Background())
if err != nil {
    log.Fatalf("Failed to invalidate cache: %v", err)
}
fmt.Printf("Cache invalidation result: %s\n", invalidateResp.Data.Message)
```

**Rust**
```rust
let invalidateResp = client.invalidate_cache().await?;
println!("Cache invalidation result: {}", invalidateResp.data.unwrap().message.unwrap_or_default());
```

**Java**
```java
InvalidateCacheResponse invalidateResp = client.invalidateCache();
System.out.println("Cache invalidation result: " + invalidateResp.getData().getMessage());
```

**Kotlin**
```kotlin
val invalidateResp = client.invalidateCache()
println("Cache invalidation result: ${invalidateResp.data.message}")
```

## Events Endpoints

### List Events
`GET /events`

Returns a paginated list of audit events. Supports all standard filter query parameters (type, submitter, metadata, startTime, endTime, sort, order).

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of events to return per page (1–1000) |
| offset | integer | Number of events to skip from the beginning |
| type | string | Filter by event type (case-insensitive partial match) |
| submitter | string | Filter by submitter address (partial match) |
| metadata | string | Filter by metadata content (partial match) |
| startTime | integer | Only include events at or after this unix timestamp (seconds) |
| endTime | integer | Only include events at or before this unix timestamp (seconds) |
| sort | string | Field to sort by (index, timestamp, event_type, submitter) |
| order | string | Sort order (asc, desc) |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Paginated list of events |
| 400 | Invalid filter or pagination parameters |

#### SDK Snippets

**Go**
```go
events, resp, err := client.ListEvents(context.Background(), 50, 0, map[string]string{
    "type": "payment",
    "submitter": "GABCD...",
})
if err != nil {
    log.Fatalf("Failed to list events: %v", err)
}
fmt.Printf("Found %d events\n", len(events.Data))
for _, event := range events.Data {
    fmt.Printf("Event %d: type=%s submitter=%s timestamp=%d\n", 
        event.Index, event.EventType, event.Submitter, event.Timestamp)
}
```

**Rust**
```rust
let mut filters = HashMap::new();
filters.insert("type".to_string(), "payment".to_string());
filters.insert("submitter".to_string(), "GABCD...".to_string());
let events = client.list_events(Some(50), Some(0), filters).await?;
println!("Found {} events", events.data.as_ref().map(|v| v.len()).unwrap_or(0));
for event in events.data.unwrap_or_default() {
    println!("Event {}: type={:?} submitter={:?} timestamp={:?}", 
        event.index, event.event_type, event.submitter, event.timestamp);
}
```

**Java**
```java
Map<String, String> filters = new HashMap<>();
filters.put("type", "payment");
filters.put("submitter", "GABCD...");
EventListResponse events = client.listEvents(50, 0, filters);
System.out.printf("Found %d events%n", events.getData().size());
for (Event event : events.getData()) {
    System.out.printf("Event %d: type=%s submitter=%s timestamp=%d%n",
        event.getIndex(), event.getEventType(), event.getSubmitter(), event.getTimestamp());
}
```

**Kotlin**
```kotlin
val filters = mapOf(
    "type" to "payment",
    "submitter" to "GABCD..."
)
val events = client.listEvents(50, 0, filters)
println("Found ${events.data.size} events")
for (event in events.data) {
    println("Event ${event.index}: type=${event.eventType} submitter=${event.submitter} timestamp=${event.timestamp}")
}
```

### Get Event by Index
`GET /events/{index}`

Get event by sequential index.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| index | integer | Sequential index of the event (0-based) |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Event details |
| 400 | Invalid index parameter |
| 404 | Event not found |

#### SDK Snippets

**Go**
```go
event, resp, err := client.GetEvent(context.Background(), 42)
if err != nil {
    log.Fatalf("Failed to get event: %v", err)
}
fmt.Printf("Event: type=%s submitter=%s timestamp=%d\n", 
    event.EventType, event.Submitter, event.Timestamp)
```

**Rust**
```rust
let event = client.get_event(42).await?;
println!("Event: type={:?} submitter={:?} timestamp={:?}", 
    event.event_type, event.submitter, event.timestamp);
```

**Java**
```java
Event event = client.getEvent(42);
System.out.printf("Event: type=%s submitter=%s timestamp=%d%n",
    event.getEventType(), event.getSubmitter(), event.getTimestamp());
```

**Kotlin**
```kotlin
val event = client.getEvent(42)
println("Event: type=${event.eventType} submitter=${event.submitter} timestamp=${event.timestamp}")
```

### Get Events by Type
`GET /events/type/{type}`

Returns all events matching the given type. Supports pagination via limit and offset parameters.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Event type to filter by (e.g. "payment", "audit", "governance") |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of events to return per page (1–1000) |
| offset | integer | Number of events to skip from the beginning |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Paginated list of events of the given type |
| 400 | Invalid type or pagination parameters |

#### SDK Snippets

**Go**
```go
events, resp, err := client.GetEventsByType(context.Background(), "payment", 20, 0)
if err != nil {
    log.Fatalf("Failed to get events by type: %v", err)
}
fmt.Printf("Found %d payment events\n", len(events.Data))
```

**Rust**
```rust
let events = client.get_events_by_type("payment", Some(20), Some(0)).await?;
println!("Found {} payment events", events.data.as_ref().map(|v| v.len()).unwrap_or(0));
```

**Java**
```java
EventListResponse events = client.getEventsByType("payment", 20, 0);
System.out.printf("Found %d payment events%n", events.getData().size());
```

**Kotlin**
```kotlin
val events = client.getEventsByType("payment", 20, 0)
println("Found ${events.data.size} payment events")
```

### Search Events
`GET /events/search`

Search events by multiple filter criteria.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of events to return per page (1–1000) |
| offset | integer | Number of events to skip from the beginning |
| type | string | Filter by event type (case-insensitive partial match) |
| submitter | string | Filter by submitter address (partial match) |
| metadata | string | Filter by metadata content (partial match) |
| startTime | integer | Only include events at or after this unix timestamp (seconds) |
| endTime | integer | Only include events at or before this unix timestamp (seconds) |
| sort | string | Field to sort by (index, timestamp, event_type, submitter) |
| order | string | Sort order (asc, desc) |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Search results |
| 400 | Invalid filter or pagination parameters |

#### SDK Snippets

**Go**
```go
events, resp, err := client.SearchEvents(context.Background(), 10, 0, map[string]string{
    "type": "governance",
    "startTime": "1640995200", // 2022-01-01
    "endTime": "1643673600",   // 2022-02-01
})
if err != nil {
    log.Fatalf("Failed to search events: %v", err)
}
fmt.Printf("Found %d governance events from Jan 2022\n", len(events.Data))
```

**Rust**
```rust
let mut filters = HashMap::new();
filters.insert("type".to_string(), "governance".to_string());
filters.insert("startTime".to_string(), "1640995200".to_string());
filters.insert("endTime".to_string(), "1643673600".to_string());
let events = client.search_events(Some(10), Some(0), filters).await?;
println!("Found {} governance events from Jan 2022", events.data.as_ref().map(|v| v.len()).unwrap_or(0));
```

**Java**
```java
Map<String, String> filters = new HashMap<>();
filters.put("type", "governance");
filters.put("startTime", "1640995200"); // 2022-01-01
filters.put("endTime", "1643673600");   // 2022-02-01
EventListResponse events = client.searchEvents(10, 0, filters);
System.out.printf("Found %d governance events from Jan 2022%n", events.getData().size());
```

**Kotlin**
```kotlin
val filters = mapOf(
    "type" to "governance",
    "startTime" to "1640995200", // 2022-01-01
    "endTime" to "1643673600"    // 2022-02-01
)
val events = client.searchEvents(10, 0, filters)
println("Found ${events.data.size} governance events from Jan 2022")
```

## Export Endpoints

### Export Events as JSON
`GET /export/events.json`

Export events as JSON.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Maximum number of events to export |
| offset | integer | Number of events to skip |
| fields | string | Comma-separated list of fields to include |
| filter | string | Filter to apply |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | JSON export of events |

#### SDK Snippets

**Go**
```go
export, resp, err := client.ExportEventsJSON(context.Background(), 100, 0, "index,timestamp,event_type,submitter", "")
if err != nil {
    log.Fatalf("Failed to export events as JSON: %v", err)
}
fmt.Printf("Exported %d events as JSON\n", len(export.Data))
```

**Rust**
```rust
let export = client.export_events_json(Some(100), Some(0), Some("index,timestamp,event_type,submitter".to_string()), None).await?;
println!("Exported {} events as JSON", export.data.as_ref().map(|v| v.len()).unwrap_or(0));
```

**Java**
```java
ExportResponse export = client.exportEventsJson(100, 0, "index,timestamp,event_type,submitter", "");
System.out.printf("Exported %d events as JSON%n", export.getData().size());
```

**Kotlin**
```kotlin
val export = client.exportEventsJson(100, 0, "index,timestamp,event_type,submitter", null)
println("Exported ${export.data.size} events as JSON")
```

### Export Events as CSV
`GET /export/events.csv`

Export events as CSV.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Maximum number of events to export |
| offset | integer | Number of events to skip |
| fields | string | Comma-separated list of fields to include |
| filter | string | Filter to apply |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | CSV export of events |

#### SDK Snippets

**Go**
```go
csvData, resp, err := client.ExportEventsCSV(context.Background(), 100, 0, "index,timestamp,event_type,submitter", "")
if err != nil {
    log.Fatalf("Failed to export events as CSV: %v", err)
}
fmt.Printf("Exported %d events as CSV (%d bytes)\n", len(export.Data), len(csvData))
```

**Rust**
```rust
let csvData = client.export_events_csv(Some(100), Some(0), Some("index,timestamp,event_type,submitter".to_string()), None).await?;
println!("Exported {} events as CSV ({} bytes)", 
    export.data.as_ref().map(|v| v.len()).unwrap_or(0), csvData.len());
```

**Java**
```java
byte[] csvData = client.exportEventsCsv(100, 0, "index,timestamp,event_type,submitter", "");
System.out.printf("Exported %d events as CSV (%d bytes)%n", 
    export.getData().size(), csvData.length);
```

**Kotlin**
```kotlin
val csvData = client.exportEventsCsv(100, 0, "index,timestamp,event_type,submitter", null)
println("Exported ${export.data.size} events as CSV (${csvData.size} bytes)")
```

### Export Events as Stream
`GET /export/events/stream`

Streaming JSON export of events.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Maximum number of events to export |
| offset | integer | Number of events to skip |
| fields | string | Comma-separated list of fields to include |

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Streaming JSON events |
| Header: X-Export-Status | running, completed, failed |

#### SDK Snippets

**Go**
```go
resp, err := client.ExportEventsStream(context.Background(), 1000, 0, "")
if err != nil {
    log.Fatalf("Failed to start export stream: %v", err)
}
defer resp.Body.Close()

// Process the stream
decoder := json.NewDecoder(resp.Body)
for {
    var event Event
    if err := decoder.Decode(&event); err != nil {
        if err == io.EOF {
            break
        }
        log.Fatalf("Failed to decode event: %v", err)
    }
    fmt.Printf("Event: %d %s %s\n", event.Index, event.EventType, event.Submitter)
}
```

**Rust**
```rust
let mut stream = client.export_events_stream(Some(1000), Some(0), Some("".to_string())).await?;
while let Some(chunk) = stream.chunk().await? {
    let text = std::str::from_utf8(&chunk)?;
    // Process each line as JSON
    for line in text.lines() {
        if let Ok(event) = serde_json::from_str::<Event>(line) {
            println!("Event: {} {} {}", event.index.unwrap_or(0), 
                event.event_type.as_deref().unwrap_or(""), 
                event.submitter.as_deref().unwrap_or(""));
        }
    }
}
```

**Java**
```java
// Note: For streaming, Java SDK provides the raw response which you can process with Jackson's Streaming API
try (CloseableHttpResponse response = client.exportEventsStream(1000, 0, "")) {
    HttpEntity entity = response.getEntity();
    if (entity != null) {
        InputStream input = entity.getContent();
        // Use Jackson's Streaming API to process the stream
        JsonFactory jsonFactory = new JsonFactory();
        JsonParser parser = jsonFactory.createParser(input);
        
        while (!parser.isClosed()) {
            JsonToken jsonToken = parser.nextToken();
            if (jsonToken == JsonToken.START_OBJECT) {
                Event event = parser.readValueAs(Event.class);
                System.out.printf("Event: %d %s %s%n", 
                    event.getIndex(), event.getEventType(), event.getSubmitter());
            }
        }
    }
}
```

**Kotlin**
```kotlin
// Note: For streaming, Kotlin SDK provides the raw response which you can process with Jackson's Streaming API
val response = client.exportEventsStream(1000, 0, "")
response.entity?.content?.use { input ->
    val jsonFactory = JsonFactory()
    val parser = jsonFactory.createParser(input)
    
    while (!parser.isClosed) {
        val jsonToken = parser.nextToken()
        if (jsonToken == JsonToken.START_OBJECT) {
            val event = parser.readValueAs(Event::class.java)
            println("Event: ${event.index} ${event.eventType} ${event.submitter}")
        }
    }
}
```

### Export Progress
`GET /export/progress`

Get export progress status.

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Current export status |

#### SDK Snippets

**Go**
```go
progress, resp, err := client.ExportProgress(context.Background())
if err != nil {
    log.Fatalf("Failed to get export progress: %v", err)
}
fmt.Printf("Export progress: %s\n", string(progress))
```

**Rust**
```rust
let progress = client.export_progress().await?;
println!("Export progress: {}", String::from_utf8_lossy(&progress));
```

**Java**
```java
byte[] progress = client.exportProgress();
System.out.println("Export progress: " + new String(progress, StandardCharsets.UTF_8));
```

**Kotlin**
```kotlin
val progress = client.exportProgress()
println("Export progress: ${String(progress, Charsets.UTF_8)}")
```

## Statistics Endpoint

### Get Statistics
`GET /stats`

Get contract statistics.

#### Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Contract statistics |

#### SDK Snippets

**Go**
```go
stats, resp, err := client.GetStatistics(context.Background())
if err != nil {
    log.Fatalf("Failed to get statistics: %v", err)
}
fmt.Printf("Statistics: totalEvents=%d globalMaxLogs=%d\n", 
    stats.TotalEvents, stats.GlobalMaxLogs)
for (eventType, count) := range stats.EventsByType {
    fmt.Printf("  %s: %d\n", eventType, count)
}
```

**Rust**
```rust
let stats = client.get_statistics().await?;
println!("Statistics: total_events={} global_max_logs={}", 
    stats.total_events.unwrap_or(0), stats.global_max_logs.unwrap_or(0));
for (eventType, count) in stats.events_by_type.unwrap_or_default() {
    println!("  {}: {}", eventType, count);
}
```

**Java**
```java
Statistics stats = client.getStatistics();
System.out.printf("Statistics: totalEvents=%d globalMaxLogs=%d%n",
    stats.getTotalEvents(), stats.getGlobalMaxLogs());
for (Map.Entry<String, Long> entry : stats.getEventsByType().entrySet()) {
    System.out.printf("  %s: %d%n", entry.getKey(), entry.getValue());
}
```

**Kotlin**
```kotlin
val stats = client.getStatistics()
println("Statistics: totalEvents=${stats.totalEvents} globalMaxLogs=${stats.globalMaxLogs}")
for ((eventType, count) in stats.eventsByType) {
    println("  $eventType: $count")
}
```

## Versioning

This documentation corresponds to API version 1.1.0.

SDK versions:
- Go: 0.1.0
- Rust: 0.1.0
- Java/Kotlin: 0.1.0

## Interactive Examples

You can try out the API directly using the following tools:

### Swagger UI
Visit `http://localhost:3002/api/docs` to explore the API interactively.

### cURL Examples
```bash
# Get health status
curl http://localhost:3002/v1/healthz

# List events
curl "http://localhost:3002/v1/events?limit=10&offset=0"

# Get statistics
curl http://localhost:3002/v1/stats
```

## Error Handling

All SDKs return detailed error information when API calls fail.

**Go**: Returns an `error` value that can be checked for `APIError` type
**Rust**: Returns a `Result<T, Error>` where `Error` is an enum with variant `ApiError`
**Java**: Throws `AuditLedgerException` with status code and message
**Kotlin**: Throws `AuditLedgerException` with status code and message

## License

This documentation is part of the AuditLedger project and is licensed under the MIT License.
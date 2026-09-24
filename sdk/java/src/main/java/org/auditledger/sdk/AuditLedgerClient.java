package org.auditledger.sdk;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.classic.methods.HttpRequestBuilder;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * AuditLedger SDK client for Java and Kotlin.
 * Provides both blocking and reactive APIs for interacting with the AuditLedger REST API.
 */
public class AuditLedgerClient {
    private final String baseUrl;
    private final CloseableHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String userAgent;

    /**
     * Create a new AuditLedger client.
     *
     * @param baseUrl The base URL of the AuditLedger API (e.g., "http://localhost:3002/v1")
     */
    public AuditLedgerClient(String baseUrl) {
        this(baseUrl, HttpClients.createDefault());
    }

    /**
     * Create a new AuditLedger client with a custom HTTP client.
     *
     * @param baseUrl      The base URL of the AuditLedger API
     * @param httpClient   Custom HTTP client to use
     */
    public AuditLedgerClient(String baseUrl, CloseableHttpClient httpClient) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.httpClient = Objects.requireNonNull(httpClient);
        this.objectMapper = new ObjectMapper();
        this.userAgent = "audit-ledger-java/0.1.0";
    }

    /**
     * Execute a GET request and deserialize the response.
     *
     * @param path  The API endpoint path
     * @param clazz The class to deserialize the response into
     * @param <T>   The type of the response
     * @return The deserialized response
     * @throws AuditLedgerException If the request fails
     */
    private <T> T get(String path, Class<T> clazz) throws AuditLedgerException {
        HttpGet request = new HttpGet(buildUrl(path));
        request.setHeader(HttpHeaders.USER_AGENT, userAgent);
        return execute(request, clazz);
    }

    /**
     * Execute a POST request and deserialize the response.
     *
     * @param path  The API endpoint path
     * @param body  The request body (can be null)
     * @param clazz The class to deserialize the response into
     * @param <T>   The type of the response
     * @return The deserialized response
     * @throws AuditLedgerException If the request fails
     */
    private <T> T post(String path, Object body, Class<T> clazz) throws AuditLedgerException {
        HttpPost request = new HttpPost(buildUrl(path));
        request.setHeader(HttpHeaders.USER_AGENT, userAgent);
        request.setHeader(HttpHeaders.CONTENT_TYPE, ContentType.APPLICATION_JSON.getMimeType());
        
        if (body != null) {
            try {
                String json = objectMapper.writeValueAsString(body);
                request.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON));
            } catch (IOException e) {
                throw new AuditLedgerException("Failed to serialize request body", e);
            }
        }
        
        return execute(request, clazz);
    }

    /**
     * Execute an HTTP request and deserialize the response.
     *
     * @param request The HTTP request to execute
     * @param clazz   The class to deserialize the response into
     * @param <T>     The type of the response
     * @return The deserialized response
     * @throws AuditLedgerException If the request fails
     */
    private <T> T execute(HttpUriRequestBase request, Class<T> clazz) throws AuditLedgerException {
        try (ClassicHttpResponse response = httpClient.execute(request)) {
            int statusCode = response.getCode();
            HttpEntity entity = response.getEntity();
            
            if (entity == null) {
                throw new AuditLedgerException("Empty response body");
            }
            
            String responseBody;
            try {
                responseBody = EntityUtils.toString(entity);
            } finally {
                EntityUtils.consume(entity);
            }
            
            if (statusCode >= 200 && statusCode < 300) {
                try {
                    return objectMapper.readValue(responseBody, clazz);
                } catch (IOException e) {
                    throw new AuditLedgerException("Failed to parse response: " + responseBody, e);
                }
            } else {
                throw new AuditLedgerException(
                    String.format("API error %d: %s", statusCode, responseBody),
                    statusCode
                );
            }
        } catch (IOException e) {
            throw new AuditLedgerException("I/O error: " + e.getMessage(), e);
        }
    }

    /**
     * Build a full URL from the base URL and path.
     *
     * @param path The API endpoint path
     * @return The full URL
     */
    private String buildUrl(String path) {
        return String.format("%s%s", baseUrl, path);
    }

    // ========== Health Endpoints ==========

    /**
     * Get the health status of the service.
     *
     * @return The health status
     * @throws AuditLedgerException If the request fails
     */
    public HealthStatus getHealth() throws AuditLedgerException {
        return get("/healthz", HealthStatus.class);
    }

    /**
     * Get the readiness status of the service.
     *
     * @return The readiness status
     * @throws AuditLedgerException If the request fails
     */
    public ReadinessStatus getReadiness() throws AuditLedgerException {
        return get("/readyz", ReadinessStatus.class);
    }

    // ========== Metrics Endpoint ==========

    /**
     * Get Prometheus metrics.
     *
     * @return The metrics in Prometheus text format
     * @throws AuditLedgerException If the request fails
     */
    public String getMetrics() throws AuditLedgerException {
        HttpGet request = new HttpGet(buildUrl("/metrics"));
        request.setHeader(HttpHeaders.USER_AGENT, userAgent);
        
        try (ClassicHttpResponse response = httpClient.execute(request)) {
            int statusCode = response.getCode();
            HttpEntity entity = response.getEntity();
            
            if (entity == null) {
                throw new AuditLedgerException("Empty response body");
            }
            
            String responseBody;
            try {
                responseBody = EntityUtils.toString(entity);
            } finally {
                EntityUtils.consume(entity);
            }
            
            if (statusCode >= 200 && statusCode < 300) {
                return responseBody;
            } else {
                throw new AuditLedgerException(
                    String.format("API error %d: %s", statusCode, responseBody),
                    statusCode
                );
            }
        } catch (IOException e) {
            throw new AuditLedgerException("I/O error: " + e.getMessage(), e);
        }
    }

    // ========== Cache Endpoints ==========

    /**
     * Get cache statistics.
     *
     * @return The cache statistics
     * @throws AuditLedgerException If the request fails
     */
    public CacheStats getCacheStats() throws AuditLedgerException {
        return get("/cache/stats", CacheStats.class);
    }

    /**
     * Invalidate the cache.
     *
     * @return The invalidation response
     * @throws AuditLedgerException If the request fails
     */
    public InvalidateCacheResponse invalidateCache() throws AuditLedgerException {
        return post("/cache/invalidate", null, InvalidateCacheResponse.class);
    }

    // ========== Events Endpoints ==========

    /**
     * List events with pagination and filtering.
     *
     * @param limit    Maximum number of events to return (optional)
     * @param offset   Number of events to skip (optional)
     * @param filters  Filters to apply (optional)
     * @return The list of events
     * @throws AuditLedgerException If the request fails
     */
    public EventListResponse listEvents(
            Integer limit,
            Integer offset,
            Map<String, String> filters) throws AuditLedgerException {
        StringBuilder url = new StringBuilder(buildUrl("/events"));
        boolean first = true;
        
        if (limit != null) {
            url.append(first ? "?" : "&").append("limit=").append(limit);
            first = false;
        }
        if (offset != null) {
            url.append(first ? "?" : "&").append("offset=").append(offset);
            first = false;
        }
        if (filters != null) {
            for (Map.Entry<String, String> entry : filters.entrySet()) {
                url.append(first ? "?" : "&")
                   .append(entry.getKey())
                   .append("=")
                   .append(entry.getValue());
                first = false;
            }
        }
        
        HttpGet request = new HttpGet(url.toString());
        request.setHeader(HttpHeaders.USER_AGENT, userAgent);
        return execute(request, EventListResponse.class);
    }

    /**
     * Get an event by its index.
     *
     * @param index The event index
     * @return The event
     * @throws AuditLedgerException If the request fails
     */
    public Event getEvent(long index) throws AuditLedgerException {
        String path = String.format("/events/%d", index);
        EventResponse response = get(path, EventResponse.class);
        return response.getData();
    }

    /**
     * Get events by type.
     *
     * @param eventType The event type to filter by
     * @param limit     Maximum number of events to return (optional)
     * @param offset    Number of events to skip (optional)
     * @return The list of events
     * @throws AuditLedgerException If the request fails
     */
    public EventListResponse getEventsByType(
            String eventType,
            Integer limit,
            Integer offset) throws AuditLedgerException {
        StringBuilder url = new StringBuilder(buildUrl(String.format("/events/type/%s", eventType)));
        boolean first = true;
        
        if (limit != null) {
            url.append(first ? "?" : "&").append("limit=").append(limit);
            first = false;
        }
        if (offset != null) {
            url.append(first ? "?" : "&").append("offset=").append(offset);
            first = false;
        }
        
        HttpGet request = new HttpGet(url.toString());
        request.setHeader(HttpHeaders.USER_AGENT, userAgent);
        return execute(request, EventListResponse.class);
    }

    // ========== Export Endpoints ==========

    /**
     * Export events as JSON.
     *
     * @param limit   Maximum number of events to export (optional)
     * @param offset  Number of events to skip (optional)
     * @param fields  Comma-separated list of fields to include (optional)
     * @param filter  Filter to apply (optional)
     * @return The exported events
     * @throws AuditLedgerException If the request fails
     */
    public ExportResponse exportEventsJson(
            Integer limit,
            Integer offset,
            String fields,
            String filter) throws AuditLedgerException {
        StringBuilder url = new StringBuilder(buildUrl("/export/events.json"));
        boolean first = true;
        
        if (limit != null) {
            url.append(first ? "?" : "&").append("limit=").append(limit);
            first = false;
        }
        if (offset != null) {
            url.append(first ? "?" : "&").append("offset=").append(offset);
            first = false;
        }
        if (fields != null) {
            url.append(first ? "?" : "&").append("fields=").append(fields);
            first = false;
        }
        if (filter != null) {
            url.append(first ? "?" : "&").append("filter=").append(filter);
            first = false;
        }
        
        HttpGet request = new HttpGet(url.toString());
        request.setHeader(HttpHeaders.USER_AGENT, userAgent);
        return execute(request, ExportResponse.class);
    }

    /**
     * Get contract statistics.
     *
     * @return The contract statistics
     * @throws AuditLedgerException If the request fails
     */
    public Statistics getStatistics() throws AuditLedgerException {
        return get("/stats", Statistics.class);
    }

    /**
     * Close the HTTP client and release resources.
     *
     * @throws IOException If an I/O error occurs
     */
    public void close() throws IOException {
        httpClient.close();
    }

    // ========== Data Models ==========

    /**
     * Health status response.
     */
    public static class HealthStatus {
        private String status;
        private Long uptime;
        private String timestamp;

        // Getters and setters
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Long getUptime() { return uptime; }
        public void setUptime(Long uptime) { this.uptime = uptime; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    /**
     * Readiness check for a dependency.
     */
    public static class ReadinessCheck {
        private String status;
        private Long latencyMs;

        // Getters and setters
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Long getLatencyMs() { return latencyMs; }
        public void setLatencyMs(Long latencyMs) { this.latencyMs = latencyMs; }
    }

    /**
     * Readiness status response.
     */
    public static class ReadinessStatus {
        private String status;
        private Map<String, ReadinessCheck> checks;
        private String timestamp;

        // Getters and setters
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Map<String, ReadinessCheck> getChecks() { return checks; }
        public void setChecks(Map<String, ReadinessCheck> checks) { this.checks = checks; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    /**
     * Cache statistics.
     */
    public static class CacheStats {
        private Long hits;
        private Long misses;
        private Long totalRequests;
        private String hitRate;
        private String lastReset;

        // Getters and setters
        public Long getHits() { return hits; }
        public void setHits(Long hits) { this.hits = hits; }
        public Long getMisses() { return misses; }
        public void setMisses(Long misses) { this.misses = misses; }
        public Long getTotalRequests() { return totalRequests; }
        public void setTotalRequests(Long totalRequests) { this.totalRequests = totalRequests; }
        public String getHitRate() { return hitRate; }
        public void setHitRate(String hitRate) { this.hitRate = hitRate; }
        public String getLastReset() { return lastReset; }
        public void setLastReset(String lastReset) { this.lastReset = lastReset; }
    }

    /**
     * An audit event.
     */
    public static class Event {
        private Long index;
        private Long timestamp;
        private String eventType;
        private String submitter;
        private String metadata;
        private String eventHash;
        private String prevHash;

        // Getters and setters
        public Long getIndex() { return index; }
        public void setIndex(Long index) { this.index = index; }
        public Long getTimestamp() { return timestamp; }
        public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public String getSubmitter() { return submitter; }
        public void setSubmitter(String submitter) { this.submitter = submitter; }
        public String getMetadata() { return metadata; }
        public void setMetadata(String metadata) { this.metadata = metadata; }
        public String getEventHash() { return eventHash; }
        public void setEventHash(String eventHash) { this.eventHash = eventHash; }
        public String getPrevHash() { return prevHash; }
        public void setPrevHash(String prevHash) { this.prevHash = prevHash; }
    }

    /**
     * Paginated list of events.
     */
    public static class EventListResponse {
        private java.util.List<Event> data;
        private Long total;
        private Long limit;
        private Long offset;

        // Getters and setters
        public java.util.List<Event> getData() { return data; }
        public void setData(java.util.List<Event> data) { this.data = data; }
        public Long getTotal() { return total; }
        public void setTotal(Long total) { this.total = total; }
        public Long getLimit() { return limit; }
        public void setLimit(Long limit) { this.limit = limit; }
        public Long getOffset() { return offset; }
        public void setOffset(Long offset) { this.offset = offset; }
    }

    /**
     * Contract statistics.
     */
    public static class Statistics {
        private Long totalEvents;
        private Long globalMaxLogs;
        private java.util.Map<String, Long> eventsByType;

        // Getters and setters
        public Long getTotalEvents() { return totalEvents; }
        public void setTotalEvents(Long totalEvents) { this.totalEvents = totalEvents; }
        public Long getGlobalMaxLogs() { return globalMaxLogs; }
        public void setGlobalMaxLogs(Long globalMaxLogs) { this.globalMaxLogs = globalMaxLogs; }
        public java.util.Map<String, Long> getEventsByType() { return eventsByType; }
        public void setEventsByType(java.util.Map<String, Long> eventsByType) { this.eventsByType = eventsByType; }
    }

    /**
     * Export response.
     */
    public static class ExportResponse {
        private java.util.List<Event> data;
        private Long total;

        // Getters and setters
        public java.util.List<Event> getData() { return data; }
        public void setData(java.util.List<Event> data) { this.data = data; }
        public Long getTotal() { return total; }
        public void setTotal(Long total) { this.total = total; }
    }

    /**
     * Invalidate cache response.
     */
    public static class InvalidateCacheResponse {
        private InvalidateCacheData data;

        // Getters and setters
        public InvalidateCacheData getData() { return data; }
        public void setData(InvalidateCacheData data) { this.data = data; }
    }

    /**
     * Invalidate cache data.
     */
    public static class InvalidateCacheData {
        private String message;

        // Getters and setters
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    /**
     * Response wrapper for single event.
     */
    private static class EventResponse {
        private Event data;

        public Event getData() { return data; }
    }

    // ========== Exception ==========

    /**
     * Exception thrown by the AuditLedger SDK.
     */
    public static class AuditLedgerException extends Exception {
        private final int statusCode;

        public AuditLedgerException(String message) {
            super(message);
            this.statusCode = 0;
        }

        public AuditLedgerException(String message, Throwable cause) {
            super(message, cause);
            this.statusCode = 0;
        }

        public AuditLedgerException(String message, int statusCode) {
            super(message);
            this.statusCode = statusCode;
        }

        public AuditLedgerException(String message, int statusCode, Throwable cause) {
            super(message, cause);
            this.statusCode = statusCode;
        }

        public int getStatusCode() {
            return statusCode;
        }
    }

    // ========== Reactive API (using Reactor) ==========

    /**
     * Reactive AuditLedger client using Project Reactor.
     * Provides non-blocking, reactive streams API.
     */
    public static class ReactiveAuditLedgerClient {
        private final AuditLedgerClient blockingClient;

        public ReactiveAuditLedgerClient(AuditLedgerClient blockingClient) {
            this.blockingClient = blockingClient;
        }

        public ReactiveAuditLedgerClient(String baseUrl) {
            this.blockingClient = new AuditLedgerClient(baseUrl);
        }

        public ReactiveAuditLedgerClient(String baseUrl, CloseableHttpClient httpClient) {
            this.blockingClient = new AuditLedgerClient(baseUrl, httpClient);
        }

        public reactor.core.publisher.Mono<HealthStatus> getHealth() {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getHealth();
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<ReadinessStatus> getReadiness() {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getReadiness();
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<String> getMetrics() {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getMetrics();
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<CacheStats> getCacheStats() {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getCacheStats();
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<InvalidateCacheResponse> invalidateCache() {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.invalidateCache();
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<EventListResponse> listEvents(
                Integer limit,
                Integer offset,
                Map<String, String> filters) {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.listEvents(limit, offset, filters);
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<Event> getEvent(long index) {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getEvent(index);
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<EventListResponse> getEventsByType(
                String eventType,
                Integer limit,
                Integer offset) {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getEventsByType(eventType, limit, offset);
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<ExportResponse> exportEventsJson(
                Integer limit,
                Integer offset,
                String fields,
                String filter) {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.exportEventsJson(limit, offset, fields, filter);
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public reactor.core.publisher.Mono<Statistics> getStatistics() {
            return reactor.core.publisher.Mono.fromCallable(() -> {
                try {
                    return blockingClient.getStatistics();
                } catch (AuditLedgerException e) {
                    throw new RuntimeException(e);
                }
            });
        }

        public void close() throws IOException {
            blockingClient.close();
        }
    }
}
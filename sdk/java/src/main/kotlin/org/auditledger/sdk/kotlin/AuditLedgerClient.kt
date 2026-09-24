package org.auditledger.sdk.kotlin

import org.auditledger.sdk.AuditLedgerClient
import org.auditledger.sdk.AuditLedgerClient.ReactiveAuditLedgerClient
import reactor.core.publisher.Mono

/**
 * Kotlin-friendly wrapper for the AuditLedger SDK.
 * Provides idiomatic Kotlin APIs with coroutines support.
 */
class AuditLedgerClientKotlin(
    private val delegate: AuditLedgerClient
) {
    /**
     * Create a new AuditLedger client.
     *
     * @param baseUrl The base URL of the AuditLedger API (e.g., "http://localhost:3002/v1")
     */
    constructor(baseUrl: String) : this(AuditLedgerClient(baseUrl))

    /**
     * Create a new AuditLedger client with a custom HTTP client.
     *
     * @param baseUrl   The base URL of the AuditLedger API
     * @param httpClient Custom HTTP client to use
     */
    constructor(baseUrl: String, httpClient: org.apache.hc.client5.http.classic.CloseableHttpClient) :
        this(AuditLedgerClient(baseUrl, httpClient))

    // ========== Suspend Functions (Coroutines) ==========

    suspend fun getHealth(): org.auditledger.sdk.AuditLedgerClient.HealthStatus =
        delegate.getHealth()

    suspend fun getReadiness(): org.auditledger.sdk.AuditLedgerClient.ReadinessStatus =
        delegate.getReadiness()

    suspend fun getMetrics(): String =
        delegate.getMetrics()

    suspend fun getCacheStats(): org.auditledger.sdk.AuditLedgerClient.CacheStats =
        delegate.getCacheStats()

    suspend fun invalidateCache(): org.auditledger.sdk.AuditLedgerClient.InvalidateCacheResponse =
        delegate.invalidateCache()

    suspend fun listEvents(
        limit: Int?,
        offset: Int?,
        filters: Map<String, String> = emptyMap()
    ): org.auditledger.sdk.AuditLedgerClient.EventListResponse =
        delegate.listEvents(limit, offset, filters)

    suspend fun getEvent(index: Long): org.auditledger.sdk.AuditLedgerClient.Event =
        delegate.getEvent(index)

    suspend fun getEventsByType(
        eventType: String,
        limit: Int?,
        offset: Int?
    ): org.auditledger.sdk.AuditLedgerClient.EventListResponse =
        delegate.getEventsByType(eventType, limit, offset)

    suspend fun exportEventsJson(
        limit: Int?,
        offset: Int?,
        fields: String?,
        filter: String?
    ): org.auditledger.sdk.AuditLedgerClient.ExportResponse =
        delegate.exportEventsJson(limit, offset, fields, filter)

    suspend fun getStatistics(): org.auditledger.sdk.AuditLedgerClient.Statistics =
        delegate.getStatistics()

    fun close() {
        delegate.close()
    }

    // ========== Reactive API (using Reactor Kotlin extensions) ==========

    fun getHealthMono(): Mono<org.auditledger.sdk.AuditLedgerClient.HealthStatus> =
        ReactiveAuditLedgerClient(delegate).getHealth()

    fun getReadinessMono(): Mono<org.auditledger.sdk.AuditLedgerClient.ReadinessStatus> =
        ReactiveAuditLedgerClient(delegate).getReadiness()

    fun getMetricsMono(): Mono<String> =
        ReactiveAuditLedgerClient(delegate).getMetrics()

    fun getCacheStatsMono(): Mono<org.auditledger.sdk.AuditLedgerClient.CacheStats> =
        ReactiveAuditLedgerClient(delegate).getCacheStats()

    fun invalidateCacheMono(): Mono<org.auditledger.sdk.AuditLedgerClient.InvalidateCacheResponse> =
        ReactiveAuditLedgerClient(delegate).invalidateCache()

    fun listEventsMono(
        limit: Int?,
        offset: Int?,
        filters: Map<String, String> = emptyMap()
    ): Mono<org.auditledger.sdk.AuditLedgerClient.EventListResponse> =
        ReactiveAuditLedgerClient(delegate).listEvents(limit, offset, filters)

    fun getEventMono(index: Long): Mono<org.auditledger.sdk.AuditLedgerClient.Event> =
        ReactiveAuditLedgerClient(delegate).getEventMono(index)

    fun getEventsByTypeMono(
        eventType: String,
        limit: Int?,
        offset: Int?
    ): Mono<org.auditledger.sdk.AuditLedgerClient.EventListResponse> =
        ReactiveAuditLedgerClient(delegate).getEventsByTypeMono(eventType, limit, offset)

    fun exportEventsJsonMono(
        limit: Int?,
        offset: Int?,
        fields: String?,
        filter: String?
    ): Mono<org.auditedger.sdk.AuditLedgerClient.ExportResponse> =
        ReactiveAuditLedgerClient(delegate).exportEventsJsonMono(limit, offset, fields, filter)

    fun getStatisticsMono(): Mono<org.auditedger.sdk.AuditLedgerClient.Statistics> =
        ReactiveAuditLedgerClient(delegate).getStatisticsMono()
}

/**
 * Factory functions for easy client creation.
 */
object AuditLedgerClientKotlinFactory {
    /**
     * Create a new AuditLedger client.
     *
     * @param baseUrl The base URL of the AuditLedger API (e.g., "http://localhost:3002/v1")
     * @return A new Kotlin-friendly AuditLedger client
     */
    fun create(baseUrl: String): AuditLedgerClientKotlin =
        AuditLedgerClientKotlin(baseUrl)

    /**
     * Create a new AuditLedger client with a custom HTTP client.
     *
     * @param baseUrl   The base URL of the AuditLedger API
     * @param httpClient Custom HTTP client to use
     * @return A new Kotlin-friendly AuditLedger client
     */
    fun create(
        baseUrl: String,
        httpClient: org.apache.hc.client5.http.classic.CloseableHttpClient
    ): AuditLedgerClientKotlin =
        AuditLedgerClientKotlin(baseUrl, httpClient)
}
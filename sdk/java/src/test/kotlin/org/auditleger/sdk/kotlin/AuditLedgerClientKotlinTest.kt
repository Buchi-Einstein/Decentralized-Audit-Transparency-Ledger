package org.auditleger.sdk.kotlin

import org.auditleger.sdk.kotlin.AuditLedgerClientKotlinFactory.create
import org.junit.jupiter.api.Test
import static org.junit.jupiter.api.Assertions.assertNotNull

class AuditLedgerClientKotlinTest {

    @Test
    fun testClientCreation() {
        val client = create("http://example.com")
        assertNotNull(client)
    }

    @Test
    fun testClientCreationWithCustomHttpClient() {
        val httpClient = org.apache.hc.client5.http.classic.CloseableHttpClient
            org.apache.hc.client5.http.impl.classic.HttpClients.createDefault()
        val client = create("http://example.com", httpClient)
        assertNotNull(client)
    }
}
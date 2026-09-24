package org.auditledger.sdk;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AuditLedgerClientTest {

    @Test
    void testClientCreation() {
        AuditLedgerClient client = new AuditLedgerClient("http://example.com");
        assertNotNull(client);
        // Note: We're not testing actual API calls as they would require a server
    }

    @Test
    void testClientCreationWithCustomHttpClient() {
        org.apache.hc.client5.http.classic.CloseableHttpClient httpClient = 
            org.apache.hc.client5.http.impl.classic.HttpClients.createDefault();
        AuditLedgerClient client = new AuditLedgerClient("http://example.com", httpClient);
        assertNotNull(client);
    }
}
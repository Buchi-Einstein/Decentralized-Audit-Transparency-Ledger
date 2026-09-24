package auditledger

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewClient(t *testing.T) {
	c, err := NewClient("http://example.com")
	if err != nil {
		t.Fatalf("NewClient failed: %v", err)
	}
	if c.baseURL != "http://example.com" {
		t.Errorf("Expected baseURL http://example.com, got %s", c.baseURL)
	}
	if c.httpClient == nil {
		t.Errorf("httpClient should not be nil")
	}
	if c.userAgent != "audit-ledger-go/0.1.0" {
		t.Errorf("Expected userAgent audit-ledger-go/0.1.0, got %s", c.userAgent)
	}
}

func TestNewClientWithOptions(t *testing.T) {
	customClient := &http.Client{Timeout: 5 * time.Second}
	c, err := NewClient("http://example.com", WithHTTPClient(customClient), WithUserAgent("test-agent"))
	if err != nil {
		t.Fatalf("NewClient with options failed: %v", err)
	}
	if c.httpClient != customClient {
		t.Errorf("httpClient should be set to custom client")
	}
	if c.userAgent != "test-agent" {
		t.Errorf("Expected userAgent test-agent, got %s", c.userAgent)
	}
}
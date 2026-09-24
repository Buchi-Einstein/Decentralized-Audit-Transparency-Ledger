// Package auditledger provides a Go client for the AuditLedger REST API.
package auditledger

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client is a Go client for the AuditLedger REST API.
type Client struct {
	baseURL    string
	httpClient *http.Client
	userAgent  string
}

// NewClient creates a new AuditLedger client.
func NewClient(baseURL string, opts ...ClientOption) (*Client, error) {
	if baseURL == "" {
		baseURL = "http://localhost:3002/v1"
	}
	c := &Client{
		baseURL:   strings.TrimRight(baseURL, "/"),
		userAgent: "audit-ledger-go/0.1.0",
	}
	for _, fn := range opts {
		if err := fn(c); err != nil {
			return nil, err
		}
	}
	if c.httpClient == nil {
		c.httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return c, nil
}

// ClientOption is a functional option for Client.
type ClientOption func(*Client) error

// WithHTTPClient sets a custom *http.Client.
func WithHTTPClient(hc *http.Client) ClientOption {
	return func(c *Client) error {
		if hc == nil {
			return fmt.Errorf("http client must not be nil")
		}
		c.httpClient = hc
		return nil
	}
}

// WithUserAgent sets a custom User-Agent.
func WithUserAgent(ua string) ClientOption {
	return func(c *Client) error {
		c.userAgent = ua
		return nil
	}
}

// WithTimeout sets a timeout on the client.
func WithTimeout(d time.Duration) ClientOption {
	return func(c *Client) error {
		if c.httpClient == nil {
			c.httpClient = &http.Client{Timeout: d}
			return nil
		}
		c.httpClient.Timeout = d
		return nil
	}
}

// HealthStatus represents the /healthz response.
type HealthStatus struct {
	Status  string    `json:"status"`
	Uptime  int64     `json:"uptime,omitempty"`
	TS      time.Time `json:"timestamp,omitempty"`
}

// ReadinessStatus represents the /readyz response.
type ReadinessStatus struct {
	Status string                     `json:"status"`
	Checks map[string]ReadinessCheck `json:"checks,omitempty"`
	TS     time.Time                  `json:"timestamp,omitempty"`
}

// ReadinessCheck represents a dependency check in readiness response.
type ReadinessCheck struct {
	Status   string `json:"status"`
	LatencyMs int64  `json:"latencyMs,omitempty"`
}

// CacheStats represents the /cache/stats response.
type CacheStats struct {
	Hits         int64   `json:"hits,omitempty"`
	Misses       int64   `json:"misses,omitempty"`
	TotalRequest int64   `json:"totalRequests,omitempty"`
	HitRate      float64 `json:"hitRate,omitempty"`
	LastReset    string  `json:"lastReset,omitempty"`
}

// MetricsResponse is the raw Prometheus text response.
type MetricsResponse string

// ErrorResponse represents the error body.
type ErrorResponse struct {
	Error   string   `json:"error"`
	Details []string `json:"details,omitempty"`
}

// APIError is an error from the API.
type APIError struct {
	StatusCode int
	Message    string
}

func (e APIError) Error() string {
	return fmt.Sprintf("audit ledger API error %d: %s", e.StatusCode, e.Message)
}

// Event represents an audit event.
type Event struct {
	Index     int64  `json:"index,omitempty"`
	Timestamp int64  `json:"timestamp,omitempty"`
	EventType string `json:"event_type,omitempty"`
	Submitter string `json:"submitter,omitempty"`
	Metadata  string `json:"metadata,omitempty"`
	EventHash string `json:"event_hash,omitempty"`
	PrevHash  string `json:"prev_hash,omitempty"`
}

// EventListResponse represents a paginated list of events.
type EventListResponse struct {
	Data  []Event `json:"data,omitempty"`
	Total int64   `json:"total,omitempty"`
	Limit int64   `json:"limit,omitempty"`
	Offset int64  `json:"offset,omitempty"`
}

// Statistics represents contract statistics.
type Statistics struct {
	TotalEvents   int64            `json:"totalEvents,omitempty"`
	GlobalMaxLogs int64            `json:"globalMaxLogs,omitempty"`
	EventsByType  map[string]int64 `json:"eventsByType,omitempty"`
}

// ExportResponse represents an export response.
type ExportResponse struct {
	Data  []Event `json:"data,omitempty"`
	Total int64   `json:"total,omitempty"`
}

// InvalidateCacheResponse represents the /cache/invalidate response.
type InvalidateCacheResponse struct {
	Data struct {
		Message string `json:"message"`
	} `json:"data"`
}

// String satisfies fmt.Stringer.
func (m MetricsResponse) String() string { return string(m) }

// String satisfies fmt.Stringer.
func (e ErrorResponse) String() string {
	if e.Error != "" {
		return e.Error
	}
	return "unknown error"
}

// String satisfies fmt.Stringer.
func (s HealthStatus) String() string {
	return s.Status
}

// String satisfies fmt.Stringer.
func (r ReadinessStatus) String() string {
	return r.Status
}

// String satisfies fmt.Stringer.
func (c CacheStats) String() string {
	return fmt.Sprintf("CacheStats{hits=%d misses=%d total=%d hitRate=%.2f lastReset=%s}", c.Hits, c.Misses, c.TotalRequest, c.HitRate, c.LastReset)
}

// String satisfies fmt.Stringer.
func (i InvalidateCacheResponse) String() string {
	return i.Data.Message
}

// String satisfies fmt.Stringer.
func (e APIError) String() string {
	return e.Error()
}

// Do executes the request and decodes JSON response into out.
func (c *Client) Do(ctx context.Context, method, path string, in, out interface{}) (*http.Response, error) {
	var body io.Reader
	if in != nil {
		b, err := json.Marshal(in)
		if err != nil {
			return nil, fmt.Errorf("marshal request: %w", err)
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		var apiErr ErrorResponse
		if err := json.Unmarshal(b, &apiErr); err == nil && apiErr.Error != "" {
			return nil, APIError{StatusCode: resp.StatusCode, Message: apiErr.Error}
		}
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(b))
	}
	if out != nil && len(b) > 0 {
		if err := json.Unmarshal(b, out); err != nil {
			return nil, fmt.Errorf("decode response: %w", err)
		}
	}
	return resp, nil
}

// Health gets the health status.
func (c *Client) Health(ctx context.Context) (*HealthStatus, *http.Response, error) {
	var resp HealthStatus
	httpResp, err := c.Do(ctx, http.MethodGet, "/healthz", nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// Readiness gets the readiness status.
func (c *Client) Readiness(ctx context.Context) (*ReadinessStatus, *http.Response, error) {
	var resp ReadinessStatus
	httpResp, err := c.Do(ctx, http.MethodGet, "/readyz", nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// Metrics gets Prometheus metrics.
func (c *Client) Metrics(ctx context.Context) (*MetricsResponse, *http.Response, error) {
	var resp MetricsResponse
	httpResp, err := c.Do(ctx, http.MethodGet, "/metrics", nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// CacheStats gets cache statistics.
func (c *Client) CacheStats(ctx context.Context) (*CacheStats, *http.Response, error) {
	var resp CacheStats
	httpResp, err := c.Do(ctx, http.MethodGet, "/cache/stats", nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// InvalidateCache invalidates the cache.
func (c *Client) InvalidateCache(ctx context.Context) (*InvalidateCacheResponse, *http.Response, error) {
	var resp InvalidateCacheResponse
	httpResp, err := c.Do(ctx, http.MethodPost, "/cache/invalidate", nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// ListEvents lists events with pagination and filtering.
func (c *Client) ListEvents(ctx context.Context, limit, offset int64, filters map[string]string) (*EventListResponse, *http.Response, error) {
	u, _ := url.Parse(c.baseURL + "/events")
	q := u.Query()
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}
	if offset >= 0 {
		q.Set("offset", fmt.Sprintf("%d", offset))
	}
	for k, v := range filters {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()
	var resp EventListResponse
	httpResp, err := c.Do(ctx, http.MethodGet, u.Path+"?"+u.RawQuery, nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// GetEvent gets an event by index.
func (c *Client) GetEvent(ctx context.Context, index int64) (*Event, *http.Response, error) {
	var resp struct {
		Data Event `json:"data,omitempty"`
	}
	path := fmt.Sprintf("/events/%d", index)
	httpResp, err := c.Do(ctx, http.MethodGet, path, nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp.Data, httpResp, nil
}

// GetEventsByType gets events by type.
func (c *Client) GetEventsByType(ctx context.Context, eventType string, limit, offset int64) (*EventListResponse, *http.Response, error) {
	u, _ := url.Parse(c.baseURL + "/events/type/" + url.PathEscape(eventType))
	q := u.Query()
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}
	if offset >= 0 {
		q.Set("offset", fmt.Sprintf("%d", offset))
	}
	u.RawQuery = q.Encode()
	var resp EventListResponse
	httpResp, err := c.Do(ctx, http.MethodGet, u.Path+"?"+u.RawQuery, nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// SearchEvents searches events.
func (c *Client) SearchEvents(ctx context.Context, limit, offset int64, filters map[string]string) (*EventListResponse, *http.Response, error) {
	u, _ := url.Parse(c.baseURL + "/events/search")
	q := u.Query()
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}
	if offset >= 0 {
		q.Set("offset", fmt.Sprintf("%d", offset))
	}
	for k, v := range filters {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()
	var resp EventListResponse
	httpResp, err := c.Do(ctx, http.MethodGet, u.Path+"?"+u.RawQuery, nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// ExportEventsJSON exports events as JSON.
func (c *Client) ExportEventsJSON(ctx context.Context, limit, offset int64, fields, filter string) (*ExportResponse, *http.Response, error) {
	u, _ := url.Parse(c.baseURL + "/export/events.json")
	q := u.Query()
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}
	if offset >= 0 {
		q.Set("offset", fmt.Sprintf("%d", offset))
	}
	if fields != "" {
		q.Set("fields", fields)
	}
	if filter != "" {
		q.Set("filter", filter)
	}
	u.RawQuery = q.Encode()
	var resp ExportResponse
	httpResp, err := c.Do(ctx, http.MethodGet, u.Path+"?"+u.RawQuery, nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// ExportEventsCSV exports events as CSV.
func (c *Client) ExportEventsCSV(ctx context.Context, limit, offset int64, fields, filter string) ([]byte, *http.Response, error) {
	u, _ := url.Parse(c.baseURL + "/export/events.csv")
	q := u.Query()
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}
	if offset >= 0 {
		q.Set("offset", fmt.Sprintf("%d", offset))
	}
	if fields != "" {
		q.Set("fields", fields)
	}
	if filter != "" {
		q.Set("filter", filter)
	}
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Accept", "text/csv")
	req.Header.Set("User-Agent", c.userAgent)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, resp, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		var apiErr ErrorResponse
		if err := json.Unmarshal(body, &apiErr); err == nil && apiErr.Error != "" {
			return nil, resp, APIError{StatusCode: resp.StatusCode, Message: apiErr.Error}
		}
		return nil, resp, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp, fmt.Errorf("read body: %w", err)
	}
	return body, resp, nil
}

// ExportEventsStream exports events as a stream.
func (c *Client) ExportEventsStream(ctx context.Context, limit, offset int64, fields string) (*http.Response, error) {
	u, _ := url.Parse(c.baseURL + "/export/events/stream")
	q := u.Query()
	if limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", limit))
	}
	if offset >= 0 {
		q.Set("offset", fmt.Sprintf("%d", offset))
	}
	if fields != "" {
		q.Set("fields", fields)
	}
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		var apiErr ErrorResponse
		if err := json.Unmarshal(body, &apiErr); err == nil && apiErr.Error != "" {
			resp.Body.Close()
			return nil, APIError{StatusCode: resp.StatusCode, Message: apiErr.Error}
		}
		resp.Body.Close()
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
	return resp, nil
}

// ExportProgress gets export progress.
func (c *Client) ExportProgress(ctx context.Context) ([]byte, *http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/export/progress", nil)
	if err != nil {
		return nil, nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, resp, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		var apiErr ErrorResponse
		if err := json.Unmarshal(body, &apiErr); err == nil && apiErr.Error != "" {
			return nil, resp, APIError{StatusCode: resp.StatusCode, Message: apiErr.Error}
		}
		return nil, resp, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp, fmt.Errorf("read body: %w", err)
	}
	return body, resp, nil
}

// GetStatistics gets contract statistics.
func (c *Client) GetStatistics(ctx context.Context) (*Statistics, *http.Response, error) {
	var resp Statistics
	httpResp, err := c.Do(ctx, http.MethodGet, "/stats", nil, &resp)
	if err != nil {
		return nil, httpResp, err
	}
	return &resp, httpResp, nil
}

// Close closes the HTTP client.
func (c *Client) Close() error {
	if closer, ok := c.httpClient.(interface{ Close() error }); ok {
		return closer.Close()
	}
	return nil
}
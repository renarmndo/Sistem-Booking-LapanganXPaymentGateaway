package midtrans

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"sistem-booking/internal/config"
)

const (
	sandboxSnapBaseURL    = "https://app.sandbox.midtrans.com"
	productionSnapBaseURL = "https://app.midtrans.com"
	sandboxAPIBaseURL     = "https://api.sandbox.midtrans.com"
	productionAPIBaseURL  = "https://api.midtrans.com"
	defaultTimeout        = 10 * time.Second
	maxGETRetries         = 2
)

type Client struct {
	serverKey   string
	clientKey   string
	snapBaseURL string
	apiBaseURL  string
	httpClient  *http.Client
}

func NewClient(cfg config.MidtransConfig) *Client {
	snapURL := sandboxSnapBaseURL
	apiURL := sandboxAPIBaseURL
	if cfg.IsProduction {
		snapURL = productionSnapBaseURL
		apiURL = productionAPIBaseURL
	}
	return &Client{
		serverKey:   strings.TrimSpace(cfg.ServerKey),
		clientKey:   strings.TrimSpace(cfg.ClientKey),
		snapBaseURL: snapURL,
		apiBaseURL:  apiURL,
		httpClient:  &http.Client{Timeout: defaultTimeout},
	}
}

func (c *Client) authHeader() string {
	encoded := base64.StdEncoding.EncodeToString([]byte(c.serverKey + ":"))
	return "Basic " + encoded
}

func (c *Client) doJSON(ctx context.Context, method, fullURL string, reqBody any, respBody any, retries int) error {
	var bodyBytes []byte
	if reqBody != nil {
		var err error
		bodyBytes, err = json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("marshal midtrans request: %w", err)
		}
	}

	var lastErr error
	for attempt := 0; attempt <= retries; attempt++ {
		var bodyReader io.Reader
		if bodyBytes != nil {
			bodyReader = bytes.NewReader(bodyBytes)
		}

		req, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)
		if err != nil {
			return fmt.Errorf("build midtrans request: %w", err)
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", c.authHeader())

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt < retries {
				time.Sleep(150 * time.Millisecond)
				continue
			}
			return fmt.Errorf("midtrans request failed: %w", err)
		}

		raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		_ = resp.Body.Close()
		if readErr != nil {
			return fmt.Errorf("read midtrans response: %w", readErr)
		}

		if resp.StatusCode >= 500 && attempt < retries {
			lastErr = fmt.Errorf("midtrans status %d", resp.StatusCode)
			time.Sleep(150 * time.Millisecond)
			continue
		}
		if resp.StatusCode >= 400 {
			return fmt.Errorf("midtrans error status %d: %s", resp.StatusCode, string(raw))
		}

		if respBody != nil && len(raw) > 0 {
			if err := json.Unmarshal(raw, respBody); err != nil {
				return fmt.Errorf("decode midtrans response: %w", err)
			}
		}
		return nil
	}

	return lastErr
}

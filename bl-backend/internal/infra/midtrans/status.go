package midtrans

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

func (c *Client) GetTransactionStatus(ctx context.Context, orderID string) (*TransactionStatusResponse, error) {
	endpoint := fmt.Sprintf("%s/v2/%s/status", c.apiBaseURL, url.PathEscape(orderID))
	var out TransactionStatusResponse
	if err := c.doJSON(ctx, http.MethodGet, endpoint, nil, &out, maxGETRetries); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) CancelTransaction(ctx context.Context, orderID string) error {
	endpoint := fmt.Sprintf("%s/v2/%s/cancel", c.apiBaseURL, url.PathEscape(orderID))
	return c.doJSON(ctx, http.MethodPost, endpoint, nil, nil, 0)
}

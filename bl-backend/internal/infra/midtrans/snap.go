package midtrans

import (
	"context"
	"math"
	"net/http"
	"time"
)

func (c *Client) CreateSnapTransaction(ctx context.Context, req SnapRequest) (*SnapResponse, error) {
	if req.Expiry == nil && !req.ExpiresAt.IsZero() {
		now := time.Now().In(req.ExpiresAt.Location())
		mins := int(math.Ceil(req.ExpiresAt.Sub(now).Minutes()))
		if mins < 1 {
			mins = 1
		}
		req.Expiry = &ExpiryConfig{
			StartTime: now.Format("2006-01-02 15:04:05 -0700"),
			Unit:      "minutes",
			Duration:  mins,
		}
	}

	var out SnapResponse
	err := c.doJSON(ctx, http.MethodPost, c.snapBaseURL+"/snap/v1/transactions", req, &out, 0)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

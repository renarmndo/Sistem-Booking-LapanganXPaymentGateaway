package midtrans

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"sistem-booking/internal/config"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func computeTestSig(orderID, statusCode, grossAmount, serverKey string) string {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	return hex.EncodeToString(sum[:])
}

func TestVerifySignature(t *testing.T) {
	client := NewClient(config.MidtransConfig{ServerKey: "SB-Mid-server-secret"})
	validSig := computeTestSig("BK-001", "200", "250000.00", "SB-Mid-server-secret")

	tests := []struct {
		name        string
		orderID     string
		statusCode  string
		grossAmount string
		sig         string
		want        bool
	}{
		{"valid signature", "BK-001", "200", "250000.00", validSig, true},
		{"tampered order_id", "BK-002", "200", "250000.00", validSig, false},
		{"tampered status_code", "BK-001", "201", "250000.00", validSig, false},
		{"tampered gross_amount", "BK-001", "200", "1000.00", validSig, false},
		{"empty signature", "BK-001", "200", "250000.00", "", false},
		{"wrong length signature", "BK-001", "200", "250000.00", "deadbeef", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := client.VerifySignature(tc.orderID, tc.statusCode, tc.grossAmount, tc.sig); got != tc.want {
				t.Fatalf("VerifySignature() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestCreateSnapAndGetStatus_HTTPMock(t *testing.T) {
	client := NewClient(config.MidtransConfig{ServerKey: "test-key"})
	client.httpClient = &http.Client{
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			var bodyBytes []byte
			switch r.URL.Path {
			case "/snap/v1/transactions":
				bodyBytes, _ = json.Marshal(SnapResponse{
					Token:       "snap-tok-123",
					RedirectURL: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-tok-123",
				})
			case "/v2/BK-001/status":
				bodyBytes, _ = json.Marshal(TransactionStatusResponse{
					OrderID:           "BK-001",
					TransactionID:     "tx-99",
					TransactionStatus: "settlement",
					PaymentType:       "qris",
					GrossAmount:       "250000.00",
					StatusCode:        "200",
				})
			default:
				return &http.Response{
					StatusCode: http.StatusNotFound,
					Body:       io.NopCloser(bytes.NewReader(nil)),
					Header:     make(http.Header),
				}, nil
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewReader(bodyBytes)),
				Header:     http.Header{"Content-Type": []string{"application/json"}},
			}, nil
		}),
	}

	snapRes, err := client.CreateSnapTransaction(context.Background(), SnapRequest{
		TransactionDetails: TransactionDetails{OrderID: "BK-001", GrossAmount: 250000},
		ExpiresAt:          time.Now().Add(15 * time.Minute),
	})
	if err != nil || snapRes.Token != "snap-tok-123" {
		t.Fatalf("CreateSnapTransaction failed: res=%+v err=%v", snapRes, err)
	}

	statusRes, err := client.GetTransactionStatus(context.Background(), "BK-001")
	if err != nil || statusRes.TransactionStatus != "settlement" {
		t.Fatalf("GetTransactionStatus failed: res=%+v err=%v", statusRes, err)
	}
}

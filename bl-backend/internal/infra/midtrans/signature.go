package midtrans

import (
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"strings"
)

// VerifySignature validates Midtrans SHA512(order_id + status_code + gross_amount + ServerKey)
// using constant-time comparison to prevent timing side-channel attacks.
func (c *Client) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	if c.serverKey == "" || signatureKey == "" {
		return false
	}
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + c.serverKey))
	expectedHex := hex.EncodeToString(sum[:])
	providedHex := strings.ToLower(strings.TrimSpace(signatureKey))

	if len(expectedHex) != len(providedHex) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(expectedHex), []byte(providedHex)) == 1
}

package random

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"math/big"
	"time"
)

const bookingAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func BookingCode(now time.Time) (string, error) {
	value, err := randomString(6, bookingAlphabet)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("BK-%s-%s", now.Format("20060102"), value), nil
}

func GenerateOTP(length int) (string, error) {
	if length < 1 {
		return "", fmt.Errorf("OTP length must be positive")
	}
	return randomString(length, "1234567890")
}

// Token generates a cryptographically random URL-safe token from byteLen random bytes.
func Token(byteLen int) (string, error) {
	if byteLen < 1 {
		return "", fmt.Errorf("token byte length must be positive")
	}
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// UUID generates a random RFC 4122 v4 UUID string.
func UUID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16]), nil
}

func randomString(length int, alphabet string) (string, error) {
	result := make([]byte, length)
	max := big.NewInt(int64(len(alphabet)))
	for i := range result {
		index, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		result[i] = alphabet[index.Int64()]
	}
	return string(result), nil
}

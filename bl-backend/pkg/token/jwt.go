package token

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint   `json:"sub"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func Generate(userID uint, role, secret string, ttl time.Duration) (string, error) {
	if secret == "" {
		return "", errors.New("token secret is required")
	}
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprint(userID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			ID:        fmt.Sprintf("%d-%d", userID, now.UnixNano()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func Parse(raw, secret string) (*Claims, error) {
	if raw == "" || secret == "" {
		return nil, errors.New("token and secret are required")
	}
	parsed, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %s", t.Method.Alg())
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token claims")
	}
	return claims, nil
}

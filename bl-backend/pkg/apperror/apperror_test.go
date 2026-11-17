package apperror

import (
	"errors"
	"testing"
)

func TestConstructors(t *testing.T) {
	cause := errors.New("database failed")
	tests := []struct {
		name   string
		make   func() *AppError
		status int
	}{
		{"bad request", func() *AppError { return BadRequest("BAD", "bad", cause) }, 400},
		{"unauthorized", func() *AppError { return Unauthorized("AUTH", "auth") }, 401},
		{"forbidden", func() *AppError { return Forbidden("FORBIDDEN", "forbidden") }, 403},
		{"not found", func() *AppError { return NotFound("NOT_FOUND", "missing") }, 404},
		{"conflict", func() *AppError { return Conflict("CONFLICT", "conflict") }, 409},
		{"unprocessable", func() *AppError { return Unprocessable("INVALID", "invalid") }, 422},
		{"internal", func() *AppError { return Internal("INTERNAL", "internal") }, 500},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.make()
			if err.HTTPStatus != tt.status || err.Code == "" || err.Message == "" {
				t.Fatalf("unexpected error: %+v", err)
			}
		})
	}
	if !errors.Is(BadRequest("BAD", "bad", cause), cause) {
		t.Fatal("cause was not unwrap-able")
	}
}

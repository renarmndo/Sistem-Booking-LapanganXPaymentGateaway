package response

import (
	"errors"
	"testing"

	"sistem-booking/pkg/apperror"
)

func TestResponseFactories(t *testing.T) {
	status, body := Success("ok", map[string]string{"id": "1"})
	if status != 200 || !body.Success || body.Data == nil {
		t.Fatalf("unexpected success response: %+v", body)
	}
	status, body = Created("created", nil)
	if status != 201 || !body.Success {
		t.Fatalf("unexpected created response: %+v", body)
	}
	status, body = Fail("bad", "BAD_REQUEST", FieldError{Field: "name", Message: "invalid"})
	if status != 400 || body.Success || body.Code != "BAD_REQUEST" || len(body.Errors) != 1 {
		t.Fatalf("unexpected failure response: %+v", body)
	}
	status, body = ValidationError("invalid", FieldError{Field: "email", Message: "Email tidak valid"})
	if status != 400 || body.Success || len(body.Errors) != 1 {
		t.Fatalf("unexpected validation response: %+v", body)
	}
}

func TestFromError(t *testing.T) {
	status, body := FromError(apperror.NotFound("NOT_FOUND", "Tidak ditemukan"))
	if status != 404 || body.Code != "NOT_FOUND" {
		t.Fatalf("unexpected app error response: %+v", body)
	}
	status, body = FromError(errors.New("secret database detail"))
	if status != 500 || body.Message == "secret database detail" {
		t.Fatalf("internal error leaked: %+v", body)
	}
}

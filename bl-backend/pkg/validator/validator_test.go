package validator

import "testing"

type registerInput struct {
	Email string `json:"email" validate:"required,email"`
	Name  string `json:"name" validate:"required,min=2"`
}

type ruleInput struct {
	Text   string `json:"text" validate:"max=2"`
	Number int    `json:"number" validate:"gt=10"`
	Role   string `json:"role" validate:"oneof=user admin"`
}

func TestStructUsesJSONFieldNamesAndIndonesianMessages(t *testing.T) {
	errs := New().Struct(registerInput{Email: "invalid", Name: ""})
	if len(errs) != 2 {
		t.Fatalf("error count = %d, want 2", len(errs))
	}
	if errs[0].Field != "email" || errs[0].Message == "" {
		t.Fatalf("unexpected first error: %+v", errs[0])
	}
	if errs[1].Field != "name" || errs[1].Message != "Wajib diisi" {
		t.Fatalf("unexpected second error: %+v", errs[1])
	}
}

func TestStructValid(t *testing.T) {
	if errs := New().Struct(registerInput{Email: "user@example.com", Name: "User"}); errs != nil {
		t.Fatalf("unexpected validation errors: %+v", errs)
	}
}

func TestValidationMessages(t *testing.T) {
	errs := New().Struct(ruleInput{Text: "long", Number: 1, Role: "owner"})
	if len(errs) != 3 {
		t.Fatalf("error count = %d, want 3", len(errs))
	}
	messages := map[string]string{}
	for _, err := range errs {
		messages[err.Field] = err.Message
	}
	if messages["text"] != "Nilai terlalu panjang" ||
		messages["number"] != "Nilai harus lebih besar dari batas minimum" ||
		messages["role"] != "Nilai tidak termasuk pilihan yang tersedia" {
		t.Fatalf("unexpected messages: %+v", messages)
	}
}

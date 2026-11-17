package validator

import (
	"reflect"
	"strings"

	"sistem-booking/pkg/response"

	goValidator "github.com/go-playground/validator/v10"
)

type Validator struct {
	engine *goValidator.Validate
}

func New() *Validator {
	engine := goValidator.New()
	engine.RegisterTagNameFunc(func(field reflect.StructField) string {
		name := strings.Split(field.Tag.Get("json"), ",")[0]
		if name == "-" || name == "" {
			return field.Name
		}
		return name
	})
	return &Validator{engine: engine}
}

func (v *Validator) Struct(value any) []response.FieldError {
	err := v.engine.Struct(value)
	if err == nil {
		return nil
	}
	validationErrors, ok := err.(goValidator.ValidationErrors)
	if !ok {
		return []response.FieldError{{Field: "body", Message: "Format data tidak valid"}}
	}
	result := make([]response.FieldError, 0, len(validationErrors))
	for _, fieldErr := range validationErrors {
		result = append(result, response.FieldError{
			Field:   fieldErr.Field(),
			Message: messageFor(fieldErr),
		})
	}
	return result
}

func messageFor(err goValidator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "Wajib diisi"
	case "email":
		return "Format email tidak valid"
	case "min":
		return "Nilai terlalu pendek"
	case "max":
		return "Nilai terlalu panjang"
	case "gt":
		return "Nilai harus lebih besar dari batas minimum"
	case "oneof":
		return "Nilai tidak termasuk pilihan yang tersedia"
	case "len":
		return "Panjang karakter tidak sesuai"
	case "numeric":
		return "Harus berupa angka"
	default:
		return "Nilai tidak valid"
	}
}

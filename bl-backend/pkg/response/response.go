package response

import (
	"errors"
	"net/http"

	"sistem-booking/pkg/apperror"
)

type Body struct {
	Success bool         `json:"success"`
	Message string       `json:"message"`
	Code    string       `json:"code,omitempty"`
	Data    any          `json:"data"`
	Errors  []FieldError `json:"errors"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func Success(message string, data any) (int, Body) {
	return http.StatusOK, Body{Success: true, Message: message, Data: data}
}

func Created(message string, data any) (int, Body) {
	return http.StatusCreated, Body{Success: true, Message: message, Data: data}
}

func Fail(message, code string, fieldErrors ...FieldError) (int, Body) {
	status := http.StatusBadRequest
	if code == "" {
		code = "BAD_REQUEST"
	}
	return status, Body{Success: false, Message: message, Code: code, Errors: fieldErrors}
}

func FromError(err error) (int, Body) {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		return appErr.HTTPStatus, Body{Success: false, Message: appErr.Message, Code: appErr.Code}
	}
	return http.StatusInternalServerError, Body{Success: false, Message: "Terjadi kesalahan pada server"}
}

func ValidationError(message string, fieldErrors ...FieldError) (int, Body) {
	return http.StatusBadRequest, Body{Success: false, Message: message, Errors: fieldErrors}
}

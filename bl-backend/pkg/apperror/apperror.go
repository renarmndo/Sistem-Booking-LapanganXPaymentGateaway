package apperror

import "fmt"

type AppError struct {
	Code       string
	Message    string
	HTTPStatus int
	Err        error
}

func (e *AppError) Error() string {
	if e.Err == nil {
		return e.Message
	}
	return fmt.Sprintf("%s: %v", e.Message, e.Err)
}

func (e *AppError) Unwrap() error { return e.Err }

func New(code, message string, status int, cause error) *AppError {
	return &AppError{Code: code, Message: message, HTTPStatus: status, Err: cause}
}

func BadRequest(code, message string, cause ...error) *AppError {
	return New(code, message, 400, first(cause))
}

func Unauthorized(code, message string, cause ...error) *AppError {
	return New(code, message, 401, first(cause))
}

func Forbidden(code, message string, cause ...error) *AppError {
	return New(code, message, 403, first(cause))
}

func NotFound(code, message string, cause ...error) *AppError {
	return New(code, message, 404, first(cause))
}

func Conflict(code, message string, cause ...error) *AppError {
	return New(code, message, 409, first(cause))
}

func Unprocessable(code, message string, cause ...error) *AppError {
	return New(code, message, 422, first(cause))
}

func Internal(code, message string, cause ...error) *AppError {
	return New(code, message, 500, first(cause))
}

func TooManyRequests(code, message string, cause ...error) *AppError {
	return New(code, message, 429, first(cause))
}

func first(errs []error) error {
	if len(errs) == 0 {
		return nil
	}
	return errs[0]
}

package middleware

import (
	"encoding/json"
	"net/http"
)

func writeJSONError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Code    string `json:"code"`
	}{false, message, code})
}

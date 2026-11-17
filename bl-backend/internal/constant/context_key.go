package constant

type ContextKey string

const (
	ContextUserID    ContextKey = "user_id"
	ContextRole      ContextKey = "role"
	ContextRequestID ContextKey = "request_id"
)

package constant

import "fmt"

func SlotLockKey(fieldID uint, date, start string) string {
	return fmt.Sprintf("lock:slot:%d:%s:%s", fieldID, date, start)
}

func RateLimitKey(scope, identifier string) string {
	return fmt.Sprintf("rl:%s:%s", scope, identifier)
}

func IdemKey(orderID, status, transactionID string) string {
	return fmt.Sprintf("idem:webhook:%s:%s:%s", orderID, status, transactionID)
}

func OtpRateLimitKey(email string) string {
	return fmt.Sprintf("rl:otp:%s", email)
}

func OtpAttemptKey(email string) string {
	return fmt.Sprintf("otp:attempts:%s", email)
}

const FieldsListCachePrefix = "cache:fields:list"

func FieldsListCacheKey(queryHash string) string {
	return fmt.Sprintf("%s:%s", FieldsListCachePrefix, queryHash)
}

func AvailCacheKey(fieldID uint, date string) string {
	return fmt.Sprintf("cache:avail:%d:%s", fieldID, date)
}

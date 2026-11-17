package timeutil

import "time"

const (
	DateLayout  = "2006-01-02"
	ClockLayout = "15:04"
)

var WIB = mustLocation("Asia/Jakarta")

func Now() time.Time { return time.Now().In(WIB) }

func StartOfDay(value time.Time) time.Time {
	local := value.In(WIB)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, WIB)
}

func ParseDate(value string) (time.Time, error) { return time.ParseInLocation(DateLayout, value, WIB) }

func ParseClock(value string) (time.Time, error) {
	return time.ParseInLocation(ClockLayout, value, WIB)
}

func IsPast(value time.Time) bool { return value.Before(Now()) }

func mustLocation(name string) *time.Location {
	location, err := time.LoadLocation(name)
	if err != nil {
		panic(err)
	}
	return location
}

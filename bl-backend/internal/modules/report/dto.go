package report

import "time"

type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type PendingBookingItem struct {
	ID          uint       `json:"id"`
	Code        string     `json:"code"`
	FieldName   string     `json:"field_name"`
	TotalAmount int64      `json:"total_amount"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

type DailyTrendPoint struct {
	Date     string `json:"date"`
	Bookings int64  `json:"bookings"`
	Revenue  int64  `json:"revenue"`
}

type TopFieldItem struct {
	FieldID   uint   `json:"field_id"`
	FieldName string `json:"field_name"`
	Bookings  int64  `json:"bookings"`
	Revenue   int64  `json:"revenue"`
}

type PeakHourItem struct {
	Hour     string `json:"hour"`
	Bookings int64  `json:"bookings"`
}

type AdminDashboardSummary struct {
	From             string               `json:"from"`
	To               string               `json:"to"`
	TotalBookings    int64                `json:"total_bookings"`
	OnlineBookings   int64                `json:"online_bookings"`
	OfflineBookings  int64                `json:"offline_bookings"`
	PaidRevenue      int64                `json:"paid_revenue"`
	NeedsReviewCount int64                `json:"needs_review_count"`
	StatusCounts     map[string]int64     `json:"status_counts"`
	PendingBookings  []PendingBookingItem `json:"pending_bookings"`
	DailyTrend       []DailyTrendPoint    `json:"daily_trend"`
	TopFields        []TopFieldItem       `json:"top_fields"`
	PeakHours        []PeakHourItem       `json:"peak_hours"`
}

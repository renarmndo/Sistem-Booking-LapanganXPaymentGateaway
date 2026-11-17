package report

import (
	"time"

	"sistem-booking/pkg/pagination"
)

type OwnerFieldItem struct {
	ID               uint    `json:"id"`
	Name             string  `json:"name"`
	Slug             string  `json:"slug"`
	SurfaceType      string  `json:"surface_type"`
	Capacity         uint    `json:"capacity"`
	IsActive         bool    `json:"is_active"`
	CoverURL         string  `json:"cover_url"`
	MonthRevenue     int64   `json:"month_revenue"`
	MonthUtilization float64 `json:"month_utilization"`
}

type OwnerScheduleBooking struct {
	ID           uint   `json:"id"`
	Code         string `json:"code"`
	FieldID      uint   `json:"field_id"`
	FieldName    string `json:"field_name"`
	BookingDate  string `json:"booking_date"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	Status       string `json:"status"`
	Source       string `json:"source"`
	CustomerName string `json:"customer_name"`
	TotalAmount  int64  `json:"total_amount"`
}

type OwnerScheduleBlock struct {
	ID            uint      `json:"id"`
	FieldID       uint      `json:"field_id"`
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
	Reason        string    `json:"reason"`
}

type OwnerScheduleResponse struct {
	From     string                 `json:"from"`
	To       string                 `json:"to"`
	Bookings []OwnerScheduleBooking `json:"bookings"`
	Blocks   []OwnerScheduleBlock   `json:"blocks"`
}

type OwnerBookingFilter struct {
	FieldID *uint
	Status  string
	Source  string
	From    string
	To      string
	Query   string
	Page    pagination.Query
}

type OwnerBookingItem struct {
	ID            uint      `json:"id"`
	Code          string    `json:"code"`
	FieldID       uint      `json:"field_id"`
	FieldName     string    `json:"field_name"`
	BookingDate   string    `json:"booking_date"`
	StartTime     string    `json:"start_time"`
	EndTime       string    `json:"end_time"`
	TotalAmount   int64     `json:"total_amount"`
	Status        string    `json:"status"`
	Source        string    `json:"source"`
	CustomerName  string    `json:"customer_name"`
	CustomerPhone string    `json:"customer_phone"`
	PaymentStatus string    `json:"payment_status"`
	PaymentMethod string    `json:"payment_method"`
	CreatedAt     time.Time `json:"created_at"`
}

type PaginatedOwnerBookingsResponse struct {
	Items []OwnerBookingItem `json:"items"`
	Meta  pagination.Meta    `json:"meta"`
}

type OwnerTransactionFilter struct {
	FieldID *uint
	Status  string
	Method  string
	From    string
	To      string
	Page    pagination.Query
}

type OwnerTransactionItem struct {
	ID          uint       `json:"id"`
	BookingID   uint       `json:"booking_id"`
	BookingCode string     `json:"booking_code"`
	FieldID     uint       `json:"field_id"`
	FieldName   string     `json:"field_name"`
	OrderID     string     `json:"order_id"`
	Method      string     `json:"method"`
	Channel     string     `json:"channel"`
	Amount      int64      `json:"amount"`
	Status      string     `json:"status"`
	PaidAt      *time.Time `json:"paid_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type PaginatedOwnerTransactionsResponse struct {
	Items     []OwnerTransactionItem `json:"items"`
	TotalPaid int64                  `json:"total_paid"`
	Meta      pagination.Meta        `json:"meta"`
}

type OwnerDashboardSummary struct {
	From               string                 `json:"from"`
	To                 string                 `json:"to"`
	TotalRevenue       int64                  `json:"total_revenue"`
	PreviousRevenue    int64                  `json:"previous_revenue"`
	RevenueGrowthPct   float64                `json:"revenue_growth_pct"`
	TotalBookings      int64                  `json:"total_bookings"`
	AverageUtilization float64                `json:"average_utilization"`
	UpcomingBookings   []OwnerScheduleBooking `json:"upcoming_bookings"`
	FieldUtilizations  []FieldUtilizationCalc `json:"field_utilizations"`
}

type RevenuePoint struct {
	Period         string `json:"period"`
	OnlineRevenue  int64  `json:"online_revenue"`
	OfflineRevenue int64  `json:"offline_revenue"`
	TotalRevenue   int64  `json:"total_revenue"`
	Bookings       int64  `json:"bookings"`
}

type RevenueReportResponse struct {
	From               string         `json:"from"`
	To                 string         `json:"to"`
	Group              string         `json:"group"`
	TotalRevenue       int64          `json:"total_revenue"`
	OnlineRevenue      int64          `json:"online_revenue"`
	OfflineRevenue     int64          `json:"offline_revenue"`
	PreviousRevenue    int64          `json:"previous_revenue"`
	RevenueGrowthPct   float64        `json:"revenue_growth_pct"`
	Series             []RevenuePoint `json:"series"`
}

type HeatmapCell struct {
	DayOfWeek int    `json:"day_of_week"`
	Hour      string `json:"hour"`
	Count     int64  `json:"count"`
}

type UtilizationReportResponse struct {
	From               string                 `json:"from"`
	To                 string                 `json:"to"`
	AverageUtilization float64                `json:"average_utilization"`
	Fields             []FieldUtilizationCalc `json:"fields"`
	Heatmap            []HeatmapCell          `json:"heatmap"`
	QuietHours         []string               `json:"quiet_hours"`
}

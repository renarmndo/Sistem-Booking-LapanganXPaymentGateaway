package schedule

import (
	"time"

	"sistem-booking/pkg/pagination"
)

type SlotStatus string

const (
	SlotAvailable SlotStatus = "available"
	SlotPast      SlotStatus = "past"
	SlotLocked    SlotStatus = "locked"
	SlotBooked    SlotStatus = "booked"
	SlotBlocked   SlotStatus = "blocked"
)

type SlotItem struct {
	StartTime string     `json:"start_time"`
	EndTime   string     `json:"end_time"`
	Price     int64      `json:"price"`
	Status    SlotStatus `json:"status"`
}

type DateAvailabilitySummary struct {
	Date           string `json:"date"`
	AvailableSlots int    `json:"available_slots"`
	TotalSlots     int    `json:"total_slots"`
}

type FieldScheduleInfo struct {
	ID        uint
	IsActive  bool
	OpenTime  string
	CloseTime string
	IsClosed  bool
	HasHours  bool
}

type CreateScheduleBlockRequest struct {
	FieldID       uint   `json:"field_id" validate:"required,gt=0"`
	StartDatetime string `json:"start_datetime" validate:"required"`
	EndDatetime   string `json:"end_datetime" validate:"required"`
	Reason        string `json:"reason" validate:"required,min=3,max=255"`
}

type UpdateScheduleBlockRequest struct {
	StartDatetime string `json:"start_datetime" validate:"required"`
	EndDatetime   string `json:"end_datetime" validate:"required"`
	Reason        string `json:"reason" validate:"required,min=3,max=255"`
}

type ScheduleBlockResponse struct {
	ID            uint      `json:"id"`
	FieldID       uint      `json:"field_id"`
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
	Reason        string    `json:"reason"`
	CreatedBy     *uint     `json:"created_by,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type ScheduleBlockFilter struct {
	FieldID *uint
	From    *time.Time
	To      *time.Time
	Page    int
	Limit   int
}

type PaginatedScheduleBlocksResponse struct {
	Items []ScheduleBlockResponse `json:"items"`
	Meta  pagination.Meta         `json:"meta"`
}

type ConflictingBooking struct {
	ID          uint   `json:"id"`
	Code        string `json:"code"`
	Status      string `json:"status"`
	BookingDate string `json:"booking_date"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
}

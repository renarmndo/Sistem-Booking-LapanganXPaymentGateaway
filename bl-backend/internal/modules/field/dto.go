package field

import (
	"sistem-booking/internal/constant"
	"sistem-booking/pkg/pagination"
)

type FieldPhotoInput struct {
	URL       string `json:"url" validate:"required,url,max=512"`
	SortOrder uint   `json:"sort_order"`
	IsCover   bool   `json:"is_cover"`
}

type ReorderPhotosRequest struct {
	PhotoIDs []uint `json:"photo_ids" validate:"required,min=1,dive,gt=0"`
}

type UpdateFieldStatusRequest struct {
	IsActive bool `json:"is_active"`
}

type FieldStatusResponse struct {
	ID                    uint  `json:"id"`
	IsActive              bool  `json:"is_active"`
	UpcomingBookingsCount int64 `json:"upcoming_bookings_count"`
}

type FacilityRequest struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
	Icon string `json:"icon" validate:"required,min=1,max=50"`
}

type SetFieldFacilitiesRequest struct {
	FacilityIDs []uint `json:"facility_ids" validate:"required,dive,gt=0"`
}

type SetFieldPricesRequest struct {
	Prices []FieldPriceInput `json:"prices" validate:"required,min=1,dive"`
}

type SetFieldOperatingHoursRequest struct {
	OperatingHours []OperatingHourInput `json:"operating_hours" validate:"required,len=7,dive"`
}

type FieldPriceInput struct {
	DayType      constant.DayType `json:"day_type" validate:"required,oneof=weekday weekend holiday"`
	StartTime    string           `json:"start_time" validate:"required"`
	EndTime      string           `json:"end_time" validate:"required"`
	PricePerSlot int64            `json:"price_per_slot" validate:"required,gt=0"`
}

type OperatingHourInput struct {
	DayOfWeek uint8  `json:"day_of_week" validate:"min=0,max=6"`
	OpenTime  string `json:"open_time" validate:"required"`
	CloseTime string `json:"close_time" validate:"required"`
	IsClosed  bool   `json:"is_closed"`
}

type CreateFieldRequest struct {
	OwnerID        uint                 `json:"owner_id" validate:"required,gt=0"`
	Name           string               `json:"name" validate:"required,min=2,max=150"`
	Slug           string               `json:"slug" validate:"omitempty,max=180"`
	Description    string               `json:"description"`
	SurfaceType    string               `json:"surface_type" validate:"required,min=2,max=50"`
	Capacity       uint                 `json:"capacity" validate:"required,gt=0"`
	Address        string               `json:"address" validate:"required,min=5,max=255"`
	City           string               `json:"city" validate:"required,min=2,max=100"`
	Latitude       *float64             `json:"latitude"`
	Longitude      *float64             `json:"longitude"`
	IsActive       *bool                `json:"is_active"`
	Photos         []FieldPhotoInput    `json:"photos" validate:"dive"`
	FacilityIDs    []uint               `json:"facility_ids"`
	Prices         []FieldPriceInput    `json:"prices" validate:"dive"`
	OperatingHours []OperatingHourInput `json:"operating_hours" validate:"dive"`
}

type UpdateFieldRequest struct {
	OwnerID        *uint                `json:"owner_id" validate:"omitempty,gt=0"`
	Name           string               `json:"name" validate:"required,min=2,max=150"`
	Slug           string               `json:"slug" validate:"omitempty,max=180"`
	Description    string               `json:"description"`
	SurfaceType    string               `json:"surface_type" validate:"required,min=2,max=50"`
	Capacity       uint                 `json:"capacity" validate:"required,gt=0"`
	Address        string               `json:"address" validate:"required,min=5,max=255"`
	City           string               `json:"city" validate:"required,min=2,max=100"`
	Latitude       *float64             `json:"latitude"`
	Longitude      *float64             `json:"longitude"`
	IsActive       *bool                `json:"is_active"`
	Photos         []FieldPhotoInput    `json:"photos" validate:"dive"`
	FacilityIDs    []uint               `json:"facility_ids"`
	Prices         []FieldPriceInput    `json:"prices" validate:"dive"`
	OperatingHours []OperatingHourInput `json:"operating_hours" validate:"dive"`
}

type ListFieldsFilter struct {
	Query       string
	City        string
	SurfaceType string
	FacilityIDs []uint
	MinPrice    *int64
	MaxPrice    *int64
	Sort        string
	Pagination  pagination.Query
	OnlyActive  bool
	OwnerID     *uint
}

type FieldPhotoResponse struct {
	ID        uint   `json:"id"`
	URL       string `json:"url"`
	SortOrder uint   `json:"sort_order"`
	IsCover   bool   `json:"is_cover"`
}

type FacilityResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

type FieldPriceResponse struct {
	ID           uint   `json:"id"`
	DayType      string `json:"day_type"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	PricePerSlot int64  `json:"price_per_slot"`
}

type OperatingHourResponse struct {
	ID        uint   `json:"id"`
	DayOfWeek uint8  `json:"day_of_week"`
	OpenTime  string `json:"open_time"`
	CloseTime string `json:"close_time"`
	IsClosed  bool   `json:"is_closed"`
}

type FieldSummaryResponse struct {
	ID          uint               `json:"id"`
	OwnerID     uint               `json:"owner_id"`
	Name        string             `json:"name"`
	Slug        string             `json:"slug"`
	SurfaceType string             `json:"surface_type"`
	Capacity    uint               `json:"capacity"`
	Address     string             `json:"address"`
	City        string             `json:"city"`
	IsActive    bool               `json:"is_active"`
	CoverURL    string             `json:"cover_url"`
	MinPrice    int64              `json:"min_price"`
	Facilities  []FacilityResponse `json:"facilities"`
}

type FieldDetailResponse struct {
	FieldSummaryResponse
	Description    string                  `json:"description"`
	Latitude       *float64                `json:"latitude"`
	Longitude      *float64                `json:"longitude"`
	Photos         []FieldPhotoResponse    `json:"photos"`
	Prices         []FieldPriceResponse    `json:"prices"`
	OperatingHours []OperatingHourResponse `json:"operating_hours"`
}

type PaginatedFieldsResponse struct {
	Items []FieldSummaryResponse `json:"items"`
	Meta  pagination.Meta        `json:"meta"`
}

// FieldInfo is the lightweight contract returned by FieldReader for downstream modules.
type FieldInfo struct {
	ID       uint
	OwnerID  uint
	Name     string
	IsActive bool
}

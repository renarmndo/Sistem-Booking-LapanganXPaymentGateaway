package field

import (
	"time"

	"sistem-booking/internal/constant"
)

type Field struct {
	ID             uint            `gorm:"primaryKey"`
	OwnerID        uint            `gorm:"not null;index"`
	Name           string          `gorm:"size:150;not null"`
	Slug           string          `gorm:"size:180;uniqueIndex;not null"`
	Description    string          `gorm:"type:text"`
	SurfaceType    string          `gorm:"size:50;not null"`
	Capacity       uint            `gorm:"not null;default:14"`
	Address        string          `gorm:"size:255;not null"`
	City           string          `gorm:"size:100;not null"`
	Latitude       *float64        `gorm:"type:decimal(10,7)"`
	Longitude      *float64        `gorm:"type:decimal(10,7)"`
	IsActive       bool            `gorm:"not null;default:true"`
	CreatedAt      time.Time       `gorm:"not null"`
	UpdatedAt      time.Time       `gorm:"not null"`
	DeletedAt      *time.Time      `gorm:"index"`
	Photos         []FieldPhoto    `gorm:"foreignKey:FieldID"`
	Facilities     []Facility      `gorm:"many2many:field_facilities;"`
	Prices         []FieldPrice    `gorm:"foreignKey:FieldID"`
	OperatingHours []OperatingHour `gorm:"foreignKey:FieldID"`
	MinPrice       int64           `gorm:"->;-:migration"`
}

type FieldPhoto struct {
	ID        uint      `gorm:"primaryKey"`
	FieldID   uint      `gorm:"not null;index"`
	URL       string    `gorm:"size:512;not null"`
	SortOrder uint      `gorm:"not null;default:0"`
	IsCover   bool      `gorm:"not null;default:false"`
	CreatedAt time.Time `gorm:"not null"`
}

type Facility struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"size:100;uniqueIndex;not null"`
	Icon      string    `gorm:"size:50;not null"`
	CreatedAt time.Time `gorm:"not null"`
}

type FieldPrice struct {
	ID           uint             `gorm:"primaryKey"`
	FieldID      uint             `gorm:"not null"`
	DayType      constant.DayType `gorm:"type:enum('weekday','weekend','holiday');not null"`
	StartTime    string           `gorm:"type:time;not null"`
	EndTime      string           `gorm:"type:time;not null"`
	PricePerSlot int64            `gorm:"not null"`
	CreatedAt    time.Time        `gorm:"not null"`
	UpdatedAt    time.Time        `gorm:"not null"`
}

type OperatingHour struct {
	ID        uint      `gorm:"primaryKey"`
	FieldID   uint      `gorm:"not null"`
	DayOfWeek uint8     `gorm:"not null"`
	OpenTime  string    `gorm:"type:time;not null"`
	CloseTime string    `gorm:"type:time;not null"`
	IsClosed  bool      `gorm:"not null;default:false"`
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`
}

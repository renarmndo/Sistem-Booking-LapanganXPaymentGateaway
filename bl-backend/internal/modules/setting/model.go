package setting

import "time"

type Setting struct {
	ID           uint      `gorm:"primaryKey"`
	SettingKey   string    `gorm:"size:100;uniqueIndex;not null"`
	SettingValue string    `gorm:"size:255;not null"`
	Description  string    `gorm:"size:255"`
	UpdatedAt    time.Time `gorm:"not null"`
}

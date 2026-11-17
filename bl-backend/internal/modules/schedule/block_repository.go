package schedule

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

type ScheduleBlock struct {
	ID            uint      `gorm:"primaryKey"`
	FieldID       uint      `gorm:"column:field_id;not null"`
	StartDatetime time.Time `gorm:"column:start_datetime;not null"`
	EndDatetime   time.Time `gorm:"column:end_datetime;not null"`
	Reason        string    `gorm:"column:reason;size:255;not null"`
	CreatedBy     *uint     `gorm:"column:created_by"`
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt     time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (ScheduleBlock) TableName() string { return "schedule_blocks" }

type BlockRepository interface {
	Create(ctx context.Context, block *ScheduleBlock) error
	Update(ctx context.Context, block *ScheduleBlock) error
	Delete(ctx context.Context, id uint) error
	FindByID(ctx context.Context, id uint) (*ScheduleBlock, error)
	List(ctx context.Context, filter ScheduleBlockFilter) ([]ScheduleBlock, int64, error)
	FindByFieldAndRange(ctx context.Context, fieldID uint, start, end time.Time) ([]ScheduleBlock, error)
}

type gormBlockRepository struct {
	db *gorm.DB
}

func NewBlockRepository(db *gorm.DB) BlockRepository {
	return &gormBlockRepository{db: db}
}

func (r *gormBlockRepository) Create(ctx context.Context, block *ScheduleBlock) error {
	return r.db.WithContext(ctx).Create(block).Error
}

func (r *gormBlockRepository) Update(ctx context.Context, block *ScheduleBlock) error {
	return r.db.WithContext(ctx).Save(block).Error
}

func (r *gormBlockRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&ScheduleBlock{}, id).Error
}

func (r *gormBlockRepository) FindByID(ctx context.Context, id uint) (*ScheduleBlock, error) {
	var b ScheduleBlock
	err := r.db.WithContext(ctx).First(&b, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *gormBlockRepository) List(ctx context.Context, filter ScheduleBlockFilter) ([]ScheduleBlock, int64, error) {
	q := r.db.WithContext(ctx).Model(&ScheduleBlock{})
	if filter.FieldID != nil {
		q = q.Where("field_id = ?", *filter.FieldID)
	}
	if filter.From != nil {
		q = q.Where("end_datetime > ?", *filter.From)
	}
	if filter.To != nil {
		q = q.Where("start_datetime < ?", *filter.To)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []ScheduleBlock
	err := q.Order("start_datetime DESC").
		Limit(filter.Limit).
		Offset((filter.Page - 1) * filter.Limit).
		Find(&items).Error
	return items, total, err
}

func (r *gormBlockRepository) FindByFieldAndRange(ctx context.Context, fieldID uint, start, end time.Time) ([]ScheduleBlock, error) {
	var items []ScheduleBlock
	err := r.db.WithContext(ctx).
		Where("field_id = ? AND start_datetime < ? AND end_datetime > ?", fieldID, end, start).
		Order("start_datetime ASC").
		Find(&items).Error
	return items, err
}

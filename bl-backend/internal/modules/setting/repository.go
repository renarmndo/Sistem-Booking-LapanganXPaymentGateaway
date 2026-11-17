package setting

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository interface {
	FindByKey(ctx context.Context, key string) (*Setting, error)
	ListAll(ctx context.Context) ([]Setting, error)
	Upsert(ctx context.Context, key, value, description string) error
}

type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) FindByKey(ctx context.Context, key string) (*Setting, error) {
	var s Setting
	err := r.db.WithContext(ctx).Where("setting_key = ?", key).First(&s).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *gormRepository) ListAll(ctx context.Context) ([]Setting, error) {
	var items []Setting
	err := r.db.WithContext(ctx).Order("setting_key ASC").Find(&items).Error
	return items, err
}

func (r *gormRepository) Upsert(ctx context.Context, key, value, description string) error {
	item := Setting{
		SettingKey:   key,
		SettingValue: value,
		Description:  description,
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "setting_key"}},
			DoUpdates: clause.AssignmentColumns([]string{"setting_value", "description", "updated_at"}),
		}).
		Create(&item).Error
}

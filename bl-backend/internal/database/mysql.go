package database

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"sistem-booking/internal/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func OpenMySQL(cfg config.DBConfig, location *time.Location) (*gorm.DB, error) {
	connection := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=%s",
		cfg.User,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.Name,
		url.QueryEscape(location.String()),
	)

	db, err := gorm.Open(mysql.Open(connection), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get mysql sql db: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	return db, nil
}

func PingMySQL(ctx context.Context, db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

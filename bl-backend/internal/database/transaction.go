package database

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

func WithTx(ctx context.Context, db *gorm.DB, fn func(tx *gorm.DB) error) (err error) {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		defer func() {
			if recovered := recover(); recovered != nil {
				err = fmt.Errorf("transaction panic: %v", recovered)
				panic(recovered)
			}
		}()
		return fn(tx)
	})
}

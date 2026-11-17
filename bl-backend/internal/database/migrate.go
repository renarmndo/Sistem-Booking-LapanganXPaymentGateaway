package database

import (
	"database/sql"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"sistem-booking/migrations"
)

func RunMigrations(sqlDB *sql.DB, direction string, steps int) error {
	driver, err := mysql.WithInstance(sqlDB, &mysql.Config{})
	if err != nil {
		return fmt.Errorf("create migration database driver: %w", err)
	}
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("create migration source: %w", err)
	}
	migration, err := migrate.NewWithInstance("iofs", source, "mysql", driver)
	if err != nil {
		return fmt.Errorf("create migration runner: %w", err)
	}
	defer func() {
		_, _ = migration.Close()
	}()

	switch direction {
	case "up":
		if err := migration.Up(); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("run migrations up: %w", err)
		}
	case "down":
		if steps <= 0 {
			steps = 1
		}
		if err := migration.Steps(-steps); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("run migrations down: %w", err)
		}
	case "force":
		if steps < 0 {
			return fmt.Errorf("migration version must be non-negative")
		}
		if err := migration.Force(steps); err != nil {
			return fmt.Errorf("force migration version: %w", err)
		}
	default:
		return fmt.Errorf("unsupported migration direction %q", direction)
	}
	return nil
}

package database

import (
	"context"
	"errors"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestWithTxRollsBackOnError(t *testing.T) {
	db, mock, cleanup := openMockDB(t)
	defer cleanup()

	errExpected := errors.New("expected failure")
	mock.ExpectBegin()
	mock.ExpectRollback()

	err := WithTx(context.Background(), db, func(tx *gorm.DB) error {
		return errExpected
	})
	if !errors.Is(err, errExpected) {
		t.Fatalf("WithTx() error = %v, want %v", err, errExpected)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestWithTxCommitsOnSuccess(t *testing.T) {
	db, mock, cleanup := openMockDB(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO `records` (`name`) VALUES (?)")).WithArgs("commit").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := WithTx(context.Background(), db, func(tx *gorm.DB) error {
		return tx.Table("records").Create(map[string]any{"name": "commit"}).Error
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func openMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, func()) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}), &gorm.Config{})
	if err != nil {
		_ = sqlDB.Close()
		t.Fatal(err)
	}
	return db, mock, func() { _ = sqlDB.Close() }
}

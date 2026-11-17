package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"sistem-booking/internal/config"
	"sistem-booking/internal/database"
	"sistem-booking/internal/middleware"
)

func Run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	db, err := database.OpenMySQL(cfg.DB, cfg.App.TZ)
	if err != nil {
		return err
	}
	defer closeSQL(db, logger)

	redisClient := database.OpenRedis(cfg.Redis)
	defer closeRedis(redisClient, logger)

	server := &http.Server{
		Addr:              ":" + cfg.App.Port,
		Handler:           middleware.Logger(logger, middleware.Recovery(logger, middleware.CORS(cfg.CORS.AllowedOrigins, newRouter(db, redisClient, cfg)))),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("http server started", "addr", server.Addr)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("http server: %w", err)
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown http server: %w", err)
	}
	return nil
}

func closeSQL(db *gorm.DB, logger *slog.Logger) {
	sqlDB, err := db.DB()
	if err != nil {
		logger.Error("close mysql connection", "error", err)
		return
	}
	if err := sqlDB.Close(); err != nil {
		logger.Error("close mysql connection", "error", err)
	}
}

func closeRedis(client *redis.Client, logger *slog.Logger) {
	if err := client.Close(); err != nil {
		logger.Error("close redis connection", "error", err)
	}
}

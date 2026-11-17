package app

import (
	"context"
	"net/http"
	"time"

	"sistem-booking/internal/config"
	"sistem-booking/internal/database"
	"sistem-booking/internal/infra/cache"
	"sistem-booking/internal/infra/email"
	"sistem-booking/internal/infra/storage"
	"sistem-booking/internal/modules/auth"
	"sistem-booking/internal/modules/field"
	"sistem-booking/internal/modules/schedule"
	"sistem-booking/internal/modules/setting"
	"sistem-booking/pkg/validator"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func newRouter(db *gorm.DB, redisClient *redis.Client, cfg config.Config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthHandler(db, redisClient))
	mux.HandleFunc("GET /readyz", healthHandler(db, redisClient))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	val := validator.New()
	mailer := email.NewSMTPSender(cfg.SMTP)
	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(authRepo, redisClient, mailer, cfg)
	authHandler := auth.NewHandler(authSvc, val, cfg.JWT.RefreshTTL, cfg.App.Env == "production")
	auth.RegisterRoutes(mux, authHandler, cfg.JWT.Secret)

	localStore := storage.NewLocalStorage("uploads", "/uploads")
	redisCache := cache.NewRedisCache(redisClient)
	fieldRepo := field.NewRepository(db)
	fieldSvc := field.NewServiceWithDeps(fieldRepo, authSvc, nil, localStore, redisCache)
	fieldHandler := field.NewHandler(fieldSvc, val)
	field.RegisterPublicRoutes(mux, fieldHandler)
	field.RegisterAdminRoutes(mux, fieldHandler, cfg.JWT.Secret)

	settingRepo := setting.NewRepository(db)
	settingSvc := setting.NewService(settingRepo, redisCache)

	scheduleSvc := schedule.NewService(&scheduleFieldAdapter{fields: fieldSvc}, settingSvc, nil)
	scheduleHandler := schedule.NewHandler(scheduleSvc)
	schedule.RegisterPublicRoutes(mux, scheduleHandler)

	return mux
}

type scheduleFieldAdapter struct {
	fields field.Service
}

func (a *scheduleFieldAdapter) GetScheduleInfo(ctx context.Context, fieldID uint, dayOfWeek uint8) (*schedule.FieldScheduleInfo, error) {
	detail, err := a.fields.GetPublicByID(ctx, fieldID)
	if err != nil {
		return nil, err
	}
	info := &schedule.FieldScheduleInfo{
		ID:       detail.ID,
		IsActive: detail.IsActive,
	}
	for _, h := range detail.OperatingHours {
		if h.DayOfWeek == dayOfWeek {
			info.HasHours = true
			info.OpenTime = h.OpenTime
			info.CloseTime = h.CloseTime
			info.IsClosed = h.IsClosed
			break
		}
	}
	return info, nil
}

func (a *scheduleFieldAdapter) ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error) {
	return a.fields.ResolvePrice(ctx, fieldID, date, startTime)
}

func healthHandler(db *gorm.DB, redisClient *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		if err := database.PingMySQL(ctx, db); err != nil {
			writeHealthResponse(w, http.StatusServiceUnavailable, "mysql unavailable")
			return
		}
		if err := database.PingRedis(ctx, redisClient); err != nil {
			writeHealthResponse(w, http.StatusServiceUnavailable, "redis unavailable")
			return
		}
		writeHealthResponse(w, http.StatusOK, "ok")
	}
}

func writeHealthResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"status":"` + message + `"}`))
}

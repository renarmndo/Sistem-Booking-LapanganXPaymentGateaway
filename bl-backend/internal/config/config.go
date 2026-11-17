package config

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

type Config struct {
	App      AppConfig
	DB       DBConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Midtrans MidtransConfig
	Booking  BookingConfig
	SMTP     SMTPConfig
	CORS     CORSConfig
}

type AppConfig struct {
	Env  string
	Port string
	TZ   *time.Location
}

type DBConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Name            string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret     string
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type MidtransConfig struct {
	ServerKey    string
	ClientKey    string
	IsProduction bool
}

type BookingConfig struct {
	PaymentTTL time.Duration
}

type SMTPConfig struct {
	Host        string
	Port        int
	Username    string
	Password    string
	FromName    string
	FromEmail   string
	OTPTTL      time.Duration
	ResendLimit int
}

type CORSConfig struct {
	AllowedOrigins []string
}

func Load() (Config, error) {
	LoadDotEnv(".env")

	location, err := time.LoadLocation(GetString("TZ", "Asia/Jakarta"))
	if err != nil {
		return Config{}, fmt.Errorf("load timezone: %w", err)
	}

	cfg := Config{
		App: AppConfig{
			Env:  GetString("APP_ENV", "development"),
			Port: GetString("APP_PORT", "8080"),
			TZ:   location,
		},
		DB: DBConfig{
			Host:            GetString("DB_HOST", "localhost"),
			Port:            GetInt("DB_PORT", 3306),
			User:            GetString("DB_USER", "app_user"),
			Password:        GetString("DB_PASS", ""),
			Name:            GetString("DB_NAME", "football_booking"),
			MaxOpenConns:    GetInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    GetInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: GetDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			Addr:     GetString("REDIS_ADDR", "localhost:6379"),
			Password: GetString("REDIS_PASS", ""),
			DB:       GetInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:     GetString("JWT_SECRET", ""),
			AccessTTL:  GetDuration("JWT_ACCESS_TTL", 15*time.Minute),
			RefreshTTL: GetDuration("JWT_REFRESH_TTL", 7*24*time.Hour),
		},
		Midtrans: MidtransConfig{
			ServerKey:    GetString("MIDTRANS_SERVER_KEY", ""),
			ClientKey:    GetString("MIDTRANS_CLIENT_KEY", ""),
			IsProduction: GetString("MIDTRANS_IS_PRODUCTION", "false") == "true",
		},
		Booking: BookingConfig{
			PaymentTTL: time.Duration(GetInt("BOOKING_PAYMENT_TTL_MIN", 15)) * time.Minute,
		},
		SMTP: SMTPConfig{
			Host:        GetString("SMTP_HOST", "localhost"),
			Port:        GetInt("SMTP_PORT", 1025),
			Username:    GetString("SMTP_USERNAME", ""),
			Password:    GetString("SMTP_PASSWORD", ""),
			FromName:    GetString("SMTP_FROM_NAME", "Football Booking"),
			FromEmail:   GetString("SMTP_FROM_EMAIL", "no-reply@example.com"),
			OTPTTL:      time.Duration(GetInt("OTP_TTL_MINUTES", 15)) * time.Minute,
			ResendLimit: GetInt("OTP_MAX_ATTEMPTS_PER_HOUR", 3),
		},
		CORS: CORSConfig{
			AllowedOrigins: splitCSV(GetString("ALLOWED_ORIGINS", "http://localhost:5173")),
		},
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) Validate() error {
	var missing []string
	if c.DB.Password == "" {
		missing = append(missing, "DB_PASS")
	}
	if c.Redis.Password == "" {
		missing = append(missing, "REDIS_PASS")
	}
	if c.JWT.Secret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	if c.App.Env == "production" && len(c.JWT.Secret) < 32 {
		return errors.New("JWT_SECRET must be at least 32 characters in production")
	}
	if len(missing) > 0 && c.App.Env == "production" {
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}
	if c.DB.Port <= 0 || c.Redis.Addr == "" || c.App.Port == "" {
		return errors.New("invalid application or dependency configuration")
	}
	return nil
}

func splitCSV(value string) []string {
	items := strings.Split(value, ",")
	result := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

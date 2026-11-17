package setting

import (
	"context"
	"strconv"
	"strings"
	"time"

	"sistem-booking/internal/infra/cache"
)

const settingsCacheTTL = 5 * time.Minute

type Service interface {
	GetString(ctx context.Context, key, fallback string) string
	GetInt(ctx context.Context, key string, fallback int) int
	ListAll(ctx context.Context) ([]Setting, error)
	Set(ctx context.Context, key, value, description string) error
}

type service struct {
	repo  Repository
	cache cache.Cache
}

func NewService(repo Repository, c cache.Cache) Service {
	return &service{repo: repo, cache: c}
}

func (s *service) GetString(ctx context.Context, key, fallback string) string {
	cacheKey := "cache:settings:" + key
	if s.cache != nil {
		if val, hit, err := s.cache.Get(ctx, cacheKey); err == nil && hit {
			return string(val)
		}
	}

	item, err := s.repo.FindByKey(ctx, key)
	if err != nil || item == nil || strings.TrimSpace(item.SettingValue) == "" {
		return fallback
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, []byte(item.SettingValue), settingsCacheTTL)
	}
	return item.SettingValue
}

func (s *service) GetInt(ctx context.Context, key string, fallback int) int {
	raw := s.GetString(ctx, key, "")
	if raw == "" {
		return fallback
	}
	val, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || val <= 0 {
		return fallback
	}
	return val
}

func (s *service) ListAll(ctx context.Context) ([]Setting, error) {
	return s.repo.ListAll(ctx)
}

func (s *service) Set(ctx context.Context, key, value, description string) error {
	if err := s.repo.Upsert(ctx, key, value, description); err != nil {
		return err
	}
	if s.cache != nil {
		_ = s.cache.DeleteByPrefix(ctx, "cache:settings:"+key)
	}
	return nil
}

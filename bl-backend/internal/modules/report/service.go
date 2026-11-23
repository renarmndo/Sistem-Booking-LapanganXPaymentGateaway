package report

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"sistem-booking/internal/infra/cache"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/timeutil"
)

const summaryCacheTTL = 45 * time.Second

type Service interface {
	OwnerService
	GetAdminDashboardSummary(ctx context.Context, fromStr, toStr string) (*AdminDashboardSummary, error)
}

type service struct {
	repo  Repository
	cache cache.Cache
	now   func() time.Time
}

func NewService(repo Repository, c cache.Cache) Service {
	return &service{
		repo:  repo,
		cache: c,
		now:   timeutil.Now,
	}
}

func (s *service) GetAdminDashboardSummary(ctx context.Context, fromStr, toStr string) (*AdminDashboardSummary, error) {
	now := s.now().In(timeutil.WIB)
	today := timeutil.StartOfDay(now)
	fromDate := today.AddDate(0, 0, -29)
	toDate := today.AddDate(0, 0, 30)

	if strings.TrimSpace(fromStr) != "" {
		parsed, err := timeutil.ParseDate(strings.TrimSpace(fromStr))
		if err != nil {
			return nil, apperror.BadRequest("INVALID_DATE", "Format tanggal 'from' harus YYYY-MM-DD", err)
		}
		fromDate = parsed
	}
	if strings.TrimSpace(toStr) != "" {
		parsed, err := timeutil.ParseDate(strings.TrimSpace(toStr))
		if err != nil {
			return nil, apperror.BadRequest("INVALID_DATE", "Format tanggal 'to' harus YYYY-MM-DD", err)
		}
		toDate = parsed
	}
	if fromDate.After(toDate) {
		return nil, apperror.Unprocessable("INVALID_DATE_RANGE", "Tanggal mulai tidak boleh melebihi tanggal akhir")
	}

	from := fromDate.Format(timeutil.DateLayout)
	to := toDate.Format(timeutil.DateLayout)
	cacheKey := fmt.Sprintf("cache:report:admin_summary:%s:%s", from, to)

	if s.cache != nil {
		if raw, hit, err := s.cache.Get(ctx, cacheKey); err == nil && hit {
			var cached AdminDashboardSummary
			if json.Unmarshal(raw, &cached) == nil {
				return &cached, nil
			}
		}
	}

	summary, err := s.repo.GetAdminDashboardSummary(ctx, from, to, now)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil ringkasan dashboard", err)
	}

	if s.cache != nil {
		if payload, err := json.Marshal(summary); err == nil {
			_ = s.cache.Set(ctx, cacheKey, payload, summaryCacheTTL)
		}
	}
	return summary, nil
}

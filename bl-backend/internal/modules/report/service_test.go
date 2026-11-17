package report

import (
	"context"
	"testing"
	"time"
)

type stubReportRepo struct {
	calls int
}

func (s *stubReportRepo) GetAdminDashboardSummary(_ context.Context, from, to string, _ time.Time) (*AdminDashboardSummary, error) {
	s.calls++
	return &AdminDashboardSummary{
		From:          from,
		To:            to,
		TotalBookings: 12,
		PaidRevenue:   2400000,
	}, nil
}

type memCache struct {
	store map[string][]byte
}

func (m *memCache) Get(_ context.Context, key string) ([]byte, bool, error) {
	v, ok := m.store[key]
	return v, ok, nil
}
func (m *memCache) Set(_ context.Context, key string, val []byte, _ time.Duration) error {
	m.store[key] = val
	return nil
}
func (m *memCache) Del(_ context.Context, key string) error {
	delete(m.store, key)
	return nil
}
func (m *memCache) DeleteByPrefix(_ context.Context, _ string) error { return nil }

func TestAdminDashboardSummaryValidationAndCache(t *testing.T) {
	repo := &stubReportRepo{}
	c := &memCache{store: make(map[string][]byte)}
	svc := NewService(repo, c)

	if _, err := svc.GetAdminDashboardSummary(context.Background(), "2026-11-20", "2026-11-10"); err == nil {
		t.Fatalf("expected error when from > to")
	}

	res1, err := svc.GetAdminDashboardSummary(context.Background(), "2026-11-01", "2026-11-15")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res1.TotalBookings != 12 || repo.calls != 1 {
		t.Fatalf("expected 12 bookings and 1 repo call, got %d and %d", res1.TotalBookings, repo.calls)
	}

	res2, err := svc.GetAdminDashboardSummary(context.Background(), "2026-11-01", "2026-11-15")
	if err != nil {
		t.Fatalf("unexpected error on cached call: %v", err)
	}
	if res2.PaidRevenue != 2400000 || repo.calls != 1 {
		t.Fatalf("expected cache hit (repo calls=1), got calls=%d", repo.calls)
	}
}

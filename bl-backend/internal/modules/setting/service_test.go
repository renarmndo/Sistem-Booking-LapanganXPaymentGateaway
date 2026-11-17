package setting

import (
	"context"
	"testing"
	"time"
)

type memSettingRepo struct {
	items map[string]Setting
}

func (m *memSettingRepo) FindByKey(_ context.Context, key string) (*Setting, error) {
	s, ok := m.items[key]
	if !ok {
		return nil, nil
	}
	return &s, nil
}

func (m *memSettingRepo) ListAll(_ context.Context) ([]Setting, error) {
	out := make([]Setting, 0, len(m.items))
	for _, s := range m.items {
		out = append(out, s)
	}
	return out, nil
}

func (m *memSettingRepo) Upsert(_ context.Context, key, value, description string) error {
	m.items[key] = Setting{SettingKey: key, SettingValue: value, Description: description}
	return nil
}

type memCache struct {
	data map[string][]byte
}

func (c *memCache) Get(_ context.Context, key string) ([]byte, bool, error) {
	v, ok := c.data[key]
	return v, ok, nil
}

func (c *memCache) Set(_ context.Context, key string, value []byte, _ time.Duration) error {
	c.data[key] = value
	return nil
}

func (c *memCache) DeleteByPrefix(_ context.Context, prefix string) error {
	delete(c.data, prefix)
	return nil
}

func TestSettingService(t *testing.T) {
	repo := &memSettingRepo{items: map[string]Setting{
		"booking.slot_minutes": {SettingKey: "booking.slot_minutes", SettingValue: "60"},
	}}
	svc := NewService(repo, &memCache{data: map[string][]byte{}})
	ctx := context.Background()

	if got := svc.GetInt(ctx, "booking.slot_minutes", 30); got != 60 {
		t.Fatalf("expected 60, got %d", got)
	}
	if got := svc.GetInt(ctx, "booking.missing", 30); got != 30 {
		t.Fatalf("expected fallback 30, got %d", got)
	}
	if err := svc.Set(ctx, "booking.slot_minutes", "90", "updated"); err != nil {
		t.Fatal(err)
	}
	if got := svc.GetInt(ctx, "booking.slot_minutes", 60); got != 90 {
		t.Fatalf("expected 90 after update, got %d", got)
	}
}

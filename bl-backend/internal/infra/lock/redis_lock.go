package lock

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const releaseScript = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
end
return 0
`

// Locker provides distributed or in-memory multi-key slot locking.
type Locker interface {
	AcquireMany(ctx context.Context, keys []string, token string, ttl time.Duration) (bool, error)
	ReleaseMany(ctx context.Context, keys []string, token string) error
	ForceReleaseMany(ctx context.Context, keys []string) error
}

// RedisLocker implements Locker using Redis SET NX EX and Lua-guarded release.
type RedisLocker struct {
	client *redis.Client
}

func NewRedisLocker(client *redis.Client) *RedisLocker {
	return &RedisLocker{client: client}
}

func (l *RedisLocker) AcquireMany(ctx context.Context, keys []string, token string, ttl time.Duration) (bool, error) {
	if l.client == nil || len(keys) == 0 {
		return true, nil
	}

	sorted := make([]string, len(keys))
	copy(sorted, keys)
	sort.Strings(sorted)

	acquired := make([]string, 0, len(sorted))
	for _, key := range sorted {
		ok, err := l.client.SetNX(ctx, key, token, ttl).Result()
		if err != nil {
			_ = l.ReleaseMany(context.Background(), acquired, token)
			return false, err
		}
		if !ok {
			_ = l.ReleaseMany(context.Background(), acquired, token)
			return false, nil
		}
		acquired = append(acquired, key)
	}

	return true, nil
}

func (l *RedisLocker) ReleaseMany(ctx context.Context, keys []string, token string) error {
	if l.client == nil || len(keys) == 0 {
		return nil
	}

	var firstErr error
	for _, key := range keys {
		if err := l.client.Eval(ctx, releaseScript, []string{key}, token).Err(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (l *RedisLocker) ForceReleaseMany(ctx context.Context, keys []string) error {
	if l.client == nil || len(keys) == 0 {
		return nil
	}
	return l.client.Del(ctx, keys...).Err()
}

// MemoryLocker is a thread-safe in-memory Locker for tests and Redis-less local runs.
type MemoryLocker struct {
	mu    sync.Mutex
	locks map[string]memEntry
}

type memEntry struct {
	token     string
	expiresAt time.Time
}

func NewMemoryLocker() *MemoryLocker {
	return &MemoryLocker{locks: make(map[string]memEntry)}
}

func (m *MemoryLocker) AcquireMany(_ context.Context, keys []string, token string, ttl time.Duration) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for _, key := range keys {
		if entry, exists := m.locks[key]; exists && entry.expiresAt.After(now) {
			return false, nil
		}
	}

	exp := now.Add(ttl)
	for _, key := range keys {
		m.locks[key] = memEntry{token: token, expiresAt: exp}
	}
	return true, nil
}

func (m *MemoryLocker) ReleaseMany(_ context.Context, keys []string, token string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, key := range keys {
		if entry, exists := m.locks[key]; exists && entry.token == token {
			delete(m.locks, key)
		}
	}
	return nil
}

func (m *MemoryLocker) ForceReleaseMany(_ context.Context, keys []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, key := range keys {
		delete(m.locks, key)
	}
	return nil
}

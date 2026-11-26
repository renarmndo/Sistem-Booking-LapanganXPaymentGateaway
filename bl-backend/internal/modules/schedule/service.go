package schedule

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/cache"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
)

const (
	defaultSlotMinutes  = 60
	defaultMaxDaysAhead = 30
	availCacheTTL       = 10 * time.Second
)

// FieldProvider supplies field status, operating hours, and slot pricing without importing field.
type FieldProvider interface {
	GetScheduleInfo(ctx context.Context, fieldID uint, dayOfWeek uint8) (*FieldScheduleInfo, error)
	ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error)
}

// SettingReader reads dynamic schedule settings.
type SettingReader interface {
	GetInt(ctx context.Context, key string, fallback int) int
}

// OccupancyProvider returns occupied/locked/blocked slots keyed by "HH:MM" start time.
type OccupancyProvider interface {
	GetOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) (map[string]SlotStatus, error)
}

// NoopOccupancyProvider is the default Fase 2 implementation before booking/blocks exist.
type NoopOccupancyProvider struct{}

func (NoopOccupancyProvider) GetOccupiedSlots(_ context.Context, _ uint, _ time.Time) (map[string]SlotStatus, error) {
	return map[string]SlotStatus{}, nil
}

// BookingConflictChecker checks active bookings that overlap with a candidate schedule block.
type BookingConflictChecker interface {
	FindConflictingBookings(ctx context.Context, fieldID uint, start, end time.Time) ([]ConflictingBooking, error)
}

type Service interface {
	GetAvailability(ctx context.Context, fieldID uint, dateStr string) ([]SlotItem, error)
	GetAvailabilitySummary(ctx context.Context, fieldID uint, fromStr, toStr string) ([]DateAvailabilitySummary, error)
	SetBlockDeps(repo BlockRepository, conflicts BookingConflictChecker)
	ListBlocks(ctx context.Context, filter ScheduleBlockFilter) (*PaginatedScheduleBlocksResponse, error)
	CreateBlock(ctx context.Context, adminID uint, req CreateScheduleBlockRequest) (*ScheduleBlockResponse, []ConflictingBooking, error)
	UpdateBlock(ctx context.Context, id uint, req UpdateScheduleBlockRequest) (*ScheduleBlockResponse, []ConflictingBooking, error)
	DeleteBlock(ctx context.Context, id uint) error
	IsRangeBlocked(ctx context.Context, fieldID uint, start, end time.Time) (bool, error)
}

type service struct {
	fields    FieldProvider
	settings  SettingReader
	occupancy OccupancyProvider
	blocks    BlockRepository
	conflicts BookingConflictChecker
	cache     cache.Cache
	now       func() time.Time
}

func NewService(fields FieldProvider, settings SettingReader, occupancy OccupancyProvider) Service {
	return NewServiceWithCache(fields, settings, occupancy, nil)
}

func NewServiceWithCache(fields FieldProvider, settings SettingReader, occupancy OccupancyProvider, c cache.Cache) Service {
	if occupancy == nil {
		occupancy = NoopOccupancyProvider{}
	}
	return &service{
		fields:    fields,
		settings:  settings,
		occupancy: occupancy,
		cache:     c,
		now:       timeutil.Now,
	}
}

func (s *service) GetAvailabilitySummary(ctx context.Context, fieldID uint, fromStr, toStr string) ([]DateAvailabilitySummary, error) {
	now := s.now().In(timeutil.WIB)
	today := timeutil.StartOfDay(now)
	maxDays := defaultMaxDaysAhead
	if s.settings != nil {
		maxDays = s.settings.GetInt(ctx, "booking.max_days_ahead", defaultMaxDaysAhead)
	}
	if maxDays <= 0 {
		maxDays = defaultMaxDaysAhead
	}

	fromDate := today
	if strings.TrimSpace(fromStr) != "" {
		parsed, err := timeutil.ParseDate(strings.TrimSpace(fromStr))
		if err != nil {
			return nil, ErrInvalidDate
		}
		if parsed.After(today) {
			fromDate = parsed
		}
	}

	maxEnd := today.AddDate(0, 0, maxDays)
	toDate := maxEnd
	if strings.TrimSpace(toStr) != "" {
		parsed, err := timeutil.ParseDate(strings.TrimSpace(toStr))
		if err != nil {
			return nil, ErrInvalidDate
		}
		toDate = parsed
	}
	if toDate.After(maxEnd) {
		toDate = maxEnd
	}
	if fromDate.After(toDate) {
		return []DateAvailabilitySummary{}, nil
	}

	summaries := make([]DateAvailabilitySummary, 0, 31)
	for d := fromDate; !d.After(toDate) && len(summaries) < 31; d = d.AddDate(0, 0, 1) {
		dateStr := d.Format(timeutil.DateLayout)
		slots, err := s.GetAvailability(ctx, fieldID, dateStr)
		if err != nil {
			return nil, err
		}
		avail := 0
		for _, sl := range slots {
			if sl.Status == SlotAvailable {
				avail++
			}
		}
		summaries = append(summaries, DateAvailabilitySummary{
			Date:           dateStr,
			AvailableSlots: avail,
			TotalSlots:     len(slots),
		})
	}
	return summaries, nil
}

func (s *service) GetAvailability(ctx context.Context, fieldID uint, dateStr string) ([]SlotItem, error) {
	targetDate, err := timeutil.ParseDate(strings.TrimSpace(dateStr))
	if err != nil {
		return nil, ErrInvalidDate
	}

	now := s.now().In(timeutil.WIB)
	today := timeutil.StartOfDay(now)
	if targetDate.Before(today) {
		return nil, ErrPastDate
	}

	maxDays := defaultMaxDaysAhead
	slotMinutes := defaultSlotMinutes
	if s.settings != nil {
		maxDays = s.settings.GetInt(ctx, "booking.max_days_ahead", defaultMaxDaysAhead)
		slotMinutes = s.settings.GetInt(ctx, "booking.slot_minutes", defaultSlotMinutes)
	}
	if slotMinutes <= 0 {
		slotMinutes = defaultSlotMinutes
	}
	if targetDate.After(today.AddDate(0, 0, maxDays)) {
		return nil, ErrDateTooFar
	}

	normalizedDate := targetDate.Format(timeutil.DateLayout)
	cacheKey := constant.AvailCacheKey(fieldID, normalizedDate)
	if s.cache != nil {
		if raw, hit, err := s.cache.Get(ctx, cacheKey); err == nil && hit {
			var cached []SlotItem
			if err := json.Unmarshal(raw, &cached); err == nil {
				return cached, nil
			}
		}
	}

	dayOfWeek := uint8(targetDate.Weekday())
	info, err := s.fields.GetScheduleInfo(ctx, fieldID, dayOfWeek)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrFieldNotFound
	}
	if !info.IsActive {
		return nil, ErrFieldInactive
	}
	if !info.HasHours || info.IsClosed {
		return []SlotItem{}, nil
	}

	openMin, errOpen := parseClockMinutes(info.OpenTime)
	closeMin, errClose := parseClockMinutes(info.CloseTime)
	if errOpen != nil || errClose != nil || openMin >= closeMin {
		return []SlotItem{}, nil
	}

	occupied, err := s.occupancy.GetOccupiedSlots(ctx, fieldID, targetDate)
	if err != nil {
		return nil, err
	}

	var dayBlocks []ScheduleBlock
	if s.blocks != nil {
		dayStart := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 0, 0, 0, 0, timeutil.WIB)
		dayEnd := dayStart.Add(24 * time.Hour)
		dayBlocks, err = s.blocks.FindByFieldAndRange(ctx, fieldID, dayStart, dayEnd)
		if err != nil {
			return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa blokir jadwal", err)
		}
	}

	slots := make([]SlotItem, 0, (closeMin-openMin)/slotMinutes)
	for curMin := openMin; curMin+slotMinutes <= closeMin; curMin += slotMinutes {
		startClock := formatClock(curMin)
		endClock := formatClock(curMin + slotMinutes)
		slotStartTime := time.Date(
			targetDate.Year(),
			targetDate.Month(),
			targetDate.Day(),
			curMin/60,
			curMin%60,
			0,
			0,
			timeutil.WIB,
		)
		slotEndTime := slotStartTime.Add(time.Duration(slotMinutes) * time.Minute)

		price, err := s.fields.ResolvePrice(ctx, fieldID, targetDate, slotStartTime)
		if err != nil {
			return nil, err
		}

		status := SlotAvailable
		if !slotStartTime.After(now) {
			status = SlotPast
		} else if occStatus, exists := occupied[startClock]; exists {
			status = occStatus
		} else if overlapsAnyBlock(dayBlocks, slotStartTime, slotEndTime) {
			status = SlotBlocked
		}

		slots = append(slots, SlotItem{
			StartTime: startClock,
			EndTime:   endClock,
			Price:     price,
			Status:    status,
		})
	}

	if s.cache != nil {
		if payload, err := json.Marshal(slots); err == nil {
			_ = s.cache.Set(ctx, cacheKey, payload, availCacheTTL)
		}
	}

	return slots, nil
}

func parseClockMinutes(value string) (int, error) {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) >= 5 {
		trimmed = trimmed[:5]
	}
	parsed, err := timeutil.ParseClock(trimmed)
	if err != nil {
		return 0, err
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func formatClock(totalMinutes int) string {
	return fmt.Sprintf("%02d:%02d", totalMinutes/60, totalMinutes%60)
}

func (s *service) SetBlockDeps(repo BlockRepository, conflicts BookingConflictChecker) {
	s.blocks = repo
	s.conflicts = conflicts
}

func (s *service) ListBlocks(ctx context.Context, filter ScheduleBlockFilter) (*PaginatedScheduleBlocksResponse, error) {
	if s.blocks == nil {
		return &PaginatedScheduleBlocksResponse{Items: []ScheduleBlockResponse{}}, nil
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	rows, total, err := s.blocks.List(ctx, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar blokir jadwal", err)
	}
	items := make([]ScheduleBlockResponse, 0, len(rows))
	for _, r := range rows {
		items = append(items, toBlockResponse(r))
	}
	return &PaginatedScheduleBlocksResponse{
		Items: items,
		Meta:  pagination.NewMeta(pagination.Query{Page: filter.Page, Limit: filter.Limit}, total),
	}, nil
}

func (s *service) CreateBlock(ctx context.Context, adminID uint, req CreateScheduleBlockRequest) (*ScheduleBlockResponse, []ConflictingBooking, error) {
	if s.blocks == nil {
		return nil, nil, apperror.Internal("NOT_CONFIGURED", "Repository blokir jadwal belum dikonfigurasi", nil)
	}
	start, err := parseDateTimeInput(req.StartDatetime)
	if err != nil {
		return nil, nil, apperror.BadRequest("INVALID_DATETIME", "Format start_datetime tidak valid", err)
	}
	end, err := parseDateTimeInput(req.EndDatetime)
	if err != nil {
		return nil, nil, apperror.BadRequest("INVALID_DATETIME", "Format end_datetime tidak valid", err)
	}
	if !start.Before(end) {
		return nil, nil, ErrInvalidTimeRange
	}

	if s.conflicts != nil {
		conflicts, err := s.conflicts.FindConflictingBookings(ctx, req.FieldID, start, end)
		if err != nil {
			return nil, nil, apperror.Internal("DB_ERROR", "Gagal memeriksa bentrok booking", err)
		}
		if len(conflicts) > 0 {
			return nil, conflicts, ErrBlockConflict
		}
	}

	var createdBy *uint
	if adminID > 0 {
		createdBy = &adminID
	}
	block := &ScheduleBlock{
		FieldID:       req.FieldID,
		StartDatetime: start,
		EndDatetime:   end,
		Reason:        strings.TrimSpace(req.Reason),
		CreatedBy:     createdBy,
	}
	if err := s.blocks.Create(ctx, block); err != nil {
		return nil, nil, apperror.Internal("DB_ERROR", "Gagal menyimpan blokir jadwal", err)
	}
	s.invalidateAvailRange(ctx, block.FieldID, block.StartDatetime, block.EndDatetime)
	res := toBlockResponse(*block)
	return &res, nil, nil
}

func (s *service) UpdateBlock(ctx context.Context, id uint, req UpdateScheduleBlockRequest) (*ScheduleBlockResponse, []ConflictingBooking, error) {
	if s.blocks == nil {
		return nil, nil, apperror.Internal("NOT_CONFIGURED", "Repository blokir jadwal belum dikonfigurasi", nil)
	}
	existing, err := s.blocks.FindByID(ctx, id)
	if err != nil {
		return nil, nil, apperror.Internal("DB_ERROR", "Gagal memeriksa blokir jadwal", err)
	}
	if existing == nil {
		return nil, nil, ErrBlockNotFound
	}

	start, err := parseDateTimeInput(req.StartDatetime)
	if err != nil {
		return nil, nil, apperror.BadRequest("INVALID_DATETIME", "Format start_datetime tidak valid", err)
	}
	end, err := parseDateTimeInput(req.EndDatetime)
	if err != nil {
		return nil, nil, apperror.BadRequest("INVALID_DATETIME", "Format end_datetime tidak valid", err)
	}
	if !start.Before(end) {
		return nil, nil, ErrInvalidTimeRange
	}

	if s.conflicts != nil {
		conflicts, err := s.conflicts.FindConflictingBookings(ctx, existing.FieldID, start, end)
		if err != nil {
			return nil, nil, apperror.Internal("DB_ERROR", "Gagal memeriksa bentrok booking", err)
		}
		if len(conflicts) > 0 {
			return nil, conflicts, ErrBlockConflict
		}
	}

	oldStart, oldEnd := existing.StartDatetime, existing.EndDatetime
	existing.StartDatetime = start
	existing.EndDatetime = end
	existing.Reason = strings.TrimSpace(req.Reason)
	if err := s.blocks.Update(ctx, existing); err != nil {
		return nil, nil, apperror.Internal("DB_ERROR", "Gagal memperbarui blokir jadwal", err)
	}
	s.invalidateAvailRange(ctx, existing.FieldID, oldStart, oldEnd)
	s.invalidateAvailRange(ctx, existing.FieldID, existing.StartDatetime, existing.EndDatetime)
	res := toBlockResponse(*existing)
	return &res, nil, nil
}

func (s *service) DeleteBlock(ctx context.Context, id uint) error {
	if s.blocks == nil {
		return apperror.Internal("NOT_CONFIGURED", "Repository blokir jadwal belum dikonfigurasi", nil)
	}
	existing, err := s.blocks.FindByID(ctx, id)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa blokir jadwal", err)
	}
	if existing == nil {
		return ErrBlockNotFound
	}
	if err := s.blocks.Delete(ctx, id); err != nil {
		return apperror.Internal("DB_ERROR", "Gagal menghapus blokir jadwal", err)
	}
	s.invalidateAvailRange(ctx, existing.FieldID, existing.StartDatetime, existing.EndDatetime)
	return nil
}

func (s *service) IsRangeBlocked(ctx context.Context, fieldID uint, start, end time.Time) (bool, error) {
	if s.blocks == nil {
		return false, nil
	}
	blocks, err := s.blocks.FindByFieldAndRange(ctx, fieldID, start, end)
	if err != nil {
		return false, err
	}
	return len(blocks) > 0, nil
}

func (s *service) invalidateAvailRange(ctx context.Context, fieldID uint, start, end time.Time) {
	if s.cache == nil {
		return
	}
	cur := timeutil.StartOfDay(start.In(timeutil.WIB))
	last := timeutil.StartOfDay(end.Add(-time.Nanosecond).In(timeutil.WIB))
	for !cur.After(last) {
		_ = s.cache.DeleteByPrefix(ctx, constant.AvailCacheKey(fieldID, cur.Format(timeutil.DateLayout)))
		cur = cur.AddDate(0, 0, 1)
	}
}

func overlapsAnyBlock(blocks []ScheduleBlock, slotStart, slotEnd time.Time) bool {
	for _, b := range blocks {
		if b.StartDatetime.Before(slotEnd) && b.EndDatetime.After(slotStart) {
			return true
		}
	}
	return false
}

func toBlockResponse(b ScheduleBlock) ScheduleBlockResponse {
	return ScheduleBlockResponse{
		ID:            b.ID,
		FieldID:       b.FieldID,
		StartDatetime: b.StartDatetime,
		EndDatetime:   b.EndDatetime,
		Reason:        b.Reason,
		CreatedBy:     b.CreatedBy,
		CreatedAt:     b.CreatedAt,
	}
}

func parseDateTimeInput(raw string) (time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02 15:04", "2006-01-02 15:04:05"} {
		if layout == time.RFC3339 {
			if t, err := time.Parse(layout, trimmed); err == nil {
				return t.In(timeutil.WIB), nil
			}
		} else {
			if t, err := time.ParseInLocation(layout, trimmed, timeutil.WIB); err == nil {
				return t, nil
			}
		}
	}
	return time.Time{}, fmt.Errorf("invalid datetime: %s", raw)
}

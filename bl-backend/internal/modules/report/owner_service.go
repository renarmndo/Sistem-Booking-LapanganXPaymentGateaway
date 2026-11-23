package report

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
)

const ownerReportCacheTTL = 2 * time.Minute

type OwnerService interface {
	ListOwnerFields(ctx context.Context, ownerID uint) ([]OwnerFieldItem, error)
	GetOwnerSchedule(ctx context.Context, ownerID uint, fieldID *uint, fromStr, toStr string) (*OwnerScheduleResponse, error)
	ListOwnerBookings(ctx context.Context, ownerID uint, filter OwnerBookingFilter) (*PaginatedOwnerBookingsResponse, error)
	GetOwnerBookingDetail(ctx context.Context, ownerID, bookingID uint) (*OwnerBookingItem, error)
	ListOwnerTransactions(ctx context.Context, ownerID uint, filter OwnerTransactionFilter) (*PaginatedOwnerTransactionsResponse, error)
	GetOwnerDashboardSummary(ctx context.Context, ownerID uint, fieldID *uint, fromStr, toStr string) (*OwnerDashboardSummary, error)
	GetRevenueReport(ctx context.Context, ownerID *uint, fieldID *uint, fromStr, toStr, group string) (*RevenueReportResponse, error)
	GetUtilizationReport(ctx context.Context, ownerID *uint, fieldID *uint, fromStr, toStr string) (*UtilizationReportResponse, error)
}

func (s *service) ownerRepo() (OwnerRepository, error) {
	or, ok := s.repo.(OwnerRepository)
	if !ok {
		return nil, apperror.Internal("NOT_CONFIGURED", "OwnerRepository tidak tersedia", nil)
	}
	return or, nil
}

func (s *service) ensureFieldAccess(ctx context.Context, or OwnerRepository, ownerID *uint, fieldID *uint) error {
	if ownerID == nil || fieldID == nil {
		return nil
	}
	owned, err := or.IsFieldOwnedBy(ctx, *fieldID, *ownerID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memverifikasi kepemilikan lapangan", err)
	}
	if !owned {
		return apperror.NotFound("FIELD_NOT_FOUND", "Lapangan tidak ditemukan")
	}
	return nil
}

func (s *service) resolveDateRange(fromStr, toStr string, defaultDays int) (time.Time, time.Time, error) {
	now := s.now().In(timeutil.WIB)
	toDate := timeutil.StartOfDay(now)
	fromDate := toDate.AddDate(0, 0, -(defaultDays - 1))

	if strings.TrimSpace(fromStr) != "" {
		parsed, err := timeutil.ParseDate(strings.TrimSpace(fromStr))
		if err != nil {
			return time.Time{}, time.Time{}, apperror.BadRequest("INVALID_DATE", "Format tanggal 'from' harus YYYY-MM-DD", err)
		}
		fromDate = parsed
	}
	if strings.TrimSpace(toStr) != "" {
		parsed, err := timeutil.ParseDate(strings.TrimSpace(toStr))
		if err != nil {
			return time.Time{}, time.Time{}, apperror.BadRequest("INVALID_DATE", "Format tanggal 'to' harus YYYY-MM-DD", err)
		}
		toDate = parsed
	}
	if fromDate.After(toDate) {
		return time.Time{}, time.Time{}, apperror.Unprocessable("INVALID_DATE_RANGE", "Tanggal mulai tidak boleh melebihi tanggal akhir")
	}
	return fromDate, toDate, nil
}

func (s *service) ListOwnerFields(ctx context.Context, ownerID uint) ([]OwnerFieldItem, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	fields, err := or.ListFieldsByOwner(ctx, &ownerID, nil)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar lapangan pemilik", err)
	}

	now := s.now().In(timeutil.WIB)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, timeutil.WIB)
	monthEnd := monthStart.AddDate(0, 1, -1)

	utilReport, _ := s.GetUtilizationReport(ctx, &ownerID, nil, monthStart.Format(timeutil.DateLayout), monthEnd.Format(timeutil.DateLayout))
	utilByField := make(map[uint]float64)
	if utilReport != nil {
		for _, fu := range utilReport.Fields {
			utilByField[fu.FieldID] = fu.UtilizationPercent
		}
	}

	items := make([]OwnerFieldItem, 0, len(fields))
	for _, f := range fields {
		fid := f.ID
		rev, _, _, _, _ := or.GetPaidRevenueSummary(ctx, &ownerID, &fid, monthStart.Format(timeutil.DateLayout), monthEnd.Format(timeutil.DateLayout))
		items = append(items, OwnerFieldItem{
			ID:               f.ID,
			Name:             f.Name,
			Slug:             f.Slug,
			SurfaceType:      f.SurfaceType,
			Capacity:         f.Capacity,
			IsActive:         f.IsActive,
			CoverURL:         f.CoverURL,
			MonthRevenue:     rev,
			MonthUtilization: utilByField[f.ID],
		})
	}
	return items, nil
}

func (s *service) GetOwnerSchedule(ctx context.Context, ownerID uint, fieldID *uint, fromStr, toStr string) (*OwnerScheduleResponse, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	if err := s.ensureFieldAccess(ctx, or, &ownerID, fieldID); err != nil {
		return nil, err
	}
	fromDate, toDate, err := s.resolveDateRange(fromStr, toStr, 7)
	if err != nil {
		return nil, err
	}
	from := fromDate.Format(timeutil.DateLayout)
	to := toDate.Format(timeutil.DateLayout)

	bookings, err := or.ListScheduleBookings(ctx, &ownerID, fieldID, from, to)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil jadwal reservasi", err)
	}
	blocks, err := or.ListScheduleBlocks(ctx, &ownerID, fieldID, fromDate, toDate.Add(24*time.Hour))
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil jadwal blokir", err)
	}
	return &OwnerScheduleResponse{
		From:     from,
		To:       to,
		Bookings: bookings,
		Blocks:   blocks,
	}, nil
}

func (s *service) ListOwnerBookings(ctx context.Context, ownerID uint, filter OwnerBookingFilter) (*PaginatedOwnerBookingsResponse, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	if err := s.ensureFieldAccess(ctx, or, &ownerID, filter.FieldID); err != nil {
		return nil, err
	}
	items, total, err := or.ListOwnerBookings(ctx, ownerID, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar reservasi pemilik", err)
	}
	return &PaginatedOwnerBookingsResponse{
		Items: items,
		Meta:  pagination.NewMeta(filter.Page, total),
	}, nil
}

func (s *service) GetOwnerBookingDetail(ctx context.Context, ownerID, bookingID uint) (*OwnerBookingItem, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	item, err := or.FindOwnerBookingByID(ctx, ownerID, bookingID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil detail reservasi", err)
	}
	if item == nil {
		return nil, apperror.NotFound("BOOKING_NOT_FOUND", "Reservasi tidak ditemukan")
	}
	return item, nil
}

func (s *service) ListOwnerTransactions(ctx context.Context, ownerID uint, filter OwnerTransactionFilter) (*PaginatedOwnerTransactionsResponse, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	if err := s.ensureFieldAccess(ctx, or, &ownerID, filter.FieldID); err != nil {
		return nil, err
	}
	items, totalPaid, total, err := or.ListOwnerTransactions(ctx, ownerID, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil transaksi pemilik", err)
	}
	return &PaginatedOwnerTransactionsResponse{
		Items:     items,
		TotalPaid: totalPaid,
		Meta:      pagination.NewMeta(filter.Page, total),
	}, nil
}

func (s *service) GetOwnerDashboardSummary(ctx context.Context, ownerID uint, fieldID *uint, fromStr, toStr string) (*OwnerDashboardSummary, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	if err := s.ensureFieldAccess(ctx, or, &ownerID, fieldID); err != nil {
		return nil, err
	}
	revReport, err := s.GetRevenueReport(ctx, &ownerID, fieldID, fromStr, toStr, "day")
	if err != nil {
		return nil, err
	}
	utilReport, err := s.GetUtilizationReport(ctx, &ownerID, fieldID, revReport.From, revReport.To)
	if err != nil {
		return nil, err
	}

	now := s.now().In(timeutil.WIB)
	todayStr := timeutil.StartOfDay(now).Format(timeutil.DateLayout)
	nextWeekStr := timeutil.StartOfDay(now).AddDate(0, 0, 7).Format(timeutil.DateLayout)
	upcoming, _ := or.ListScheduleBookings(ctx, &ownerID, fieldID, todayStr, nextWeekStr)
	if len(upcoming) > 8 {
		upcoming = upcoming[:8]
	}

	_, _, _, totalBookings, _ := or.GetPaidRevenueSummary(ctx, &ownerID, fieldID, revReport.From, revReport.To)

	return &OwnerDashboardSummary{
		From:               revReport.From,
		To:                 revReport.To,
		TotalRevenue:       revReport.TotalRevenue,
		PreviousRevenue:    revReport.PreviousRevenue,
		RevenueGrowthPct:   revReport.RevenueGrowthPct,
		TotalBookings:      totalBookings,
		AverageUtilization: utilReport.AverageUtilization,
		UpcomingBookings:   upcoming,
		FieldUtilizations:  utilReport.Fields,
	}, nil
}

func (s *service) GetRevenueReport(ctx context.Context, ownerID *uint, fieldID *uint, fromStr, toStr, group string) (*RevenueReportResponse, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	if err := s.ensureFieldAccess(ctx, or, ownerID, fieldID); err != nil {
		return nil, err
	}
	fromDate, toDate, err := s.resolveDateRange(fromStr, toStr, 30)
	if err != nil {
		return nil, err
	}
	if group != "month" {
		group = "day"
	}

	from := fromDate.Format(timeutil.DateLayout)
	to := toDate.Format(timeutil.DateLayout)

	ownerScope := "all"
	if ownerID != nil {
		ownerScope = fmt.Sprintf("%d", *ownerID)
	}
	fieldScope := "all"
	if fieldID != nil {
		fieldScope = fmt.Sprintf("%d", *fieldID)
	}
	cacheKey := fmt.Sprintf("cache:report:rev:%s:%s:%s:%s:%s", ownerScope, fieldScope, from, to, group)
	if s.cache != nil {
		if raw, hit, err := s.cache.Get(ctx, cacheKey); err == nil && hit {
			var cached RevenueReportResponse
			if json.Unmarshal(raw, &cached) == nil {
				return &cached, nil
			}
		}
	}

	total, online, offline, _, err := or.GetPaidRevenueSummary(ctx, ownerID, fieldID, from, to)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal menghitung ringkasan pendapatan", err)
	}
	series, err := or.GetRevenueSeries(ctx, ownerID, fieldID, from, to, group)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil tren pendapatan", err)
	}

	spanDays := int(toDate.Sub(fromDate).Hours()/24) + 1
	prevTo := fromDate.AddDate(0, 0, -1)
	prevFrom := prevTo.AddDate(0, 0, -(spanDays - 1))
	prevTotal, _, _, _, _ := or.GetPaidRevenueSummary(ctx, ownerID, fieldID, prevFrom.Format(timeutil.DateLayout), prevTo.Format(timeutil.DateLayout))

	var growth float64
	if prevTotal > 0 {
		growth = round2((float64(total-prevTotal) / float64(prevTotal)) * 100.0)
	} else if total > 0 {
		growth = 100
	}

	res := &RevenueReportResponse{
		From:             from,
		To:               to,
		Group:            group,
		TotalRevenue:     total,
		OnlineRevenue:    online,
		OfflineRevenue:   offline,
		PreviousRevenue:  prevTotal,
		RevenueGrowthPct: growth,
		Series:           series,
	}
	if s.cache != nil {
		if payload, err := json.Marshal(res); err == nil {
			_ = s.cache.Set(ctx, cacheKey, payload, ownerReportCacheTTL)
		}
	}
	return res, nil
}

func (s *service) GetUtilizationReport(ctx context.Context, ownerID *uint, fieldID *uint, fromStr, toStr string) (*UtilizationReportResponse, error) {
	or, err := s.ownerRepo()
	if err != nil {
		return nil, err
	}
	if err := s.ensureFieldAccess(ctx, or, ownerID, fieldID); err != nil {
		return nil, err
	}
	fromDate, toDate, err := s.resolveDateRange(fromStr, toStr, 30)
	if err != nil {
		return nil, err
	}
	from := fromDate.Format(timeutil.DateLayout)
	to := toDate.Format(timeutil.DateLayout)

	fields, err := or.ListFieldsByOwner(ctx, ownerID, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil lapangan untuk utilisasi", err)
	}
	fieldIDs := make([]uint, 0, len(fields))
	for _, f := range fields {
		fieldIDs = append(fieldIDs, f.ID)
	}

	hours, err := or.GetOperatingHoursForFields(ctx, fieldIDs)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil jam operasional", err)
	}
	rawBlocks, err := or.ListScheduleBlocks(ctx, ownerID, fieldID, fromDate, toDate.Add(24*time.Hour))
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil blokir jadwal", err)
	}
	blocks := make([]BlockInterval, 0, len(rawBlocks))
	for _, b := range rawBlocks {
		blocks = append(blocks, BlockInterval{
			FieldID:       b.FieldID,
			StartDatetime: b.StartDatetime,
			EndDatetime:   b.EndDatetime,
		})
	}
	usedSlots, err := or.GetUsedSlotsForFields(ctx, fieldIDs, from, to)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil slot terpakai", err)
	}

	fieldCalcs := make([]FieldUtilizationCalc, 0, len(fields))
	var sumPct float64
	for _, f := range fields {
		calc := ComputeFieldUtilization(f.ID, f.Name, fromDate, toDate, hours, blocks, usedSlots)
		fieldCalcs = append(fieldCalcs, calc)
		sumPct += calc.UtilizationPercent
	}
	avgUtil := 0.0
	if len(fieldCalcs) > 0 {
		avgUtil = round2(sumPct / float64(len(fieldCalcs)))
	}
	heatmap, quietHours := BuildHeatmapAndQuietHours(usedSlots)

	return &UtilizationReportResponse{
		From:               from,
		To:                 to,
		AverageUtilization: avgUtil,
		Fields:             fieldCalcs,
		Heatmap:            heatmap,
		QuietHours:         quietHours,
	}, nil
}

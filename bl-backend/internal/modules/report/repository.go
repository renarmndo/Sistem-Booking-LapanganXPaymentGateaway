package report

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type Repository interface {
	GetAdminDashboardSummary(ctx context.Context, from, to string, now time.Time) (*AdminDashboardSummary, error)
}

type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) GetAdminDashboardSummary(ctx context.Context, from, to string, now time.Time) (*AdminDashboardSummary, error) {
	summary := &AdminDashboardSummary{
		From:            from,
		To:              to,
		StatusCounts:    map[string]int64{},
		PendingBookings: []PendingBookingItem{},
		DailyTrend:      []DailyTrendPoint{},
		TopFields:       []TopFieldItem{},
		PeakHours:       []PeakHourItem{},
	}

	var counts struct {
		Total   int64
		Online  int64
		Offline int64
	}
	if err := r.db.WithContext(ctx).
		Table("bookings").
		Select("COUNT(*) AS total, COALESCE(SUM(CASE WHEN source = 'online' THEN 1 ELSE 0 END), 0) AS online, COALESCE(SUM(CASE WHEN source = 'offline' THEN 1 ELSE 0 END), 0) AS offline").
		Where("booking_date >= ? AND booking_date <= ?", from, to).
		Scan(&counts).Error; err != nil {
		return nil, err
	}
	summary.TotalBookings = counts.Total
	summary.OnlineBookings = counts.Online
	summary.OfflineBookings = counts.Offline

	const processedRefundsSubquery = "LEFT JOIN (SELECT booking_id, SUM(amount) AS refunded_amount FROM refund_requests WHERE status = 'processed' GROUP BY booking_id) rr ON rr.booking_id = b.id"

	var rev struct {
		PaidRevenue int64
	}
	if err := r.db.WithContext(ctx).
		Table("payments p").
		Joins("JOIN bookings b ON b.id = p.booking_id").
		Joins(processedRefundsSubquery).
		Select("COALESCE(SUM(CASE WHEN p.status = 'paid' THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS paid_revenue").
		Where("b.booking_date >= ? AND b.booking_date <= ?", from, to).
		Scan(&rev).Error; err != nil {
		return nil, err
	}
	summary.PaidRevenue = rev.PaidRevenue

	if err := r.db.WithContext(ctx).
		Table("payments").
		Where("needs_review = TRUE").
		Count(&summary.NeedsReviewCount).Error; err != nil {
		return nil, err
	}

	var statusRows []StatusCount
	if err := r.db.WithContext(ctx).
		Table("bookings").
		Select("status, COUNT(*) AS count").
		Where("booking_date >= ? AND booking_date <= ?", from, to).
		Group("status").
		Scan(&statusRows).Error; err != nil {
		return nil, err
	}
	for _, row := range statusRows {
		summary.StatusCounts[row.Status] = row.Count
	}

	if err := r.db.WithContext(ctx).
		Table("bookings b").
		Joins("JOIN fields f ON f.id = b.field_id").
		Select("b.id, b.code, f.name AS field_name, b.total_amount, b.expires_at").
		Where("b.status = 'PENDING_PAYMENT' AND (b.expires_at IS NULL OR b.expires_at > ?)", now).
		Order("b.expires_at ASC").
		Limit(20).
		Scan(&summary.PendingBookings).Error; err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).
		Table("bookings b").
		Joins("LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'").
		Joins(processedRefundsSubquery).
		Select("DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS date, COUNT(DISTINCT b.id) AS bookings, COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS revenue").
		Where("b.booking_date >= ? AND b.booking_date <= ?", from, to).
		Group("b.booking_date").
		Order("b.booking_date ASC").
		Scan(&summary.DailyTrend).Error; err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).
		Table("bookings b").
		Joins("JOIN fields f ON f.id = b.field_id").
		Joins("LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'").
		Joins(processedRefundsSubquery).
		Select("b.field_id, f.name AS field_name, COUNT(DISTINCT b.id) AS bookings, COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS revenue").
		Where("b.booking_date >= ? AND b.booking_date <= ? AND b.status IN ('CONFIRMED','COMPLETED')", from, to).
		Group("b.field_id, f.name").
		Order("bookings DESC, revenue DESC").
		Limit(10).
		Scan(&summary.TopFields).Error; err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).
		Table("booking_slots bs").
		Joins("JOIN bookings b ON b.id = bs.booking_id").
		Select("DATE_FORMAT(bs.start_time, '%H:00') AS hour, COUNT(*) AS bookings").
		Where("b.booking_date >= ? AND b.booking_date <= ? AND b.status IN ('CONFIRMED','COMPLETED')", from, to).
		Group("hour").
		Order("bookings DESC").
		Limit(12).
		Scan(&summary.PeakHours).Error; err != nil {
		return nil, err
	}

	return summary, nil
}

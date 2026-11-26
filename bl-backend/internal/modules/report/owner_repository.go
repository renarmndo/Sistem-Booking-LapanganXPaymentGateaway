package report

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
	"sistem-booking/pkg/timeutil"
)

type OwnerFieldBasic struct {
	ID          uint
	OwnerID     uint
	Name        string
	Slug        string
	SurfaceType string
	Capacity    uint
	IsActive    bool
	CoverURL    string
}

type OwnerRepository interface {
	ListFieldsByOwner(ctx context.Context, ownerID *uint, fieldID *uint) ([]OwnerFieldBasic, error)
	IsFieldOwnedBy(ctx context.Context, fieldID, ownerID uint) (bool, error)
	ListScheduleBookings(ctx context.Context, ownerID *uint, fieldID *uint, from, to string) ([]OwnerScheduleBooking, error)
	ListScheduleBlocks(ctx context.Context, ownerID *uint, fieldID *uint, fromDT, toDT time.Time) ([]OwnerScheduleBlock, error)
	ListOwnerBookings(ctx context.Context, ownerID uint, filter OwnerBookingFilter) ([]OwnerBookingItem, int64, error)
	FindOwnerBookingByID(ctx context.Context, ownerID, bookingID uint) (*OwnerBookingItem, error)
	ListOwnerTransactions(ctx context.Context, ownerID uint, filter OwnerTransactionFilter) ([]OwnerTransactionItem, int64, int64, error)
	GetPaidRevenueSummary(ctx context.Context, ownerID *uint, fieldID *uint, from, to string) (total int64, online int64, offline int64, count int64, err error)
	GetRevenueSeries(ctx context.Context, ownerID *uint, fieldID *uint, from, to, group string) ([]RevenuePoint, error)
	GetOperatingHoursForFields(ctx context.Context, fieldIDs []uint) ([]OperatingHourRule, error)
	GetUsedSlotsForFields(ctx context.Context, fieldIDs []uint, from, to string) ([]UsedSlotRecord, error)
}

func whereOwner(q *gorm.DB, ownerID *uint) *gorm.DB {
	if ownerID != nil {
		return q.Where("f.owner_id = ?", *ownerID)
	}
	return q
}

func (r *gormRepository) ListFieldsByOwner(ctx context.Context, ownerID *uint, fieldID *uint) ([]OwnerFieldBasic, error) {
	q := r.db.WithContext(ctx).
		Table("fields f").
		Select("f.id, f.owner_id, f.name, f.slug, f.surface_type, f.capacity, f.is_active, COALESCE((SELECT fp.url FROM field_photos fp WHERE fp.field_id = f.id AND fp.is_cover = TRUE LIMIT 1), '') AS cover_url").
		Where("f.deleted_at IS NULL")
	q = whereOwner(q, ownerID)
	if fieldID != nil {
		q = q.Where("f.id = ?", *fieldID)
	}
	var rows []OwnerFieldBasic
	err := q.Order("f.id ASC").Scan(&rows).Error
	return rows, err
}

func (r *gormRepository) IsFieldOwnedBy(ctx context.Context, fieldID, ownerID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("fields f").
		Where("f.id = ? AND f.owner_id = ? AND f.deleted_at IS NULL", fieldID, ownerID).
		Count(&count).Error
	return count > 0, err
}

func (r *gormRepository) ListScheduleBookings(ctx context.Context, ownerID *uint, fieldID *uint, from, to string) ([]OwnerScheduleBooking, error) {
	q := r.db.WithContext(ctx).
		Table("bookings b").
		Joins("JOIN fields f ON f.id = b.field_id").
		Joins("LEFT JOIN users u ON u.id = b.user_id").
		Select("b.id, b.code, b.field_id, f.name AS field_name, DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date, LEFT(b.start_time, 5) AS start_time, LEFT(b.end_time, 5) AS end_time, b.status, b.source, COALESCE(NULLIF(b.guest_name, ''), u.name, 'Pelanggan') AS customer_name, b.total_amount").
		Where("f.deleted_at IS NULL AND b.status IN ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED') AND b.booking_date >= ? AND b.booking_date <= ?", from, to)
	q = whereOwner(q, ownerID)
	if fieldID != nil {
		q = q.Where("b.field_id = ?", *fieldID)
	}
	var rows []OwnerScheduleBooking
	err := q.Order("b.booking_date ASC, b.start_time ASC").Scan(&rows).Error
	return rows, err
}

func (r *gormRepository) ListScheduleBlocks(ctx context.Context, ownerID *uint, fieldID *uint, fromDT, toDT time.Time) ([]OwnerScheduleBlock, error) {
	q := r.db.WithContext(ctx).
		Table("schedule_blocks sb").
		Joins("JOIN fields f ON f.id = sb.field_id").
		Select("sb.id, sb.field_id, sb.start_datetime, sb.end_datetime, sb.reason").
		Where("f.deleted_at IS NULL AND sb.start_datetime < ? AND sb.end_datetime > ?", toDT, fromDT)
	q = whereOwner(q, ownerID)
	if fieldID != nil {
		q = q.Where("sb.field_id = ?", *fieldID)
	}
	var rows []OwnerScheduleBlock
	err := q.Order("sb.start_datetime ASC").Scan(&rows).Error
	return rows, err
}

func (r *gormRepository) ListOwnerBookings(ctx context.Context, ownerID uint, filter OwnerBookingFilter) ([]OwnerBookingItem, int64, error) {
	base := r.db.WithContext(ctx).
		Table("bookings b").
		Joins("JOIN fields f ON f.id = b.field_id").
		Joins("LEFT JOIN users u ON u.id = b.user_id").
		Where("f.deleted_at IS NULL AND f.owner_id = ?", ownerID)

	if filter.FieldID != nil {
		base = base.Where("b.field_id = ?", *filter.FieldID)
	}
	if filter.Status != "" {
		base = base.Where("b.status = ?", filter.Status)
	}
	if filter.Source != "" {
		base = base.Where("b.source = ?", filter.Source)
	}
	if filter.From != "" {
		base = base.Where("b.booking_date >= ?", filter.From)
	}
	if filter.To != "" {
		base = base.Where("b.booking_date <= ?", filter.To)
	}
	if filter.Query != "" {
		like := "%" + strings.TrimSpace(filter.Query) + "%"
		base = base.Where("(b.code LIKE ? OR b.guest_name LIKE ? OR u.name LIKE ?)", like, like, like)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []OwnerBookingItem
	err := base.
		Select("b.id, b.code, b.field_id, f.name AS field_name, DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date, LEFT(b.start_time, 5) AS start_time, LEFT(b.end_time, 5) AS end_time, b.total_amount, b.status, b.source, COALESCE(NULLIF(b.guest_name, ''), u.name, 'Pelanggan') AS customer_name, COALESCE(NULLIF(b.guest_phone, ''), u.phone, '') AS customer_phone, COALESCE((SELECT p.status FROM payments p WHERE p.booking_id = b.id ORDER BY p.id DESC LIMIT 1), 'pending') AS payment_status, COALESCE((SELECT p.method FROM payments p WHERE p.booking_id = b.id ORDER BY p.id DESC LIMIT 1), 'midtrans') AS payment_method, b.created_at").
		Order("b.created_at DESC").
		Limit(filter.Page.Limit).
		Offset(filter.Page.Offset()).
		Scan(&items).Error
	return items, total, err
}

func (r *gormRepository) FindOwnerBookingByID(ctx context.Context, ownerID, bookingID uint) (*OwnerBookingItem, error) {
	var item OwnerBookingItem
	err := r.db.WithContext(ctx).
		Table("bookings b").
		Joins("JOIN fields f ON f.id = b.field_id").
		Joins("LEFT JOIN users u ON u.id = b.user_id").
		Select("b.id, b.code, b.field_id, f.name AS field_name, DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date, LEFT(b.start_time, 5) AS start_time, LEFT(b.end_time, 5) AS end_time, b.total_amount, b.status, b.source, COALESCE(NULLIF(b.guest_name, ''), u.name, 'Pelanggan') AS customer_name, COALESCE(NULLIF(b.guest_phone, ''), u.phone, '') AS customer_phone, COALESCE((SELECT p.status FROM payments p WHERE p.booking_id = b.id ORDER BY p.id DESC LIMIT 1), 'pending') AS payment_status, COALESCE((SELECT p.method FROM payments p WHERE p.booking_id = b.id ORDER BY p.id DESC LIMIT 1), 'midtrans') AS payment_method, b.created_at").
		Where("b.id = ? AND f.owner_id = ? AND f.deleted_at IS NULL", bookingID, ownerID).
		First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *gormRepository) ListOwnerTransactions(ctx context.Context, ownerID uint, filter OwnerTransactionFilter) ([]OwnerTransactionItem, int64, int64, error) {
	base := r.db.WithContext(ctx).
		Table("payments p").
		Joins("JOIN bookings b ON b.id = p.booking_id").
		Joins("JOIN fields f ON f.id = b.field_id").
		Where("f.deleted_at IS NULL AND f.owner_id = ?", ownerID)

	if filter.FieldID != nil {
		base = base.Where("b.field_id = ?", *filter.FieldID)
	}
	if filter.Status != "" {
		base = base.Where("p.status = ?", filter.Status)
	}
	if filter.Method != "" {
		base = base.Where("p.method = ?", filter.Method)
	}
	if filter.From != "" {
		base = base.Where("DATE(p.created_at) >= ?", filter.From)
	}
	if filter.To != "" {
		base = base.Where("DATE(p.created_at) <= ?", filter.To)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, 0, err
	}

	var totalPaid int64
	if err := base.Session(&gorm.Session{}).
		Select("COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0)").
		Scan(&totalPaid).Error; err != nil {
		return nil, 0, 0, err
	}

	var items []OwnerTransactionItem
	err := base.Session(&gorm.Session{}).
		Select("p.id, p.booking_id, b.code AS booking_code, b.field_id, f.name AS field_name, p.order_id, p.method, COALESCE(p.channel, '') AS channel, p.amount, p.status, p.paid_at, p.created_at").
		Order("p.created_at DESC").
		Limit(filter.Page.Limit).
		Offset(filter.Page.Offset()).
		Scan(&items).Error
	return items, totalPaid, total, err
}

func (r *gormRepository) GetPaidRevenueSummary(ctx context.Context, ownerID *uint, fieldID *uint, from, to string) (int64, int64, int64, int64, error) {
	const processedRefundsSubquery = "LEFT JOIN (SELECT booking_id, SUM(amount) AS refunded_amount FROM refund_requests WHERE status = 'processed' GROUP BY booking_id) rr ON rr.booking_id = b.id"
	q := r.db.WithContext(ctx).
		Table("payments p").
		Joins("JOIN bookings b ON b.id = p.booking_id").
		Joins("JOIN fields f ON f.id = b.field_id").
		Joins(processedRefundsSubquery).
		Where("f.deleted_at IS NULL AND p.status IN ('paid','partial') AND b.booking_date >= ? AND b.booking_date <= ?", from, to)
	q = whereOwner(q, ownerID)
	if fieldID != nil {
		q = q.Where("b.field_id = ?", *fieldID)
	}

	var row struct {
		Total   int64
		Online  int64
		Offline int64
		Count   int64
	}
	err := q.Select("COALESCE(SUM(GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0)), 0) AS total, COALESCE(SUM(CASE WHEN b.source = 'online' THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS online, COALESCE(SUM(CASE WHEN b.source = 'offline' THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS offline, COUNT(DISTINCT b.id) AS count").
		Scan(&row).Error
	return row.Total, row.Online, row.Offline, row.Count, err
}

func (r *gormRepository) GetRevenueSeries(ctx context.Context, ownerID *uint, fieldID *uint, from, to, group string) ([]RevenuePoint, error) {
	const processedRefundsSubquery = "LEFT JOIN (SELECT booking_id, SUM(amount) AS refunded_amount FROM refund_requests WHERE status = 'processed' GROUP BY booking_id) rr ON rr.booking_id = b.id"
	periodExpr := "DATE_FORMAT(b.booking_date, '%Y-%m-%d')"
	if group == "month" {
		periodExpr = "DATE_FORMAT(b.booking_date, '%Y-%m')"
	}
	q := r.db.WithContext(ctx).
		Table("payments p").
		Joins("JOIN bookings b ON b.id = p.booking_id").
		Joins("JOIN fields f ON f.id = b.field_id").
		Joins(processedRefundsSubquery).
		Where("f.deleted_at IS NULL AND p.status IN ('paid','partial') AND b.booking_date >= ? AND b.booking_date <= ?", from, to)
	q = whereOwner(q, ownerID)
	if fieldID != nil {
		q = q.Where("b.field_id = ?", *fieldID)
	}

	var rows []RevenuePoint
	err := q.Select(periodExpr + " AS period, COALESCE(SUM(CASE WHEN b.source = 'online' THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS online_revenue, COALESCE(SUM(CASE WHEN b.source = 'offline' THEN GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0) ELSE 0 END), 0) AS offline_revenue, COALESCE(SUM(GREATEST(p.amount - COALESCE(rr.refunded_amount, 0), 0)), 0) AS total_revenue, COUNT(DISTINCT b.id) AS bookings").
		Group("period").
		Order("period ASC").
		Scan(&rows).Error
	return rows, err
}

func (r *gormRepository) GetOperatingHoursForFields(ctx context.Context, fieldIDs []uint) ([]OperatingHourRule, error) {
	if len(fieldIDs) == 0 {
		return nil, nil
	}
	var rows []OperatingHourRule
	err := r.db.WithContext(ctx).
		Table("operating_hours").
		Select("field_id, day_of_week, open_time, close_time, is_closed").
		Where("field_id IN ?", fieldIDs).
		Find(&rows).Error
	return rows, err
}

func (r *gormRepository) GetUsedSlotsForFields(ctx context.Context, fieldIDs []uint, from, to string) ([]UsedSlotRecord, error) {
	if len(fieldIDs) == 0 {
		return nil, nil
	}
	type rawSlot struct {
		FieldID   uint
		SlotDate  time.Time
		StartTime string
		EndTime   string
	}
	var raw []rawSlot
	err := r.db.WithContext(ctx).
		Table("booking_slots bs").
		Joins("JOIN bookings b ON b.id = bs.booking_id").
		Select("bs.field_id, bs.slot_date, LEFT(bs.start_time, 5) AS start_time, LEFT(bs.end_time, 5) AS end_time").
		Where("bs.field_id IN ? AND bs.slot_date >= ? AND bs.slot_date <= ? AND b.status IN ('CONFIRMED', 'COMPLETED')", fieldIDs, from, to).
		Find(&raw).Error
	if err != nil {
		return nil, err
	}
	res := make([]UsedSlotRecord, 0, len(raw))
	for _, item := range raw {
		res = append(res, UsedSlotRecord{
			FieldID:   item.FieldID,
			SlotDate:  item.SlotDate.In(timeutil.WIB),
			StartTime: item.StartTime,
			EndTime:   item.EndTime,
		})
	}
	return res, nil
}

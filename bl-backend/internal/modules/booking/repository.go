package booking

import (
	"context"
	"errors"
	"strings"
	"time"

	mysqldrv "github.com/go-sql-driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/database"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
)

type OccupiedSlotRow struct {
	StartTime string
	Status    constant.BookingStatus
	ExpiresAt *time.Time
}

type Repository interface {
	RunInTx(ctx context.Context, fn func(txRepo Repository) error) error
	CountPendingByUser(ctx context.Context, userID uint) (int64, error)
	CreateBooking(ctx context.Context, booking *Booking) error
	CreateBookingSlots(ctx context.Context, slots []BookingSlot) error
	CreateLog(ctx context.Context, log *BookingLog) error

	ListOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) ([]OccupiedSlotRow, error)
	ListByUser(ctx context.Context, userID uint, status string, pageQuery pagination.Query) ([]Booking, int64, error)
	FindByIDForUser(ctx context.Context, bookingID uint, userID uint) (*Booking, error)
	FindFieldSummariesByIDs(ctx context.Context, fieldIDs []uint) (map[uint]FieldSummaryDTO, error)
	UpdateBookingCancellation(ctx context.Context, bookingID uint, cancelledAt time.Time, reason string) error
	ReleaseBookingSlots(ctx context.Context, bookingID uint) error

	FindOverduePendingForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error)
	FindFinishedConfirmedForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error)
	FindActivePendingWithSlots(ctx context.Context, now time.Time) ([]Booking, error)
	UpdateBookingStatus(ctx context.Context, bookingID uint, status constant.BookingStatus) error
	FindByID(ctx context.Context, bookingID uint) (*Booking, error)
	FindByIDForUpdate(ctx context.Context, bookingID uint) (*Booking, error)
	DeleteBooking(ctx context.Context, bookingID uint) error
}

// AdminRepository extends Repository with admin query, conflict detection, and lookup operations.
type AdminRepository interface {
	ListAdmin(ctx context.Context, filter AdminBookingFilter) ([]Booking, int64, error)
	FindLogsByBookingID(ctx context.Context, bookingID uint) ([]BookingLog, error)
	FindConflictingBookings(ctx context.Context, fieldID uint, start, end time.Time) ([]Booking, error)
	FindUserBasicInfoByIDs(ctx context.Context, userIDs []uint) (map[uint]UserBasicInfo, error)
	FindPaymentSummariesByBookingIDs(ctx context.Context, bookingIDs []uint) (map[uint]BookingPaymentSummary, error)
}

type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) RunInTx(ctx context.Context, fn func(txRepo Repository) error) error {
	return database.WithTx(ctx, r.db, func(tx *gorm.DB) error {
		return fn(&gormRepository{db: tx})
	})
}

func (r *gormRepository) CountPendingByUser(ctx context.Context, userID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&Booking{}).
		Where("user_id = ? AND status = ?", userID, constant.BookingPendingPayment).
		Count(&count).Error
	return count, err
}

func (r *gormRepository) CreateBooking(ctx context.Context, booking *Booking) error {
	return r.db.WithContext(ctx).Create(booking).Error
}

func (r *gormRepository) CreateBookingSlots(ctx context.Context, slots []BookingSlot) error {
	if len(slots) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&slots).Error
}

func (r *gormRepository) CreateLog(ctx context.Context, log *BookingLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *gormRepository) ListOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) ([]OccupiedSlotRow, error) {
	var rows []OccupiedSlotRow
	err := r.db.WithContext(ctx).
		Table("booking_slots bs").
		Select("bs.start_time, b.status, b.expires_at").
		Joins("JOIN bookings b ON b.id = bs.booking_id").
		Where("bs.field_id = ? AND bs.slot_date = ? AND bs.active_key = 1 AND b.status IN ?",
			fieldID,
			timeutil.StartOfDay(date).Format(timeutil.DateLayout),
			[]constant.BookingStatus{
				constant.BookingPendingPayment,
				constant.BookingConfirmed,
				constant.BookingCompleted,
			},
		).
		Scan(&rows).Error
	return rows, err
}

func (r *gormRepository) ListByUser(ctx context.Context, userID uint, status string, pageQuery pagination.Query) ([]Booking, int64, error) {
	base := r.db.WithContext(ctx).Model(&Booking{}).Where("user_id = ?", userID)
	if trimmed := strings.TrimSpace(status); trimmed != "" {
		base = base.Where("status = ?", trimmed)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []Booking
	err := base.
		Preload("Slots", func(db *gorm.DB) *gorm.DB {
			return db.Order("start_time ASC")
		}).
		Order("created_at DESC, id DESC").
		Limit(pageQuery.Limit).
		Offset(pageQuery.Offset()).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *gormRepository) FindByIDForUser(ctx context.Context, bookingID uint, userID uint) (*Booking, error) {
	var item Booking
	err := r.db.WithContext(ctx).
		Preload("Slots", func(db *gorm.DB) *gorm.DB {
			return db.Order("start_time ASC")
		}).
		Where("id = ? AND user_id = ?", bookingID, userID).
		First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *gormRepository) FindFieldSummariesByIDs(ctx context.Context, fieldIDs []uint) (map[uint]FieldSummaryDTO, error) {
	result := make(map[uint]FieldSummaryDTO)
	if len(fieldIDs) == 0 {
		return result, nil
	}

	type fieldRow struct {
		ID          uint
		Name        string
		Slug        string
		SurfaceType string
		CoverURL    string
	}
	var rows []fieldRow
	err := r.db.WithContext(ctx).
		Table("fields f").
		Select("f.id, f.name, f.slug, f.surface_type, COALESCE((SELECT fp.url FROM field_photos fp WHERE fp.field_id = f.id ORDER BY fp.is_cover DESC, fp.sort_order ASC, fp.id ASC LIMIT 1), '') AS cover_url").
		Where("f.id IN ?", fieldIDs).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ID] = FieldSummaryDTO{
			ID:          row.ID,
			Name:        row.Name,
			Slug:        row.Slug,
			SurfaceType: row.SurfaceType,
			CoverURL:    row.CoverURL,
		}
	}
	return result, nil
}

func (r *gormRepository) UpdateBookingCancellation(ctx context.Context, bookingID uint, cancelledAt time.Time, reason string) error {
	return r.db.WithContext(ctx).
		Model(&Booking{}).
		Where("id = ?", bookingID).
		Updates(map[string]any{
			"status":        constant.BookingCancelled,
			"cancelled_at":  cancelledAt,
			"cancel_reason": reason,
		}).Error
}

func (r *gormRepository) ReleaseBookingSlots(ctx context.Context, bookingID uint) error {
	return r.db.WithContext(ctx).
		Model(&BookingSlot{}).
		Where("booking_id = ?", bookingID).
		Update("active_key", nil).Error
}

func (r *gormRepository) FindOverduePendingForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error) {
	var items []Booking
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
		Preload("Slots").
		Where("status = ? AND expires_at IS NOT NULL AND expires_at < ?", constant.BookingPendingPayment, now).
		Limit(limit).
		Find(&items).Error
	return items, err
}

func (r *gormRepository) FindFinishedConfirmedForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error) {
	var items []Booking
	nowStr := now.In(timeutil.WIB).Format("2006-01-02 15:04:05")
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
		Where("status = ? AND TIMESTAMP(booking_date, end_time) < ?", constant.BookingConfirmed, nowStr).
		Limit(limit).
		Find(&items).Error
	return items, err
}

func (r *gormRepository) FindActivePendingWithSlots(ctx context.Context, now time.Time) ([]Booking, error) {
	var items []Booking
	err := r.db.WithContext(ctx).
		Preload("Slots").
		Where("status = ? AND expires_at IS NOT NULL AND expires_at > ?", constant.BookingPendingPayment, now).
		Find(&items).Error
	return items, err
}

func (r *gormRepository) UpdateBookingStatus(ctx context.Context, bookingID uint, status constant.BookingStatus) error {
	return r.db.WithContext(ctx).
		Model(&Booking{}).
		Where("id = ?", bookingID).
		Update("status", status).Error
}

func (r *gormRepository) FindByID(ctx context.Context, bookingID uint) (*Booking, error) {
	var item Booking
	err := r.db.WithContext(ctx).Preload("Slots").Where("id = ?", bookingID).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *gormRepository) FindByIDForUpdate(ctx context.Context, bookingID uint) (*Booking, error) {
	var item Booking
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Slots").
		Where("id = ?", bookingID).
		First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *gormRepository) DeleteBooking(ctx context.Context, bookingID uint) error {
	return r.db.WithContext(ctx).Delete(&Booking{}, bookingID).Error
}

func (r *gormRepository) ListAdmin(ctx context.Context, filter AdminBookingFilter) ([]Booking, int64, error) {
	q := r.db.WithContext(ctx).Model(&Booking{})

	if filter.Date != "" {
		q = q.Where("booking_date = ?", filter.Date)
	}
	if filter.From != "" {
		q = q.Where("booking_date >= ?", filter.From)
	}
	if filter.To != "" {
		q = q.Where("booking_date <= ?", filter.To)
	}
	if filter.FieldID != nil {
		q = q.Where("field_id = ?", *filter.FieldID)
	}
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Source != "" {
		q = q.Where("source = ?", filter.Source)
	}
	if filter.PaymentStatus != "" {
		q = q.Where("EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id AND p.status = ?)", filter.PaymentStatus)
	}
	if filter.Query != "" {
		like := "%" + strings.TrimSpace(filter.Query) + "%"
		q = q.Where(
			`(code LIKE ? OR guest_name LIKE ? OR guest_phone LIKE ? OR EXISTS (SELECT 1 FROM users u WHERE u.id = bookings.user_id AND (u.name LIKE ? OR u.phone LIKE ?)))`,
			like, like, like, like, like,
		)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderClause := "created_at DESC"
	switch filter.Sort {
	case "oldest":
		orderClause = "created_at ASC"
	case "date_asc":
		orderClause = "booking_date ASC, start_time ASC"
	case "date_desc":
		orderClause = "booking_date DESC, start_time DESC"
	}

	var items []Booking
	err := q.Preload("Slots").
		Order(orderClause).
		Limit(filter.Pagination.Limit).
		Offset(filter.Pagination.Offset()).
		Find(&items).Error
	return items, total, err
}

func (r *gormRepository) FindLogsByBookingID(ctx context.Context, bookingID uint) ([]BookingLog, error) {
	var logs []BookingLog
	err := r.db.WithContext(ctx).
		Where("booking_id = ?", bookingID).
		Order("created_at ASC").
		Find(&logs).Error
	return logs, err
}

func (r *gormRepository) FindConflictingBookings(ctx context.Context, fieldID uint, start, end time.Time) ([]Booking, error) {
	startDate := start.In(timeutil.WIB).Format(timeutil.DateLayout)
	endDate := end.In(timeutil.WIB).Format(timeutil.DateLayout)

	var candidates []Booking
	err := r.db.WithContext(ctx).
		Where("field_id = ? AND status IN ? AND booking_date >= ? AND booking_date <= ?",
			fieldID,
			[]constant.BookingStatus{constant.BookingPendingPayment, constant.BookingConfirmed},
			startDate,
			endDate,
		).
		Order("booking_date ASC, start_time ASC").
		Find(&candidates).Error
	if err != nil {
		return nil, err
	}

	var conflicts []Booking
	for _, b := range candidates {
		bDate := timeutil.StartOfDay(b.BookingDate.In(timeutil.WIB))
		sClock, errS := timeutil.ParseClock(trimClock(b.StartTime))
		eClock, errE := timeutil.ParseClock(trimClock(b.EndTime))
		if errS != nil || errE != nil {
			continue
		}
		bStart := time.Date(bDate.Year(), bDate.Month(), bDate.Day(), sClock.Hour(), sClock.Minute(), 0, 0, timeutil.WIB)
		bEnd := time.Date(bDate.Year(), bDate.Month(), bDate.Day(), eClock.Hour(), eClock.Minute(), 0, 0, timeutil.WIB)
		if bStart.Before(end) && bEnd.After(start) {
			conflicts = append(conflicts, b)
		}
	}
	return conflicts, nil
}

func (r *gormRepository) FindUserBasicInfoByIDs(ctx context.Context, userIDs []uint) (map[uint]UserBasicInfo, error) {
	res := make(map[uint]UserBasicInfo)
	if len(userIDs) == 0 {
		return res, nil
	}
	type row struct {
		ID    uint
		Name  string
		Phone string
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Table("users").
		Select("id, name, phone").
		Where("id IN ?", userIDs).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, item := range rows {
		res[item.ID] = UserBasicInfo{Name: item.Name, Phone: item.Phone}
	}
	return res, nil
}

func (r *gormRepository) FindPaymentSummariesByBookingIDs(ctx context.Context, bookingIDs []uint) (map[uint]BookingPaymentSummary, error) {
	res := make(map[uint]BookingPaymentSummary)
	if len(bookingIDs) == 0 {
		return res, nil
	}
	type row struct {
		BookingID uint
		Method    string
		Channel   string
		Status    string
		Amount    int64
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Table("payments").
		Select("booking_id, method, COALESCE(channel, '') AS channel, status, amount").
		Where("booking_id IN ?", bookingIDs).
		Order("id DESC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, item := range rows {
		if _, exists := res[item.BookingID]; exists {
			continue
		}
		paid := int64(0)
		if item.Status == string(constant.PaymentPaid) || (item.Status == string(constant.PaymentPartial) && item.Method == "midtrans") {
			paid = item.Amount
		}
		res[item.BookingID] = BookingPaymentSummary{
			Provider:   item.Method,
			Channel:    item.Channel,
			Status:     item.Status,
			Amount:     item.Amount,
			PaidAmount: paid,
		}
	}
	return res, nil
}

func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	var mysqlErr *mysqldrv.MySQLError
	if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "UNIQUE constraint failed")
}

func isDuplicateCodeError(err error) bool {
	if !isDuplicateKeyError(err) {
		return false
	}
	return strings.Contains(err.Error(), "uq_bookings_code")
}

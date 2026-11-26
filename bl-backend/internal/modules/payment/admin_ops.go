package payment

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
	"sistem-booking/pkg/timeutil"
)

type AdminTransactionFilter struct {
	From       string
	To         string
	Status     string
	Method     string
	FieldID    *uint
	Query      string
	Pagination pagination.Query
}

type AdminTransactionItem struct {
	ID            uint                   `json:"id"`
	BookingID     uint                   `json:"booking_id"`
	BookingCode   string                 `json:"booking_code"`
	FieldName     string                 `json:"field_name"`
	OrderID       string                 `json:"order_id"`
	Method        string                 `json:"method"`
	Channel       string                 `json:"channel"`
	Amount        int64                  `json:"amount"`
	Status        constant.PaymentStatus `json:"status"`
	TransactionID string                 `json:"transaction_id"`
	NeedsReview   bool                   `json:"needs_review"`
	PaidAt        *time.Time             `json:"paid_at"`
	RecordedBy    *uint                  `json:"recorded_by,omitempty"`
	CreatedAt     time.Time              `json:"created_at"`
}

type AdminTransactionSummary struct {
	TotalPaidAmount  int64 `json:"total_paid_amount"`
	TotalCount       int64 `json:"total_count"`
	NeedsReviewCount int64 `json:"needs_review_count"`
}

type PaginatedAdminTransactionsResponse struct {
	Items   []AdminTransactionItem  `json:"items"`
	Summary AdminTransactionSummary `json:"summary"`
	Meta    pagination.Meta         `json:"meta"`
}

type AdminTransactionDetailResponse struct {
	AdminTransactionItem
	Logs []PaymentLog `json:"logs"`
}

type AdminRefundFilter struct {
	Status     string
	Pagination pagination.Query
}

type AdminRefundItem struct {
	RefundRequest
	BookingCode string `json:"booking_code"`
}

type PaginatedAdminRefundsResponse struct {
	Items []AdminRefundItem `json:"items"`
	Meta  pagination.Meta   `json:"meta"`
}

type AdminProcessRefundRequest struct {
	Action string `json:"action"`
	Note   string `json:"note"`
}

type AdminPaymentResult struct {
	BookingID     uint
	PaymentStatus string
	PaidTotal     int64
	TotalAmount   int64
	Remaining     int64
}

type AdminPaymentRepository interface {
	FindByID(ctx context.Context, id uint) (*Payment, error)
	FindByBookingIDForUpdate(ctx context.Context, bookingID uint) (*Payment, error)
	UpdateAdminPayment(ctx context.Context, id uint, status constant.PaymentStatus, method string, amount int64, recordedBy uint, paidAt *time.Time) error
	FindPaymentLogsByPaymentID(ctx context.Context, paymentID uint) ([]PaymentLog, error)
	ListAdminTransactions(ctx context.Context, filter AdminTransactionFilter) ([]AdminTransactionItem, AdminTransactionSummary, int64, error)
	GetAdminTransactionDetail(ctx context.Context, id uint) (*AdminTransactionDetailResponse, error)
	ListAdminRefunds(ctx context.Context, filter AdminRefundFilter) ([]AdminRefundItem, int64, error)
	FindRefundByID(ctx context.Context, id uint) (*RefundRequest, error)
	UpdateRefundDecision(ctx context.Context, id uint, status string, processedBy uint, processedAt time.Time, note string) error
}

func (r *gormRepository) FindByID(ctx context.Context, id uint) (*Payment, error) {
	var p Payment
	err := r.db.WithContext(ctx).First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &p, err
}

func (r *gormRepository) FindByBookingIDForUpdate(ctx context.Context, bookingID uint) (*Payment, error) {
	var p Payment
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("booking_id = ?", bookingID).
		Order("id DESC").
		First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &p, err
}

func (r *gormRepository) UpdateAdminPayment(ctx context.Context, id uint, status constant.PaymentStatus, method string, amount int64, recordedBy uint, paidAt *time.Time) error {
	updates := map[string]any{
		"status":      status,
		"method":      method,
		"recorded_by": recordedBy,
	}
	if amount > 0 {
		updates["amount"] = amount
	}
	if paidAt != nil {
		updates["paid_at"] = *paidAt
	}
	return r.db.WithContext(ctx).
		Model(&Payment{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *gormRepository) FindPaymentLogsByPaymentID(ctx context.Context, paymentID uint) ([]PaymentLog, error) {
	var logs []PaymentLog
	err := r.db.WithContext(ctx).
		Where("payment_id = ?", paymentID).
		Order("created_at ASC").
		Find(&logs).Error
	return logs, err
}

func (r *gormRepository) buildTxQuery(ctx context.Context, filter AdminTransactionFilter) *gorm.DB {
	q := r.db.WithContext(ctx).
		Table("payments p").
		Joins("JOIN bookings b ON b.id = p.booking_id").
		Joins("JOIN fields f ON f.id = b.field_id")

	if filter.From != "" {
		q = q.Where("DATE(p.created_at) >= ?", filter.From)
	}
	if filter.To != "" {
		q = q.Where("DATE(p.created_at) <= ?", filter.To)
	}
	if filter.Status != "" {
		q = q.Where("p.status = ?", filter.Status)
	}
	if filter.Method != "" {
		q = q.Where("p.method = ?", filter.Method)
	}
	if filter.FieldID != nil {
		q = q.Where("b.field_id = ?", *filter.FieldID)
	}
	if filter.Query != "" {
		like := "%" + strings.TrimSpace(filter.Query) + "%"
		q = q.Where("(p.order_id LIKE ? OR b.code LIKE ? OR p.transaction_id LIKE ?)", like, like, like)
	}
	return q
}

func (r *gormRepository) ListAdminTransactions(ctx context.Context, filter AdminTransactionFilter) ([]AdminTransactionItem, AdminTransactionSummary, int64, error) {
	base := r.buildTxQuery(ctx, filter)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, AdminTransactionSummary{}, 0, err
	}

	var sumRow struct {
		TotalPaidAmount  int64
		NeedsReviewCount int64
	}
	if err := r.buildTxQuery(ctx, filter).
		Select("COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) AS total_paid_amount, COALESCE(SUM(CASE WHEN p.needs_review = TRUE THEN 1 ELSE 0 END), 0) AS needs_review_count").
		Scan(&sumRow).Error; err != nil {
		return nil, AdminTransactionSummary{}, 0, err
	}

	var items []AdminTransactionItem
	err := r.buildTxQuery(ctx, filter).
		Select("p.id, p.booking_id, b.code AS booking_code, f.name AS field_name, p.order_id, p.method, COALESCE(p.channel, '') AS channel, p.amount, p.status, COALESCE(p.transaction_id, '') AS transaction_id, p.needs_review, p.paid_at, p.recorded_by, p.created_at").
		Order("p.created_at DESC").
		Limit(filter.Pagination.Limit).
		Offset(filter.Pagination.Offset()).
		Scan(&items).Error

	return items, AdminTransactionSummary{
		TotalPaidAmount:  sumRow.TotalPaidAmount,
		TotalCount:       total,
		NeedsReviewCount: sumRow.NeedsReviewCount,
	}, total, err
}

func (r *gormRepository) GetAdminTransactionDetail(ctx context.Context, id uint) (*AdminTransactionDetailResponse, error) {
	var item AdminTransactionItem
	err := r.db.WithContext(ctx).
		Table("payments p").
		Joins("JOIN bookings b ON b.id = p.booking_id").
		Joins("JOIN fields f ON f.id = b.field_id").
		Select("p.id, p.booking_id, b.code AS booking_code, f.name AS field_name, p.order_id, p.method, COALESCE(p.channel, '') AS channel, p.amount, p.status, COALESCE(p.transaction_id, '') AS transaction_id, p.needs_review, p.paid_at, p.recorded_by, p.created_at").
		Where("p.id = ?", id).
		First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	logs, err := r.FindPaymentLogsByPaymentID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &AdminTransactionDetailResponse{
		AdminTransactionItem: item,
		Logs:                 logs,
	}, nil
}

func (r *gormRepository) ListAdminRefunds(ctx context.Context, filter AdminRefundFilter) ([]AdminRefundItem, int64, error) {
	q := r.db.WithContext(ctx).
		Table("refund_requests rr").
		Joins("JOIN bookings b ON b.id = rr.booking_id")
	if filter.Status != "" {
		q = q.Where("rr.status = ?", filter.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []AdminRefundItem
	err := q.Select("rr.*, b.code AS booking_code").
		Order("rr.created_at DESC").
		Limit(filter.Pagination.Limit).
		Offset(filter.Pagination.Offset()).
		Scan(&items).Error
	return items, total, err
}

func (r *gormRepository) FindRefundByID(ctx context.Context, id uint) (*RefundRequest, error) {
	var rr RefundRequest
	err := r.db.WithContext(ctx).First(&rr, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &rr, err
}

func (r *gormRepository) UpdateRefundDecision(ctx context.Context, id uint, status string, processedBy uint, processedAt time.Time, note string) error {
	return r.db.WithContext(ctx).
		Model(&RefundRequest{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":       status,
			"processed_by": processedBy,
			"processed_at": processedAt,
			"note":         note,
		}).Error
}

func (s *service) CreateOfflinePayment(ctx context.Context, bookingID, adminID uint, totalAmount int64, method, status string, amountPaid int64, note string) error {
	now := s.now()
	var paidAt *time.Time
	if status == string(constant.PaymentPaid) {
		paidAt = &now
		if amountPaid == 0 {
			amountPaid = totalAmount
		}
	}

	rawPayload, _ := json.Marshal(map[string]any{
		"amount_paid": amountPaid,
		"method":      method,
		"note":        note,
		"recorded_by": adminID,
		"recorded_at": now.Format(time.RFC3339),
	})

	return s.repo.RunInTx(ctx, func(txRepo Repository) error {
		p := &Payment{
			BookingID:  bookingID,
			OrderID:    fmt.Sprintf("OFFLINE-%d-%d", bookingID, now.UnixNano()),
			Method:     method,
			Channel:    method,
			Amount:     totalAmount,
			Status:     constant.PaymentStatus(status),
			PaidAt:     paidAt,
			RecordedBy: &adminID,
		}
		if err := txRepo.CreatePayment(ctx, p); err != nil {
			return err
		}
		return txRepo.CreatePaymentLog(ctx, &PaymentLog{
			PaymentID:  p.ID,
			Event:      "offline_payment",
			RawPayload: string(rawPayload),
		})
	})
}

func (s *service) RecordAdminPayment(ctx context.Context, bookingID, adminID uint, totalAmount, amount int64, method, note string) (*AdminPaymentResult, error) {
	if amount <= 0 {
		return nil, apperror.Unprocessable("INVALID_PAYMENT_AMOUNT", "Nominal pembayaran harus lebih dari 0")
	}
	now := s.now()
	var result AdminPaymentResult

	err := s.repo.RunInTx(ctx, func(txRepo Repository) error {
		adminTxRepo, ok := txRepo.(AdminPaymentRepository)
		if !ok {
			return apperror.Internal("NOT_CONFIGURED", "AdminPaymentRepository tidak tersedia", nil)
		}
		p, err := adminTxRepo.FindByBookingIDForUpdate(ctx, bookingID)
		if err != nil {
			return err
		}
		if p == nil {
			p = &Payment{
				BookingID:  bookingID,
				OrderID:    fmt.Sprintf("OFFLINE-%d-%d", bookingID, now.UnixNano()),
				Method:     method,
				Channel:    method,
				Amount:     totalAmount,
				Status:     constant.PaymentUnpaid,
				RecordedBy: &adminID,
			}
			if err := txRepo.CreatePayment(ctx, p); err != nil {
				return err
			}
		}

		logs, err := adminTxRepo.FindPaymentLogsByPaymentID(ctx, p.ID)
		if err != nil {
			return err
		}
		paidTotal := sumPaidFromLogs(p, logs)
		if paidTotal+amount > totalAmount {
			return apperror.Unprocessable("PAYMENT_EXCEEDS_TOTAL", "Nominal pembayaran melebihi sisa tagihan")
		}

		newPaidTotal := paidTotal + amount
		newStatus := constant.PaymentPartial
		var paidAt *time.Time
		if newPaidTotal >= totalAmount {
			newStatus = constant.PaymentPaid
			paidAt = &now
		}

		if err := adminTxRepo.UpdateAdminPayment(ctx, p.ID, newStatus, method, newPaidTotal, adminID, paidAt); err != nil {
			return err
		}

		rawPayload, _ := json.Marshal(map[string]any{
			"amount_paid": amount,
			"paid_total":  newPaidTotal,
			"method":      method,
			"note":        note,
			"recorded_by": adminID,
			"recorded_at": now.Format(time.RFC3339),
		})
		if err := txRepo.CreatePaymentLog(ctx, &PaymentLog{
			PaymentID:  p.ID,
			Event:      "admin_payment",
			RawPayload: string(rawPayload),
		}); err != nil {
			return err
		}

		result = AdminPaymentResult{
			BookingID:     bookingID,
			PaymentStatus: string(newStatus),
			PaidTotal:     newPaidTotal,
			TotalAmount:   totalAmount,
			Remaining:     totalAmount - newPaidTotal,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if s.cache != nil {
		_ = s.cache.DeleteByPrefix(ctx, "cache:report:")
	}
	return &result, nil
}

func sumPaidFromLogs(p *Payment, logs []PaymentLog) int64 {
	var total int64
	if p.Method == "midtrans" && (p.Status == constant.PaymentPartial || p.Status == constant.PaymentPaid) {
		total += p.Amount
	}
	for _, l := range logs {
		if l.Event == "offline_payment" || l.Event == "admin_payment" {
			var payload struct {
				AmountPaid int64 `json:"amount_paid"`
			}
			if json.Unmarshal([]byte(l.RawPayload), &payload) == nil {
				total += payload.AmountPaid
			}
		}
	}
	if total == 0 && p.Status == constant.PaymentPaid {
		return p.Amount
	}
	return total
}

func (s *service) ListAdminTransactions(ctx context.Context, filter AdminTransactionFilter) (*PaginatedAdminTransactionsResponse, error) {
	adminRepo, ok := s.repo.(AdminPaymentRepository)
	if !ok {
		return &PaginatedAdminTransactionsResponse{Items: []AdminTransactionItem{}}, nil
	}
	items, summary, total, err := adminRepo.ListAdminTransactions(ctx, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar transaksi", err)
	}
	return &PaginatedAdminTransactionsResponse{
		Items:   items,
		Summary: summary,
		Meta:    pagination.NewMeta(filter.Pagination, total),
	}, nil
}

func (s *service) GetAdminTransactionDetail(ctx context.Context, id uint) (*AdminTransactionDetailResponse, error) {
	adminRepo, ok := s.repo.(AdminPaymentRepository)
	if !ok {
		return nil, ErrPaymentNotFound
	}
	detail, err := adminRepo.GetAdminTransactionDetail(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil detail transaksi", err)
	}
	if detail == nil {
		return nil, ErrPaymentNotFound
	}
	return detail, nil
}

func (s *service) ListAdminRefunds(ctx context.Context, filter AdminRefundFilter) (*PaginatedAdminRefundsResponse, error) {
	adminRepo, ok := s.repo.(AdminPaymentRepository)
	if !ok {
		return &PaginatedAdminRefundsResponse{Items: []AdminRefundItem{}}, nil
	}
	items, total, err := adminRepo.ListAdminRefunds(ctx, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar refund", err)
	}
	return &PaginatedAdminRefundsResponse{
		Items: items,
		Meta:  pagination.NewMeta(filter.Pagination, total),
	}, nil
}

func (s *service) ProcessAdminRefund(ctx context.Context, adminID, refundID uint, req AdminProcessRefundRequest) (*RefundRequest, error) {
	adminRepo, ok := s.repo.(AdminPaymentRepository)
	if !ok {
		return nil, apperror.Internal("NOT_CONFIGURED", "AdminPaymentRepository tidak tersedia", nil)
	}
	existing, err := adminRepo.FindRefundByID(ctx, refundID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa permintaan refund", err)
	}
	if existing == nil {
		return nil, apperror.NotFound("REFUND_NOT_FOUND", "Permintaan refund tidak ditemukan")
	}
	if existing.Status != "pending" {
		return nil, apperror.Conflict("REFUND_ALREADY_PROCESSED", "Permintaan refund sudah diproses")
	}

	targetStatus := ""
	switch strings.ToLower(strings.TrimSpace(req.Action)) {
	case "process", "processed", "approve":
		targetStatus = "processed"
	case "reject", "rejected":
		targetStatus = "rejected"
	default:
		return nil, apperror.BadRequest("INVALID_ACTION", "Aksi refund harus 'process' atau 'reject'")
	}

	now := s.now()
	note := strings.TrimSpace(req.Note)
	if err := adminRepo.UpdateRefundDecision(ctx, refundID, targetStatus, adminID, now, note); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui status refund", err)
	}
	existing.Status = targetStatus
	existing.ProcessedBy = &adminID
	existing.ProcessedAt = &now
	existing.Note = note
	if s.cache != nil {
		_ = s.cache.DeleteByPrefix(ctx, "cache:report:")
	}
	return existing, nil
}

func (h *Handler) ListAdminTransactions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := AdminTransactionFilter{
		From:       q.Get("from"),
		To:         q.Get("to"),
		Status:     q.Get("status"),
		Method:     q.Get("method"),
		Query:      q.Get("q"),
		Pagination: pagination.Parse(q.Get("page"), q.Get("limit")),
	}
	if fid, ok := parseUintParam(q.Get("field_id")); ok {
		filter.FieldID = &fid
	}
	res, err := h.svc.ListAdminTransactions(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar transaksi", res)
	writeJSON(w, status, body)
}

func (h *Handler) ExportAdminTransactions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := AdminTransactionFilter{
		From:       q.Get("from"),
		To:         q.Get("to"),
		Status:     q.Get("status"),
		Method:     q.Get("method"),
		Query:      q.Get("q"),
		Pagination: pagination.Query{Page: 1, Limit: 5000},
	}
	if fid, ok := parseUintParam(q.Get("field_id")); ok {
		filter.FieldID = &fid
	}
	res, err := h.svc.ListAdminTransactions(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="noel-futsal-transactions.csv"`)
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"ID", "Order ID", "Booking Code", "Lapangan", "Metode", "Channel", "Nominal", "Status", "Waktu Bayar", "Dibuat"})
	for _, item := range res.Items {
		paidAt := ""
		if item.PaidAt != nil {
			paidAt = item.PaidAt.In(timeutil.WIB).Format(time.RFC3339)
		}
		_ = cw.Write([]string{
			strconv.FormatUint(uint64(item.ID), 10),
			item.OrderID,
			item.BookingCode,
			item.FieldName,
			item.Method,
			item.Channel,
			strconv.FormatInt(item.Amount, 10),
			string(item.Status),
			paidAt,
			item.CreatedAt.In(timeutil.WIB).Format(time.RFC3339),
		})
	}
	cw.Flush()
}

func (h *Handler) GetAdminTransaction(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID transaksi tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.GetAdminTransactionDetail(r.Context(), id)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Detail transaksi", res)
	writeJSON(w, status, body)
}

func (h *Handler) ListAdminRefunds(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	res, err := h.svc.ListAdminRefunds(r.Context(), AdminRefundFilter{
		Status:     q.Get("status"),
		Pagination: pagination.Parse(q.Get("page"), q.Get("limit")),
	})
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar permintaan refund", res)
	writeJSON(w, status, body)
}

func (h *Handler) ProcessAdminRefund(w http.ResponseWriter, r *http.Request) {
	adminID, _ := middleware.UserID(r.Context())
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID refund tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req AdminProcessRefundRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.ProcessAdminRefund(r.Context(), adminID, id, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Permintaan refund berhasil diproses", res)
	writeJSON(w, status, body)
}

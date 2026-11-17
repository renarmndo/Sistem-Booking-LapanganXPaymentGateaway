package payment

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/midtrans"
)

type memPaymentRepo struct {
	mu       sync.Mutex
	nextID   uint
	payments map[uint]Payment
	logs     []PaymentLog
	refunds  []RefundRequest
}

func newMemPaymentRepo() *memPaymentRepo {
	return &memPaymentRepo{
		nextID:   1,
		payments: make(map[uint]Payment),
	}
}

func (r *memPaymentRepo) RunInTx(_ context.Context, fn func(txRepo Repository) error) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return fn(&memPaymentTxRepo{parent: r})
}

func (r *memPaymentRepo) CreatePayment(_ context.Context, p *Payment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p.ID = r.nextID
	r.nextID++
	r.payments[p.ID] = *p
	return nil
}

func (r *memPaymentRepo) UpdatePaymentSnap(_ context.Context, id uint, snapToken, redirectURL string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p := r.payments[id]
	p.SnapToken = snapToken
	p.SnapRedirectURL = redirectURL
	r.payments[id] = p
	return nil
}

func (r *memPaymentRepo) FindByBookingID(_ context.Context, bookingID uint) (*Payment, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, p := range r.payments {
		if p.BookingID == bookingID {
			cp := p
			return &cp, nil
		}
	}
	return nil, nil
}

func (r *memPaymentRepo) FindByOrderIDForUpdate(_ context.Context, orderID string) (*Payment, error) {
	for _, p := range r.payments {
		if p.OrderID == orderID {
			cp := p
			return &cp, nil
		}
	}
	return nil, nil
}

func (r *memPaymentRepo) UpdatePaymentOutcome(_ context.Context, id uint, status constant.PaymentStatus, channel, txID string, paidAt *time.Time, needsReview bool) error {
	p := r.payments[id]
	p.Status = status
	p.Channel = channel
	p.TransactionID = txID
	p.PaidAt = paidAt
	p.NeedsReview = needsReview
	r.payments[id] = p
	return nil
}

func (r *memPaymentRepo) CreatePaymentLog(_ context.Context, log *PaymentLog) error {
	r.logs = append(r.logs, *log)
	return nil
}

func (r *memPaymentRepo) CreateRefundRequest(_ context.Context, rr *RefundRequest) error {
	r.refunds = append(r.refunds, *rr)
	return nil
}

func (r *memPaymentRepo) FindRefundByBookingID(_ context.Context, bookingID uint) (*RefundRequest, error) {
	for _, rr := range r.refunds {
		if rr.BookingID == bookingID {
			cp := rr
			return &cp, nil
		}
	}
	return nil, nil
}

type memPaymentTxRepo struct {
	parent *memPaymentRepo
}

func (t *memPaymentTxRepo) RunInTx(_ context.Context, fn func(txRepo Repository) error) error { return fn(t) }
func (t *memPaymentTxRepo) CreatePayment(ctx context.Context, p *Payment) error { return t.parent.CreatePayment(ctx, p) }
func (t *memPaymentTxRepo) UpdatePaymentSnap(ctx context.Context, id uint, s, u string) error { return t.parent.UpdatePaymentSnap(ctx, id, s, u) }
func (t *memPaymentTxRepo) FindByBookingID(ctx context.Context, id uint) (*Payment, error) { return t.parent.FindByBookingID(ctx, id) }
func (t *memPaymentTxRepo) FindByOrderIDForUpdate(ctx context.Context, oid string) (*Payment, error) { return t.parent.FindByOrderIDForUpdate(ctx, oid) }
func (t *memPaymentTxRepo) UpdatePaymentOutcome(ctx context.Context, id uint, s constant.PaymentStatus, c, tx string, pa *time.Time, nr bool) error {
	return t.parent.UpdatePaymentOutcome(ctx, id, s, c, tx, pa, nr)
}
func (t *memPaymentTxRepo) CreatePaymentLog(ctx context.Context, log *PaymentLog) error { return t.parent.CreatePaymentLog(ctx, log) }
func (t *memPaymentTxRepo) CreateRefundRequest(ctx context.Context, rr *RefundRequest) error { return t.parent.CreateRefundRequest(ctx, rr) }
func (t *memPaymentTxRepo) FindRefundByBookingID(ctx context.Context, id uint) (*RefundRequest, error) { return t.parent.FindRefundByBookingID(ctx, id) }

type stubGateway struct {
	serverKey string
	statusRes *midtrans.TransactionStatusResponse
}

func (g *stubGateway) CreateSnapTransaction(_ context.Context, req midtrans.SnapRequest) (*midtrans.SnapResponse, error) {
	return &midtrans.SnapResponse{Token: "snap-" + req.TransactionDetails.OrderID, RedirectURL: "https://snap/" + req.TransactionDetails.OrderID}, nil
}

func (g *stubGateway) GetTransactionStatus(_ context.Context, _ string) (*midtrans.TransactionStatusResponse, error) {
	return g.statusRes, nil
}

func (g *stubGateway) CancelTransaction(_ context.Context, _ string) error { return nil }

func (g *stubGateway) VerifySignature(orderID, statusCode, grossAmount, sig string) bool {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + g.serverKey))
	return hex.EncodeToString(sum[:]) == sig
}

type stubBookingCoord struct {
	bookingStatus constant.BookingStatus
	expiredConflict bool
}

func (c *stubBookingCoord) FindBookingForPayment(_ context.Context, bookingID uint) (*BookingPaymentInfo, error) {
	uid := uint(1)
	exp := time.Now().Add(10 * time.Minute)
	return &BookingPaymentInfo{ID: bookingID, Code: "BK-100", UserID: &uid, TotalAmount: 250000, Status: c.bookingStatus, ExpiresAt: &exp}, nil
}

func (c *stubBookingCoord) ApplyPaymentOutcome(_ context.Context, _ uint, target constant.BookingStatus, _, _ string) (bool, error) {
	if c.expiredConflict && target == constant.BookingConfirmed {
		return true, nil
	}
	c.bookingStatus = target
	return false, nil
}

type memCache struct {
	data map[string][]byte
}

func (m *memCache) Get(_ context.Context, k string) ([]byte, bool, error) {
	v, ok := m.data[k]
	return v, ok, nil
}
func (m *memCache) Set(_ context.Context, k string, v []byte, _ time.Duration) error {
	m.data[k] = v
	return nil
}
func (m *memCache) DeleteByPrefix(_ context.Context, _ string) error { return nil }

func signTest(orderID, code, amount, key string) string {
	sum := sha512.Sum512([]byte(orderID + code + amount + key))
	return hex.EncodeToString(sum[:])
}

func TestWebhook_SignatureIdempotencyAndNoDowngrade(t *testing.T) {
	repo := newMemPaymentRepo()
	_ = repo.CreatePayment(context.Background(), &Payment{BookingID: 10, OrderID: "BK-100", Amount: 250000, Status: constant.PaymentPending})

	gw := &stubGateway{serverKey: "secret"}
	coord := &stubBookingCoord{bookingStatus: constant.BookingPendingPayment}
	cache := &memCache{data: make(map[string][]byte)}
	svc := NewService(repo, gw, coord, cache, nil)
	handler := NewHandler(svc)

	// 1. Invalid signature -> 403
	badBody := `{"order_id":"BK-100","status_code":"200","gross_amount":"250000.00","signature_key":"bad","transaction_id":"tx1","transaction_status":"settlement"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/midtrans/notification", bytes.NewBufferString(badBody))
	rec := httptest.NewRecorder()
	handler.MidtransNotification(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for invalid signature, got %d", rec.Code)
	}

	// 2. Valid settlement -> paid + CONFIRMED
	sig := signTest("BK-100", "200", "250000.00", "secret")
	err := svc.HandleWebhook(context.Background(), []byte(`{}`), midtrans.NotificationPayload{
		OrderID: "BK-100", StatusCode: "200", GrossAmount: "250000.00", SignatureKey: sig,
		TransactionID: "tx1", TransactionStatus: "settlement", PaymentType: "qris",
	})
	if err != nil {
		t.Fatalf("unexpected webhook error: %v", err)
	}
	if coord.bookingStatus != constant.BookingConfirmed || repo.payments[1].Status != constant.PaymentPaid {
		t.Fatalf("expected CONFIRMED + paid, got booking=%s payment=%s", coord.bookingStatus, repo.payments[1].Status)
	}

	// 3. Duplicate notification -> 200 idempotent (logs count stays 1)
	err = svc.HandleWebhook(context.Background(), []byte(`{}`), midtrans.NotificationPayload{
		OrderID: "BK-100", StatusCode: "200", GrossAmount: "250000.00", SignatureKey: sig,
		TransactionID: "tx1", TransactionStatus: "settlement", PaymentType: "qris",
	})
	if err != nil || len(repo.logs) != 1 {
		t.Fatalf("expected idempotent duplicate webhook, logs=%d err=%v", len(repo.logs), err)
	}

	// 4. Out-of-order late pending notification -> never downgrades paid -> pending
	err = svc.HandleWebhook(context.Background(), []byte(`{}`), midtrans.NotificationPayload{
		OrderID: "BK-100", StatusCode: "201", GrossAmount: "250000.00", SignatureKey: signTest("BK-100", "201", "250000.00", "secret"),
		TransactionID: "tx2", TransactionStatus: "pending", PaymentType: "qris",
	})
	if err != nil || repo.payments[1].Status != constant.PaymentPaid {
		t.Fatalf("expected status to remain paid, got %s err=%v", repo.payments[1].Status, err)
	}
}

func TestWebhook_SettlementAfterExpiredSetsNeedsReviewAndRefund(t *testing.T) {
	repo := newMemPaymentRepo()
	_ = repo.CreatePayment(context.Background(), &Payment{BookingID: 20, OrderID: "BK-200", Amount: 250000, Status: constant.PaymentPending})

	gw := &stubGateway{serverKey: "secret"}
	coord := &stubBookingCoord{bookingStatus: constant.BookingExpired, expiredConflict: true}
	svc := NewService(repo, gw, coord, nil, nil)

	sig := signTest("BK-200", "200", "250000.00", "secret")
	err := svc.HandleWebhook(context.Background(), []byte(`{}`), midtrans.NotificationPayload{
		OrderID: "BK-200", StatusCode: "200", GrossAmount: "250000.00", SignatureKey: sig,
		TransactionID: "tx20", TransactionStatus: "settlement", PaymentType: "qris",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.payments[1].NeedsReview || len(repo.refunds) != 1 || repo.refunds[0].Status != "pending" {
		t.Fatalf("expected needs_review=true and 1 pending refund, got needsReview=%v refunds=%+v", repo.payments[1].NeedsReview, repo.refunds)
	}
}

func TestWorkerSyncBeforeExpireConfirmsPaidBooking(t *testing.T) {
	repo := newMemPaymentRepo()
	_ = repo.CreatePayment(context.Background(), &Payment{BookingID: 30, OrderID: "BK-300", Amount: 250000, Status: constant.PaymentPending})

	gw := &stubGateway{
		serverKey: "secret",
		statusRes: &midtrans.TransactionStatusResponse{
			OrderID: "BK-300", TransactionID: "tx30", TransactionStatus: "settlement", PaymentType: "qris", GrossAmount: "250000.00",
		},
	}
	coord := &stubBookingCoord{bookingStatus: constant.BookingPendingPayment}
	svc := NewService(repo, gw, coord, nil, nil)

	confirmed, err := svc.CheckAndSyncBeforeExpire(context.Background(), 30)
	if err != nil || !confirmed || coord.bookingStatus != constant.BookingConfirmed {
		t.Fatalf("expected worker sync to confirm booking, confirmed=%v status=%s err=%v", confirmed, coord.bookingStatus, err)
	}
	_ = errors.New("")
}

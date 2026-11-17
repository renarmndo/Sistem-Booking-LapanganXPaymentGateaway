package payment

import (
	"net/http"

	"sistem-booking/pkg/apperror"
)

var (
	ErrPaymentNotFound     = apperror.New("PAYMENT_NOT_FOUND", "Data pembayaran tidak ditemukan", http.StatusNotFound, nil)
	ErrPaymentExpired      = apperror.New("PAYMENT_EXPIRED", "Batas waktu pembayaran booking sudah berakhir", http.StatusUnprocessableEntity, nil)
	ErrPaymentNotPending   = apperror.New("PAYMENT_NOT_PENDING", "Booking tidak dalam status menunggu pembayaran", http.StatusUnprocessableEntity, nil)
	ErrPaymentGateway      = apperror.New("PAYMENT_GATEWAY_ERROR", "Gagal menghubungi payment gateway", http.StatusBadGateway, nil)
	ErrInvalidSignature    = apperror.New("INVALID_SIGNATURE", "Signature notifikasi tidak valid", http.StatusForbidden, nil)
	ErrInvalidGrossAmount  = apperror.New("INVALID_AMOUNT", "Nominal pembayaran tidak sesuai", http.StatusBadRequest, nil)
	ErrForbiddenBooking    = apperror.New("FORBIDDEN", "Tidak memiliki akses ke booking ini", http.StatusForbidden, nil)
)

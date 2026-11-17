package booking

import (
	"net/http"

	"sistem-booking/pkg/apperror"
)

var (
	ErrFieldInactive         = apperror.New("FIELD_INACTIVE", "Lapangan sedang tidak aktif", http.StatusUnprocessableEntity, nil)
	ErrSlotsEmpty            = apperror.New("SLOTS_EMPTY", "Pilih minimal satu slot waktu", http.StatusBadRequest, nil)
	ErrInvalidSlotFormat     = apperror.New("INVALID_SLOT", "Format slot waktu tidak valid", http.StatusBadRequest, nil)
	ErrDateInPast            = apperror.New("DATE_IN_PAST", "Tanggal booking tidak boleh di masa lalu", http.StatusUnprocessableEntity, nil)
	ErrDateTooFar            = apperror.New("DATE_TOO_FAR", "Tanggal booking melebihi batas hari ke depan", http.StatusUnprocessableEntity, nil)
	ErrSlotInPast            = apperror.New("SLOT_IN_PAST", "Slot waktu sudah terlewati", http.StatusUnprocessableEntity, nil)
	ErrFieldClosed           = apperror.New("FIELD_CLOSED", "Lapangan tutup pada hari yang dipilih", http.StatusUnprocessableEntity, nil)
	ErrOutsideOperatingHours = apperror.New("OUTSIDE_OPERATING_HOURS", "Slot berada di luar jam operasional lapangan", http.StatusUnprocessableEntity, nil)
	ErrSlotsNotConsecutive   = apperror.New("SLOTS_NOT_CONSECUTIVE", "Slot yang dipilih harus berurutan", http.StatusUnprocessableEntity, nil)
	ErrMaxHoursExceeded      = apperror.New("MAX_HOURS_EXCEEDED", "Jumlah jam melebihi batas maksimal per booking", http.StatusUnprocessableEntity, nil)
	ErrInvalidTransition     = apperror.New("INVALID_TRANSITION", "Transisi status booking tidak diizinkan", http.StatusConflict, nil)
	ErrCancelTooLate         = apperror.New("CANCEL_TOO_LATE", "Pembatalan oleh pengguna tidak diizinkan kurang dari batas waktu sebelum main", http.StatusUnprocessableEntity, nil)
	ErrFieldNotFound         = apperror.New("FIELD_NOT_FOUND", "Lapangan tidak ditemukan", http.StatusNotFound, nil)
	ErrInvalidDate           = apperror.New("INVALID_DATE", "Format tanggal harus YYYY-MM-DD", http.StatusBadRequest, nil)
	ErrPendingLimitExceeded  = apperror.New("PENDING_LIMIT_EXCEEDED", "Batas maksimal booking menunggu pembayaran telah tercapai", http.StatusUnprocessableEntity, nil)
	ErrSlotTaken             = apperror.New("SLOT_TAKEN", "Slot waktu sudah dipesan atau sedang dikunci pengguna lain", http.StatusConflict, nil)
	ErrPaymentFailed         = apperror.New("PAYMENT_ERROR", "Gagal membuat transaksi pembayaran", http.StatusBadGateway, nil)
	ErrBookingNotFound       = apperror.New("BOOKING_NOT_FOUND", "Booking tidak ditemukan", http.StatusNotFound, nil)
	ErrCustomerRequired      = apperror.New("CUSTOMER_REQUIRED", "Pilih pelanggan atau isi nama & nomor HP tamu", http.StatusBadRequest, nil)
	ErrInvalidPaymentAmount  = apperror.New("INVALID_PAYMENT_AMOUNT", "Nominal pembayaran tidak valid atau melebihi tagihan", http.StatusUnprocessableEntity, nil)
	ErrScheduleBlocked       = apperror.New("SCHEDULE_BLOCKED", "Salah satu slot sedang diblokir untuk pemeliharaan/acara", http.StatusConflict, nil)
	ErrCancelReasonRequired  = apperror.New("CANCEL_REASON_REQUIRED", "Alasan pembatalan wajib diisi", http.StatusBadRequest, nil)
)

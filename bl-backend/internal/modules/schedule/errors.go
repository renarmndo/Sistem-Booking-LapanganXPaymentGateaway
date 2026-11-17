package schedule

import "sistem-booking/pkg/apperror"

var (
	ErrInvalidDate   = apperror.BadRequest("INVALID_DATE", "Format tanggal harus YYYY-MM-DD")
	ErrPastDate      = apperror.Unprocessable("PAST_DATE", "Tanggal tidak boleh di masa lalu")
	ErrDateTooFar    = apperror.Unprocessable("DATE_TOO_FAR", "Tanggal melebihi batas maksimal pemesanan")
	ErrFieldNotFound    = apperror.NotFound("FIELD_NOT_FOUND", "Lapangan tidak ditemukan")
	ErrFieldInactive    = apperror.Conflict("FIELD_INACTIVE", "Lapangan sedang tidak aktif")
	ErrBlockNotFound    = apperror.NotFound("BLOCK_NOT_FOUND", "Blokir jadwal tidak ditemukan")
	ErrInvalidTimeRange = apperror.Unprocessable("INVALID_TIME_RANGE", "Waktu selesai harus lebih besar dari waktu mulai")
	ErrBlockConflict    = apperror.Conflict("SCHEDULE_BLOCK_CONFLICT", "Jadwal bentrok dengan booking aktif")
)

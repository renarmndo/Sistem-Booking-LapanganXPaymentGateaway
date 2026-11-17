package auth

import "sistem-booking/pkg/apperror"

var (
	ErrEmailExists       = apperror.Conflict("EMAIL_EXISTS", "Email sudah terdaftar")
	ErrInvalidCredentials = apperror.Unauthorized("INVALID_CREDENTIALS", "Email atau kata sandi salah")
	ErrAccountInactive   = apperror.Forbidden("ACCOUNT_INACTIVE", "Akun dinonaktifkan")
	ErrNotVerified       = apperror.Forbidden("ACCOUNT_NOT_VERIFIED", "Akun belum diverifikasi, silakan cek email untuk OTP")
	ErrInvalidOTP        = apperror.BadRequest("INVALID_OTP", "OTP tidak valid atau sudah kedaluwarsa")
	ErrTooManyOTP        = apperror.TooManyRequests("OTP_RATE_LIMITED", "Permintaan OTP terlalu banyak")
	ErrInvalidRefresh       = apperror.Unauthorized("INVALID_REFRESH_TOKEN", "Refresh token tidak valid")
	ErrWeakPassword         = apperror.BadRequest("WEAK_PASSWORD", "Kata sandi tidak memenuhi aturan")
	ErrTooManyLoginAttempts = apperror.TooManyRequests("LOGIN_RATE_LIMITED", "Terlalu banyak percobaan login gagal, coba lagi nanti")
	ErrTooManyOTPVerify     = apperror.TooManyRequests("OTP_VERIFY_RATE_LIMITED", "Terlalu banyak percobaan verifikasi OTP, coba lagi nanti")
	ErrAlreadyVerified      = apperror.Conflict("ALREADY_VERIFIED", "Akun sudah terverifikasi")
	ErrUserNotFound         = apperror.NotFound("USER_NOT_FOUND", "Pengguna tidak ditemukan")
	ErrWrongCurrentPassword = apperror.BadRequest("INVALID_CURRENT_PASSWORD", "Kata sandi saat ini salah")
	ErrCannotModifySelf     = apperror.Unprocessable("CANNOT_MODIFY_SELF", "Admin tidak dapat menonaktifkan atau menurunkan peran akunnya sendiri")
)

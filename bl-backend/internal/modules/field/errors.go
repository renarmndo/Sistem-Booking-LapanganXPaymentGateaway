package field

import "sistem-booking/pkg/apperror"

var (
	ErrFieldNotFound        = apperror.NotFound("FIELD_NOT_FOUND", "Lapangan tidak ditemukan")
	ErrFieldInactive        = apperror.Conflict("FIELD_INACTIVE", "Lapangan sedang tidak aktif")
	ErrInvalidOwner         = apperror.BadRequest("INVALID_OWNER", "Pemilik lapangan harus pengguna dengan peran owner")
	ErrInvalidOperatingHour = apperror.BadRequest("INVALID_OPERATING_HOUR", "Jam buka harus lebih kecil dari jam tutup")
	ErrDuplicateOperatingDay = apperror.BadRequest("DUPLICATE_OPERATING_DAY", "Hari operasional tidak boleh duplikat")
	ErrInvalidPriceRange    = apperror.BadRequest("INVALID_PRICE_RANGE", "Jam mulai harga harus lebih kecil dari jam selesai")
	ErrOverlappingPrice     = apperror.Conflict("OVERLAPPING_PRICE", "Rentang jam harga tidak boleh tumpang tindih untuk tipe hari yang sama")
	ErrPriceNotConfigured   = apperror.Unprocessable("PRICE_NOT_CONFIGURED", "Tarif untuk tanggal dan jam tersebut belum diatur")
	ErrSlugExists           = apperror.Conflict("FIELD_SLUG_EXISTS", "Slug lapangan sudah digunakan")
	ErrInvalidPhotoType     = apperror.BadRequest("INVALID_PHOTO_TYPE", "Format foto harus JPG, PNG, atau WebP")
	ErrPhotoTooLarge        = apperror.BadRequest("PHOTO_TOO_LARGE", "Ukuran foto maksimal 3 MB")
	ErrPhotoLimitReached        = apperror.BadRequest("PHOTO_LIMIT_REACHED", "Maksimal 10 foto per lapangan")
	ErrPhotoNotFound            = apperror.NotFound("PHOTO_NOT_FOUND", "Foto lapangan tidak ditemukan")
	ErrFacilityNotFound         = apperror.NotFound("FACILITY_NOT_FOUND", "Fasilitas tidak ditemukan")
	ErrFacilityExists           = apperror.Conflict("FACILITY_EXISTS", "Nama fasilitas sudah terdaftar")
	ErrOperatingHoursMustBe7Day = apperror.BadRequest("INVALID_OPERATING_HOURS_COUNT", "Jam operasional harus mencakup tepat 7 hari (0-6)")
)

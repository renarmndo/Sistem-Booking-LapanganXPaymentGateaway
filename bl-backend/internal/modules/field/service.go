package field

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strings"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/cache"
	"sistem-booking/internal/infra/storage"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
)

const (
	fieldsListCacheTTL  = 5 * time.Minute
	defaultVenueAddress = "Noel Futsal Arena"
	defaultVenueCity    = "Jakarta"
)

// OwnerChecker verifies that a given user ID belongs to an active owner account.
type OwnerChecker interface {
	IsOwnerUser(ctx context.Context, userID uint) (bool, error)
	DefaultOwnerID(ctx context.Context) (uint, error)
}

// UpcomingBookingCounter counts upcoming bookings for a field when deactivating.
type UpcomingBookingCounter interface {
	CountUpcomingByField(ctx context.Context, fieldID uint) (int64, error)
}

// FieldReader exposes field queries and pricing rules to downstream modules (e.g. booking).
type FieldReader interface {
	GetActiveField(ctx context.Context, id uint) (*FieldInfo, error)
	ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error)
	IsWithinOperatingHours(ctx context.Context, fieldID uint, date, start, end time.Time) (bool, error)
}

type Service interface {
	FieldReader
	Create(ctx context.Context, req CreateFieldRequest) (*FieldDetailResponse, error)
	Update(ctx context.Context, id uint, req UpdateFieldRequest) (*FieldDetailResponse, error)
	Delete(ctx context.Context, id uint) error
	GetByID(ctx context.Context, id uint) (*FieldDetailResponse, error)
	GetPublicByID(ctx context.Context, id uint) (*FieldDetailResponse, error)
	ListPublic(ctx context.Context, filter ListFieldsFilter) (*PaginatedFieldsResponse, error)
	ListAll(ctx context.Context, filter ListFieldsFilter) (*PaginatedFieldsResponse, error)
	ListFacilities(ctx context.Context) ([]FacilityResponse, error)

	UploadPhoto(ctx context.Context, fieldID uint, file io.Reader, isCover bool) (*FieldPhotoResponse, error)
	DeletePhoto(ctx context.Context, fieldID, photoID uint) error
	ReorderPhotos(ctx context.Context, fieldID uint, photoIDs []uint) error
	SetCoverPhoto(ctx context.Context, fieldID, photoID uint) error

	UpdateStatus(ctx context.Context, id uint, isActive bool) (*FieldStatusResponse, error)
	CreateFacility(ctx context.Context, req FacilityRequest) (*FacilityResponse, error)
	UpdateFacility(ctx context.Context, id uint, req FacilityRequest) (*FacilityResponse, error)
	DeleteFacility(ctx context.Context, id uint) error
	SetFieldFacilities(ctx context.Context, fieldID uint, facilityIDs []uint) error
	SetFieldPrices(ctx context.Context, fieldID uint, inputs []FieldPriceInput) ([]FieldPriceResponse, error)
	SetFieldOperatingHours(ctx context.Context, fieldID uint, inputs []OperatingHourInput) ([]OperatingHourResponse, error)
}

type service struct {
	repo           Repository
	ownerChecker   OwnerChecker
	bookingCounter UpcomingBookingCounter
	storage        storage.Storage
	cache          cache.Cache
	now            func() time.Time
}

func NewService(repo Repository, ownerChecker OwnerChecker) Service {
	return NewServiceWithDeps(repo, ownerChecker, nil, nil, nil)
}

func NewServiceWithStorage(repo Repository, ownerChecker OwnerChecker, st storage.Storage) Service {
	return NewServiceWithDeps(repo, ownerChecker, nil, st, nil)
}

func NewServiceWithDeps(
	repo Repository,
	ownerChecker OwnerChecker,
	bookingCounter UpcomingBookingCounter,
	st storage.Storage,
	c cache.Cache,
) Service {
	return &service{
		repo:           repo,
		ownerChecker:   ownerChecker,
		bookingCounter: bookingCounter,
		storage:        st,
		cache:          c,
		now:            timeutil.Now,
	}
}

func (s *service) Create(ctx context.Context, req CreateFieldRequest) (*FieldDetailResponse, error) {
	ownerID := req.OwnerID
	if ownerID == 0 && s.ownerChecker != nil {
		resolvedID, err := s.ownerChecker.DefaultOwnerID(ctx)
		if err != nil {
			return nil, apperror.Internal("DB_ERROR", "Gagal menentukan owner Noel Futsal", err)
		}
		ownerID = resolvedID
	}
	if err := s.validateOwner(ctx, ownerID); err != nil {
		return nil, err
	}

	prices, err := validateAndBuildPrices(req.Prices)
	if err != nil {
		return nil, err
	}
	hours, err := validateAndBuildOperatingHours(req.OperatingHours)
	if err != nil {
		return nil, err
	}

	slug := normalizeSlug(req.Slug)
	if slug == "" {
		slug = normalizeSlug(req.Name)
	}
	if existing, err := s.repo.FindBySlug(ctx, slug); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa slug lapangan", err)
	} else if existing != nil {
		return nil, ErrSlugExists
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	address := strings.TrimSpace(req.Address)
	if address == "" {
		address = defaultVenueAddress
	}
	city := strings.TrimSpace(req.City)
	if city == "" {
		city = defaultVenueCity
	}

	entity := &Field{
		OwnerID:     ownerID,
		Name:        strings.TrimSpace(req.Name),
		Slug:        slug,
		Description: strings.TrimSpace(req.Description),
		SurfaceType: strings.TrimSpace(req.SurfaceType),
		Capacity:    req.Capacity,
		Address:     address,
		City:        city,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		IsActive:    isActive,
	}

	photos := buildPhotos(req.Photos)
	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.Create(ctx, entity); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan data lapangan", err)
		}
		if err := txRepo.ReplacePhotos(ctx, entity.ID, photos); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan foto lapangan", err)
		}
		if err := txRepo.ReplaceFacilities(ctx, entity.ID, req.FacilityIDs); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan fasilitas lapangan", err)
		}
		if err := txRepo.ReplacePrices(ctx, entity.ID, prices); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan tarif lapangan", err)
		}
		if err := txRepo.ReplaceOperatingHours(ctx, entity.ID, hours); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan jam operasional", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	s.invalidateListCache(ctx)
	s.invalidateAvailabilityCache(ctx, entity.ID)
	return s.GetByID(ctx, entity.ID)
}

func (s *service) Update(ctx context.Context, id uint, req UpdateFieldRequest) (*FieldDetailResponse, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil data lapangan", err)
	}
	if existing == nil {
		return nil, ErrFieldNotFound
	}

	ownerID := existing.OwnerID
	if req.OwnerID != nil {
		ownerID = *req.OwnerID
	}
	if err := s.validateOwner(ctx, ownerID); err != nil {
		return nil, err
	}

	prices, err := validateAndBuildPrices(req.Prices)
	if err != nil {
		return nil, err
	}
	hours, err := validateAndBuildOperatingHours(req.OperatingHours)
	if err != nil {
		return nil, err
	}

	slug := normalizeSlug(req.Slug)
	if slug == "" {
		slug = existing.Slug
	}
	if slug != existing.Slug {
		if conflict, err := s.repo.FindBySlug(ctx, slug); err != nil {
			return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa slug lapangan", err)
		} else if conflict != nil && conflict.ID != id {
			return nil, ErrSlugExists
		}
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	address := strings.TrimSpace(req.Address)
	if address == "" {
		address = existing.Address
		if address == "" {
			address = defaultVenueAddress
		}
	}
	city := strings.TrimSpace(req.City)
	if city == "" {
		city = existing.City
		if city == "" {
			city = defaultVenueCity
		}
	}

	existing.OwnerID = ownerID
	existing.Name = strings.TrimSpace(req.Name)
	existing.Slug = slug
	existing.Description = strings.TrimSpace(req.Description)
	existing.SurfaceType = strings.TrimSpace(req.SurfaceType)
	existing.Capacity = req.Capacity
	existing.Address = address
	existing.City = city
	existing.Latitude = req.Latitude
	existing.Longitude = req.Longitude
	existing.IsActive = isActive

	photos := buildPhotos(req.Photos)
	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.Update(ctx, existing); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memperbarui lapangan", err)
		}
		if req.Photos != nil {
			if err := txRepo.ReplacePhotos(ctx, id, photos); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memperbarui foto lapangan", err)
			}
		}
		if req.FacilityIDs != nil {
			if err := txRepo.ReplaceFacilities(ctx, id, req.FacilityIDs); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memperbarui fasilitas lapangan", err)
			}
		}
		if req.Prices != nil {
			if err := txRepo.ReplacePrices(ctx, id, prices); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memperbarui tarif lapangan", err)
			}
		}
		if req.OperatingHours != nil {
			if err := txRepo.ReplaceOperatingHours(ctx, id, hours); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memperbarui jam operasional", err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	s.invalidateListCache(ctx)
	s.invalidateAvailabilityCache(ctx, id)
	return s.GetByID(ctx, id)
}

func (s *service) Delete(ctx context.Context, id uint) error {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mengambil data lapangan", err)
	}
	if existing == nil {
		return ErrFieldNotFound
	}
	if err := s.repo.Delete(ctx, id, s.now()); err != nil {
		return apperror.Internal("DB_ERROR", "Gagal menghapus lapangan", err)
	}
	s.invalidateListCache(ctx)
	s.invalidateAvailabilityCache(ctx, id)
	return nil
}

func (s *service) GetByID(ctx context.Context, id uint) (*FieldDetailResponse, error) {
	f, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil detail lapangan", err)
	}
	if f == nil {
		return nil, ErrFieldNotFound
	}
	res := ToFieldDetailResponse(f)
	return &res, nil
}

func (s *service) GetPublicByID(ctx context.Context, id uint) (*FieldDetailResponse, error) {
	f, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil detail lapangan", err)
	}
	if f == nil || !f.IsActive {
		return nil, ErrFieldNotFound
	}
	res := ToFieldDetailResponse(f)
	return &res, nil
}

func (s *service) ListPublic(ctx context.Context, filter ListFieldsFilter) (*PaginatedFieldsResponse, error) {
	filter.OnlyActive = true
	if filter.Pagination.Page < 1 || filter.Pagination.Limit < 1 {
		filter.Pagination = pagination.Query{Page: 1, Limit: 10}
	}

	if s.cache != nil {
		cacheKey := constant.FieldsListCacheKey(hashListFilter(filter))
		if cached, hit, err := s.cache.Get(ctx, cacheKey); err == nil && hit {
			var parsed PaginatedFieldsResponse
			if err := json.Unmarshal(cached, &parsed); err == nil {
				return &parsed, nil
			}
		}

		res, err := s.list(ctx, filter)
		if err != nil {
			return nil, err
		}
		if payload, err := json.Marshal(res); err == nil {
			_ = s.cache.Set(ctx, cacheKey, payload, fieldsListCacheTTL)
		}
		return res, nil
	}

	return s.list(ctx, filter)
}

func (s *service) ListAll(ctx context.Context, filter ListFieldsFilter) (*PaginatedFieldsResponse, error) {
	return s.list(ctx, filter)
}

func (s *service) list(ctx context.Context, filter ListFieldsFilter) (*PaginatedFieldsResponse, error) {
	if filter.Pagination.Page < 1 || filter.Pagination.Limit < 1 {
		filter.Pagination = pagination.Query{Page: 1, Limit: 10}
	}
	items, total, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar lapangan", err)
	}
	res := make([]FieldSummaryResponse, 0, len(items))
	for i := range items {
		res = append(res, ToFieldSummaryResponse(&items[i]))
	}
	return &PaginatedFieldsResponse{
		Items: res,
		Meta:  pagination.NewMeta(filter.Pagination, total),
	}, nil
}

func (s *service) ListFacilities(ctx context.Context) ([]FacilityResponse, error) {
	items, err := s.repo.ListFacilities(ctx)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar fasilitas", err)
	}
	res := make([]FacilityResponse, 0, len(items))
	for _, item := range items {
		res = append(res, ToFacilityResponse(item))
	}
	return res, nil
}

func (s *service) GetActiveField(ctx context.Context, id uint) (*FieldInfo, error) {
	f, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil data lapangan", err)
	}
	if f == nil {
		return nil, ErrFieldNotFound
	}
	if !f.IsActive {
		return nil, ErrFieldInactive
	}
	return &FieldInfo{
		ID:       f.ID,
		OwnerID:  f.OwnerID,
		Name:     f.Name,
		IsActive: f.IsActive,
	}, nil
}

func (s *service) ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error) {
	dayType := dayTypeForDate(date)
	rules, err := s.repo.FindPricesByFieldAndDayType(ctx, fieldID, dayType)
	if err != nil {
		return 0, apperror.Internal("DB_ERROR", "Gagal mengambil aturan harga lapangan", err)
	}

	targetMin := minutesOfDay(startTime)
	for _, rule := range rules {
		ruleStart, errStart := parseClockMinutes(rule.StartTime)
		ruleEnd, errEnd := parseClockMinutes(rule.EndTime)
		if errStart != nil || errEnd != nil {
			continue
		}
		if targetMin >= ruleStart && targetMin < ruleEnd {
			return rule.PricePerSlot, nil
		}
	}
	return 0, ErrPriceNotConfigured
}

func (s *service) IsWithinOperatingHours(ctx context.Context, fieldID uint, date, start, end time.Time) (bool, error) {
	dayOfWeek := uint8(date.In(timeutil.WIB).Weekday())
	hour, err := s.repo.FindOperatingHour(ctx, fieldID, dayOfWeek)
	if err != nil {
		return false, apperror.Internal("DB_ERROR", "Gagal memeriksa jam operasional", err)
	}
	if hour == nil || hour.IsClosed {
		return false, nil
	}

	openMin, errOpen := parseClockMinutes(hour.OpenTime)
	closeMin, errClose := parseClockMinutes(hour.CloseTime)
	if errOpen != nil || errClose != nil {
		return false, nil
	}

	startMin := minutesOfDay(start)
	endMin := minutesOfDay(end)
	return startMin < endMin && startMin >= openMin && endMin <= closeMin, nil
}

func (s *service) validateOwner(ctx context.Context, ownerID uint) error {
	if s.ownerChecker == nil {
		return nil
	}
	ok, err := s.ownerChecker.IsOwnerUser(ctx, ownerID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memvalidasi pemilik lapangan", err)
	}
	if !ok {
		return ErrInvalidOwner
	}
	return nil
}

func dayTypeForDate(date time.Time) constant.DayType {
	wd := date.In(timeutil.WIB).Weekday()
	if wd == time.Saturday || wd == time.Sunday {
		return constant.DayTypeWeekend
	}
	return constant.DayTypeWeekday
}

func validateAndBuildPrices(inputs []FieldPriceInput) ([]FieldPrice, error) {
	type interval struct {
		start int
		end   int
	}
	byDayType := make(map[constant.DayType][]interval)
	result := make([]FieldPrice, 0, len(inputs))

	for _, in := range inputs {
		startMin, errStart := parseClockMinutes(in.StartTime)
		endMin, errEnd := parseClockMinutes(in.EndTime)
		if errStart != nil || errEnd != nil || startMin >= endMin {
			return nil, ErrInvalidPriceRange
		}
		for _, existing := range byDayType[in.DayType] {
			if startMin < existing.end && existing.start < endMin {
				return nil, ErrOverlappingPrice
			}
		}
		byDayType[in.DayType] = append(byDayType[in.DayType], interval{start: startMin, end: endMin})
		result = append(result, FieldPrice{
			DayType:      in.DayType,
			StartTime:    formatClock(startMin),
			EndTime:      formatClock(endMin),
			PricePerSlot: in.PricePerSlot,
		})
	}
	return result, nil
}

func validateAndBuildOperatingHours(inputs []OperatingHourInput) ([]OperatingHour, error) {
	seenDays := make(map[uint8]struct{}, len(inputs))
	result := make([]OperatingHour, 0, len(inputs))

	for _, in := range inputs {
		if _, dup := seenDays[in.DayOfWeek]; dup {
			return nil, ErrDuplicateOperatingDay
		}
		seenDays[in.DayOfWeek] = struct{}{}

		openMin, errOpen := parseClockMinutes(in.OpenTime)
		closeMin, errClose := parseClockMinutes(in.CloseTime)
		if errOpen != nil || errClose != nil || (!in.IsClosed && openMin >= closeMin) {
			return nil, ErrInvalidOperatingHour
		}
		result = append(result, OperatingHour{
			DayOfWeek: in.DayOfWeek,
			OpenTime:  formatClock(openMin),
			CloseTime: formatClock(closeMin),
			IsClosed:  in.IsClosed,
		})
	}
	return result, nil
}

func buildPhotos(inputs []FieldPhotoInput) []FieldPhoto {
	photos := make([]FieldPhoto, 0, len(inputs))
	for _, in := range inputs {
		photos = append(photos, FieldPhoto{
			URL:       strings.TrimSpace(in.URL),
			SortOrder: in.SortOrder,
			IsCover:   in.IsCover,
		})
	}
	return photos
}

func parseClockMinutes(value string) (int, error) {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) >= 5 {
		trimmed = trimmed[:5]
	}
	parsed, err := timeutil.ParseClock(trimmed)
	if err != nil {
		return 0, err
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func minutesOfDay(value time.Time) int {
	local := value.In(timeutil.WIB)
	return local.Hour()*60 + local.Minute()
}

func formatClock(totalMinutes int) string {
	return fmt.Sprintf("%02d:%02d:00", totalMinutes/60, totalMinutes%60)
}

var nonAlnumRe = regexp.MustCompile(`[^a-z0-9]+`)

func normalizeSlug(value string) string {
	lower := strings.ToLower(strings.TrimSpace(value))
	return strings.Trim(nonAlnumRe.ReplaceAllString(lower, "-"), "-")
}

func (s *service) invalidateListCache(ctx context.Context) {
	if s.cache == nil {
		return
	}
	_ = s.cache.DeleteByPrefix(ctx, constant.FieldsListCachePrefix)
}

func (s *service) invalidateAvailabilityCache(ctx context.Context, fieldID uint) {
	if s.cache == nil {
		return
	}
	_ = s.cache.DeleteByPrefix(ctx, constant.AvailCachePrefix(fieldID))
}

func hashListFilter(filter ListFieldsFilter) string {
	facIDs := append([]uint(nil), filter.FacilityIDs...)
	sort.Slice(facIDs, func(i, j int) bool { return facIDs[i] < facIDs[j] })

	canonical := struct {
		Q           string
		City        string
		SurfaceType string
		FacilityIDs []uint
		MinPrice    *int64
		MaxPrice    *int64
		Sort        string
		Page        int
		Limit       int
	}{
		Q:           strings.TrimSpace(strings.ToLower(filter.Query)),
		City:        strings.TrimSpace(strings.ToLower(filter.City)),
		SurfaceType: strings.TrimSpace(strings.ToLower(filter.SurfaceType)),
		FacilityIDs: facIDs,
		MinPrice:    filter.MinPrice,
		MaxPrice:    filter.MaxPrice,
		Sort:        strings.TrimSpace(strings.ToLower(filter.Sort)),
		Page:        filter.Pagination.Page,
		Limit:       filter.Pagination.Limit,
	}
	raw, _ := json.Marshal(canonical)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:16])
}

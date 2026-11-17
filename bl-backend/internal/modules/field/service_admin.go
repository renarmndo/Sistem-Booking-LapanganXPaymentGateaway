package field

import (
	"context"
	"strings"

	"sistem-booking/pkg/apperror"
)

func (s *service) UpdateStatus(ctx context.Context, id uint, isActive bool) (*FieldStatusResponse, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa lapangan", err)
	}
	if existing == nil {
		return nil, ErrFieldNotFound
	}

	if err := s.repo.UpdateStatus(ctx, id, isActive); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui status lapangan", err)
	}
	s.invalidateListCache(ctx)

	var upcoming int64
	if !isActive && s.bookingCounter != nil {
		upcoming, err = s.bookingCounter.CountUpcomingByField(ctx, id)
		if err != nil {
			return nil, apperror.Internal("DB_ERROR", "Gagal menghitung booking mendatang", err)
		}
	}

	return &FieldStatusResponse{
		ID:                    id,
		IsActive:              isActive,
		UpcomingBookingsCount: upcoming,
	}, nil
}

func (s *service) CreateFacility(ctx context.Context, req FacilityRequest) (*FacilityResponse, error) {
	name := strings.TrimSpace(req.Name)
	icon := strings.TrimSpace(req.Icon)

	existing, err := s.repo.FindFacilityByName(ctx, name)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa fasilitas", err)
	}
	if existing != nil {
		return nil, ErrFacilityExists
	}

	fac := &Facility{Name: name, Icon: icon}
	if err := s.repo.CreateFacility(ctx, fac); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal menyimpan fasilitas", err)
	}
	res := ToFacilityResponse(*fac)
	return &res, nil
}

func (s *service) UpdateFacility(ctx context.Context, id uint, req FacilityRequest) (*FacilityResponse, error) {
	existing, err := s.repo.FindFacilityByID(ctx, id)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa fasilitas", err)
	}
	if existing == nil {
		return nil, ErrFacilityNotFound
	}

	name := strings.TrimSpace(req.Name)
	icon := strings.TrimSpace(req.Icon)
	if !strings.EqualFold(existing.Name, name) {
		conflict, err := s.repo.FindFacilityByName(ctx, name)
		if err != nil {
			return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa nama fasilitas", err)
		}
		if conflict != nil && conflict.ID != id {
			return nil, ErrFacilityExists
		}
	}

	existing.Name = name
	existing.Icon = icon
	if err := s.repo.UpdateFacility(ctx, existing); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui fasilitas", err)
	}
	res := ToFacilityResponse(*existing)
	return &res, nil
}

func (s *service) DeleteFacility(ctx context.Context, id uint) error {
	existing, err := s.repo.FindFacilityByID(ctx, id)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa fasilitas", err)
	}
	if existing == nil {
		return ErrFacilityNotFound
	}
	if err := s.repo.DeleteFacility(ctx, id); err != nil {
		return apperror.Internal("DB_ERROR", "Gagal menghapus fasilitas", err)
	}
	return nil
}

func (s *service) SetFieldFacilities(ctx context.Context, fieldID uint, facilityIDs []uint) error {
	existing, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa lapangan", err)
	}
	if existing == nil {
		return ErrFieldNotFound
	}
	if err := s.repo.ReplaceFacilities(ctx, fieldID, facilityIDs); err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memperbarui fasilitas lapangan", err)
	}
	s.invalidateListCache(ctx)
	return nil
}

func (s *service) SetFieldPrices(ctx context.Context, fieldID uint, inputs []FieldPriceInput) ([]FieldPriceResponse, error) {
	existing, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa lapangan", err)
	}
	if existing == nil {
		return nil, ErrFieldNotFound
	}

	prices, err := validateAndBuildPrices(inputs)
	if err != nil {
		return nil, err
	}
	if err := s.repo.ReplacePrices(ctx, fieldID, prices); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui tarif lapangan", err)
	}
	s.invalidateListCache(ctx)

	updated, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil tarif terbaru", err)
	}
	return ToFieldDetailResponse(updated).Prices, nil
}

func (s *service) SetFieldOperatingHours(ctx context.Context, fieldID uint, inputs []OperatingHourInput) ([]OperatingHourResponse, error) {
	if len(inputs) != 7 {
		return nil, ErrOperatingHoursMustBe7Day
	}

	existing, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa lapangan", err)
	}
	if existing == nil {
		return nil, ErrFieldNotFound
	}

	hours, err := validateAndBuildOperatingHours(inputs)
	if err != nil {
		return nil, err
	}
	if err := s.repo.ReplaceOperatingHours(ctx, fieldID, hours); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui jam operasional", err)
	}
	s.invalidateListCache(ctx)

	updated, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil jam operasional terbaru", err)
	}
	return ToFieldDetailResponse(updated).OperatingHours, nil
}

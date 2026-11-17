package field

func ToFacilityResponse(f Facility) FacilityResponse {
	return FacilityResponse{
		ID:   f.ID,
		Name: f.Name,
		Icon: f.Icon,
	}
}

func ToFieldSummaryResponse(f *Field) FieldSummaryResponse {
	if f == nil {
		return FieldSummaryResponse{}
	}

	coverURL := ""
	for _, photo := range f.Photos {
		if photo.IsCover {
			coverURL = photo.URL
			break
		}
	}
	if coverURL == "" && len(f.Photos) > 0 {
		coverURL = f.Photos[0].URL
	}

	minPrice := f.MinPrice
	if minPrice == 0 && len(f.Prices) > 0 {
		for _, p := range f.Prices {
			if minPrice == 0 || p.PricePerSlot < minPrice {
				minPrice = p.PricePerSlot
			}
		}
	}

	facilities := make([]FacilityResponse, 0, len(f.Facilities))
	for _, fac := range f.Facilities {
		facilities = append(facilities, ToFacilityResponse(fac))
	}

	return FieldSummaryResponse{
		ID:          f.ID,
		OwnerID:     f.OwnerID,
		Name:        f.Name,
		Slug:        f.Slug,
		SurfaceType: f.SurfaceType,
		Capacity:    f.Capacity,
		Address:     f.Address,
		City:        f.City,
		IsActive:    f.IsActive,
		CoverURL:    coverURL,
		MinPrice:    minPrice,
		Facilities:  facilities,
	}
}

func ToFieldDetailResponse(f *Field) FieldDetailResponse {
	if f == nil {
		return FieldDetailResponse{}
	}

	photos := make([]FieldPhotoResponse, 0, len(f.Photos))
	for _, p := range f.Photos {
		photos = append(photos, FieldPhotoResponse{
			ID:        p.ID,
			URL:       p.URL,
			SortOrder: p.SortOrder,
			IsCover:   p.IsCover,
		})
	}

	prices := make([]FieldPriceResponse, 0, len(f.Prices))
	for _, p := range f.Prices {
		prices = append(prices, FieldPriceResponse{
			ID:           p.ID,
			DayType:      string(p.DayType),
			StartTime:    trimSeconds(p.StartTime),
			EndTime:      trimSeconds(p.EndTime),
			PricePerSlot: p.PricePerSlot,
		})
	}

	hours := make([]OperatingHourResponse, 0, len(f.OperatingHours))
	for _, h := range f.OperatingHours {
		hours = append(hours, OperatingHourResponse{
			ID:        h.ID,
			DayOfWeek: h.DayOfWeek,
			OpenTime:  trimSeconds(h.OpenTime),
			CloseTime: trimSeconds(h.CloseTime),
			IsClosed:  h.IsClosed,
		})
	}

	return FieldDetailResponse{
		FieldSummaryResponse: ToFieldSummaryResponse(f),
		Description:          f.Description,
		Latitude:             f.Latitude,
		Longitude:            f.Longitude,
		Photos:               photos,
		Prices:               prices,
		OperatingHours:       hours,
	}
}

func trimSeconds(clock string) string {
	if len(clock) >= 5 {
		return clock[:5]
	}
	return clock
}

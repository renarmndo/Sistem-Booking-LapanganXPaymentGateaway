package field

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"gorm.io/gorm"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/storage"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
	"sistem-booking/pkg/token"
	"sistem-booking/pkg/validator"
)

type memFieldRepo struct {
	mu         sync.Mutex
	nextID     uint
	nextPrice  uint
	nextHour   uint
	nextPhoto  uint
	listCalls  int
	fields     map[uint]*Field
	facilities map[uint]Facility
}

func newMemFieldRepo() *memFieldRepo {
	return &memFieldRepo{
		nextID:    1,
		nextPrice: 1,
		nextHour:  1,
		nextPhoto: 1,
		fields:    make(map[uint]*Field),
		facilities: map[uint]Facility{
			1: {ID: 1, Name: "Toilet", Icon: "bath"},
			2: {ID: 2, Name: "Lampu", Icon: "lightbulb"},
		},
	}
}

func (m *memFieldRepo) WithTx(_ *gorm.DB) Repository { return m }

func (m *memFieldRepo) RunInTx(_ context.Context, fn func(repo Repository) error) error {
	return fn(m)
}

func (m *memFieldRepo) Create(_ context.Context, f *Field) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f.ID = m.nextID
	m.nextID++
	cp := *f
	m.fields[f.ID] = &cp
	return nil
}

func (m *memFieldRepo) Update(_ context.Context, f *Field) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if cur, ok := m.fields[f.ID]; ok {
		cp := *f
		cp.Photos = cur.Photos
		cp.Facilities = cur.Facilities
		cp.Prices = cur.Prices
		cp.OperatingHours = cur.OperatingHours
		m.fields[f.ID] = &cp
	}
	return nil
}

func (m *memFieldRepo) Delete(_ context.Context, id uint, deletedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if cur, ok := m.fields[id]; ok {
		t := deletedAt
		cur.DeletedAt = &t
	}
	return nil
}

func (m *memFieldRepo) FindByID(_ context.Context, id uint) (*Field, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.fields[id]
	if !ok || f.DeletedAt != nil {
		return nil, nil
	}
	cp := *f
	cp.MinPrice = computeMinPrice(f.Prices)
	return &cp, nil
}

func (m *memFieldRepo) FindBySlug(_ context.Context, slug string) (*Field, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, f := range m.fields {
		if f.Slug == slug && f.DeletedAt == nil {
			cp := *f
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *memFieldRepo) List(_ context.Context, filter ListFieldsFilter) ([]Field, int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.listCalls++
	var matched []Field
	for _, f := range m.fields {
		if f.DeletedAt != nil {
			continue
		}
		if filter.OnlyActive && !f.IsActive {
			continue
		}
		if filter.OwnerID != nil && f.OwnerID != *filter.OwnerID {
			continue
		}
		if filter.City != "" && f.City != filter.City {
			continue
		}
		if filter.SurfaceType != "" && f.SurfaceType != filter.SurfaceType {
			continue
		}
		if filter.Query != "" {
			q := strings.ToLower(filter.Query)
			if !strings.Contains(strings.ToLower(f.Name), q) && !strings.Contains(strings.ToLower(f.City), q) {
				continue
			}
		}
		cp := *f
		cp.MinPrice = computeMinPrice(f.Prices)
		if filter.MinPrice != nil && cp.MinPrice < *filter.MinPrice {
			continue
		}
		if filter.MaxPrice != nil && cp.MinPrice > *filter.MaxPrice {
			continue
		}
		matched = append(matched, cp)
	}

	switch filter.Sort {
	case "price_asc":
		sort.Slice(matched, func(i, j int) bool { return matched[i].MinPrice < matched[j].MinPrice })
	case "price_desc":
		sort.Slice(matched, func(i, j int) bool { return matched[i].MinPrice > matched[j].MinPrice })
	default:
		sort.Slice(matched, func(i, j int) bool { return matched[i].ID > matched[j].ID })
	}

	total := int64(len(matched))
	start := filter.Pagination.Offset()
	if start >= len(matched) {
		return []Field{}, total, nil
	}
	end := start + filter.Pagination.Limit
	if end > len(matched) {
		end = len(matched)
	}
	return matched[start:end], total, nil
}

func (m *memFieldRepo) ReplacePhotos(_ context.Context, fieldID uint, photos []FieldPhoto) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	out := make([]FieldPhoto, 0, len(photos))
	for _, p := range photos {
		p.ID = m.nextPhoto
		m.nextPhoto++
		p.FieldID = fieldID
		out = append(out, p)
	}
	f.Photos = out
	return nil
}

func (m *memFieldRepo) ReplaceFacilities(_ context.Context, fieldID uint, facilityIDs []uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	out := make([]Facility, 0, len(facilityIDs))
	for _, id := range facilityIDs {
		if fac, ok := m.facilities[id]; ok {
			out = append(out, fac)
		}
	}
	f.Facilities = out
	return nil
}

func (m *memFieldRepo) ReplacePrices(_ context.Context, fieldID uint, prices []FieldPrice) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	out := make([]FieldPrice, 0, len(prices))
	for _, p := range prices {
		p.ID = m.nextPrice
		m.nextPrice++
		p.FieldID = fieldID
		out = append(out, p)
	}
	f.Prices = out
	return nil
}

func (m *memFieldRepo) ReplaceOperatingHours(_ context.Context, fieldID uint, hours []OperatingHour) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	out := make([]OperatingHour, 0, len(hours))
	for _, h := range hours {
		h.ID = m.nextHour
		m.nextHour++
		h.FieldID = fieldID
		out = append(out, h)
	}
	f.OperatingHours = out
	return nil
}

func (m *memFieldRepo) ListFacilities(_ context.Context) ([]Facility, error) {
	return []Facility{m.facilities[1], m.facilities[2]}, nil
}

func (m *memFieldRepo) FindPricesByFieldAndDayType(_ context.Context, fieldID uint, dayType constant.DayType) ([]FieldPrice, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.fields[fieldID]
	if !ok {
		return nil, nil
	}
	var out []FieldPrice
	for _, p := range f.Prices {
		if p.DayType == dayType {
			out = append(out, p)
		}
	}
	return out, nil
}

func (m *memFieldRepo) FindOperatingHour(_ context.Context, fieldID uint, dayOfWeek uint8) (*OperatingHour, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.fields[fieldID]
	if !ok {
		return nil, nil
	}
	for _, h := range f.OperatingHours {
		if h.DayOfWeek == dayOfWeek {
			cp := h
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *memFieldRepo) ListPhotosByField(_ context.Context, fieldID uint) ([]FieldPhoto, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.fields[fieldID]
	if !ok {
		return nil, nil
	}
	out := append([]FieldPhoto(nil), f.Photos...)
	sort.Slice(out, func(i, j int) bool {
		if out[i].SortOrder == out[j].SortOrder {
			return out[i].ID < out[j].ID
		}
		return out[i].SortOrder < out[j].SortOrder
	})
	return out, nil
}

func (m *memFieldRepo) FindPhotoByID(_ context.Context, fieldID, photoID uint) (*FieldPhoto, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.fields[fieldID]
	if !ok {
		return nil, nil
	}
	for _, p := range f.Photos {
		if p.ID == photoID {
			cp := p
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *memFieldRepo) AddPhoto(_ context.Context, photo *FieldPhoto) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[photo.FieldID]
	photo.ID = m.nextPhoto
	m.nextPhoto++
	f.Photos = append(f.Photos, *photo)
	return nil
}

func (m *memFieldRepo) DeletePhoto(_ context.Context, fieldID, photoID uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	kept := make([]FieldPhoto, 0, len(f.Photos))
	for _, p := range f.Photos {
		if p.ID != photoID {
			kept = append(kept, p)
		}
	}
	f.Photos = kept
	return nil
}

func (m *memFieldRepo) ClearCoverPhoto(_ context.Context, fieldID uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	for i := range f.Photos {
		f.Photos[i].IsCover = false
	}
	return nil
}

func (m *memFieldRepo) SetCoverPhoto(_ context.Context, fieldID, photoID uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	for i := range f.Photos {
		if f.Photos[i].ID == photoID {
			f.Photos[i].IsCover = true
		}
	}
	return nil
}

func (m *memFieldRepo) UpdatePhotoOrder(_ context.Context, fieldID, photoID uint, sortOrder uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f := m.fields[fieldID]
	for i := range f.Photos {
		if f.Photos[i].ID == photoID {
			f.Photos[i].SortOrder = sortOrder
		}
	}
	return nil
}

func (m *memFieldRepo) UpdateStatus(_ context.Context, id uint, isActive bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if f, ok := m.fields[id]; ok {
		f.IsActive = isActive
	}
	return nil
}

func (m *memFieldRepo) FindFacilityByID(_ context.Context, id uint) (*Facility, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	fac, ok := m.facilities[id]
	if !ok {
		return nil, nil
	}
	return &fac, nil
}

func (m *memFieldRepo) FindFacilityByName(_ context.Context, name string) (*Facility, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, fac := range m.facilities {
		if strings.EqualFold(fac.Name, name) {
			cp := fac
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *memFieldRepo) CreateFacility(_ context.Context, fac *Facility) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	fac.ID = uint(len(m.facilities) + 1)
	m.facilities[fac.ID] = *fac
	return nil
}

func (m *memFieldRepo) UpdateFacility(_ context.Context, fac *Facility) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.facilities[fac.ID] = *fac
	return nil
}

func (m *memFieldRepo) DeleteFacility(_ context.Context, id uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.facilities, id)
	return nil
}

func computeMinPrice(prices []FieldPrice) int64 {
	var min int64
	for _, p := range prices {
		if min == 0 || p.PricePerSlot < min {
			min = p.PricePerSlot
		}
	}
	return min
}

type mockOwnerChecker struct {
	validOwnerID uint
}

func (m mockOwnerChecker) IsOwnerUser(_ context.Context, userID uint) (bool, error) {
	return userID == m.validOwnerID, nil
}

func assertFieldErrCode(t *testing.T, err error, code string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error %s, got nil", code)
	}
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected AppError, got %T: %v", err, err)
	}
	if appErr.Code != code {
		t.Fatalf("expected error code %s, got %s", code, appErr.Code)
	}
}

func TestCreateFieldValidation(t *testing.T) {
	svc := NewService(newMemFieldRepo(), mockOwnerChecker{validOwnerID: 10})
	ctx := context.Background()

	// Non-owner user rejected
	_, err := svc.Create(ctx, CreateFieldRequest{
		OwnerID:     99,
		Name:        "Lapangan A",
		SurfaceType: "Sintetis",
		Capacity:    14,
		Address:     "Jl. Sudirman No. 1",
		City:        "Jakarta",
	})
	assertFieldErrCode(t, err, ErrInvalidOwner.Code)

	// Invalid operating hours (open >= close)
	_, err = svc.Create(ctx, CreateFieldRequest{
		OwnerID:     10,
		Name:        "Lapangan A",
		SurfaceType: "Sintetis",
		Capacity:    14,
		Address:     "Jl. Sudirman No. 1",
		City:        "Jakarta",
		OperatingHours: []OperatingHourInput{
			{DayOfWeek: 1, OpenTime: "22:00", CloseTime: "08:00"},
		},
	})
	assertFieldErrCode(t, err, ErrInvalidOperatingHour.Code)

	// Overlapping price ranges for same day_type
	_, err = svc.Create(ctx, CreateFieldRequest{
		OwnerID:     10,
		Name:        "Lapangan A",
		SurfaceType: "Sintetis",
		Capacity:    14,
		Address:     "Jl. Sudirman No. 1",
		City:        "Jakarta",
		Prices: []FieldPriceInput{
			{DayType: constant.DayTypeWeekday, StartTime: "06:00", EndTime: "18:00", PricePerSlot: 150000},
			{DayType: constant.DayTypeWeekday, StartTime: "17:00", EndTime: "22:00", PricePerSlot: 250000},
		},
	})
	assertFieldErrCode(t, err, ErrOverlappingPrice.Code)
}

func TestResolvePriceAndOperatingHours(t *testing.T) {
	svc := NewService(newMemFieldRepo(), mockOwnerChecker{validOwnerID: 10})
	ctx := context.Background()

	created, err := svc.Create(ctx, CreateFieldRequest{
		OwnerID:     10,
		Name:        "Lapangan Utama",
		SurfaceType: "Sintetis",
		Capacity:    14,
		Address:     "Jl. Sudirman No. 1",
		City:        "Jakarta",
		FacilityIDs: []uint{1, 2},
		Prices: []FieldPriceInput{
			{DayType: constant.DayTypeWeekday, StartTime: "06:00", EndTime: "18:00", PricePerSlot: 150000},
			{DayType: constant.DayTypeWeekday, StartTime: "18:00", EndTime: "23:00", PricePerSlot: 250000},
			{DayType: constant.DayTypeWeekend, StartTime: "06:00", EndTime: "18:00", PricePerSlot: 200000},
			{DayType: constant.DayTypeWeekend, StartTime: "18:00", EndTime: "23:00", PricePerSlot: 300000},
		},
		OperatingHours: []OperatingHourInput{
			{DayOfWeek: 0, OpenTime: "06:00", CloseTime: "23:00", IsClosed: true},  // Sunday closed
			{DayOfWeek: 2, OpenTime: "06:00", CloseTime: "23:00", IsClosed: false}, // Tuesday open
			{DayOfWeek: 6, OpenTime: "06:00", CloseTime: "23:00", IsClosed: false}, // Saturday open
		},
	})
	if err != nil {
		t.Fatalf("create field failed: %v", err)
	}
	if created.MinPrice != 150000 {
		t.Fatalf("expected min_price 150000, got %d", created.MinPrice)
	}

	tuesday := time.Date(2026, 11, 17, 0, 0, 0, 0, timeutil.WIB)  // Tuesday (weekday)
	saturday := time.Date(2026, 11, 21, 0, 0, 0, 0, timeutil.WIB) // Saturday (weekend)
	sunday := time.Date(2026, 11, 22, 0, 0, 0, 0, timeutil.WIB)   // Sunday (closed)

	clock := func(h, m int) time.Time {
		return time.Date(2026, 11, 17, h, m, 0, 0, timeutil.WIB)
	}

	cases := []struct {
		name      string
		date      time.Time
		start     time.Time
		wantPrice int64
		wantErr   bool
	}{
		{"weekday regular", tuesday, clock(10, 0), 150000, false},
		{"weekday just before peak", tuesday, clock(17, 59), 150000, false},
		{"weekday exact peak boundary", tuesday, clock(18, 0), 250000, false},
		{"weekday peak night", tuesday, clock(21, 0), 250000, false},
		{"weekday outside configured end", tuesday, clock(23, 0), 0, true},
		{"weekend regular", saturday, clock(9, 0), 200000, false},
		{"weekend exact peak boundary", saturday, clock(18, 0), 300000, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			price, err := svc.ResolvePrice(ctx, created.ID, tc.date, tc.start)
			if tc.wantErr {
				assertFieldErrCode(t, err, ErrPriceNotConfigured.Code)
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if price != tc.wantPrice {
				t.Fatalf("expected price %d, got %d", tc.wantPrice, price)
			}
		})
	}

	// Operating hours checks
	ok, err := svc.IsWithinOperatingHours(ctx, created.ID, tuesday, clock(6, 0), clock(23, 0))
	if err != nil || !ok {
		t.Fatalf("expected Tuesday 06:00-23:00 to be within operating hours, ok=%v err=%v", ok, err)
	}
	ok, err = svc.IsWithinOperatingHours(ctx, created.ID, tuesday, clock(5, 0), clock(7, 0))
	if err != nil || ok {
		t.Fatalf("expected Tuesday 05:00-07:00 to be outside operating hours, ok=%v err=%v", ok, err)
	}
	ok, err = svc.IsWithinOperatingHours(ctx, created.ID, sunday, clock(10, 0), clock(12, 0))
	if err != nil || ok {
		t.Fatalf("expected closed Sunday to return false, ok=%v err=%v", ok, err)
	}
}

func TestListPublicFilterAndSort(t *testing.T) {
	svc := NewService(newMemFieldRepo(), mockOwnerChecker{validOwnerID: 10})
	ctx := context.Background()

	inactive := false
	_, _ = svc.Create(ctx, CreateFieldRequest{
		OwnerID: 10, Name: "Lapangan Mahal", SurfaceType: "Sintetis", Capacity: 14,
		Address: "Jl. A No. 1", City: "Jakarta",
		Prices: []FieldPriceInput{{DayType: constant.DayTypeWeekday, StartTime: "06:00", EndTime: "22:00", PricePerSlot: 300000}},
	})
	_, _ = svc.Create(ctx, CreateFieldRequest{
		OwnerID: 10, Name: "Lapangan Hemat", SurfaceType: "Alami", Capacity: 14,
		Address: "Jl. B No. 2", City: "Bandung",
		Prices: []FieldPriceInput{{DayType: constant.DayTypeWeekday, StartTime: "06:00", EndTime: "22:00", PricePerSlot: 120000}},
	})
	_, _ = svc.Create(ctx, CreateFieldRequest{
		OwnerID: 10, Name: "Lapangan Nonaktif", SurfaceType: "Sintetis", Capacity: 14,
		Address: "Jl. C No. 3", City: "Jakarta", IsActive: &inactive,
		Prices: []FieldPriceInput{{DayType: constant.DayTypeWeekday, StartTime: "06:00", EndTime: "22:00", PricePerSlot: 100000}},
	})

	res, err := svc.ListPublic(ctx, ListFieldsFilter{
		Sort:       "price_asc",
		Pagination: pagination.Query{Page: 1, Limit: 10},
	})
	if err != nil {
		t.Fatalf("ListPublic failed: %v", err)
	}
	if res.Meta.Total != 2 {
		t.Fatalf("expected 2 active fields, got %d", res.Meta.Total)
	}
	if res.Items[0].Name != "Lapangan Hemat" || res.Items[0].MinPrice != 120000 {
		t.Fatalf("expected cheapest field first, got %+v", res.Items[0])
	}
}

func validPNGBytes(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestPhotoUploadDeleteReorderCoverAndHTTP(t *testing.T) {
	st := storage.NewLocalStorage(t.TempDir(), "/uploads")
	svc := NewServiceWithStorage(newMemFieldRepo(), mockOwnerChecker{validOwnerID: 10}, st)
	ctx := context.Background()

	created, err := svc.Create(ctx, CreateFieldRequest{
		OwnerID: 10, Name: "Lapangan Foto", SurfaceType: "Sintetis", Capacity: 14,
		Address: "Jl. Sudirman No. 1", City: "Jakarta",
	})
	if err != nil {
		t.Fatal(err)
	}

	// Non-image rejected
	_, err = svc.UploadPhoto(ctx, created.ID, bytes.NewBufferString("<html>not an image</html>"), false)
	assertFieldErrCode(t, err, ErrInvalidPhotoType.Code)

	// Oversized file rejected
	oversized := make([]byte, MaxPhotoSizeBytes+10)
	_, err = svc.UploadPhoto(ctx, created.ID, bytes.NewReader(oversized), false)
	assertFieldErrCode(t, err, ErrPhotoTooLarge.Code)

	// Valid PNG upload via HTTP handler (Admin)
	pngData := validPNGBytes(t)
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	part, err := mw.CreateFormFile("file", "../../evil.png")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write(pngData)
	_ = mw.Close()

	secret := "super-secret-jwt-key-with-at-least-32-bytes"
	adminJWT, err := token.Generate(1, string(constant.RoleAdmin), secret, time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	mux := http.NewServeMux()
	RegisterAdminPhotoRoutes(mux, NewHandler(svc, validator.New()), secret)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/fields/1/photos", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+adminJWT)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	// Second photo uploaded and set as cover + reordered
	second, err := svc.UploadPhoto(ctx, created.ID, bytes.NewReader(pngData), false)
	if err != nil {
		t.Fatalf("second upload failed: %v", err)
	}
	if err := svc.SetCoverPhoto(ctx, created.ID, second.ID); err != nil {
		t.Fatalf("set cover failed: %v", err)
	}
	if err := svc.ReorderPhotos(ctx, created.ID, []uint{second.ID, 1}); err != nil {
		t.Fatalf("reorder failed: %v", err)
	}
	if err := svc.DeletePhoto(ctx, created.ID, second.ID); err != nil {
		t.Fatalf("delete photo failed: %v", err)
	}
}

func TestAdminMasterDataAndRBAC(t *testing.T) {
	svc := NewService(newMemFieldRepo(), mockOwnerChecker{validOwnerID: 10})
	secret := "super-secret-jwt-key-with-at-least-32-bytes"
	mux := http.NewServeMux()
	RegisterAdminRoutes(mux, NewHandler(svc, validator.New()), secret)

	userJWT, _ := token.Generate(2, string(constant.RoleUser), secret, time.Hour)
	ownerJWT, _ := token.Generate(10, string(constant.RoleOwner), secret, time.Hour)
	adminJWT, _ := token.Generate(1, string(constant.RoleAdmin), secret, time.Hour)

	doReq := func(method, path string, body any, jwtToken string) *httptest.ResponseRecorder {
		var buf bytes.Buffer
		if body != nil {
			_ = json.NewEncoder(&buf).Encode(body)
		}
		req := httptest.NewRequest(method, path, &buf)
		req.Header.Set("Content-Type", "application/json")
		if jwtToken != "" {
			req.Header.Set("Authorization", "Bearer "+jwtToken)
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	// Unauthenticated -> 401; user & owner -> 403
	if rec := doReq(http.MethodGet, "/api/v1/admin/fields", nil, ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	if rec := doReq(http.MethodGet, "/api/v1/admin/fields", nil, userJWT); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for user, got %d", rec.Code)
	}
	if rec := doReq(http.MethodPost, "/api/v1/admin/facilities", FacilityRequest{Name: "Cafe", Icon: "coffee"}, ownerJWT); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for owner, got %d", rec.Code)
	}

	// Admin creates field -> 201
	rec := doReq(http.MethodPost, "/api/v1/admin/fields", CreateFieldRequest{
		OwnerID: 10, Name: "Lapangan VIP", SurfaceType: "Sintetis", Capacity: 14,
		Address: "Jl. Sudirman No. 1", City: "Jakarta",
	}, adminJWT)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	// Admin deactivates field -> 200 with upcoming_bookings_count = 0
	rec = doReq(http.MethodPut, "/api/v1/admin/fields/1/status", UpdateFieldStatusRequest{IsActive: false}, adminJWT)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"upcoming_bookings_count":0`) {
		t.Fatalf("unexpected status response: %d %s", rec.Code, rec.Body.String())
	}

	// Admin sets prices and 7-day operating hours
	rec = doReq(http.MethodPut, "/api/v1/admin/fields/1/prices", SetFieldPricesRequest{
		Prices: []FieldPriceInput{{DayType: constant.DayTypeWeekday, StartTime: "08:00", EndTime: "22:00", PricePerSlot: 200000}},
	}, adminJWT)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for prices, got %d: %s", rec.Code, rec.Body.String())
	}

	hours := make([]OperatingHourInput, 0, 7)
	for d := uint8(0); d <= 6; d++ {
		hours = append(hours, OperatingHourInput{DayOfWeek: d, OpenTime: "08:00", CloseTime: "22:00"})
	}
	rec = doReq(http.MethodPut, "/api/v1/admin/fields/1/operating-hours", SetFieldOperatingHoursRequest{OperatingHours: hours}, adminJWT)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for operating hours, got %d: %s", rec.Code, rec.Body.String())
	}

	// Admin facility CRUD
	rec = doReq(http.MethodPost, "/api/v1/admin/facilities", FacilityRequest{Name: "Tribun", Icon: "users"}, adminJWT)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for facility, got %d: %s", rec.Code, rec.Body.String())
	}
}

type memCache struct {
	mu    sync.Mutex
	store map[string][]byte
}

func newMemCache() *memCache {
	return &memCache{store: make(map[string][]byte)}
}

func (c *memCache) Get(_ context.Context, key string) ([]byte, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	v, ok := c.store[key]
	return v, ok, nil
}

func (c *memCache) Set(_ context.Context, key string, value []byte, _ time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.store[key] = append([]byte(nil), value...)
	return nil
}

func (c *memCache) DeleteByPrefix(_ context.Context, prefix string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.store {
		if strings.HasPrefix(k, prefix) {
			delete(c.store, k)
		}
	}
	return nil
}

func TestPublicCatalogCacheInvalidationAndHTTP(t *testing.T) {
	repo := newMemFieldRepo()
	c := newMemCache()
	svc := NewServiceWithDeps(repo, mockOwnerChecker{validOwnerID: 10}, nil, nil, c)
	ctx := context.Background()

	activeField, err := svc.Create(ctx, CreateFieldRequest{
		OwnerID: 10, Name: "Arena Utama", SurfaceType: "Sintetis", Capacity: 14,
		Address: "Jl. Stadion No. 1", City: "Jakarta",
		Prices: []FieldPriceInput{{DayType: constant.DayTypeWeekday, StartTime: "08:00", EndTime: "22:00", PricePerSlot: 175000}},
	})
	if err != nil {
		t.Fatal(err)
	}

	inactive := false
	inactiveField, err := svc.Create(ctx, CreateFieldRequest{
		OwnerID: 10, Name: "Arena Maintenance", SurfaceType: "Alami", Capacity: 14,
		Address: "Jl. Stadion No. 2", City: "Jakarta", IsActive: &inactive,
	})
	if err != nil {
		t.Fatal(err)
	}

	filter := ListFieldsFilter{Pagination: pagination.Query{Page: 1, Limit: 10}}

	// 1st call -> cache miss (repo.listCalls == 1)
	res1, err := svc.ListPublic(ctx, filter)
	if err != nil || res1.Meta.Total != 1 {
		t.Fatalf("unexpected 1st ListPublic result: %+v, err=%v", res1, err)
	}
	if repo.listCalls != 1 {
		t.Fatalf("expected 1 repo call, got %d", repo.listCalls)
	}

	// 2nd call with same filter -> cache hit (repo.listCalls stays 1)
	res2, err := svc.ListPublic(ctx, filter)
	if err != nil || res2.Meta.Total != 1 {
		t.Fatalf("unexpected 2nd ListPublic result: %+v, err=%v", res2, err)
	}
	if repo.listCalls != 1 {
		t.Fatalf("expected cache hit (1 repo call), got %d", repo.listCalls)
	}

	// Admin updates price -> invalidates cache -> next call hits repo and reflects new price
	_, err = svc.SetFieldPrices(ctx, activeField.ID, []FieldPriceInput{
		{DayType: constant.DayTypeWeekday, StartTime: "08:00", EndTime: "22:00", PricePerSlot: 210000},
	})
	if err != nil {
		t.Fatal(err)
	}

	res3, err := svc.ListPublic(ctx, filter)
	if err != nil || res3.Items[0].MinPrice != 210000 {
		t.Fatalf("expected invalidated cache with price 210000, got %+v, err=%v", res3, err)
	}
	if repo.listCalls != 2 {
		t.Fatalf("expected 2 repo calls after invalidation, got %d", repo.listCalls)
	}

	// Public HTTP endpoints
	mux := http.NewServeMux()
	RegisterPublicRoutes(mux, NewHandler(svc, validator.New()))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/fields?sort=price_asc", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /fields, got %d", rec.Code)
	}

	// Active field detail -> 200; inactive field detail -> 404
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/fields/1", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for active field detail, got %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/fields/"+string(rune('0'+inactiveField.ID)), nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for inactive field detail, got %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/facilities", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /facilities, got %d", rec.Code)
	}
}

package field

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/database"
)

const minPriceSubquery = "COALESCE((SELECT MIN(fp.price_per_slot) FROM field_prices fp WHERE fp.field_id = fields.id), 0)"

type Repository interface {
	WithTx(tx *gorm.DB) Repository
	RunInTx(ctx context.Context, fn func(repo Repository) error) error

	Create(ctx context.Context, f *Field) error
	Update(ctx context.Context, f *Field) error
	Delete(ctx context.Context, id uint, deletedAt time.Time) error
	FindByID(ctx context.Context, id uint) (*Field, error)
	FindBySlug(ctx context.Context, slug string) (*Field, error)
	List(ctx context.Context, filter ListFieldsFilter) ([]Field, int64, error)

	ReplacePhotos(ctx context.Context, fieldID uint, photos []FieldPhoto) error
	ReplaceFacilities(ctx context.Context, fieldID uint, facilityIDs []uint) error
	ReplacePrices(ctx context.Context, fieldID uint, prices []FieldPrice) error
	ReplaceOperatingHours(ctx context.Context, fieldID uint, hours []OperatingHour) error

	ListFacilities(ctx context.Context) ([]Facility, error)
	FindPricesByFieldAndDayType(ctx context.Context, fieldID uint, dayType constant.DayType) ([]FieldPrice, error)
	FindOperatingHour(ctx context.Context, fieldID uint, dayOfWeek uint8) (*OperatingHour, error)

	ListPhotosByField(ctx context.Context, fieldID uint) ([]FieldPhoto, error)
	FindPhotoByID(ctx context.Context, fieldID, photoID uint) (*FieldPhoto, error)
	AddPhoto(ctx context.Context, photo *FieldPhoto) error
	DeletePhoto(ctx context.Context, fieldID, photoID uint) error
	ClearCoverPhoto(ctx context.Context, fieldID uint) error
	SetCoverPhoto(ctx context.Context, fieldID, photoID uint) error
	UpdatePhotoOrder(ctx context.Context, fieldID, photoID uint, sortOrder uint) error

	UpdateStatus(ctx context.Context, id uint, isActive bool) error
	FindFacilityByID(ctx context.Context, id uint) (*Facility, error)
	FindFacilityByName(ctx context.Context, name string) (*Facility, error)
	CreateFacility(ctx context.Context, fac *Facility) error
	UpdateFacility(ctx context.Context, fac *Facility) error
	DeleteFacility(ctx context.Context, id uint) error
}

type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) WithTx(tx *gorm.DB) Repository {
	return &gormRepository{db: tx}
}

func (r *gormRepository) RunInTx(ctx context.Context, fn func(repo Repository) error) error {
	return database.WithTx(ctx, r.db, func(tx *gorm.DB) error {
		return fn(r.WithTx(tx))
	})
}

func (r *gormRepository) Create(ctx context.Context, f *Field) error {
	return r.db.WithContext(ctx).Create(f).Error
}

func (r *gormRepository) Update(ctx context.Context, f *Field) error {
	return r.db.WithContext(ctx).
		Model(&Field{}).
		Where("id = ? AND deleted_at IS NULL", f.ID).
		Updates(map[string]any{
			"owner_id":     f.OwnerID,
			"name":         f.Name,
			"slug":         f.Slug,
			"description":  f.Description,
			"surface_type": f.SurfaceType,
			"capacity":     f.Capacity,
			"address":      f.Address,
			"city":         f.City,
			"latitude":     f.Latitude,
			"longitude":    f.Longitude,
			"is_active":    f.IsActive,
		}).Error
}

func (r *gormRepository) Delete(ctx context.Context, id uint, deletedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&Field{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("deleted_at", deletedAt).Error
}

func (r *gormRepository) FindByID(ctx context.Context, id uint) (*Field, error) {
	var f Field
	err := r.db.WithContext(ctx).
		Select("fields.*, "+minPriceSubquery+" AS min_price").
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Preload("Facilities").
		Preload("Prices", func(db *gorm.DB) *gorm.DB {
			return db.Order("day_type ASC, start_time ASC")
		}).
		Preload("OperatingHours", func(db *gorm.DB) *gorm.DB {
			return db.Order("day_of_week ASC")
		}).
		Where("fields.id = ? AND fields.deleted_at IS NULL", id).
		First(&f).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *gormRepository) FindBySlug(ctx context.Context, slug string) (*Field, error) {
	var f Field
	err := r.db.WithContext(ctx).
		Where("slug = ? AND deleted_at IS NULL", slug).
		First(&f).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *gormRepository) List(ctx context.Context, filter ListFieldsFilter) ([]Field, int64, error) {
	base := r.db.WithContext(ctx).Model(&Field{}).Where("fields.deleted_at IS NULL")

	if filter.OnlyActive {
		base = base.Where("fields.is_active = ?", true)
	}
	if filter.OwnerID != nil {
		base = base.Where("fields.owner_id = ?", *filter.OwnerID)
	}
	if q := strings.TrimSpace(filter.Query); q != "" {
		like := "%" + q + "%"
		base = base.Where("(fields.name LIKE ? OR fields.city LIKE ? OR fields.address LIKE ?)", like, like, like)
	}
	if city := strings.TrimSpace(filter.City); city != "" {
		base = base.Where("fields.city = ?", city)
	}
	if surface := strings.TrimSpace(filter.SurfaceType); surface != "" {
		base = base.Where("fields.surface_type = ?", surface)
	}
	if len(filter.FacilityIDs) > 0 {
		base = base.Where(
			"EXISTS (SELECT 1 FROM field_facilities ff WHERE ff.field_id = fields.id AND ff.facility_id IN ?)",
			filter.FacilityIDs,
		)
	}
	if filter.MinPrice != nil {
		base = base.Where(minPriceSubquery+" >= ?", *filter.MinPrice)
	}
	if filter.MaxPrice != nil {
		base = base.Where(minPriceSubquery+" <= ?", *filter.MaxPrice)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderClause := "fields.id DESC"
	switch filter.Sort {
	case "price_asc":
		orderClause = "min_price ASC, fields.id DESC"
	case "price_desc":
		orderClause = "min_price DESC, fields.id DESC"
	}

	var items []Field
	err := base.
		Select("fields.*, "+minPriceSubquery+" AS min_price").
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Preload("Facilities").
		Order(orderClause).
		Limit(filter.Pagination.Limit).
		Offset(filter.Pagination.Offset()).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *gormRepository) ReplacePhotos(ctx context.Context, fieldID uint, photos []FieldPhoto) error {
	if err := r.db.WithContext(ctx).Where("field_id = ?", fieldID).Delete(&FieldPhoto{}).Error; err != nil {
		return err
	}
	if len(photos) == 0 {
		return nil
	}
	for i := range photos {
		photos[i].FieldID = fieldID
	}
	return r.db.WithContext(ctx).Create(&photos).Error
}

func (r *gormRepository) ReplaceFacilities(ctx context.Context, fieldID uint, facilityIDs []uint) error {
	if err := r.db.WithContext(ctx).Exec("DELETE FROM field_facilities WHERE field_id = ?", fieldID).Error; err != nil {
		return err
	}
	for _, facID := range facilityIDs {
		if err := r.db.WithContext(ctx).
			Exec("INSERT INTO field_facilities (field_id, facility_id) VALUES (?, ?)", fieldID, facID).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *gormRepository) ReplacePrices(ctx context.Context, fieldID uint, prices []FieldPrice) error {
	if err := r.db.WithContext(ctx).Where("field_id = ?", fieldID).Delete(&FieldPrice{}).Error; err != nil {
		return err
	}
	if len(prices) == 0 {
		return nil
	}
	for i := range prices {
		prices[i].FieldID = fieldID
	}
	return r.db.WithContext(ctx).Create(&prices).Error
}

func (r *gormRepository) ReplaceOperatingHours(ctx context.Context, fieldID uint, hours []OperatingHour) error {
	if err := r.db.WithContext(ctx).Where("field_id = ?", fieldID).Delete(&OperatingHour{}).Error; err != nil {
		return err
	}
	if len(hours) == 0 {
		return nil
	}
	for i := range hours {
		hours[i].FieldID = fieldID
	}
	return r.db.WithContext(ctx).Create(&hours).Error
}

func (r *gormRepository) ListFacilities(ctx context.Context) ([]Facility, error) {
	var facilities []Facility
	err := r.db.WithContext(ctx).Order("id ASC").Find(&facilities).Error
	return facilities, err
}

func (r *gormRepository) FindPricesByFieldAndDayType(ctx context.Context, fieldID uint, dayType constant.DayType) ([]FieldPrice, error) {
	var prices []FieldPrice
	err := r.db.WithContext(ctx).
		Where("field_id = ? AND day_type = ?", fieldID, dayType).
		Order("start_time ASC").
		Find(&prices).Error
	return prices, err
}

func (r *gormRepository) FindOperatingHour(ctx context.Context, fieldID uint, dayOfWeek uint8) (*OperatingHour, error) {
	var hour OperatingHour
	err := r.db.WithContext(ctx).
		Where("field_id = ? AND day_of_week = ?", fieldID, dayOfWeek).
		First(&hour).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &hour, nil
}

func (r *gormRepository) ListPhotosByField(ctx context.Context, fieldID uint) ([]FieldPhoto, error) {
	var photos []FieldPhoto
	err := r.db.WithContext(ctx).
		Where("field_id = ?", fieldID).
		Order("sort_order ASC, id ASC").
		Find(&photos).Error
	return photos, err
}

func (r *gormRepository) FindPhotoByID(ctx context.Context, fieldID, photoID uint) (*FieldPhoto, error) {
	var photo FieldPhoto
	err := r.db.WithContext(ctx).
		Where("id = ? AND field_id = ?", photoID, fieldID).
		First(&photo).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &photo, nil
}

func (r *gormRepository) AddPhoto(ctx context.Context, photo *FieldPhoto) error {
	return r.db.WithContext(ctx).Create(photo).Error
}

func (r *gormRepository) DeletePhoto(ctx context.Context, fieldID, photoID uint) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND field_id = ?", photoID, fieldID).
		Delete(&FieldPhoto{}).Error
}

func (r *gormRepository) ClearCoverPhoto(ctx context.Context, fieldID uint) error {
	return r.db.WithContext(ctx).
		Model(&FieldPhoto{}).
		Where("field_id = ? AND is_cover = ?", fieldID, true).
		Update("is_cover", false).Error
}

func (r *gormRepository) SetCoverPhoto(ctx context.Context, fieldID, photoID uint) error {
	return r.db.WithContext(ctx).
		Model(&FieldPhoto{}).
		Where("id = ? AND field_id = ?", photoID, fieldID).
		Update("is_cover", true).Error
}

func (r *gormRepository) UpdatePhotoOrder(ctx context.Context, fieldID, photoID uint, sortOrder uint) error {
	return r.db.WithContext(ctx).
		Model(&FieldPhoto{}).
		Where("id = ? AND field_id = ?", photoID, fieldID).
		Update("sort_order", sortOrder).Error
}

func (r *gormRepository) UpdateStatus(ctx context.Context, id uint, isActive bool) error {
	return r.db.WithContext(ctx).
		Model(&Field{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("is_active", isActive).Error
}

func (r *gormRepository) FindFacilityByID(ctx context.Context, id uint) (*Facility, error) {
	var fac Facility
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&fac).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &fac, nil
}

func (r *gormRepository) FindFacilityByName(ctx context.Context, name string) (*Facility, error) {
	var fac Facility
	err := r.db.WithContext(ctx).Where("LOWER(name) = LOWER(?)", name).First(&fac).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &fac, nil
}

func (r *gormRepository) CreateFacility(ctx context.Context, fac *Facility) error {
	return r.db.WithContext(ctx).Create(fac).Error
}

func (r *gormRepository) UpdateFacility(ctx context.Context, fac *Facility) error {
	return r.db.WithContext(ctx).
		Model(&Facility{}).
		Where("id = ?", fac.ID).
		Updates(map[string]any{
			"name": fac.Name,
			"icon": fac.Icon,
		}).Error
}

func (r *gormRepository) DeleteFacility(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&Facility{}).Error
}

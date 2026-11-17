package field

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/random"
)

const (
	MaxPhotoSizeBytes = 3 << 20 // 3 MB
	MaxPhotosPerField = 10
)

var allowedPhotoExtensions = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

func (s *service) UploadPhoto(ctx context.Context, fieldID uint, file io.Reader, isCover bool) (*FieldPhotoResponse, error) {
	if s.storage == nil {
		return nil, apperror.Internal("STORAGE_UNAVAILABLE", "Penyimpanan file belum dikonfigurasi")
	}

	f, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa lapangan", err)
	}
	if f == nil {
		return nil, ErrFieldNotFound
	}

	existingPhotos, err := s.repo.ListPhotosByField(ctx, fieldID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa jumlah foto lapangan", err)
	}
	if len(existingPhotos) >= MaxPhotosPerField {
		return nil, ErrPhotoLimitReached
	}

	data, err := io.ReadAll(io.LimitReader(file, MaxPhotoSizeBytes+1))
	if err != nil {
		return nil, apperror.BadRequest("INVALID_FILE", "Gagal membaca file foto", err)
	}
	if len(data) == 0 {
		return nil, ErrInvalidPhotoType
	}
	if len(data) > MaxPhotoSizeBytes {
		return nil, ErrPhotoTooLarge
	}

	mimeType := http.DetectContentType(data)
	ext, ok := allowedPhotoExtensions[mimeType]
	if !ok {
		return nil, ErrInvalidPhotoType
	}

	uuidName, err := random.UUID()
	if err != nil {
		return nil, apperror.Internal("UUID_ERROR", "Gagal membuat nama file", err)
	}
	filename := uuidName + ext
	subdir := fmt.Sprintf("fields/%d", fieldID)

	publicURL, err := s.storage.Save(ctx, subdir, filename, bytes.NewReader(data))
	if err != nil {
		return nil, apperror.Internal("STORAGE_ERROR", "Gagal menyimpan file foto", err)
	}

	shouldCover := isCover || len(existingPhotos) == 0
	var maxOrder uint
	for _, p := range existingPhotos {
		if p.SortOrder >= maxOrder {
			maxOrder = p.SortOrder + 1
		}
	}

	photo := &FieldPhoto{
		FieldID:   fieldID,
		URL:       publicURL,
		SortOrder: maxOrder,
		IsCover:   shouldCover,
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if shouldCover {
			if err := txRepo.ClearCoverPhoto(ctx, fieldID); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memperbarui cover sebelumnya", err)
			}
		}
		if err := txRepo.AddPhoto(ctx, photo); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan metadata foto", err)
		}
		return nil
	})
	if err != nil {
		_ = s.storage.Delete(ctx, publicURL)
		return nil, err
	}
	s.invalidateListCache(ctx)

	return &FieldPhotoResponse{
		ID:        photo.ID,
		URL:       photo.URL,
		SortOrder: photo.SortOrder,
		IsCover:   photo.IsCover,
	}, nil
}

func (s *service) DeletePhoto(ctx context.Context, fieldID, photoID uint) error {
	photo, err := s.repo.FindPhotoByID(ctx, fieldID, photoID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mencari foto lapangan", err)
	}
	if photo == nil {
		return ErrPhotoNotFound
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.DeletePhoto(ctx, fieldID, photoID); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menghapus foto lapangan", err)
		}
		if photo.IsCover {
			remaining, err := txRepo.ListPhotosByField(ctx, fieldID)
			if err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memeriksa foto tersisa", err)
			}
			if len(remaining) > 0 {
				if err := txRepo.SetCoverPhoto(ctx, fieldID, remaining[0].ID); err != nil {
					return apperror.Internal("DB_ERROR", "Gagal menetapkan foto cover baru", err)
				}
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	if s.storage != nil {
		_ = s.storage.Delete(ctx, photo.URL)
	}
	s.invalidateListCache(ctx)
	return nil
}

func (s *service) ReorderPhotos(ctx context.Context, fieldID uint, photoIDs []uint) error {
	f, err := s.repo.FindByID(ctx, fieldID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa lapangan", err)
	}
	if f == nil {
		return ErrFieldNotFound
	}

	existingPhotos, err := s.repo.ListPhotosByField(ctx, fieldID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mengambil daftar foto", err)
	}
	validIDs := make(map[uint]struct{}, len(existingPhotos))
	for _, p := range existingPhotos {
		validIDs[p.ID] = struct{}{}
	}
	for _, id := range photoIDs {
		if _, ok := validIDs[id]; !ok {
			return ErrPhotoNotFound
		}
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		for idx, id := range photoIDs {
			if err := txRepo.UpdatePhotoOrder(ctx, fieldID, id, uint(idx)); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal memperbarui urutan foto", err)
			}
		}
		return nil
	})
	if err == nil {
		s.invalidateListCache(ctx)
	}
	return err
}

func (s *service) SetCoverPhoto(ctx context.Context, fieldID, photoID uint) error {
	photo, err := s.repo.FindPhotoByID(ctx, fieldID, photoID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mencari foto lapangan", err)
	}
	if photo == nil {
		return ErrPhotoNotFound
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.ClearCoverPhoto(ctx, fieldID); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menghapus status cover lama", err)
		}
		if err := txRepo.SetCoverPhoto(ctx, fieldID, photoID); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menetapkan foto cover", err)
		}
		return nil
	})
	if err == nil {
		s.invalidateListCache(ctx)
	}
	return err
}

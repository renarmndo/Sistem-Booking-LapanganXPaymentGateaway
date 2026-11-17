package field

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"sistem-booking/pkg/response"
	"sistem-booking/pkg/validator"
)

type Handler struct {
	svc      Service
	validate *validator.Validator
}

func NewHandler(svc Service, validate *validator.Validator) *Handler {
	return &Handler{svc: svc, validate: validate}
}

func (h *Handler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	fieldID, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxPhotoSizeBytes+(1<<20))
	if err := r.ParseMultipartForm(MaxPhotoSizeBytes + (1 << 20)); err != nil {
		status, body := response.Fail("Request upload tidak valid atau melebihi batas ukuran", "INVALID_UPLOAD")
		writeJSON(w, status, body)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		file, _, err = r.FormFile("photo")
		if err != nil {
			status, body := response.Fail("File foto wajib disertakan pada field 'file'", "MISSING_FILE")
			writeJSON(w, status, body)
			return
		}
	}
	defer func() { _ = file.Close() }()

	isCover := r.FormValue("is_cover") == "true" || r.FormValue("is_cover") == "1"
	res, err := h.svc.UploadPhoto(r.Context(), fieldID, file, isCover)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Created("Foto lapangan berhasil diunggah", res)
	writeJSON(w, status, body)
}

func (h *Handler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	fieldID, ok := parseUintParam(r.PathValue("id"))
	photoID, okPhoto := parseUintParam(r.PathValue("photoId"))
	if !ok || !okPhoto {
		status, body := response.Fail("ID tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.DeletePhoto(r.Context(), fieldID, photoID); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Foto lapangan berhasil dihapus", nil)
	writeJSON(w, status, body)
}

func (h *Handler) ReorderPhotos(w http.ResponseWriter, r *http.Request) {
	fieldID, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req ReorderPhotosRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if fieldErrs := h.validate.Struct(&req); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.ReorderPhotos(r.Context(), fieldID, req.PhotoIDs); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Urutan foto berhasil diperbarui", nil)
	writeJSON(w, status, body)
}

func (h *Handler) SetCoverPhoto(w http.ResponseWriter, r *http.Request) {
	fieldID, ok := parseUintParam(r.PathValue("id"))
	photoID, okPhoto := parseUintParam(r.PathValue("photoId"))
	if !ok || !okPhoto {
		status, body := response.Fail("ID tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.SetCoverPhoto(r.Context(), fieldID, photoID); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Foto cover berhasil ditetapkan", nil)
	writeJSON(w, status, body)
}

func parseUintParam(raw string) (uint, bool) {
	val, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || val == 0 {
		return 0, false
	}
	return uint(val), true
}

func writeJSON(w http.ResponseWriter, status int, body response.Body) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

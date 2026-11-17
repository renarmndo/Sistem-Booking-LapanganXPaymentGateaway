package field

import (
	"encoding/json"
	"io"
	"net/http"

	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
)

func (h *Handler) ListAdminFields(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ListFieldsFilter{
		Query:       q.Get("q"),
		City:        q.Get("city"),
		SurfaceType: q.Get("surface_type"),
		Sort:        q.Get("sort"),
		Pagination:  pagination.Parse(q.Get("page"), q.Get("limit")),
	}
	if rawActive := q.Get("is_active"); rawActive == "true" {
		filter.OnlyActive = true
	}
	if ownerID, ok := parseUintParam(q.Get("owner_id")); ok {
		filter.OwnerID = &ownerID
	}

	res, err := h.svc.ListAll(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar lapangan", res)
	writeJSON(w, status, body)
}

func (h *Handler) GetAdminField(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Detail lapangan", res)
	writeJSON(w, status, body)
}

func (h *Handler) CreateField(w http.ResponseWriter, r *http.Request) {
	var req CreateFieldRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.Create(r.Context(), req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Created("Lapangan berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) UpdateField(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req UpdateFieldRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Lapangan berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) DeleteField(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Lapangan berhasil dihapus", nil)
	writeJSON(w, status, body)
}

func (h *Handler) UpdateFieldStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req UpdateFieldStatusRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.UpdateStatus(r.Context(), id, req.IsActive)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Status lapangan berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) ListFacilities(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.ListFacilities(r.Context())
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar fasilitas", res)
	writeJSON(w, status, body)
}

func (h *Handler) CreateFacility(w http.ResponseWriter, r *http.Request) {
	var req FacilityRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.CreateFacility(r.Context(), req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Created("Fasilitas berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) UpdateFacility(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID fasilitas tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req FacilityRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.UpdateFacility(r.Context(), id, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Fasilitas berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) DeleteFacility(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID fasilitas tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.DeleteFacility(r.Context(), id); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Fasilitas berhasil dihapus", nil)
	writeJSON(w, status, body)
}

func (h *Handler) SetFieldFacilities(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req SetFieldFacilitiesRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	if err := h.svc.SetFieldFacilities(r.Context(), id, req.FacilityIDs); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Fasilitas lapangan berhasil diperbarui", nil)
	writeJSON(w, status, body)
}

func (h *Handler) SetFieldPrices(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req SetFieldPricesRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.SetFieldPrices(r.Context(), id, req.Prices)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Tarif lapangan berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) SetFieldOperatingHours(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req SetFieldOperatingHoursRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.SetFieldOperatingHours(r.Context(), id, req.OperatingHours)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Jam operasional berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) decodeAndValidate(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(dst); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return false
	}
	if fieldErrs := h.validate.Struct(dst); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return false
	}
	return true
}

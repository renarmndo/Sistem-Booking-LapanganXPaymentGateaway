package field

import (
	"net/http"
	"strconv"
	"strings"

	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
)

func (h *Handler) ListPublicFields(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ListFieldsFilter{
		Query:       q.Get("q"),
		City:        q.Get("city"),
		SurfaceType: q.Get("surface_type"),
		FacilityIDs: parseFacilityIDs(q["facility_ids"]),
		MinPrice:    parseInt64Ptr(q.Get("min_price")),
		MaxPrice:    parseInt64Ptr(q.Get("max_price")),
		Sort:        q.Get("sort"),
		Pagination:  pagination.Parse(q.Get("page"), q.Get("limit")),
		OnlyActive:  true,
	}

	res, err := h.svc.ListPublic(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar lapangan", res)
	writeJSON(w, status, body)
}

func (h *Handler) GetPublicField(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.GetPublicByID(r.Context(), id)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Detail lapangan", res)
	writeJSON(w, status, body)
}

func parseFacilityIDs(values []string) []uint {
	var ids []uint
	for _, raw := range values {
		for _, part := range strings.Split(raw, ",") {
			if id, err := strconv.ParseUint(strings.TrimSpace(part), 10, 64); err == nil && id > 0 {
				ids = append(ids, uint(id))
			}
		}
	}
	return ids
}

func parseInt64Ptr(raw string) *int64 {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	val, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || val < 0 {
		return nil
	}
	return &val
}

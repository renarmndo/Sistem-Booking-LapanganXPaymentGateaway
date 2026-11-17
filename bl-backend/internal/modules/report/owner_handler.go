package report

import (
	"net/http"
	"strconv"

	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
)

func parseOptionalUint(raw string) *uint {
	if raw == "" {
		return nil
	}
	v, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || v == 0 {
		return nil
	}
	u := uint(v)
	return &u
}

func (h *Handler) OwnerFields(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	res, err := h.svc.ListOwnerFields(r.Context(), ownerID)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar lapangan milik owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerSchedule(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	q := r.URL.Query()
	res, err := h.svc.GetOwnerSchedule(r.Context(), ownerID, parseOptionalUint(q.Get("field_id")), q.Get("from"), q.Get("to"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Jadwal lapangan owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerBookings(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	q := r.URL.Query()
	res, err := h.svc.ListOwnerBookings(r.Context(), ownerID, OwnerBookingFilter{
		FieldID: parseOptionalUint(q.Get("field_id")),
		Status:  q.Get("status"),
		Source:  q.Get("source"),
		From:    q.Get("from"),
		To:      q.Get("to"),
		Query:   q.Get("q"),
		Page:    pagination.Parse(q.Get("page"), q.Get("limit")),
	})
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar reservasi owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerBookingDetail(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID reservasi tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.GetOwnerBookingDetail(r.Context(), ownerID, uint(id))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Detail reservasi owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerTransactions(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	q := r.URL.Query()
	res, err := h.svc.ListOwnerTransactions(r.Context(), ownerID, OwnerTransactionFilter{
		FieldID: parseOptionalUint(q.Get("field_id")),
		Status:  q.Get("status"),
		Method:  q.Get("method"),
		From:    q.Get("from"),
		To:      q.Get("to"),
		Page:    pagination.Parse(q.Get("page"), q.Get("limit")),
	})
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar transaksi owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerDashboardSummary(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	q := r.URL.Query()
	res, err := h.svc.GetOwnerDashboardSummary(r.Context(), ownerID, parseOptionalUint(q.Get("field_id")), q.Get("from"), q.Get("to"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Ringkasan dashboard owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerRevenue(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	q := r.URL.Query()
	res, err := h.svc.GetRevenueReport(r.Context(), &ownerID, parseOptionalUint(q.Get("field_id")), q.Get("from"), q.Get("to"), q.Get("group"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Laporan pendapatan owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) OwnerUtilization(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := middleware.UserID(r.Context())
	q := r.URL.Query()
	res, err := h.svc.GetUtilizationReport(r.Context(), &ownerID, parseOptionalUint(q.Get("field_id")), q.Get("from"), q.Get("to"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Laporan utilisasi owner", res)
	writeJSON(w, status, body)
}

func (h *Handler) AdminRevenueReport(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	res, err := h.svc.GetRevenueReport(r.Context(), nil, parseOptionalUint(q.Get("field_id")), q.Get("from"), q.Get("to"), q.Get("group"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Laporan pendapatan", res)
	writeJSON(w, status, body)
}

func (h *Handler) AdminUtilizationReport(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	res, err := h.svc.GetUtilizationReport(r.Context(), nil, parseOptionalUint(q.Get("field_id")), q.Get("from"), q.Get("to"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Laporan utilisasi", res)
	writeJSON(w, status, body)
}

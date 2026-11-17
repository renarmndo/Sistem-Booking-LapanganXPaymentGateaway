package field

import (
	"net/http"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
)

// RegisterPublicRoutes mounts public catalog endpoints without auth middleware.
func RegisterPublicRoutes(mux *http.ServeMux, h *Handler) {
	mux.HandleFunc("GET /api/v1/fields", h.ListPublicFields)
	mux.HandleFunc("GET /api/v1/fields/{id}", h.GetPublicField)
	mux.HandleFunc("GET /api/v1/facilities", h.ListFacilities)
}

// RegisterAdminRoutes mounts all admin master-data endpoints under /api/v1/admin/*
// protected by Auth and RequireRole(RoleAdmin).
func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}

	mux.Handle("GET /api/v1/admin/fields", adminMW(h.ListAdminFields))
	mux.Handle("GET /api/v1/admin/fields/{id}", adminMW(h.GetAdminField))
	mux.Handle("POST /api/v1/admin/fields", adminMW(h.CreateField))
	mux.Handle("PUT /api/v1/admin/fields/{id}", adminMW(h.UpdateField))
	mux.Handle("DELETE /api/v1/admin/fields/{id}", adminMW(h.DeleteField))
	mux.Handle("PUT /api/v1/admin/fields/{id}/status", adminMW(h.UpdateFieldStatus))
	mux.Handle("PUT /api/v1/admin/fields/{id}/facilities", adminMW(h.SetFieldFacilities))
	mux.Handle("PUT /api/v1/admin/fields/{id}/prices", adminMW(h.SetFieldPrices))
	mux.Handle("PUT /api/v1/admin/fields/{id}/operating-hours", adminMW(h.SetFieldOperatingHours))

	mux.Handle("GET /api/v1/admin/facilities", adminMW(h.ListFacilities))
	mux.Handle("POST /api/v1/admin/facilities", adminMW(h.CreateFacility))
	mux.Handle("PUT /api/v1/admin/facilities/{id}", adminMW(h.UpdateFacility))
	mux.Handle("DELETE /api/v1/admin/facilities/{id}", adminMW(h.DeleteFacility))

	RegisterAdminPhotoRoutes(mux, h, jwtSecret)
}

// RegisterAdminPhotoRoutes mounts admin photo management routes protected by Auth + RoleAdmin.
func RegisterAdminPhotoRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}

	mux.Handle("POST /api/v1/admin/fields/{id}/photos", adminMW(h.UploadPhoto))
	mux.Handle("DELETE /api/v1/admin/fields/{id}/photos/{photoId}", adminMW(h.DeletePhoto))
	mux.Handle("PUT /api/v1/admin/fields/{id}/photos/order", adminMW(h.ReorderPhotos))
	mux.Handle("PUT /api/v1/admin/fields/{id}/photos/{photoId}/cover", adminMW(h.SetCoverPhoto))
}

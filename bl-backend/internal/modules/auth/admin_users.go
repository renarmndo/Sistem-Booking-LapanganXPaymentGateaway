package auth

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
)

type AdminUserFilter struct {
	Role       string
	IsActive   *bool
	Query      string
	Pagination pagination.Query
}

type AdminCreateUserRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email,max=150"`
	Phone    string `json:"phone" validate:"required,min=8,max=20"`
	Password string `json:"password" validate:"required,min=8,max=72"`
	Role     string `json:"role" validate:"required,oneof=admin owner user"`
}

type AdminUpdateUserRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Phone    string `json:"phone" validate:"required,min=8,max=20"`
	Role     string `json:"role" validate:"required,oneof=admin owner user"`
	IsActive bool   `json:"is_active"`
}

type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password" validate:"required,min=8,max=72"`
}

type AdminUserSummaryResponse struct {
	UserResponse
	TotalBookings int64 `json:"total_bookings"`
	TotalSpent    int64 `json:"total_spent"`
}

type PaginatedAdminUsersResponse struct {
	Items []UserResponse  `json:"items"`
	Meta  pagination.Meta `json:"meta"`
}

type AdminUserRepository interface {
	ListUsers(ctx context.Context, filter AdminUserFilter) ([]User, int64, error)
	UpdateUserAdmin(ctx context.Context, user *User) error
	GetUserBookingStats(ctx context.Context, userID uint) (int64, int64, error)
}

func (r *gormRepository) ListUsers(ctx context.Context, filter AdminUserFilter) ([]User, int64, error) {
	q := r.db.WithContext(ctx).Model(&User{}).Where("deleted_at IS NULL")
	if filter.Role != "" {
		q = q.Where("role = ?", filter.Role)
	}
	if filter.IsActive != nil {
		q = q.Where("is_active = ?", *filter.IsActive)
	}
	if filter.Query != "" {
		like := "%" + strings.TrimSpace(filter.Query) + "%"
		q = q.Where("(name LIKE ? OR email LIKE ? OR phone LIKE ?)", like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []User
	err := q.Order("created_at DESC").
		Limit(filter.Pagination.Limit).
		Offset(filter.Pagination.Offset()).
		Find(&users).Error
	return users, total, err
}

func (r *gormRepository) UpdateUserAdmin(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ? AND deleted_at IS NULL", user.ID).
		Updates(map[string]any{
			"name":      user.Name,
			"phone":     user.Phone,
			"role":      user.Role,
			"is_active": user.IsActive,
		}).Error
}

func (r *gormRepository) GetUserBookingStats(ctx context.Context, userID uint) (int64, int64, error) {
	type statsRow struct {
		TotalBookings int64
		TotalSpent    int64
	}
	var res statsRow
	err := r.db.WithContext(ctx).
		Table("bookings").
		Select("COUNT(*) AS total_bookings, COALESCE(SUM(CASE WHEN status IN ('CONFIRMED','COMPLETED') THEN total_amount ELSE 0 END), 0) AS total_spent").
		Where("user_id = ?", userID).
		Scan(&res).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return 0, 0, err
	}
	return res.TotalBookings, res.TotalSpent, nil
}

func (s *service) ListAdminUsers(ctx context.Context, filter AdminUserFilter) (*PaginatedAdminUsersResponse, error) {
	adminRepo, ok := s.repo.(AdminUserRepository)
	if !ok {
		return &PaginatedAdminUsersResponse{Items: []UserResponse{}}, nil
	}
	users, total, err := adminRepo.ListUsers(ctx, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar pengguna", err)
	}
	items := make([]UserResponse, 0, len(users))
	for i := range users {
		items = append(items, ToUserResponse(&users[i]))
	}
	return &PaginatedAdminUsersResponse{
		Items: items,
		Meta:  pagination.NewMeta(filter.Pagination, total),
	}, nil
}

func (s *service) GetAdminUserDetail(ctx context.Context, userID uint) (*AdminUserSummaryResponse, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil data pengguna", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	var totalBookings, totalSpent int64
	if adminRepo, ok := s.repo.(AdminUserRepository); ok {
		totalBookings, totalSpent, _ = adminRepo.GetUserBookingStats(ctx, userID)
	}
	return &AdminUserSummaryResponse{
		UserResponse:  ToUserResponse(user),
		TotalBookings: totalBookings,
		TotalSpent:    totalSpent,
	}, nil
}

func (s *service) CreateAdminUser(ctx context.Context, req AdminCreateUserRequest) (*UserResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	existing, err := s.repo.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa email", err)
	}
	if existing != nil {
		return nil, ErrEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.Internal("HASH_ERROR", "Gagal memproses kata sandi", err)
	}

	now := s.now()
	user := &User{
		Name:               strings.TrimSpace(req.Name),
		Email:              email,
		Phone:              strings.TrimSpace(req.Phone),
		PasswordHash:       string(hash),
		Role:               constant.Role(req.Role),
		IsActive:           true,
		VerificationStatus: constant.VerificationVerified,
		VerifiedAt:         &now,
		TokenVersion:       1,
	}
	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal membuat akun pengguna", err)
	}
	res := ToUserResponse(user)
	return &res, nil
}

func (s *service) UpdateAdminUser(ctx context.Context, actorAdminID, targetUserID uint, req AdminUpdateUserRequest) (*UserResponse, error) {
	if actorAdminID == targetUserID && (!req.IsActive || req.Role != string(constant.RoleAdmin)) {
		return nil, ErrCannotModifySelf
	}
	user, err := s.repo.FindUserByID(ctx, targetUserID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa pengguna", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	user.Name = strings.TrimSpace(req.Name)
	user.Phone = strings.TrimSpace(req.Phone)
	user.Role = constant.Role(req.Role)
	user.IsActive = req.IsActive

	if adminRepo, ok := s.repo.(AdminUserRepository); ok {
		if err := adminRepo.UpdateUserAdmin(ctx, user); err != nil {
			return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui pengguna", err)
		}
	}
	if !req.IsActive {
		_ = s.repo.RevokeAllUserRefreshTokens(ctx, targetUserID, s.now())
	}

	res := ToUserResponse(user)
	return &res, nil
}

func (s *service) ResetAdminUserPassword(ctx context.Context, targetUserID uint, newPassword string) error {
	user, err := s.repo.FindUserByID(ctx, targetUserID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa pengguna", err)
	}
	if user == nil {
		return ErrUserNotFound
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.Internal("HASH_ERROR", "Gagal memproses kata sandi", err)
	}
	if err := s.repo.UpdateUserPassword(ctx, targetUserID, string(hash)); err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memperbarui kata sandi", err)
	}
	_ = s.repo.RevokeAllUserRefreshTokens(ctx, targetUserID, time.Now())
	return nil
}

func (h *Handler) ListAdminUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := AdminUserFilter{
		Role:       q.Get("role"),
		Query:      q.Get("q"),
		Pagination: pagination.Parse(q.Get("page"), q.Get("limit")),
	}
	if rawActive := q.Get("is_active"); rawActive == "true" {
		v := true
		filter.IsActive = &v
	} else if rawActive == "false" {
		v := false
		filter.IsActive = &v
	}

	res, err := h.svc.ListAdminUsers(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar pengguna", res)
	writeJSON(w, status, body)
}

func (h *Handler) GetAdminUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID pengguna tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.GetAdminUserDetail(r.Context(), uint(id))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Detail pengguna", res)
	writeJSON(w, status, body)
}

func (h *Handler) CreateAdminUser(w http.ResponseWriter, r *http.Request) {
	var req AdminCreateUserRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if errs := h.validate.Struct(&req); len(errs) > 0 {
		status, body := response.ValidationError("Data akun tidak valid", errs...)
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.CreateAdminUser(r.Context(), req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Created("Akun berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) UpdateAdminUser(w http.ResponseWriter, r *http.Request) {
	actorID, _ := middleware.UserID(r.Context())
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID pengguna tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req AdminUpdateUserRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if errs := h.validate.Struct(&req); len(errs) > 0 {
		status, body := response.ValidationError("Data pengguna tidak valid", errs...)
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.UpdateAdminUser(r.Context(), actorID, uint(id), req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Data pengguna berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) ResetAdminUserPassword(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID pengguna tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req AdminResetPasswordRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if errs := h.validate.Struct(&req); len(errs) > 0 {
		status, body := response.ValidationError("Password baru tidak valid", errs...)
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.ResetAdminUserPassword(r.Context(), uint(id), req.NewPassword); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Password pengguna berhasil direset", nil)
	writeJSON(w, status, body)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

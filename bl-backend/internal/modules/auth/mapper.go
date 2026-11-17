package auth

func ToUserResponse(u *User) UserResponse {
	if u == nil {
		return UserResponse{}
	}
	return UserResponse{
		ID:                 u.ID,
		Name:               u.Name,
		Email:              u.Email,
		Phone:              u.Phone,
		Role:               string(u.Role),
		IsActive:           u.IsActive,
		VerificationStatus: string(u.VerificationStatus),
		CreatedAt:          u.CreatedAt,
	}
}

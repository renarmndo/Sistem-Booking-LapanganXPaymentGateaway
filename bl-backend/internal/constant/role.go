package constant

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
	RoleOwner Role = "owner"
)

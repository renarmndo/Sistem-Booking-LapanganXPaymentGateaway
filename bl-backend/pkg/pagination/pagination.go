package pagination

import "strconv"

type Query struct {
	Page  int
	Limit int
}

func Parse(pageValue, limitValue string) Query {
	page := parsePositive(pageValue, 1)
	limit := parsePositive(limitValue, 10)
	if limit > 100 {
		limit = 100
	}
	return Query{Page: page, Limit: limit}
}

func (q Query) Offset() int { return (q.Page - 1) * q.Limit }

type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func NewMeta(query Query, total int64) Meta {
	pages := int(total / int64(query.Limit))
	if total%int64(query.Limit) != 0 {
		pages++
	}
	return Meta{Page: query.Page, Limit: query.Limit, Total: total, TotalPages: pages}
}

func parsePositive(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

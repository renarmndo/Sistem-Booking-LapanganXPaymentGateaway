package pagination

import "testing"

func TestParseAndOffset(t *testing.T) {
	query := Parse("2", "200")
	if query.Page != 2 || query.Limit != 100 || query.Offset() != 100 {
		t.Fatalf("unexpected query: %+v", query)
	}
	fallback := Parse("bad", "0")
	if fallback.Page != 1 || fallback.Limit != 10 || fallback.Offset() != 0 {
		t.Fatalf("unexpected fallback: %+v", fallback)
	}
}

func TestNewMeta(t *testing.T) {
	meta := NewMeta(Query{Page: 2, Limit: 10}, 21)
	if meta.TotalPages != 3 || meta.Total != 21 {
		t.Fatalf("unexpected meta: %+v", meta)
	}
}

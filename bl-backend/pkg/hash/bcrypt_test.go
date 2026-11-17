package hash

import "testing"

func TestHashAndCompare(t *testing.T) {
	encoded, err := Hash("StrongPassword123")
	if err != nil {
		t.Fatal(err)
	}
	if encoded == "StrongPassword123" || len(encoded) == 0 {
		t.Fatal("password was not hashed")
	}
	if err := Compare(encoded, "StrongPassword123"); err != nil {
		t.Fatal(err)
	}
	if err := Compare(encoded, "wrong"); err == nil {
		t.Fatal("wrong password was accepted")
	}
}

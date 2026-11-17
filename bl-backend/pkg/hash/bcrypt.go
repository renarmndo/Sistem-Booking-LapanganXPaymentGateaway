package hash

import "golang.org/x/crypto/bcrypt"

const Cost = 12

func Hash(password string) (string, error) {
	value, err := bcrypt.GenerateFromPassword([]byte(password), Cost)
	return string(value), err
}

func Compare(encoded, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password))
}

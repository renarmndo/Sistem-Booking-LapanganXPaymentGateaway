.PHONY: run test lint swag migrate-up migrate-down

run:
	go run ./cmd/api

test:
	go test ./...

lint:
	golangci-lint run

swag:
	swag init -g cmd/api/main.go

migrate-up:
	go run ./cmd/api migrate-up

migrate-down:
	go run ./cmd/api migrate-down

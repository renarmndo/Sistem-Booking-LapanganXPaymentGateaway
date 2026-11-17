.PHONY: run test lint swag migrate-up migrate-down migrate-create migrate-force

DB_URL ?= mysql://$(DB_USER):$(DB_PASS)@tcp($(DB_HOST):$(DB_PORT))/$(DB_NAME)
MIGRATE ?= migrate
MIGRATION_DIR ?= migrations

GO ?= go

run:
	$(GO) run ./cmd/api

test:
	$(GO) test ./...

lint:
	golangci-lint run

swag:
	swag init -g cmd/api/main.go

migrate-up:
	$(MIGRATE) -path $(MIGRATION_DIR) -database "$(DB_URL)" up

migrate-down:
	$(MIGRATE) -path $(MIGRATION_DIR) -database "$(DB_URL)" down 1

migrate-create:
	@test -n "$(name)" || (echo "usage: make migrate-create name=create_users" && exit 1)
	$(MIGRATE) create -ext sql -dir $(MIGRATION_DIR) -seq $(name)

migrate-force:
	@test -n "$(version)" || (echo "usage: make migrate-force version=1" && exit 1)
	$(MIGRATE) -path $(MIGRATION_DIR) -database "$(DB_URL)" force $(version)

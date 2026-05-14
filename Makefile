.PHONY: api worker seed migrate-up migrate-down test compose-up compose-down bench-search bench-mixed

api:
	go run ./backend/cmd/api

worker:
	go run ./backend/cmd/worker

seed:
	go run ./backend/cmd/seed

migrate-up:
	go run ./backend/cmd/migrate up

migrate-down:
	go run ./backend/cmd/migrate down

test:
	go test ./...

compose-up:
	docker compose up --build

compose-down:
	docker compose down

bench-search:
	k6 run benchmarks/k6/search.js

bench-mixed:
	k6 run benchmarks/k6/mixed-workload.js

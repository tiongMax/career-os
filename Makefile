.PHONY: dev api worker seed migrate-up migrate-down test compose-up compose-down bench-search bench-mixed

dev:
	npm run dev

api:
	go -C backend run ./cmd/api

worker:
	go -C backend run ./cmd/worker

seed:
	go -C backend run ./cmd/seed

migrate-up:
	go -C backend run ./cmd/migrate up

migrate-down:
	go -C backend run ./cmd/migrate down

test:
	go -C backend test ./...

compose-up:
	docker compose up --build

compose-down:
	docker compose down

bench-search:
	k6 run benchmarks/k6/search.js

bench-mixed:
	k6 run benchmarks/k6/mixed-workload.js

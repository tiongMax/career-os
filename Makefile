.PHONY: dev api worker seed migrate-up migrate-down migrate-status test compose-up compose-down bench-search bench-mixed

dev:
	npm run dev

api:
	npm run dev:api

worker:
	npm run dev:worker

seed:
	npm run seed

migrate-up:
	npm run migrate:up

migrate-down:
	npm run migrate:down

migrate-status:
	npm run migrate:status

test:
	npm run test:api:ts

compose-up:
	docker compose up --build

compose-down:
	docker compose down

bench-search:
	k6 run benchmarks/k6/search.js

bench-mixed:
	k6 run benchmarks/k6/mixed-workload.js

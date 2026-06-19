FROM golang:1.24.13-alpine3.22 AS builder

WORKDIR /app

RUN apk upgrade --no-cache

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum* ./
RUN go mod download

COPY backend ./
RUN go build -o /out/api ./cmd/api
RUN go build -o /out/worker ./cmd/worker
RUN go build -o /out/migrate ./cmd/migrate

FROM alpine:3.22

WORKDIR /app

RUN apk upgrade --no-cache

COPY --from=builder /out/api ./api
COPY --from=builder /out/worker ./worker
COPY --from=builder /out/migrate ./migrate
COPY backend/migrations ./backend/migrations

EXPOSE 8080

CMD ["./api"]

FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN go build -o /out/api ./backend/cmd/api
RUN go build -o /out/worker ./backend/cmd/worker
RUN go build -o /out/migrate ./backend/cmd/migrate

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /out/api ./api
COPY --from=builder /out/worker ./worker
COPY --from=builder /out/migrate ./migrate
COPY backend/migrations ./backend/migrations

EXPOSE 8080

CMD ["./api"]

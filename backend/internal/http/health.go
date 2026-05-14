package http

import (
	"context"
	"encoding/json"
	nethttp "net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	Postgres *pgxpool.Pool
	Redis    *redis.Client
}

type healthResponse struct {
	Status   string `json:"status"`
	Postgres string `json:"postgres"`
	Redis    string `json:"redis"`
}

func (h HealthHandler) ServeHTTP(w nethttp.ResponseWriter, r *nethttp.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	res := healthResponse{
		Status:   "ok",
		Postgres: "ok",
		Redis:    "ok",
	}

	statusCode := nethttp.StatusOK

	if err := h.Postgres.Ping(ctx); err != nil {
		res.Status = "degraded"
		res.Postgres = "error"
		statusCode = nethttp.StatusServiceUnavailable
	}

	if err := h.Redis.Ping(ctx).Err(); err != nil {
		res.Status = "degraded"
		res.Redis = "error"
		statusCode = nethttp.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(res)
}

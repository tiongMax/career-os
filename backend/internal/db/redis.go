package db

import (
	"context"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates and verifies a Redis client from a redis:// connection
// string.
func NewRedisClient(ctx context.Context, redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		if closeErr := client.Close(); closeErr != nil {
			return nil, closeErr
		}
		return nil, err
	}

	return client, nil
}

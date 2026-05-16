// Package reminders contains reminder validation and scheduling behavior.
package reminders

import (
	"context"

	"careeros/backend/internal/db/queries"

	"github.com/redis/go-redis/v9"
)

// ScheduledSetKey is the Redis sorted set that stores scheduled reminder IDs.
const ScheduledSetKey = "reminders:scheduled"

// RedisScheduler stores pending reminder IDs in Redis using due_at as the
// sorted-set score.
type RedisScheduler struct {
	client *redis.Client
}

// NewRedisScheduler builds a Redis-backed reminder scheduler.
func NewRedisScheduler(client *redis.Client) RedisScheduler {
	return RedisScheduler{client: client}
}

// ScheduleReminder inserts or updates a reminder in the Redis schedule.
func (s RedisScheduler) ScheduleReminder(ctx context.Context, reminder queries.Reminder) error {
	return s.client.ZAdd(ctx, ScheduledSetKey, redis.Z{
		Score:  float64(reminder.DueAt.Unix()),
		Member: reminder.ID,
	}).Err()
}

// UnscheduleReminder removes a reminder ID from the Redis schedule.
func (s RedisScheduler) UnscheduleReminder(ctx context.Context, id string) error {
	return s.client.ZRem(ctx, ScheduledSetKey, id).Err()
}

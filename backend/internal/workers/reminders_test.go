package workers

import (
	"context"
	"errors"
	"testing"
	"time"

	"careeros/backend/internal/persistence/postgres"
	remindersvc "careeros/backend/internal/services/reminders"
)

func TestBackoffForRetryUsesPlannedSchedule(t *testing.T) {
	tests := []struct {
		retry int32
		want  time.Duration
	}{
		{retry: 1, want: 30 * time.Second},
		{retry: 2, want: 2 * time.Minute},
		{retry: 3, want: 5 * time.Minute},
		{retry: 4, want: 5 * time.Minute},
	}

	for _, tt := range tests {
		if got := backoffForRetry(tt.retry); got != tt.want {
			t.Fatalf("retry %d: expected %s, got %s", tt.retry, tt.want, got)
		}
	}
}

func TestMaxRetriesDefaultsToThree(t *testing.T) {
	worker := ReminderWorker{}

	if got := worker.maxRetries(); got != 3 {
		t.Fatalf("expected default max retries 3, got %d", got)
	}
}

func TestProcessDueProcessesPendingReminderOnce(t *testing.T) {
	store := newFakeReminderStore(postgres.Reminder{
		ID:             "reminder-1",
		Title:          "Follow up",
		DueAt:          time.Now(),
		Status:         remindersvc.StatusPending,
		IdempotencyKey: "key-1",
	})
	queue := &fakeReminderQueue{
		dueIDs:  []string{"reminder-1", "reminder-1"},
		claimed: map[string][]bool{"reminder-1": {true, false}},
	}
	deliveries := 0
	worker := ReminderWorker{
		store: store,
		queue: queue,
		Deliver: func(context.Context, postgres.Reminder) error {
			deliveries++
			return nil
		},
	}

	if err := worker.ProcessDue(context.Background()); err != nil {
		t.Fatalf("process due: %v", err)
	}

	if deliveries != 1 {
		t.Fatalf("expected 1 delivery attempt, got %d", deliveries)
	}
	if store.deliveryCount != 1 {
		t.Fatalf("expected 1 reminder delivery row, got %d", store.deliveryCount)
	}
	if store.reminder.Status != remindersvc.StatusSent {
		t.Fatalf("expected reminder sent, got %q", store.reminder.Status)
	}
	if store.reminder.DeliveredAt == nil {
		t.Fatal("expected delivered_at to be set")
	}
	if len(store.statuses) != 1 || store.statuses[0] != remindersvc.StatusProcessing {
		t.Fatalf("expected processing status before send, got %v", store.statuses)
	}
}

func TestProcessDueSkipsCancelledReminder(t *testing.T) {
	store := newFakeReminderStore(postgres.Reminder{
		ID:             "reminder-1",
		Title:          "Follow up",
		Status:         remindersvc.StatusCancelled,
		IdempotencyKey: "key-1",
	})
	queue := &fakeReminderQueue{
		dueIDs:  []string{"reminder-1"},
		claimed: map[string][]bool{"reminder-1": {true}},
	}
	worker := ReminderWorker{
		store: store,
		queue: queue,
		Deliver: func(context.Context, postgres.Reminder) error {
			t.Fatal("cancelled reminder should not be delivered")
			return nil
		},
	}

	if err := worker.ProcessDue(context.Background()); err != nil {
		t.Fatalf("process due: %v", err)
	}

	if store.deliveryCount != 0 {
		t.Fatalf("expected no delivery row, got %d", store.deliveryCount)
	}
	if len(store.statuses) != 0 {
		t.Fatalf("expected no status updates, got %v", store.statuses)
	}
}

func TestProcessDueRetriesFailedDeliveryWithBackoff(t *testing.T) {
	store := newFakeReminderStore(postgres.Reminder{
		ID:             "reminder-1",
		Title:          "Follow up",
		DueAt:          time.Now(),
		Status:         remindersvc.StatusPending,
		IdempotencyKey: "key-1",
	})
	queue := &fakeReminderQueue{
		dueIDs:  []string{"reminder-1"},
		claimed: map[string][]bool{"reminder-1": {true}},
	}
	worker := ReminderWorker{
		store: store,
		queue: queue,
		Deliver: func(context.Context, postgres.Reminder) error {
			return errors.New("smtp unavailable")
		},
	}

	if err := worker.ProcessDue(context.Background()); err != nil {
		t.Fatalf("process due should continue after item failure: %v", err)
	}

	if store.retry.Status != remindersvc.StatusPending {
		t.Fatalf("expected retry status pending, got %q", store.retry.Status)
	}
	if store.retry.RetryCount != 1 {
		t.Fatalf("expected retry count 1, got %d", store.retry.RetryCount)
	}
	if store.retry.LastError != "smtp unavailable" {
		t.Fatalf("expected last error to be stored, got %q", store.retry.LastError)
	}
	if len(queue.scheduled) != 1 || queue.scheduled[0].id != "reminder-1" {
		t.Fatalf("expected reminder to be rescheduled, got %+v", queue.scheduled)
	}
	if queue.scheduled[0].dueAt.Before(time.Now().Add(25 * time.Second)) {
		t.Fatalf("expected retry to be scheduled with backoff, got %s", queue.scheduled[0].dueAt)
	}
}

func TestProcessDueDeadLettersAfterMaxRetries(t *testing.T) {
	store := newFakeReminderStore(postgres.Reminder{
		ID:             "reminder-1",
		Title:          "Follow up",
		DueAt:          time.Now(),
		Status:         remindersvc.StatusPending,
		IdempotencyKey: "key-1",
		RetryCount:     2,
	})
	queue := &fakeReminderQueue{
		dueIDs:  []string{"reminder-1"},
		claimed: map[string][]bool{"reminder-1": {true}},
	}
	worker := ReminderWorker{
		store:      store,
		queue:      queue,
		MaxRetries: 3,
		Deliver: func(context.Context, postgres.Reminder) error {
			return errors.New("provider rejected message")
		},
	}

	if err := worker.ProcessDue(context.Background()); err != nil {
		t.Fatalf("process due should continue after dead-lettering item: %v", err)
	}

	if store.retry.Status != remindersvc.StatusFailed {
		t.Fatalf("expected retry status failed, got %q", store.retry.Status)
	}
	if store.retry.RetryCount != 3 {
		t.Fatalf("expected retry count 3, got %d", store.retry.RetryCount)
	}
	if len(store.failedJobs) != 1 {
		t.Fatalf("expected 1 failed job, got %d", len(store.failedJobs))
	}
	if store.failedJobs[0].ErrorMessage != "provider rejected message" {
		t.Fatalf("expected failed job error to be stored, got %q", store.failedJobs[0].ErrorMessage)
	}
	if len(queue.scheduled) != 0 {
		t.Fatalf("expected no retry schedule after dead-letter, got %+v", queue.scheduled)
	}
}

type fakeReminderStore struct {
	reminder      postgres.Reminder
	statuses      []string
	deliveryCount int
	retry         postgres.MarkReminderRetryParams
	failedJobs    []postgres.CreateFailedReminderJobParams
}

func newFakeReminderStore(reminder postgres.Reminder) *fakeReminderStore {
	return &fakeReminderStore{reminder: reminder}
}

func (s *fakeReminderStore) GetReminder(context.Context, string) (postgres.Reminder, error) {
	return s.reminder, nil
}

func (s *fakeReminderStore) UpdateReminderStatus(_ context.Context, _ string, status string) (postgres.Reminder, error) {
	s.statuses = append(s.statuses, status)
	s.reminder.Status = status
	return s.reminder, nil
}

func (s *fakeReminderStore) CreateReminderDelivery(context.Context, postgres.Reminder) (postgres.ReminderDelivery, error) {
	s.deliveryCount++
	return postgres.ReminderDelivery{ID: "delivery-1", ReminderID: s.reminder.ID, IdempotencyKey: s.reminder.IdempotencyKey}, nil
}

func (s *fakeReminderStore) MarkReminderSent(context.Context, string) (postgres.Reminder, error) {
	now := time.Now()
	s.reminder.Status = remindersvc.StatusSent
	s.reminder.DeliveredAt = &now
	return s.reminder, nil
}

func (s *fakeReminderStore) MarkReminderRetry(_ context.Context, arg postgres.MarkReminderRetryParams) (postgres.Reminder, error) {
	s.retry = arg
	s.reminder.Status = arg.Status
	s.reminder.RetryCount = arg.RetryCount
	s.reminder.LastError = &arg.LastError
	return s.reminder, nil
}

func (s *fakeReminderStore) CreateFailedReminderJob(_ context.Context, arg postgres.CreateFailedReminderJobParams) (postgres.FailedReminderJob, error) {
	s.failedJobs = append(s.failedJobs, arg)
	return postgres.FailedReminderJob{ID: "failed-1", ReminderID: arg.ReminderID, ErrorMessage: arg.ErrorMessage, RetryCount: arg.RetryCount, Payload: arg.Payload}, nil
}

type fakeReminderQueue struct {
	dueIDs    []string
	claimed   map[string][]bool
	scheduled []scheduledReminder
}

type scheduledReminder struct {
	id    string
	dueAt time.Time
}

func (q *fakeReminderQueue) DueReminderIDs(context.Context, time.Time) ([]string, error) {
	return q.dueIDs, nil
}

func (q *fakeReminderQueue) ClaimReminder(_ context.Context, id string) (bool, error) {
	claims := q.claimed[id]
	if len(claims) == 0 {
		return false, nil
	}
	q.claimed[id] = claims[1:]
	return claims[0], nil
}

func (q *fakeReminderQueue) ScheduleReminder(_ context.Context, id string, dueAt time.Time) error {
	q.scheduled = append(q.scheduled, scheduledReminder{id: id, dueAt: dueAt})
	return nil
}

package reminders

import (
	"context"
	"errors"
	"testing"
	"time"

	"careeros/backend/internal/persistence/postgres"
)

func TestCreateRejectsBlankTitle(t *testing.T) {
	service := New(&fakeStore{}, &fakeScheduler{})

	_, err := service.Create(context.Background(), postgres.CreateReminderParams{Title: "   ", DueAt: time.Now()})

	if !errors.Is(err, ErrTitleRequired) {
		t.Fatalf("expected ErrTitleRequired, got %v", err)
	}
}

func TestCreateSchedulesReminder(t *testing.T) {
	store := &fakeStore{}
	scheduler := &fakeScheduler{}
	service := New(store, scheduler)
	dueAt := time.Now().Add(time.Hour)

	reminder, err := service.Create(context.Background(), postgres.CreateReminderParams{
		ApplicationID: "00000000-0000-4000-8000-000000000001",
		Title:         "Follow up",
		DueAt:         dueAt,
	})
	if err != nil {
		t.Fatalf("create reminder: %v", err)
	}

	if reminder.IdempotencyKey == "" {
		t.Fatal("expected idempotency key")
	}
	if scheduler.scheduled.ID != reminder.ID {
		t.Fatalf("expected scheduled reminder %q, got %q", reminder.ID, scheduler.scheduled.ID)
	}
}

func TestCancelUnschedulesReminder(t *testing.T) {
	scheduler := &fakeScheduler{}
	service := New(&fakeStore{}, scheduler)

	_, err := service.Cancel(context.Background(), "reminder-1")
	if err != nil {
		t.Fatalf("cancel reminder: %v", err)
	}

	if scheduler.unscheduled != "reminder-1" {
		t.Fatalf("expected reminder to be unscheduled, got %q", scheduler.unscheduled)
	}
}

type fakeStore struct {
	created postgres.CreateReminderParams
	updated postgres.UpdateReminderParams
	status  string
}

func (f *fakeStore) CreateReminder(_ context.Context, arg postgres.CreateReminderParams) (postgres.Reminder, error) {
	f.created = arg
	return postgres.Reminder{
		ID:             "reminder-1",
		ApplicationID:  arg.ApplicationID,
		Title:          arg.Title,
		DueAt:          arg.DueAt,
		Status:         StatusPending,
		IdempotencyKey: arg.IdempotencyKey,
	}, nil
}

func (f *fakeStore) ListReminders(context.Context) ([]postgres.Reminder, error) {
	return nil, nil
}

func (f *fakeStore) ListDueReminders(context.Context, time.Time) ([]postgres.Reminder, error) {
	return nil, nil
}

func (f *fakeStore) GetReminder(context.Context, string) (postgres.Reminder, error) {
	return postgres.Reminder{}, nil
}

func (f *fakeStore) UpdateReminder(_ context.Context, arg postgres.UpdateReminderParams) (postgres.Reminder, error) {
	f.updated = arg
	return postgres.Reminder{ID: arg.ID, Status: StatusPending}, nil
}

func (f *fakeStore) UpdateReminderStatus(_ context.Context, id string, status string) (postgres.Reminder, error) {
	f.status = status
	return postgres.Reminder{ID: id, Status: status}, nil
}

func (f *fakeStore) DeleteReminder(context.Context, string) error {
	return nil
}

func (f *fakeStore) ListFailedReminderJobs(context.Context) ([]postgres.FailedReminderJob, error) {
	return nil, nil
}

func (f *fakeStore) ResetReminderForRetry(context.Context, string) (postgres.Reminder, error) {
	return postgres.Reminder{}, nil
}

type fakeScheduler struct {
	scheduled   postgres.Reminder
	unscheduled string
}

func (f *fakeScheduler) ScheduleReminder(_ context.Context, reminder postgres.Reminder) error {
	f.scheduled = reminder
	return nil
}

func (f *fakeScheduler) UnscheduleReminder(_ context.Context, id string) error {
	f.unscheduled = id
	return nil
}

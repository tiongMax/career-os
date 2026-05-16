package reminders

import (
	"context"
	"errors"
	"testing"
	"time"

	"careeros/backend/internal/db/queries"
)

func TestCreateRejectsBlankTitle(t *testing.T) {
	service := New(&fakeStore{}, &fakeScheduler{})

	_, err := service.Create(context.Background(), queries.CreateReminderParams{Title: "   ", DueAt: time.Now()})

	if !errors.Is(err, ErrTitleRequired) {
		t.Fatalf("expected ErrTitleRequired, got %v", err)
	}
}

func TestCreateSchedulesReminder(t *testing.T) {
	store := &fakeStore{}
	scheduler := &fakeScheduler{}
	service := New(store, scheduler)
	dueAt := time.Now().Add(time.Hour)

	reminder, err := service.Create(context.Background(), queries.CreateReminderParams{
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
	created queries.CreateReminderParams
	updated queries.UpdateReminderParams
	status  string
}

func (f *fakeStore) CreateReminder(_ context.Context, arg queries.CreateReminderParams) (queries.Reminder, error) {
	f.created = arg
	return queries.Reminder{
		ID:             "reminder-1",
		ApplicationID:  arg.ApplicationID,
		Title:          arg.Title,
		DueAt:          arg.DueAt,
		Status:         StatusPending,
		IdempotencyKey: arg.IdempotencyKey,
	}, nil
}

func (f *fakeStore) ListReminders(context.Context) ([]queries.Reminder, error) {
	return nil, nil
}

func (f *fakeStore) ListDueReminders(context.Context, time.Time) ([]queries.Reminder, error) {
	return nil, nil
}

func (f *fakeStore) GetReminder(context.Context, string) (queries.Reminder, error) {
	return queries.Reminder{}, nil
}

func (f *fakeStore) UpdateReminder(_ context.Context, arg queries.UpdateReminderParams) (queries.Reminder, error) {
	f.updated = arg
	return queries.Reminder{ID: arg.ID, Status: StatusPending}, nil
}

func (f *fakeStore) UpdateReminderStatus(_ context.Context, id string, status string) (queries.Reminder, error) {
	f.status = status
	return queries.Reminder{ID: id, Status: status}, nil
}

func (f *fakeStore) DeleteReminder(context.Context, string) error {
	return nil
}

type fakeScheduler struct {
	scheduled   queries.Reminder
	unscheduled string
}

func (f *fakeScheduler) ScheduleReminder(_ context.Context, reminder queries.Reminder) error {
	f.scheduled = reminder
	return nil
}

func (f *fakeScheduler) UnscheduleReminder(_ context.Context, id string) error {
	f.unscheduled = id
	return nil
}

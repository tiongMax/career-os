package app

import (
	pgstore "careeros/backend/internal/persistence/postgres"
	aianalysissvc "careeros/backend/internal/services/aianalysis"
	analyticssvc "careeros/backend/internal/services/analytics"
	appsvc "careeros/backend/internal/services/applications"
	companysvc "careeros/backend/internal/services/companies"
	contactsvc "careeros/backend/internal/services/contacts"
	interviewsvc "careeros/backend/internal/services/interviews"
	jdsvc "careeros/backend/internal/services/jobdescriptions"
	remindersvc "careeros/backend/internal/services/reminders"
	resumesvc "careeros/backend/internal/services/resumes"
	roletracksvc "careeros/backend/internal/services/roletracks"
	searchsvc "careeros/backend/internal/services/search"
	"careeros/backend/internal/transport/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Services struct {
	HTTP httpapi.Services
}

func NewServices(postgres *pgxpool.Pool, redisClient *redis.Client) Services {
	store := pgstore.New(postgres)
	return Services{
		HTTP: httpapi.Services{
			Companies:       companysvc.New(store),
			Resumes:         resumesvc.New(store),
			Applications:    appsvc.New(store),
			JobDescriptions: jdsvc.New(store),
			Contacts:        contactsvc.New(store),
			Interviews:      interviewsvc.New(store),
			Reminders:       remindersvc.New(store, remindersvc.NewRedisScheduler(redisClient)),
			Search:          searchsvc.New(store),
			Analytics:       analyticssvc.New(store),
			RoleTracks:      roletracksvc.New(store),
			AnalysisJobs:    aianalysissvc.New(store),
		},
	}
}

package workers

import (
	"context"
	"errors"
	"time"

	aianalysissvc "careeros/backend/internal/services/aianalysis"

	"github.com/rs/zerolog"
)

type AnalysisWorker struct {
	Service      *aianalysissvc.Service
	Logger       zerolog.Logger
	PollInterval time.Duration
}

func (w AnalysisWorker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.pollInterval())
	defer ticker.Stop()

	w.Logger.Info().Dur("poll_interval", w.pollInterval()).Msg("analysis worker started")
	for {
		select {
		case <-ctx.Done():
			w.Logger.Info().Msg("analysis worker stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := w.ProcessOnce(ctx); err != nil {
				w.Logger.Error().Err(err).Msg("process analysis job")
			}
		}
	}
}

func (w AnalysisWorker) ProcessOnce(ctx context.Context) error {
	if w.Service == nil {
		return errors.New("analysis service is nil")
	}
	job, processed, err := w.Service.ProcessNext(ctx)
	if err != nil {
		if processed {
			w.Logger.Warn().Err(err).Str("analysis_job_id", job.ID).Msg("analysis job failed")
			return nil
		}
		return err
	}
	if processed {
		w.Logger.Info().Str("analysis_job_id", job.ID).Str("status", job.Status).Msg("analysis job processed")
	}
	return nil
}

func (w AnalysisWorker) pollInterval() time.Duration {
	if w.PollInterval <= 0 {
		return time.Second
	}
	return w.PollInterval
}

package postgres

import (
	"context"
	"errors"
)

func (q *Queries) CreateApplication(ctx context.Context, arg CreateApplicationParams) (Application, error) {
	tracks := normalizeApplicationTracks(arg.RoleTrack, arg.RoleTracks)
	if len(tracks) == 0 {
		return Application{}, errors.New("application track is required")
	}
	arg.RoleTrack = tracks[0]

	starter, ok := q.db.(transactionStarter)
	if !ok {
		return Application{}, errors.New("queries db does not support transactions")
	}
	tx, err := starter.Begin(ctx)
	if err != nil {
		return Application{}, err
	}
	defer tx.Rollback(ctx)

	txq := q.WithTx(tx)
	row, err := txq.CreateApplicationSQL(ctx, CreateApplicationSQLParams{
		CompanyID:       arg.CompanyID,
		ResumeVersionID: arg.ResumeVersionID,
		Title:           arg.Title,
		RoleTrack:       arg.RoleTrack,
		Source:          arg.Source,
		Status:          arg.Status,
		Location:        arg.Location,
		EmploymentType:  arg.EmploymentType,
		JobUrl:          arg.JobURL,
		PortalAccount:   arg.PortalAccount,
		PortalPassword:  arg.PortalPassword,
		AppliedAt:       arg.AppliedAt,
		DeadlineAt:      arg.DeadlineAt,
		Notes:           arg.Notes,
	})
	if err != nil {
		return Application{}, err
	}
	if err := txq.replaceApplicationTracks(ctx, row.ID, tracks); err != nil {
		return Application{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Application{}, err
	}
	return applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, tracks, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.PortalAccount, row.PortalPassword, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt), nil
}

func (q *Queries) ListApplications(ctx context.Context) ([]Application, error) {
	rows, err := q.ListApplicationsSQL(ctx)
	if err != nil {
		return nil, err
	}
	applications := make([]Application, 0, len(rows))
	for _, row := range rows {
		tracks, err := q.listApplicationTracks(ctx, row.ID, row.RoleTrack)
		if err != nil {
			return nil, err
		}
		applications = append(applications, applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, tracks, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.PortalAccount, row.PortalPassword, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt))
	}
	return applications, nil
}

func (q *Queries) GetApplication(ctx context.Context, id string) (Application, error) {
	row, err := q.GetApplicationSQL(ctx, id)
	if err != nil {
		return Application{}, err
	}
	tracks, err := q.listApplicationTracks(ctx, row.ID, row.RoleTrack)
	if err != nil {
		return Application{}, err
	}
	return applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, tracks, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.PortalAccount, row.PortalPassword, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt), nil
}

func (q *Queries) UpdateApplication(ctx context.Context, arg UpdateApplicationParams) (Application, error) {
	if len(arg.RoleTracks) > 0 {
		tracks := normalizeApplicationTracks("", arg.RoleTracks)
		if len(tracks) == 0 {
			return Application{}, errors.New("application track is required")
		}
		arg.RoleTrack = &tracks[0]
	}

	starter, ok := q.db.(transactionStarter)
	if !ok {
		return Application{}, errors.New("queries db does not support transactions")
	}
	tx, err := starter.Begin(ctx)
	if err != nil {
		return Application{}, err
	}
	defer tx.Rollback(ctx)

	txq := q.WithTx(tx)
	row, err := txq.UpdateApplicationSQL(ctx, UpdateApplicationSQLParams{
		CompanyID:       arg.CompanyID,
		ResumeVersionID: arg.ResumeVersionID,
		Title:           arg.Title,
		RoleTrack:       arg.RoleTrack,
		Status:          arg.Status,
		Source:          arg.Source,
		Location:        arg.Location,
		EmploymentType:  arg.EmploymentType,
		JobUrl:          arg.JobURL,
		PortalAccount:   arg.PortalAccount,
		PortalPassword:  arg.PortalPassword,
		AppliedAt:       arg.AppliedAt,
		DeadlineAt:      arg.DeadlineAt,
		Notes:           arg.Notes,
		ID:              arg.ID,
	})
	if err != nil {
		return Application{}, err
	}
	tracks := arg.RoleTracks
	if len(tracks) > 0 {
		tracks = normalizeApplicationTracks(row.RoleTrack, tracks)
		if err := txq.replaceApplicationTracks(ctx, row.ID, tracks); err != nil {
			return Application{}, err
		}
	} else {
		tracks, err = txq.listApplicationTracks(ctx, row.ID, row.RoleTrack)
		if err != nil {
			return Application{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Application{}, err
	}
	return applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, tracks, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.PortalAccount, row.PortalPassword, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt), nil
}

func (q *Queries) UpdateApplicationStatusAndCreateAudit(ctx context.Context, id string, newStatus string, auditLog CreateAuditLogParams) (Application, error) {
	starter, ok := q.db.(transactionStarter)
	if !ok {
		return Application{}, errors.New("queries db does not support transactions")
	}
	tx, err := starter.Begin(ctx)
	if err != nil {
		return Application{}, err
	}
	defer tx.Rollback(ctx)

	txq := q.WithTx(tx)
	updatedRow, err := txq.UpdateApplicationStatusSQL(ctx, UpdateApplicationStatusSQLParams{ID: id, Status: newStatus})
	if err != nil {
		return Application{}, err
	}
	if _, err := txq.CreateAuditLog(ctx, auditLog); err != nil {
		return Application{}, err
	}
	tracks, err := txq.listApplicationTracks(ctx, updatedRow.ID, updatedRow.RoleTrack)
	if err != nil {
		return Application{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Application{}, err
	}
	return applicationFrom(updatedRow.ID, updatedRow.CompanyID, updatedRow.ResumeVersionID, updatedRow.Title, updatedRow.RoleTrack, tracks, updatedRow.Source, updatedRow.Status, updatedRow.Location, updatedRow.EmploymentType, updatedRow.JobUrl, updatedRow.PortalAccount, updatedRow.PortalPassword, updatedRow.AppliedAt, updatedRow.DeadlineAt, updatedRow.Notes, updatedRow.CreatedAt, updatedRow.UpdatedAt), nil
}

func (q *Queries) DeleteApplication(ctx context.Context, id string) error {
	return ensureRows(q.DeleteApplicationRowCount(ctx, id))
}

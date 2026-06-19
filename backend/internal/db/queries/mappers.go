package queries

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func timeFrom(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time
}

func ptrFromString(value any) *string {
	text, ok := value.(string)
	if !ok || text == "" {
		return nil
	}
	return &text
}

func companyFrom(id, name string, website, industry, location, notes *string, createdAt, updatedAt pgtype.Timestamptz) Company {
	return Company{ID: id, Name: name, Website: website, Industry: industry, Location: location, Notes: notes, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func applicationFrom(id, companyID string, resumeVersionID any, title, roleTrack string, roleTracks []string, source *string, status string, location, employmentType, jobURL, portalAccount, portalPassword *string, appliedAt, deadlineAt *time.Time, notes *string, createdAt, updatedAt pgtype.Timestamptz) Application {
	if len(roleTracks) == 0 {
		roleTracks = normalizeApplicationTracks(roleTrack, nil)
	}
	return Application{ID: id, CompanyID: companyID, ResumeVersionID: ptrFromString(resumeVersionID), Title: title, RoleTrack: roleTrack, RoleTracks: roleTracks, Source: source, Status: status, Location: location, EmploymentType: employmentType, JobURL: jobURL, PortalAccount: portalAccount, PortalPassword: portalPassword, AppliedAt: appliedAt, DeadlineAt: deadlineAt, Notes: notes, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func auditLogFrom(id, entityType, entityID, action string, oldValue, newValue []byte, createdAt pgtype.Timestamptz) AuditLog {
	return AuditLog{ID: id, EntityType: entityType, EntityID: entityID, Action: action, OldValue: oldValue, NewValue: newValue, CreatedAt: timeFrom(createdAt)}
}

func resumeVersionFrom(id, name, track string, contentText *string, hasPDF bool, tags []string, createdAt, updatedAt pgtype.Timestamptz) ResumeVersion {
	if tags == nil {
		tags = []string{}
	}
	return ResumeVersion{ID: id, Name: name, Track: track, ContentText: contentText, HasPDF: hasPDF, Tags: tags, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func contactFrom(id, companyID, name string, role, email, linkedinURL, relationship, notes *string, createdAt, updatedAt pgtype.Timestamptz) Contact {
	return Contact{ID: id, CompanyID: companyID, Name: name, Role: role, Email: email, LinkedinURL: linkedinURL, Relationship: relationship, Notes: notes, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func interviewFrom(id, applicationID, roundType string, scheduledAt *time.Time, interviewer, notes, outcome *string, createdAt, updatedAt pgtype.Timestamptz) InterviewRound {
	return InterviewRound{ID: id, ApplicationID: applicationID, RoundType: roundType, ScheduledAt: scheduledAt, Interviewer: interviewer, Notes: notes, Outcome: outcome, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func jobDescriptionFrom(id, applicationID, rawText string, extractedKeywords []string, aiSummary *string, createdAt, updatedAt pgtype.Timestamptz) JobDescription {
	if extractedKeywords == nil {
		extractedKeywords = []string{}
	}
	return JobDescription{ID: id, ApplicationID: applicationID, RawText: rawText, ExtractedKeywords: extractedKeywords, AISummary: aiSummary, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func reminderFrom(id, applicationID string, contactID any, title string, description *string, dueAt pgtype.Timestamptz, status, idempotencyKey string, retryCount int32, lastError *string, deliveredAt *time.Time, createdAt, updatedAt pgtype.Timestamptz) Reminder {
	return Reminder{ID: id, ApplicationID: applicationID, ContactID: ptrFromString(contactID), Title: title, Description: description, DueAt: timeFrom(dueAt), Status: status, IdempotencyKey: idempotencyKey, RetryCount: retryCount, LastError: lastError, DeliveredAt: deliveredAt, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

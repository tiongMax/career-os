package resumes

import "time"

type ResumeVersion struct {
	ID          string
	Name        string
	Track       string
	ContentText *string
	HasPDF      bool
	Tags        []string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

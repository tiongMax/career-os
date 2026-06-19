package contacts

import "time"

type Contact struct {
	ID           string
	CompanyID    string
	Name         string
	Role         *string
	Email        *string
	LinkedinURL  *string
	Relationship *string
	Notes        *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

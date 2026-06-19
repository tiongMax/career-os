package companies

import "time"

type Company struct {
	ID        string
	Name      string
	Website   *string
	Industry  *string
	Location  *string
	Notes     *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

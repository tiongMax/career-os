package postgres

import (
	"careeros/backend/internal/persistence/postgres/sqlc"

	"github.com/jackc/pgx/v5"
)

type DBTX = sqlc.DBTX

type Queries struct {
	*sqlc.Queries
	db DBTX
}

func New(db DBTX) *Queries {
	return &Queries{Queries: sqlc.New(db), db: db}
}

func (q *Queries) WithTx(tx pgx.Tx) *Queries {
	return &Queries{Queries: q.Queries.WithTx(tx), db: tx}
}

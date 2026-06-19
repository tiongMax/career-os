package queries

import (
	"errors"

	"github.com/jackc/pgx/v5"
)

func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func ensureRows(rows int64, err error) error {
	if err != nil {
		return err
	}
	if rows == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

package applications

import (
	"errors"
	"fmt"

	appdomain "careeros/backend/internal/domain/applications"
)

const (
	StatusSaved           = appdomain.StatusSaved
	StatusApplied         = appdomain.StatusApplied
	StatusRecruiterScreen = appdomain.StatusRecruiterScreen
	StatusTechnicalScreen = appdomain.StatusTechnicalScreen
	StatusOnsite          = appdomain.StatusOnsite
	StatusOffer           = appdomain.StatusOffer
	StatusRejected        = appdomain.StatusRejected
	StatusWithdrawn       = appdomain.StatusWithdrawn
)

var (
	ErrInvalidStatus     = errors.New("invalid application status")
	ErrInvalidTransition = errors.New("invalid application status transition")
)

var allowedTransitions = map[string]map[string]struct{}{
	StatusSaved: {
		StatusApplied:   {},
		StatusWithdrawn: {},
	},
	StatusApplied: {
		StatusRecruiterScreen: {},
		StatusTechnicalScreen: {},
		StatusRejected:        {},
		StatusWithdrawn:       {},
	},
	StatusRecruiterScreen: {
		StatusTechnicalScreen: {},
		StatusRejected:        {},
		StatusWithdrawn:       {},
	},
	StatusTechnicalScreen: {
		StatusOnsite:    {},
		StatusRejected:  {},
		StatusWithdrawn: {},
	},
	StatusOnsite: {
		StatusOffer:     {},
		StatusRejected:  {},
		StatusWithdrawn: {},
	},
	StatusOffer: {
		StatusWithdrawn: {},
		StatusRejected:  {},
	},
	StatusRejected: {
		StatusSaved:           {},
		StatusApplied:         {},
		StatusRecruiterScreen: {},
		StatusTechnicalScreen: {},
		StatusOnsite:          {},
		StatusOffer:           {},
		StatusWithdrawn:       {},
	},
	StatusWithdrawn: {},
}

func ValidateTransition(from string, to string) error {
	nextStatuses, ok := allowedTransitions[from]
	if !ok {
		return fmt.Errorf("%w: %s", ErrInvalidStatus, from)
	}
	if _, ok := allowedTransitions[to]; !ok {
		return fmt.Errorf("%w: %s", ErrInvalidStatus, to)
	}
	if _, ok := nextStatuses[to]; !ok {
		return fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, from, to)
	}
	return nil
}

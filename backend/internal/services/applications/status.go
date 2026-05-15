package applications

import (
	"errors"
	"fmt"
)

const (
	StatusSaved           = "saved"
	StatusApplied         = "applied"
	StatusRecruiterScreen = "recruiter_screen"
	StatusTechnicalScreen = "technical_screen"
	StatusOnsite          = "onsite"
	StatusOffer           = "offer"
	StatusRejected        = "rejected"
	StatusWithdrawn       = "withdrawn"
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
	StatusRejected:  {},
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

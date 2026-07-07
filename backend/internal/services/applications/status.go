package applications

import (
	"errors"
	"fmt"

	appdomain "careeros/backend/internal/domain/applications"
)

const (
	StatusSaved            = appdomain.StatusSaved
	StatusApplied          = appdomain.StatusApplied
	StatusOnlineAssessment = appdomain.StatusOnlineAssessment
	StatusRecruiterScreen  = appdomain.StatusRecruiterScreen
	StatusTechnicalScreen  = appdomain.StatusTechnicalScreen
	StatusTechnicalScreen2 = appdomain.StatusTechnicalScreen2
	StatusTechnicalScreen3 = appdomain.StatusTechnicalScreen3
	StatusTechnicalScreen4 = appdomain.StatusTechnicalScreen4
	StatusOnsite           = appdomain.StatusOnsite
	StatusOffer            = appdomain.StatusOffer
	StatusRejected         = appdomain.StatusRejected
	StatusWithdrawn        = appdomain.StatusWithdrawn
	StatusKIV              = appdomain.StatusKIV
)

var (
	ErrInvalidStatus     = errors.New("invalid application status")
	ErrInvalidTransition = errors.New("invalid application status transition")
)

var allowedTransitions = map[string]map[string]struct{}{
	StatusSaved: {
		StatusApplied:   {},
		StatusWithdrawn: {},
		StatusKIV:       {},
	},
	StatusApplied: {
		StatusOnlineAssessment: {},
		StatusRecruiterScreen:  {},
		StatusTechnicalScreen:  {},
		StatusRejected:         {},
		StatusWithdrawn:        {},
		StatusKIV:              {},
	},
	StatusOnlineAssessment: {
		StatusRecruiterScreen: {},
		StatusTechnicalScreen: {},
		StatusRejected:        {},
		StatusWithdrawn:       {},
		StatusKIV:             {},
	},
	StatusRecruiterScreen: {
		StatusOnlineAssessment: {},
		StatusTechnicalScreen:  {},
		StatusRejected:         {},
		StatusWithdrawn:        {},
		StatusKIV:              {},
	},
	StatusTechnicalScreen: {
		StatusTechnicalScreen2: {},
		StatusOnsite:           {},
		StatusRejected:         {},
		StatusWithdrawn:        {},
		StatusKIV:              {},
	},
	StatusTechnicalScreen2: {
		StatusTechnicalScreen3: {},
		StatusOnsite:           {},
		StatusRejected:         {},
		StatusWithdrawn:        {},
		StatusKIV:              {},
	},
	StatusTechnicalScreen3: {
		StatusTechnicalScreen4: {},
		StatusOnsite:           {},
		StatusRejected:         {},
		StatusWithdrawn:        {},
		StatusKIV:              {},
	},
	StatusTechnicalScreen4: {
		StatusOnsite:    {},
		StatusRejected:  {},
		StatusWithdrawn: {},
		StatusKIV:       {},
	},
	StatusOnsite: {
		StatusOffer:     {},
		StatusRejected:  {},
		StatusWithdrawn: {},
		StatusKIV:       {},
	},
	StatusOffer: {
		StatusWithdrawn: {},
		StatusRejected:  {},
		StatusKIV:       {},
	},
	StatusRejected: {
		StatusSaved:            {},
		StatusApplied:          {},
		StatusOnlineAssessment: {},
		StatusRecruiterScreen:  {},
		StatusTechnicalScreen:  {},
		StatusTechnicalScreen2: {},
		StatusTechnicalScreen3: {},
		StatusTechnicalScreen4: {},
		StatusOnsite:           {},
		StatusOffer:            {},
		StatusWithdrawn:        {},
		StatusKIV:              {},
	},
	StatusKIV: {
		StatusSaved:            {},
		StatusApplied:          {},
		StatusOnlineAssessment: {},
		StatusRecruiterScreen:  {},
		StatusTechnicalScreen:  {},
		StatusTechnicalScreen2: {},
		StatusTechnicalScreen3: {},
		StatusTechnicalScreen4: {},
		StatusOnsite:           {},
		StatusOffer:            {},
		StatusRejected:         {},
		StatusWithdrawn:        {},
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

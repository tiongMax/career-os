# Frontend Guide

The frontend has not started yet. `frontend/README.md` currently marks it as a
future implementation after the backend foundation is in place.

Use this doc as the frontend mental model once UI work begins.

## Current Status

Implemented:

- Placeholder `frontend/README.md`.

Not implemented yet:

- Framework setup.
- Routing.
- API client.
- Pages.
- Components.
- Tests.

## Recommended First Screens

Build the usable app first, not a marketing landing page.

Suggested first screen:

- Application pipeline dashboard.
- Filters for status, role track, company, and upcoming deadlines.
- Table or dense list of applications.
- Quick create action for a new application.

Suggested follow-up screens:

- Application detail page.
- Company detail page.
- Resume versions page.
- Reminder list.
- Search results.
- Analytics dashboard.

## Suggested Frontend Structure

Adjust this to the chosen framework, but keep the boundaries clear:

```text
frontend/
  src/
    app/ or pages/       route-level screens
    components/          reusable UI pieces
    features/            application, company, reminder modules
    lib/
      api/               HTTP client and endpoint wrappers
      dates/             date formatting helpers
      status/            status labels and ordering
    styles/              global styles and design tokens
```

## API Client Rule

Keep raw `fetch` calls in one API layer instead of scattering endpoint URLs
through components.

Example shape:

```text
components call feature hooks/functions
feature code calls lib/api
lib/api calls /api/v1/*
```

That makes backend endpoint changes easier to find.

## UI State Model

For each backend-backed view, make these states explicit:

- loading
- empty
- ready
- error
- saving or mutating

CareerOS is an operational tool, so prioritize fast scanning and repeated use:

- Dense but readable tables and lists.
- Clear status chips.
- Predictable filters.
- Minimal decorative layout.
- Dates and next actions visible without extra clicks.

## Shared Domain Constants

The frontend will need the same domain vocabulary as the backend:

- application statuses
- role tracks
- reminder statuses
- interview round types

Prefer one shared frontend module for labels, ordering, colors, and allowed
actions. Do not hard-code status labels independently on every page.

## First Integration Checklist

When frontend work starts:

- Add a health check call first to prove local API connectivity.
- Add list/create applications after backend endpoints exist.
- Add status update UI only after service-layer transition rules exist.
- Add reminder UI only after reminder scheduling behavior exists.
- Document the chosen framework and command set here.

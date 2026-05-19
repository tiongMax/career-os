// Command seed populates the CareerOS database with realistic demo data for
// development and demonstration purposes.
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"time"

	"careeros/backend/internal/db/queries"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable"
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping postgres: %v", err)
	}

	store := queries.New(pool)

	// Idempotency check: if companies already exist, skip seeding.
	existing, err := store.ListCompanies(ctx)
	if err != nil {
		log.Fatalf("check existing data: %v", err)
	}
	if len(existing) > 0 {
		log.Println("already seeded — found existing companies, exiting")
		return
	}

	var (
		insertedCompanies    int
		insertedResumes      int
		insertedApplications int
		insertedJobDescs     int
		insertedContacts     int
		insertedInterviews   int
		insertedReminders    int
	)

	// -------------------------------------------------------------------------
	// 1. Companies
	// -------------------------------------------------------------------------
	type companySpec struct {
		name     string
		website  string
		industry string
		location string
	}

	companySpecs := []companySpec{
		{"Acme Systems", "https://acmesystems.io", "Infrastructure", "San Francisco, CA"},
		{"Vertex AI Labs", "https://vertexailabs.com", "AI/ML", "New York, NY"},
		{"Northpeak Capital", "https://northpeakcapital.com", "Quantitative Finance", "New York, NY"},
		{"Cloudbridge Inc", "https://cloudbridge.io", "Infrastructure", "Seattle, WA"},
		{"DataStream Analytics", "https://datastreamanalytics.com", "Data Engineering", "Austin, TX"},
		{"Solaris Fintech", "https://solarisfintech.com", "Fintech", "Chicago, IL"},
		{"Quantum Leap Technologies", "https://quantumleaptech.io", "AI/ML", "Boston, MA"},
		{"Ironclad Security", "https://ironcladsc.com", "Cybersecurity", "Washington, DC"},
		{"NovaTrade Systems", "https://novatadesystems.com", "Quantitative Finance", "Chicago, IL"},
		{"Meridian Health Tech", "https://meridianhealthtech.com", "HealthTech", "San Francisco, CA"},
		{"Stackfire Engineering", "https://stackfire.dev", "Infrastructure", "Remote"},
		{"Luminary Data", "https://luminarydata.io", "Data Engineering", "Seattle, WA"},
		{"Cascade Financial", "https://cascadefinancial.com", "Fintech", "Denver, CO"},
		{"Helios Computing", "https://helioscomputing.io", "Cloud Computing", "Austin, TX"},
		{"Polaris ML", "https://polarisml.com", "AI/ML", "San Francisco, CA"},
		{"Apex Trading Co", "https://apextrading.co", "Quantitative Finance", "New York, NY"},
		{"Horizon Robotics", "https://horizonrobotics.io", "Robotics/AI", "Pittsburgh, PA"},
		{"BlueSky Payments", "https://blueskypayments.com", "Fintech", "Miami, FL"},
		{"Cobalt Networks", "https://cobaltnetworks.io", "Infrastructure", "Portland, OR"},
		{"Zenith Analytics", "https://zenithanalytics.com", "Data Engineering", "Boston, MA"},
	}

	companies := make([]queries.Company, 0, len(companySpecs))
	for _, spec := range companySpecs {
		w := spec.website
		ind := spec.industry
		loc := spec.location
		c, err := store.CreateCompany(ctx, queries.CreateCompanyParams{
			Name:     spec.name,
			Website:  &w,
			Industry: &ind,
			Location: &loc,
		})
		if err != nil {
			log.Printf("insert company %q: %v", spec.name, err)
			continue
		}
		companies = append(companies, c)
		insertedCompanies++
	}
	log.Printf("inserted %d companies", insertedCompanies)

	if len(companies) == 0 {
		log.Fatal("no companies inserted, aborting seed")
	}

	// -------------------------------------------------------------------------
	// 2. Resume versions
	// -------------------------------------------------------------------------
	type resumeSpec struct {
		name    string
		track   string
		tags    []string
		content string
	}

	resumeSpecs := []resumeSpec{
		{
			name:  "Backend Engineer v1",
			track: "backend",
			tags:  []string{"go", "postgresql", "redis", "kubernetes", "rest-api"},
			content: "Experienced backend engineer with 3+ years building distributed systems in Go. " +
				"Proficient in PostgreSQL, Redis, Kubernetes, and Docker. " +
				"Strong background in REST API design, microservices, and observability.",
		},
		{
			name:  "AI Engineer v1",
			track: "ai",
			tags:  []string{"python", "pytorch", "llm", "mlops", "kubernetes"},
			content: "AI/ML engineer with expertise in large language models and deep learning. " +
				"Experience with PyTorch, Hugging Face, and MLOps pipelines. " +
				"Comfortable deploying models at scale with Kubernetes and cloud infrastructure.",
		},
		{
			name:  "Quant Dev v1",
			track: "quant",
			tags:  []string{"python", "c++", "statistics", "algo-trading", "risk-modeling"},
			content: "Quantitative developer with a background in mathematical finance. " +
				"Proficient in Python and C++ for algorithmic trading and risk modeling. " +
				"Experience with time-series analysis, backtesting frameworks, and low-latency systems.",
		},
		{
			name:  "General v1",
			track: "general",
			tags:  []string{"go", "python", "sql", "cloud", "agile"},
			content: "Versatile software engineer with experience across full-stack development. " +
				"Comfortable working with Go, Python, and SQL in fast-paced agile environments. " +
				"Solid understanding of cloud services and software delivery best practices.",
		},
		{
			name:  "Full Stack v1",
			track: "general",
			tags:  []string{"typescript", "react", "go", "postgresql", "docker"},
			content: "Full stack engineer with strong frontend and backend skills. " +
				"React/TypeScript on the frontend, Go services on the backend, PostgreSQL for persistence. " +
				"Experience shipping end-to-end product features in small, cross-functional teams.",
		},
	}

	resumes := make([]queries.ResumeVersion, 0, len(resumeSpecs))
	for _, spec := range resumeSpecs {
		ct := spec.content
		rv, err := store.CreateResumeVersion(ctx, queries.CreateResumeVersionParams{
			Name:        spec.name,
			Track:       spec.track,
			Tags:        spec.tags,
			ContentText: &ct,
		})
		if err != nil {
			log.Printf("insert resume %q: %v", spec.name, err)
			continue
		}
		resumes = append(resumes, rv)
		insertedResumes++
	}
	log.Printf("inserted %d resume versions", insertedResumes)

	if len(resumes) == 0 {
		log.Fatal("no resume versions inserted, aborting seed")
	}

	// -------------------------------------------------------------------------
	// 3. Applications
	// -------------------------------------------------------------------------
	type appSpec struct {
		title          string
		roleTrack      string
		source         string
		status         string
		location       string
		employmentType string
	}

	appSpecs := []appSpec{
		{"Software Engineer Intern", "backend", "LinkedIn", "saved", "San Francisco, CA", "internship"},
		{"Backend Engineer", "backend", "referral", "applied", "New York, NY", "full_time"},
		{"ML Engineer", "ai", "company_site", "recruiter_screen", "Remote", "full_time"},
		{"Quant Developer", "quant", "recruiter", "technical_screen", "Chicago, IL", "full_time"},
		{"Site Reliability Engineer", "backend", "LinkedIn", "onsite", "Seattle, WA", "full_time"},
		{"Platform Engineer", "backend", "company_site", "offer", "Austin, TX", "full_time"},
		{"Data Engineer", "general", "LinkedIn", "rejected", "Boston, MA", "full_time"},
		{"AI Research Intern", "ai", "referral", "withdrawn", "New York, NY", "internship"},
		{"Systems Engineer", "backend", "recruiter", "applied", "San Francisco, CA", "full_time"},
		{"Quantitative Analyst", "quant", "LinkedIn", "recruiter_screen", "Chicago, IL", "full_time"},
		{"DevOps Engineer", "backend", "company_site", "technical_screen", "Seattle, WA", "full_time"},
		{"Machine Learning Engineer", "ai", "LinkedIn", "onsite", "Remote", "full_time"},
		{"Software Engineer - Infrastructure", "backend", "referral", "offer", "New York, NY", "full_time"},
		{"Research Engineer - NLP", "ai", "company_site", "applied", "Boston, MA", "full_time"},
		{"Quantitative Software Developer", "quant", "recruiter", "saved", "New York, NY", "full_time"},
		{"Backend Engineer - Payments", "backend", "LinkedIn", "recruiter_screen", "San Francisco, CA", "full_time"},
		{"Data Platform Engineer", "general", "company_site", "technical_screen", "Austin, TX", "full_time"},
		{"Applied Scientist Intern", "ai", "referral", "applied", "Remote", "internship"},
		{"Algorithmic Trading Engineer", "quant", "LinkedIn", "rejected", "Chicago, IL", "full_time"},
		{"Cloud Infrastructure Engineer", "backend", "company_site", "applied", "Seattle, WA", "full_time"},
		{"Software Engineer Intern - ML", "ai", "LinkedIn", "saved", "San Francisco, CA", "internship"},
		{"Go Backend Developer", "backend", "referral", "applied", "New York, NY", "full_time"},
		{"Senior ML Engineer", "ai", "recruiter", "recruiter_screen", "Boston, MA", "full_time"},
		{"Quant Research Intern", "quant", "company_site", "technical_screen", "Chicago, IL", "internship"},
		{"Distributed Systems Engineer", "backend", "LinkedIn", "onsite", "Seattle, WA", "full_time"},
		{"AI Infrastructure Engineer", "ai", "company_site", "applied", "Remote", "full_time"},
		{"Full Stack Engineer", "general", "referral", "saved", "Austin, TX", "full_time"},
		{"Software Engineer - Core", "backend", "LinkedIn", "recruiter_screen", "San Francisco, CA", "full_time"},
		{"Quantitative Researcher", "quant", "recruiter", "applied", "New York, NY", "full_time"},
		{"Platform Software Engineer", "backend", "company_site", "technical_screen", "Seattle, WA", "full_time"},
		{"ML Platform Engineer", "ai", "LinkedIn", "onsite", "Remote", "full_time"},
		{"Systems Software Engineer", "backend", "referral", "offer", "Chicago, IL", "full_time"},
		{"Research Scientist - AI", "ai", "company_site", "applied", "Boston, MA", "full_time"},
		{"Algo Trading Developer", "quant", "LinkedIn", "recruiter_screen", "New York, NY", "full_time"},
		{"Backend Infrastructure Engineer", "backend", "recruiter", "saved", "San Francisco, CA", "full_time"},
		{"Data Engineer - Fintech", "general", "company_site", "applied", "Chicago, IL", "full_time"},
		{"Software Engineer - ML Systems", "ai", "referral", "recruiter_screen", "Remote", "full_time"},
		{"Quantitative Dev Intern", "quant", "LinkedIn", "technical_screen", "New York, NY", "internship"},
		{"Cloud Backend Engineer", "backend", "company_site", "onsite", "Seattle, WA", "full_time"},
		{"ML Researcher", "ai", "recruiter", "applied", "Boston, MA", "full_time"},
		{"Software Engineer - APIs", "backend", "LinkedIn", "saved", "San Francisco, CA", "full_time"},
		{"Quant Risk Developer", "quant", "referral", "recruiter_screen", "Chicago, IL", "full_time"},
		{"Infrastructure Engineer", "backend", "company_site", "applied", "Austin, TX", "full_time"},
		{"LLM Engineer", "ai", "LinkedIn", "technical_screen", "Remote", "full_time"},
		{"General Software Engineer", "general", "recruiter", "saved", "New York, NY", "full_time"},
		{"Core Platform Engineer", "backend", "company_site", "applied", "Seattle, WA", "full_time"},
		{"Computer Vision Engineer", "ai", "referral", "recruiter_screen", "Boston, MA", "full_time"},
		{"Portfolio Analytics Developer", "quant", "LinkedIn", "applied", "Chicago, IL", "full_time"},
		{"Reliability Engineer", "backend", "company_site", "technical_screen", "San Francisco, CA", "full_time"},
		{"Senior AI Engineer", "ai", "recruiter", "onsite", "Remote", "full_time"},
	}

	// Job description templates keyed by role track
	jdTemplates := map[string][]string{
		"backend": {
			"We are looking for a backend engineer to build scalable services in Go. " +
				"You will design RESTful APIs, optimize PostgreSQL queries, and manage Redis caching layers. " +
				"Familiarity with Kubernetes, Docker, and observability tools (Prometheus, Grafana) is expected. " +
				"Our stack includes Go, PostgreSQL, Redis, and runs on AWS EKS.",
			"Join our platform team to own the reliability and performance of our core backend systems. " +
				"You will work with Go microservices, event-driven architectures using Kafka, and PostgreSQL. " +
				"Experience with container orchestration and CI/CD pipelines (GitHub Actions, ArgoCD) is a plus.",
			"We need a backend developer who thrives in distributed systems. " +
				"Responsibilities include designing gRPC services, maintaining PostgreSQL schemas, and improving SLOs. " +
				"Our toolchain: Go, gRPC, PostgreSQL, Redis, Docker, Terraform.",
		},
		"ai": {
			"We are seeking an ML engineer to productionize large language model pipelines. " +
				"You will work with Python, PyTorch, and Hugging Face Transformers to fine-tune and deploy models. " +
				"Experience with MLflow, Kubernetes, and cloud GPU infrastructure (AWS SageMaker, GCP Vertex AI) required.",
			"Help us build the next generation of AI-powered products. " +
				"You will design training pipelines, evaluate model quality, and deploy serving infrastructure. " +
				"Stack: Python, PyTorch, TensorFlow, Docker, Kubernetes, and Ray.",
			"We need an applied scientist to develop NLP and computer vision models. " +
				"Responsibilities include dataset curation, model evaluation, and A/B testing. " +
				"Experience with Python, scikit-learn, transformers, and distributed training is expected.",
		},
		"quant": {
			"We are hiring a quantitative developer to build and maintain algorithmic trading strategies. " +
				"You will implement and backtest alpha signals using Python and C++, interface with market data feeds, " +
				"and develop low-latency execution systems. Strong stats and numerical computing background required.",
			"Join our quant research team to model portfolio risk and optimize execution algorithms. " +
				"You will use Python for data analysis, R for statistical modeling, and C++ for performance-critical paths. " +
				"Experience with Bloomberg, SQL databases, and Monte Carlo methods is expected.",
			"Seeking a quant software engineer to build infrastructure for our systematic trading desk. " +
				"Responsibilities include real-time data pipelines, risk calculation engines, and backtesting frameworks. " +
				"Proficiency in Python, C++, and SQL is required.",
		},
		"general": {
			"We are looking for a versatile software engineer comfortable across the full stack. " +
				"You will work on React frontends, Go or Python backends, and PostgreSQL databases. " +
				"Agile development practices, code reviews, and cross-functional collaboration are central to this role.",
			"Join a fast-growing startup as a generalist engineer. " +
				"You will own features end-to-end: frontend (TypeScript/React), backend (Go), and infrastructure (AWS, Docker). " +
				"We value curiosity, pragmatism, and a strong sense of ownership.",
		},
	}

	now := time.Now()
	appliedTime := now.Add(-30 * 24 * time.Hour)

	applications := make([]queries.Application, 0, len(appSpecs))
	for i, spec := range appSpecs {
		company := companies[i%len(companies)]
		resume := resumes[i%len(resumes)]
		resumeID := resume.ID

		src := spec.source
		status := spec.status
		loc := spec.location
		et := spec.employmentType
		jobURL := fmt.Sprintf("https://jobs.example.com/%d", i+1)

		var appliedAt *time.Time
		if spec.status != "saved" {
			t := appliedTime.Add(time.Duration(i) * 12 * time.Hour)
			appliedAt = &t
		}

		app, err := store.CreateApplication(ctx, queries.CreateApplicationParams{
			CompanyID:       company.ID,
			ResumeVersionID: &resumeID,
			Title:           spec.title,
			RoleTrack:       spec.roleTrack,
			Source:          &src,
			Status:          &status,
			Location:        &loc,
			EmploymentType:  &et,
			JobURL:          &jobURL,
			AppliedAt:       appliedAt,
		})
		if err != nil {
			log.Printf("insert application %q: %v", spec.title, err)
			continue
		}
		applications = append(applications, app)
		insertedApplications++
	}

	// Fill remaining applications up to 200 by cycling through the spec list.
	for i := len(appSpecs); i < 200; i++ {
		spec := appSpecs[i%len(appSpecs)]
		company := companies[i%len(companies)]
		resume := resumes[i%len(resumes)]
		resumeID := resume.ID

		src := spec.source
		status := spec.status
		loc := spec.location
		et := spec.employmentType
		title := fmt.Sprintf("%s (%d)", spec.title, i)
		jobURL := fmt.Sprintf("https://jobs.example.com/%d", i+1)

		var appliedAt *time.Time
		if spec.status != "saved" {
			t := appliedTime.Add(time.Duration(i) * 6 * time.Hour)
			appliedAt = &t
		}

		app, err := store.CreateApplication(ctx, queries.CreateApplicationParams{
			CompanyID:       company.ID,
			ResumeVersionID: &resumeID,
			Title:           title,
			RoleTrack:       spec.roleTrack,
			Source:          &src,
			Status:          &status,
			Location:        &loc,
			EmploymentType:  &et,
			JobURL:          &jobURL,
			AppliedAt:       appliedAt,
		})
		if err != nil {
			log.Printf("insert application %d: %v", i, err)
			continue
		}
		applications = append(applications, app)
		insertedApplications++
	}
	log.Printf("inserted %d applications", insertedApplications)

	// -------------------------------------------------------------------------
	// 4. Job descriptions (one per application)
	// -------------------------------------------------------------------------
	for i, app := range applications {
		track := appSpecs[i%len(appSpecs)].roleTrack
		templates := jdTemplates[track]
		if templates == nil {
			templates = jdTemplates["general"]
		}
		rawText := templates[i%len(templates)]
		keywords := keywordsForTrack(track)

		_, err := store.CreateJobDescription(ctx, queries.CreateJobDescriptionParams{
			ApplicationID:     app.ID,
			RawText:           rawText,
			ExtractedKeywords: keywords,
		})
		if err != nil {
			log.Printf("insert job description for app %s: %v", app.ID, err)
			continue
		}
		insertedJobDescs++
	}
	log.Printf("inserted %d job descriptions", insertedJobDescs)

	// -------------------------------------------------------------------------
	// 5. Contacts (100 total, spread across companies)
	// -------------------------------------------------------------------------
	type contactSpec struct {
		name         string
		role         string
		relationship string
	}

	contactSpecs := []contactSpec{
		{"Alice Chen", "Engineering Manager", "recruiter"},
		{"Bob Martinez", "Senior Recruiter", "recruiter"},
		{"Carol White", "Staff Engineer", "referral"},
		{"David Kim", "VP Engineering", "hiring_manager"},
		{"Emily Taylor", "Technical Recruiter", "recruiter"},
		{"Frank Johnson", "Director of Engineering", "hiring_manager"},
		{"Grace Liu", "HR Business Partner", "recruiter"},
		{"Henry Brown", "Principal Engineer", "interviewer"},
		{"Isabel Davis", "Talent Acquisition", "recruiter"},
		{"James Wilson", "Engineering Lead", "hiring_manager"},
	}

	contacts := make([]queries.Contact, 0, 100)
	for i := 0; i < 100; i++ {
		spec := contactSpecs[i%len(contactSpecs)]
		company := companies[i%len(companies)]

		name := fmt.Sprintf("%s %d", spec.name, i/len(contactSpecs)+1)
		if i < len(contactSpecs) {
			name = spec.name
		}
		role := spec.role
		rel := spec.relationship
		email := fmt.Sprintf("%s.%d@%s", sanitizeName(spec.name), i+1, domainFor(company.Name))

		contact, err := store.CreateContact(ctx, queries.CreateContactParams{
			CompanyID:    company.ID,
			Name:         name,
			Role:         &role,
			Email:        &email,
			Relationship: &rel,
		})
		if err != nil {
			log.Printf("insert contact %q: %v", name, err)
			continue
		}
		contacts = append(contacts, contact)
		insertedContacts++
	}
	log.Printf("inserted %d contacts", insertedContacts)

	// -------------------------------------------------------------------------
	// 6. Interview rounds (50, linked to applications past recruiter_screen)
	// -------------------------------------------------------------------------
	advancedStatuses := map[string]bool{
		"recruiter_screen": true,
		"technical_screen": true,
		"onsite":           true,
		"offer":            true,
	}

	advancedApps := make([]queries.Application, 0)
	for _, app := range applications {
		if advancedStatuses[app.Status] {
			advancedApps = append(advancedApps, app)
		}
	}

	roundTypes := []string{"recruiter", "online_assessment", "technical", "system_design", "behavioral", "final"}
	outcomes := []string{"passed", "failed", "pending"}
	interviewers := []string{
		"Sarah Thompson", "Mike Rodriguez", "Amy Zhang", "Chris Patel", "Laura Nguyen",
	}

	roundCount := 50
	if len(advancedApps) < roundCount {
		roundCount = len(advancedApps)
	}

	for i := 0; i < roundCount; i++ {
		app := advancedApps[i%len(advancedApps)]
		roundType := roundTypes[i%len(roundTypes)]
		interviewer := interviewers[i%len(interviewers)]
		outcome := outcomes[i%len(outcomes)]
		scheduledAt := now.Add(-time.Duration(roundCount-i) * 24 * time.Hour)
		notes := fmt.Sprintf("Round %d interview for %s position.", i+1, app.Title)

		_, err := store.CreateInterviewRound(ctx, queries.CreateInterviewRoundParams{
			ApplicationID: app.ID,
			RoundType:     roundType,
			ScheduledAt:   &scheduledAt,
			Interviewer:   &interviewer,
			Notes:         &notes,
			Outcome:       &outcome,
		})
		if err != nil {
			log.Printf("insert interview round %d: %v", i, err)
			continue
		}
		insertedInterviews++
	}
	log.Printf("inserted %d interview rounds", insertedInterviews)

	// -------------------------------------------------------------------------
	// 7. Reminders (50, linked to applications)
	// -------------------------------------------------------------------------
	reminderTitles := []string{
		"Follow up with recruiter",
		"Send thank you email",
		"Check application status",
		"Prepare for technical interview",
		"Review company research notes",
		"Update resume for role",
		"Reach out to contact at company",
		"Submit coding assessment",
		"Schedule interview debrief",
		"Negotiate offer details",
	}

	reminderDescriptions := []string{
		"Send a follow-up email to check on the status of the application.",
		"Write and send a thank you note after the interview.",
		"Log in to the application portal and check for updates.",
		"Review system design concepts and practice LeetCode problems.",
		"Re-read notes on the company's engineering blog and products.",
		"Tailor the resume to better match the job description keywords.",
		"Reach out via LinkedIn to a mutual connection at this company.",
		"Complete the take-home coding assessment before the deadline.",
		"Write down reflections on what went well and what to improve.",
		"Draft a list of questions for the recruiter about compensation.",
	}

	for i := 0; i < 50; i++ {
		app := applications[i%len(applications)]
		title := reminderTitles[i%len(reminderTitles)]
		desc := reminderDescriptions[i%len(reminderDescriptions)]
		dueAt := now.Add(time.Duration(i+1) * 24 * time.Hour)

		key, err := randomHex(16)
		if err != nil {
			log.Printf("generate idempotency key for reminder %d: %v", i, err)
			continue
		}

		_, err = store.CreateReminder(ctx, queries.CreateReminderParams{
			ApplicationID:  app.ID,
			Title:          title,
			Description:    &desc,
			DueAt:          dueAt,
			IdempotencyKey: key,
		})
		if err != nil {
			log.Printf("insert reminder %d: %v", i, err)
			continue
		}
		insertedReminders++
	}
	log.Printf("inserted %d reminders", insertedReminders)

	// -------------------------------------------------------------------------
	// Summary
	// -------------------------------------------------------------------------
	fmt.Println("\n--- seed summary ---")
	fmt.Printf("companies:      %d\n", insertedCompanies)
	fmt.Printf("resume versions:%d\n", insertedResumes)
	fmt.Printf("applications:   %d\n", insertedApplications)
	fmt.Printf("job descriptions:%d\n", insertedJobDescs)
	fmt.Printf("contacts:       %d\n", insertedContacts)
	fmt.Printf("interview rounds:%d\n", insertedInterviews)
	fmt.Printf("reminders:      %d\n", insertedReminders)
	fmt.Println("--- done ---")
}

// randomHex returns a cryptographically random hex string of n bytes.
func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// keywordsForTrack returns a representative set of tech keywords for a role track.
func keywordsForTrack(track string) []string {
	switch track {
	case "backend":
		return []string{"go", "postgresql", "redis", "kubernetes", "docker", "rest-api", "grpc", "microservices"}
	case "ai":
		return []string{"python", "pytorch", "tensorflow", "llm", "mlops", "kubernetes", "huggingface", "transformer"}
	case "quant":
		return []string{"python", "c++", "statistics", "algo-trading", "risk-modeling", "bloomberg", "sql", "monte-carlo"}
	default:
		return []string{"go", "python", "sql", "docker", "cloud", "agile", "rest-api", "typescript"}
	}
}

// sanitizeName converts a full name to a lowercase email-safe slug (first letter of first
// name joined with last name, all lowercase, no spaces).
func sanitizeName(name string) string {
	result := ""
	parts := splitName(name)
	if len(parts) >= 2 {
		result = string([]rune(parts[0])[:1]) + parts[len(parts)-1]
	} else if len(parts) == 1 {
		result = parts[0]
	}
	// lowercase
	out := make([]byte, 0, len(result))
	for _, r := range result {
		if r >= 'A' && r <= 'Z' {
			out = append(out, byte(r+32))
		} else {
			out = append(out, byte(r))
		}
	}
	return string(out)
}

func splitName(name string) []string {
	parts := make([]string, 0)
	current := ""
	for _, r := range name {
		if r == ' ' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(r)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}

// domainFor derives a simple email domain from a company name.
func domainFor(companyName string) string {
	slug := ""
	for _, r := range companyName {
		switch {
		case r >= 'a' && r <= 'z':
			slug += string(r)
		case r >= 'A' && r <= 'Z':
			slug += string([]rune{r + 32})
		case r == ' ':
			// skip
		}
	}
	if len(slug) > 20 {
		slug = slug[:20]
	}
	return slug + ".com"
}

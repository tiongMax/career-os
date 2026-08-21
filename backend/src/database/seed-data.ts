export const companySeeds = [
  ["Acme Systems", "Infrastructure", "San Francisco, CA"],
  ["Vertex AI Labs", "AI/ML", "New York, NY"],
  ["Northpeak Capital", "Quantitative Finance", "New York, NY"],
  ["Cloudbridge Inc", "Infrastructure", "Seattle, WA"],
  ["DataStream Analytics", "Data Engineering", "Austin, TX"],
  ["Solaris Fintech", "Fintech", "Chicago, IL"],
  ["Quantum Leap Technologies", "AI/ML", "Boston, MA"],
  ["Ironclad Security", "Cybersecurity", "Washington, DC"],
  ["NovaTrade Systems", "Quantitative Finance", "Chicago, IL"],
  ["Meridian Health Tech", "HealthTech", "San Francisco, CA"],
  ["Stackfire Engineering", "Infrastructure", "Remote"],
  ["Luminary Data", "Data Engineering", "Seattle, WA"],
  ["Cascade Financial", "Fintech", "Denver, CO"],
  ["Helios Computing", "Cloud Computing", "Austin, TX"],
  ["Polaris ML", "AI/ML", "San Francisco, CA"],
  ["Apex Trading Co", "Quantitative Finance", "New York, NY"],
  ["Horizon Robotics", "Robotics/AI", "Pittsburgh, PA"],
  ["BlueSky Payments", "Fintech", "Miami, FL"],
  ["Cobalt Networks", "Infrastructure", "Portland, OR"],
  ["Zenith Analytics", "Data Engineering", "Boston, MA"],
] as const;

export const resumeSeeds = [
  {
    name: "Backend Engineer v1",
    track: "backend",
    tags: ["go", "postgresql", "redis", "kubernetes", "rest-api"],
    contentText:
      "Backend engineer building distributed services, PostgreSQL systems, Redis workers, Kubernetes deployments, and REST APIs.",
  },
  {
    name: "AI Engineer v1",
    track: "ai",
    tags: ["python", "pytorch", "llm", "mlops", "kubernetes"],
    contentText:
      "AI engineer building LLM and deep-learning systems with PyTorch, Hugging Face, MLOps pipelines, and Kubernetes.",
  },
  {
    name: "Quant Dev v1",
    track: "quant",
    tags: ["python", "c++", "statistics", "algo-trading", "risk-modeling"],
    contentText:
      "Quantitative developer using Python and C++ for algorithmic trading, risk models, backtesting, and low-latency systems.",
  },
  {
    name: "General v1",
    track: "general",
    tags: ["go", "python", "sql", "cloud", "agile"],
    contentText:
      "Versatile software engineer working across backend, frontend, SQL, cloud services, and agile product delivery.",
  },
  {
    name: "Full Stack v1",
    track: "general",
    tags: ["typescript", "react", "go", "postgresql", "docker"],
    contentText:
      "Full-stack engineer shipping React and TypeScript frontends, backend services, PostgreSQL persistence, and Docker deployments.",
  },
] as const;

export const applicationSeeds = [
  ["Software Engineer Intern", "backend", "LinkedIn", "applied", "internship"],
  ["Backend Engineer", "backend", "referral", "applied", "full_time"],
  ["ML Engineer", "ai", "company_site", "recruiter_screen", "full_time"],
  ["Quant Developer", "quant", "recruiter", "technical_screen", "full_time"],
  ["Site Reliability Engineer", "backend", "LinkedIn", "onsite", "full_time"],
  ["Platform Engineer", "backend", "company_site", "offer", "full_time"],
  ["Data Engineer", "general", "LinkedIn", "rejected", "full_time"],
  ["AI Research Intern", "ai", "referral", "withdrawn", "internship"],
  ["Systems Engineer", "backend", "recruiter", "applied", "full_time"],
  [
    "Quantitative Analyst",
    "quant",
    "LinkedIn",
    "recruiter_screen",
    "full_time",
  ],
  ["Machine Learning Engineer", "ai", "LinkedIn", "onsite", "full_time"],
  ["Full Stack Engineer", "general", "referral", "applied", "full_time"],
] as const;

export const jobDescriptionTemplates = {
  backend: [
    "Build scalable TypeScript services and REST APIs backed by PostgreSQL and Redis. Experience with Docker, Kubernetes, observability, and distributed systems is expected.",
    "Own reliable backend platforms, event-driven services, PostgreSQL schemas, caching, CI/CD, and production operations.",
  ],
  ai: [
    "Productionize large language model pipelines using Python, PyTorch, embeddings, evaluation, MLOps, and Kubernetes.",
    "Build AI-powered products, training pipelines, model evaluation, and scalable inference infrastructure.",
  ],
  quant: [
    "Build and backtest quantitative trading strategies using Python, C++, statistics, market data, and low-latency systems.",
    "Develop portfolio risk models, execution algorithms, real-time data pipelines, SQL analytics, and Monte Carlo simulations.",
  ],
  general: [
    "Own product features end to end with TypeScript, React, backend services, PostgreSQL, cloud infrastructure, and Docker.",
    "Work across the full stack in a cross-functional team with strong engineering, collaboration, and delivery practices.",
  ],
} as const;

export const keywordsByTrack = {
  backend: [
    "typescript",
    "postgresql",
    "redis",
    "kubernetes",
    "docker",
    "rest-api",
    "distributed-systems",
  ],
  ai: [
    "python",
    "pytorch",
    "llm",
    "mlops",
    "kubernetes",
    "embeddings",
    "evaluation",
  ],
  quant: [
    "python",
    "c++",
    "statistics",
    "algo-trading",
    "risk-modeling",
    "sql",
    "monte-carlo",
  ],
  general: [
    "typescript",
    "react",
    "sql",
    "docker",
    "cloud",
    "agile",
    "rest-api",
  ],
} as const;

export const contactSeeds = [
  ["Alice Chen", "Engineering Manager", "recruiter"],
  ["Bob Martinez", "Senior Recruiter", "recruiter"],
  ["Carol White", "Staff Engineer", "referral"],
  ["David Kim", "VP Engineering", "hiring_manager"],
  ["Emily Taylor", "Technical Recruiter", "recruiter"],
  ["Frank Johnson", "Director of Engineering", "hiring_manager"],
  ["Grace Liu", "HR Business Partner", "recruiter"],
  ["Henry Brown", "Principal Engineer", "interviewer"],
  ["Isabel Davis", "Talent Acquisition", "recruiter"],
  ["James Wilson", "Engineering Lead", "hiring_manager"],
] as const;

export const reminderSeeds = [
  ["Follow up with recruiter", "Send a follow-up email about the application."],
  [
    "Send thank you email",
    "Write and send a thank-you note after the interview.",
  ],
  ["Check application status", "Check the application portal for updates."],
  [
    "Prepare for technical interview",
    "Review system design and coding topics.",
  ],
  ["Review company research", "Review company products and engineering notes."],
  ["Update resume for role", "Tailor the resume to the job description."],
  ["Reach out to contact", "Contact a connection at the company."],
  ["Submit coding assessment", "Complete the assessment before its deadline."],
  ["Schedule interview debrief", "Record reflections and improvement areas."],
  ["Negotiate offer details", "Prepare compensation and role questions."],
] as const;

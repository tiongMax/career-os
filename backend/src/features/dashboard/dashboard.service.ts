export interface DashboardSummary {
  total: number;
  active: number;
  responded: number;
  interviewed: number;
  offers: number;
  rejected: number;
}

export interface DashboardAttention {
  overdueReminders: number;
  dueTodayReminders: number;
  staleApplications: number;
  missingResumeVersion: number;
  items: DashboardAttentionItem[];
}

export type DashboardAttentionType =
  | "overdue_reminder"
  | "due_reminder"
  | "deadline"
  | "interview"
  | "follow_up"
  | "stale"
  | "missing_resume";

export interface DashboardAttentionItem {
  id: string;
  applicationId: string;
  applicationTitle: string;
  companyName: string;
  type: DashboardAttentionType;
  title: string | null;
  actionAt: string;
}

export interface DashboardRecentApplication {
  id: string;
  title: string;
  status: string;
  companyName: string;
  updatedAt: string;
}

export interface DashboardUpcomingInterview {
  id: string;
  applicationTitle: string;
  companyName: string;
  scheduledAt: string;
}

export interface DashboardUpcomingReminder {
  id: string;
  title: string;
  applicationTitle: string;
  dueAt: string;
}

export interface DashboardUpcomingDeadline {
  id: string;
  title: string;
  companyName: string;
  deadlineAt: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  summary: DashboardSummary;
  attention: DashboardAttention;
  pipeline: Record<string, number>;
  reachedPipeline: Record<string, number>;
  recentApplications: DashboardRecentApplication[];
  upcoming: {
    interviews: DashboardUpcomingInterview[];
    reminders: DashboardUpcomingReminder[];
    deadlines: DashboardUpcomingDeadline[];
  };
}

export interface DashboardRepository {
  load: (now: Date) => Promise<DashboardSnapshot>;
}

export interface DashboardCache {
  get: () => Promise<DashboardSnapshot | null>;
  set: (snapshot: DashboardSnapshot) => Promise<void>;
  invalidate: () => Promise<void>;
}

export type DashboardCacheStatus = "HIT" | "MISS";

export interface DashboardResult {
  snapshot: DashboardSnapshot;
  cacheStatus: DashboardCacheStatus;
}

export interface DashboardService {
  get: () => Promise<DashboardResult>;
}

export function createDashboardService(
  repository: DashboardRepository,
  cache?: DashboardCache,
  now: () => Date = () => new Date(),
): DashboardService {
  let inFlight: Promise<DashboardSnapshot> | undefined;

  async function load(): Promise<DashboardSnapshot> {
    if (inFlight !== undefined) return inFlight;
    inFlight = repository.load(now());
    try {
      const snapshot = await inFlight;
      await cache?.set(snapshot);
      return snapshot;
    } finally {
      inFlight = undefined;
    }
  }

  return {
    async get() {
      const cached = await cache?.get();
      if (cached !== undefined && cached !== null) {
        return { snapshot: cached, cacheStatus: "HIT" };
      }
      return { snapshot: await load(), cacheStatus: "MISS" };
    },
  };
}

export interface AnalyticsSummary {
  total: number;
  active: number;
  responded: number;
  offers: number;
  responseRate: number;
  offerRate: number;
  pendingReminders: number;
}
export interface StatusCount {
  status: string;
  count: number;
}
export interface TrackCount {
  track: string;
  count: number;
}
export interface ResumePerformance {
  id: string;
  name: string;
  track: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  responseRate: number;
  offerRate: number;
}
export interface SourcePerformance {
  source: string;
  applications: number;
  responses: number;
  offers: number;
  responseRate: number;
}
export interface FunnelStep {
  stage: string;
  count: number;
}
export interface UpcomingInterview {
  id: string;
  roundType: string;
  scheduledAt: Date | null;
  applicationTitle: string;
  companyName: string;
}
export interface UpcomingReminder {
  id: string;
  title: string;
  dueAt: Date;
  applicationTitle: string;
}
export interface AnalyticsRepository {
  summary: () => Promise<AnalyticsSummary>;
  byStatus: () => Promise<StatusCount[]>;
  byTrack: () => Promise<TrackCount[]>;
  byResume: () => Promise<ResumePerformance[]>;
  sources: () => Promise<SourcePerformance[]>;
  funnel: () => Promise<FunnelStep[]>;
  upcomingInterviews: () => Promise<UpcomingInterview[]>;
  upcomingReminders: () => Promise<UpcomingReminder[]>;
}
export interface AnalyticsService extends Omit<
  AnalyticsRepository,
  "upcomingInterviews" | "upcomingReminders"
> {
  upcoming: () => Promise<{
    interviews: UpcomingInterview[];
    reminders: UpcomingReminder[];
  }>;
}
export function createAnalyticsService(
  repository: AnalyticsRepository,
): AnalyticsService {
  return {
    summary: repository.summary,
    byStatus: repository.byStatus,
    byTrack: repository.byTrack,
    byResume: repository.byResume,
    sources: repository.sources,
    funnel: repository.funnel,
    async upcoming() {
      const [interviews, reminders] = await Promise.all([
        repository.upcomingInterviews(),
        repository.upcomingReminders(),
      ]);
      return { interviews, reminders };
    },
  };
}

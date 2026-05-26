export type ReviewStatus =
  | 'ELIGIBLE'
  | 'APPRAISED'
  | 'ACKNOWLEDGED'
  | 'DISPUTED'
  | 'RECOMMENDATION_GIVEN'
  | 'FEEDBACK_PENDING'
  | 'CLOSED';

export type EmployeeResponse = 'ACCEPTED' | 'REJECTED';

export type Recommendation =
  | 'PROMOTION'
  | 'SALARY_INCREMENT'
  | 'TRAINING_AND_DEVELOPMENT'
  | 'PERFORMANCE_IMPROVEMENT_PLAN'
  | 'COMMENDATION';

export type Competency =
  | 'COMMUNICATION' | 'TEAMWORK' | 'PRODUCTIVITY' | 'PROBLEM_SOLVING'
  | 'LEADERSHIP' | 'ATTITUDE' | 'INNOVATION' | 'TIME_MANAGEMENT';

export type TrainingStatus = 'RECOMMENDED' | 'SCHEDULED' | 'ATTENDED' | 'MISSED';
export type QuestionType = 'RATING' | 'TEXT' | 'BOTH';

export interface TrainingType {
  id: number;
  name: string;
  description?: string;
}

export interface TrainingRecord {
  id: number;
  employee: { id: number; fullName: string; department: string };
  trainingType: TrainingType;
  review?: { id: number; reviewPeriod: string };
  status: TrainingStatus;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
}

export interface OffenceCategory {
  id: number;
  name: string;
  deductionMark: number;
  description?: string;
}

export interface DisciplinaryAction {
  id: number;
  employee: { id: number; fullName: string; department: string };
  offenceCategory: OffenceCategory;
  reviewPeriod: string;
  description?: string;
  loggedBy: { fullName: string };
  loggedAt: string;
}

export interface FeedbackQuestion {
  id: number;
  questionText: string;
  type: QuestionType;
  sortOrder: number;
}

export interface FeedbackResponse {
  id: number;
  question: FeedbackQuestion;
  rating?: number;
  textAnswer?: string;
}

export interface PerformanceReview {
  id: number;
  employee: { id: number; fullName: string; email: string; department: string; position: string };
  manager: { id: number; fullName: string; email: string };
  reviewPeriod: string;
  status: ReviewStatus;
  appraisalSummary?: string;
  managerScore?: number;
  disciplinaryDeductions?: number;
  finalScore?: number;
  appraisedAt?: string;
  employeeResponse?: EmployeeResponse;
  employeeComment?: string;
  respondedAt?: string;
  recommendation?: Recommendation;
  trainingType?: TrainingType;
  recommendationNote?: string;
  recommendedAt?: string;
  feedbackSubmitted: boolean;
  feedbackSubmittedAt?: string;
  createdAt: string;
}

export interface CompetencyScore {
  id: number;
  competency: Competency;
  score: number;
  comment?: string;
}

// -------------------------------------------------------
// Display helpers
// -------------------------------------------------------

export const COMPETENCY_LABELS: Record<Competency, string> = {
  COMMUNICATION:   'Communication',
  TEAMWORK:        'Teamwork & Collaboration',
  PRODUCTIVITY:    'Productivity & Output',
  PROBLEM_SOLVING: 'Problem Solving',
  LEADERSHIP:      'Leadership',
  ATTITUDE:        'Attitude & Professionalism',
  INNOVATION:      'Innovation & Initiative',
  TIME_MANAGEMENT: 'Time Management',
};

export const RECOMMENDATION_META: Record<Recommendation, { label: string; icon: string; color: string; bg: string }> = {
  PROMOTION:                    { label: 'Promotion',                    icon: '🚀', color: '#7c3aed', bg: '#ede9fe' },
  SALARY_INCREMENT:             { label: 'Salary Increment',             icon: '💵', color: '#059669', bg: '#d1fae5' },
  TRAINING_AND_DEVELOPMENT:     { label: 'Training & Development',       icon: '📚', color: '#1d4ed8', bg: '#dbeafe' },
  PERFORMANCE_IMPROVEMENT_PLAN: { label: 'Performance Improvement Plan', icon: '📋', color: '#d97706', bg: '#fef3c7' },
  COMMENDATION:                 { label: 'Commendation',                 icon: '🏆', color: '#0891b2', bg: '#e0f2fe' },
};

export const STATUS_META: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  ELIGIBLE:             { label: 'Pending Appraisal',         color: '#64748b', bg: '#f1f5f9' },
  APPRAISED:            { label: 'Awaiting Your Response',    color: '#d97706', bg: '#fef3c7' },
  ACKNOWLEDGED:         { label: 'Acknowledged',              color: '#16a34a', bg: '#dcfce7' },
  DISPUTED:             { label: 'Disputed',                  color: '#dc2626', bg: '#fee2e2' },
  RECOMMENDATION_GIVEN: { label: 'Recommendation Given',      color: '#7c3aed', bg: '#ede9fe' },
  FEEDBACK_PENDING:     { label: 'Feedback Required',         color: '#ea580c', bg: '#ffedd5' },
  CLOSED:               { label: 'Closed',                    color: '#94a3b8', bg: '#f8fafc' },
};

export const TRAINING_STATUS_META: Record<TrainingStatus, { label: string; color: string; bg: string }> = {
  RECOMMENDED: { label: 'Recommended', color: '#d97706', bg: '#fef3c7' },
  SCHEDULED:   { label: 'Scheduled',   color: '#1d4ed8', bg: '#dbeafe' },
  ATTENDED:    { label: 'Attended',    color: '#16a34a', bg: '#dcfce7' },
  MISSED:      { label: 'Missed',      color: '#dc2626', bg: '#fee2e2' },
};

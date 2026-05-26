import api from './client';
import { PerformanceReview, CompetencyScore, Recommendation, EmployeeResponse, Competency, TrainingType, TrainingRecord, OffenceCategory, DisciplinaryAction, FeedbackQuestion, FeedbackResponse } from '../types/performance';

// Admin — reviews
export const markEligible = (data: { employeeId: number; managerId: number; reviewPeriod: string }) =>
  api.post<PerformanceReview>('/performance/admin/mark-eligible', data);
export const getAllReviews = () => api.get<PerformanceReview[]>('/performance/admin/all');
export const closeReview = (id: number) => api.post<PerformanceReview>(`/performance/admin/${id}/close`);
export const getPerfStats = () => api.get('/performance/admin/stats');
export const getPerfEmployees = () => api.get<any[]>('/performance/admin/employees');
export const getSuggestedPeriods = () => api.get<string[]>('/performance/admin/periods');

// Admin — offence categories
export const getOffenceCategories = () => api.get<OffenceCategory[]>('/performance/admin/offence-categories');
export const createOffenceCategory = (data: { name: string; deductionMark: number; description?: string }) =>
  api.post<OffenceCategory>('/performance/admin/offence-categories', data);
export const updateOffenceCategory = (id: number, data: { name: string; deductionMark: number; description?: string }) =>
  api.put<OffenceCategory>(`/performance/admin/offence-categories/${id}`, data);

// Admin — disciplinary actions
export const logDisciplinaryAction = (data: { employeeId: number; offenceCategoryId: number; reviewPeriod: string; description?: string }) =>
  api.post<DisciplinaryAction>('/performance/admin/disciplinary', data);
export const getStaffDisciplinaryHistory = (employeeId: number) =>
  api.get<DisciplinaryAction[]>(`/performance/admin/disciplinary/${employeeId}`);

// Admin — training types
export const getTrainingTypes = () => api.get<TrainingType[]>('/performance/training-types');
export const createTrainingType = (data: { name: string; description?: string }) =>
  api.post<TrainingType>('/performance/admin/training-types', data);

// Admin — training records
export const getAllTrainingRecords = () => api.get<TrainingRecord[]>('/performance/admin/training-records');
export const scheduleTraining = (data: { trainingRecordId: number; scheduledDate: string; notes?: string }) =>
  api.post<TrainingRecord>('/performance/admin/training-records/schedule', data);
export const updateTrainingStatus = (data: { trainingRecordId: number; status: string; completedDate?: string; notes?: string }) =>
  api.post<TrainingRecord>('/performance/admin/training-records/update-status', data);

// Admin — feedback questions
export const getFeedbackQuestions = () => api.get<FeedbackQuestion[]>('/performance/admin/feedback-questions');
export const createFeedbackQuestion = (data: { questionText: string; type: string; sortOrder?: number }) =>
  api.post<FeedbackQuestion>('/performance/admin/feedback-questions', data);
export const getReviewFeedback = (reviewId: number) =>
  api.get<FeedbackResponse[]>(`/performance/admin/feedback/${reviewId}`);

// Manager
export const getManagerReviews = () => api.get<PerformanceReview[]>('/performance/manager/my-reviews');
export const getManagerPendingAppraisals = () => api.get<PerformanceReview[]>('/performance/manager/pending-appraisals');
export const getManagerPendingRecommendations = () => api.get<PerformanceReview[]>('/performance/manager/pending-recommendations');
export const submitAppraisal = (id: number, data: { scores: { competency: Competency; score: number; comment?: string }[]; appraisalSummary: string }) =>
  api.post<PerformanceReview>(`/performance/manager/${id}/appraise`, data);
export const giveRecommendation = (id: number, data: { recommendation: Recommendation; trainingTypeId?: number; note: string }) =>
  api.post<PerformanceReview>(`/performance/manager/${id}/recommend`, data);

// Employee
export const getMyReviews = () => api.get<PerformanceReview[]>('/performance/my-reviews');
export const respondToAppraisal = (id: number, data: { response: EmployeeResponse; comment?: string }) =>
  api.post<PerformanceReview>(`/performance/${id}/respond`, data);
export const submitFeedback = (id: number, data: { answers: { questionId: number; rating?: number; textAnswer?: string }[] }) =>
  api.post<PerformanceReview>(`/performance/${id}/feedback`, data);
export const getMyTraining = () => api.get<TrainingRecord[]>('/performance/my-training');
export const getMyDisciplinary = () => api.get<DisciplinaryAction[]>('/performance/my-disciplinary');
export const getReviewById = (id: number) => api.get<PerformanceReview>(`/performance/${id}`);
export const getReviewScores = (id: number) => api.get<CompetencyScore[]>(`/performance/${id}/scores`);

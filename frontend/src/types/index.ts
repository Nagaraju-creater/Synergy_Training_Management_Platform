// ── API Response Envelope ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  error: string | null;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  status_counts?: {
    scheduled: number;
    ongoing: number;
    completed: number;
    all: number;
  };
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
  error: string | null;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "trainer" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  employee?: Partial<Employee>;
  last_login?: string;
  onboarding_completed?: boolean;
  never_show_welcome_back?: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Domain types ───────────────────────────────────────────────────────────────

export interface User extends AuthUser {
  created_at: string;
  updated_at: string;
}

export type EmploymentStatus = "active" | "on_leave" | "terminated";

export interface EmployeeManagerNested {
  id: string;
  first_name: string;
  last_name: string;
}

export interface EmployeeDepartmentNested {
  id: string;
  name: string;
  code: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  designation?: string | null;
  email: string;
  phone?: string | null;
  location?: string | null;
  legal_entity?: string | null;
  profile_image_url?: string | null;
  date_of_joining?: string | null;
  status: EmploymentStatus;
  department_id?: string | null;
  sub_department?: string | null;
  department?: EmployeeDepartmentNested;
  manager_id?: string | null;
  manager?: EmployeeManagerNested;
  user_id?: string | null;
  leaderboard_points?: any[];
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  head_id?: string | null;
  parent_id?: string | null;
  employee_count?: number;
  total_training_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentAnalyticsData {
  month: string;
  training_hours: number;
  employee_count: number;
}

export type TrainingType = "internal" | "external" | "online" | "workshop" | "certification";
export type TrainingStatus = "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";

export interface TrainingCategory {
  id: string;
  name: string;
  description?: string;
}

export interface TrainingDocument {
  id: string;
  title: string;
  file_path: string;
  training_id: string;
  created_at: string;
}

export interface Training {
  id: string;
  title: string;
  description?: string;
  training_type: TrainingType;
  delivery_mode: "online" | "in_person" | "hybrid";
  status: TrainingStatus;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  duration_hours: number;
  max_hours_allowed: number;
  max_participants?: number;
  available_seats?: number;
  enrollment_deadline?: string;
  venue?: string;
  meeting_link?: string;
  trainer_name?: string;
  is_mandatory: boolean;
  is_archived: boolean;
  is_global: boolean;
  departments?: Department[];
  eligible_departments?: string[];
  category_id?: string;
  category?: TrainingCategory;
  documents?: TrainingDocument[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  server_time?: string;
  learning_module_id?: string | null;
}

export type EnrollmentStatus = "pending" | "enrolled" | "rejected" | "completed" | "withdrawn";

export interface Enrollment {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee?: Employee;
  training_id: string;
  training_title?: string;
  training_start_date?: string;
  status: EnrollmentStatus;
  progress: number;
  completion_score?: number;
  feedback?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export type NominationStatus = "pending_manager_approval" | "pending_admin_approval" | "rejected_by_manager" | "rejected_by_admin" | "approved";

export interface Nomination {
  id: string;
  employee_id: string;
  training_id: string;
  nominated_by: string;
  status: NominationStatus;
  reason?: string;
  reviewer_notes?: string;
  reviewed_by?: string;
  training_title?: string;
  employee_name?: string;
  nominator_name?: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export interface Attendance {
  id: string;
  enrollment_id: string;
  session_date: string;
  status: AttendanceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type EffectivenessLevel = "reaction" | "learning" | "behavior" | "results";
export type EffectivenessStatus = "pending" | "submitted" | "reviewed" | "overdue";

export interface Effectiveness {
  id: string;
  enrollment_id: string;
  training_id: string;
  level: EffectivenessLevel;
  status: EffectivenessStatus;
  
  learnings_summary?: string;
  work_application?: string;
  suggestions?: string;
  
  score?: number;
  rating?: number;
  comments?: string;
  
  manager_comments?: string;
  manager_score?: number;
  digital_signature_url?: string;
  
  submission_deadline?: string;
  completion_datetime?: string;
  is_24h_reminder_sent?: boolean;
  is_6h_reminder_sent?: boolean;
  
  reviewed_at?: string;
  reviewed_by?: string;
  evaluated_by?: string;
  
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_employees: number;
  total_trainings: number;
  total_enrollments: number;
  avg_completion_rate: number;
  trainings_this_month: number;
}

export interface MonthlyEngagement {
  month: string;
  trainings: number;
  enrollments: number;
}

export interface DepartmentPerformance {
  dept: string;
  rate: number;
  hours?: number;
}

export interface AnalyticsCharts {
  monthly_engagement: MonthlyEngagement[];
  department_performance: DepartmentPerformance[];
}

export interface SkillProgress {
  skill: string;
  level: number;
  progress: number;
}

export interface AnnualLearningGoal {
  goal_hours: number;
  completed_hours: number;
  remaining_hours: number;
  progress_percentage: number;
  progress_state: "Getting Started" | "On Track" | "Strong Progress" | "Almost Achieved" | "Goal Achieved";
  financial_year_label: string;
  financial_year_start: string;
  financial_year_end: string;
  last_completed_course?: string;
  recent_contribution?: {
    training_title: string;
    hours: number;
    completed_on?: string;
  };
}

export interface EmployeeDashboardData {
  active_courses_count: number;
  completed_courses_count: number;
  missed_courses_count: number;
  overall_progress: number;
  upcoming_deadlines: Array<{title: string, due_date: string}>;
  weekly_calendar: Array<{day: string, event: string}>;
  skills: SkillProgress[];
  points: number;
  streak_days: number;
  badges_count: number;
  recommendations: Array<{id: string, title: string, type: string}>;
  pending_effectiveness: number;
  annual_learning_goal: AnnualLearningGoal;
}

export interface TeamMemberProgress {
  id: string;
  name: string;
  department: string;
  completion_rate: number;
  status: 'active' | 'overdue' | 'at-risk';
  hours_completed: number;
}

export interface ManagerDashboardData {
  team_progress: TeamMemberProgress[];
  avg_completion_rate: number;
  overdue_count: number;
  at_risk_count: number;
  total_team_hours: number;
  pending_reviews_count: number;
  activity_feed: Array<{user: string, action: string, time: string}>;
  completion_stats: {completed: number, ongoing: number, dropped: number};
}

export interface AdminDashboardData {
  summary: AnalyticsSummary;
  compliance_percentage: number;
  skills_gap: Array<{skill: string, gap: number}>;
  department_hours: Array<{dept: string, hours: number}>;
  monthly_trends: MonthlyEngagement[];
  roi_metrics: {cost: number, savings: number, ratio: number};
  top_trainings: Array<{title: string, completions: number}>;
  top_departments: Array<{name: string, performance: number}>;
  pending_nominations: number;
  pending_reviews: number;
  learning_goal: {
    goal_hours: number;
    financial_year_label: string;
    organization_learning_hours: number;
    yearly_completion_percentage: number;
    achieved_employees: number;
    employees_below_target: number;
    department_goal_achievement: Array<{
      dept: string;
      hours: number;
      employees: number;
      achieved_employees: number;
      completion_percentage: number;
    }>;
    top_learners: Array<{
      employee_id: string;
      name: string;
      department: string;
      hours: number;
      progress_percentage: number;
    }>;
  };
}

export interface ManagerSummary {
  team_count: number;
  active_trainings: number;
  pending_nominations: number;
  overdue_employees: number;
  team_learning_hours_fy: number;
  learning_goal_completion_percentage: number;
  employees_below_learning_target: number;
  financial_year_label: string;
  avg_completion_rate?: number;
}

export interface ParticipationChart {
  training_name: string;
  participation_count: number;
}

export interface ManagerCharts {
  completion_rate: {
    completed: number;
    pending: number;
  };
  participation: ParticipationChart[];
}

export interface TeamMemberRow {
  id: string;
  name: string;
  department: string;
  trainings_assigned: number;
  completion_percentage: number;
  status: 'On track' | 'At risk';
  learning_hours_fy: number;
  learning_goal_progress: number;
  below_learning_target: boolean;
}

export interface TeamDataResponse {
  members: TeamMemberRow[];
  total_count: number;
}

export interface PendingReviewRow {
  id: string;
  employee_name: string;
  training_name: string;
  submission_date: string;
}

export interface ManagerDashboardActivity {
  type: 'nomination' | 'completion' | 'submission';
  user: string;
  detail: string;
  time: string;
}

export interface UnifiedManagerDashboard {
  summary: ManagerSummary;
  charts: ManagerCharts;
  team: TeamDataResponse;
  activity: ManagerDashboardActivity[];
  pending_reviews: PendingReviewRow[];
  leaderboard: TeamMemberRow[];
}

export interface TrainingPlan {
  id: string;
  training_title: string;
  category_id: string;
  planned_date: string;
  department_id?: string | null;
  description?: string | null;
  financial_year: string;
  status: "Planned" | "Converted" | "Completed";
  converted_training_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  category?: TrainingCategory;
  department?: Department;
}

export interface DepartmentWiseCount {
  department_name: string;
  count: number;
}

export interface TrainingPlanStats {
  total_planned: number;
  converted: number;
  completed: number;
  pending: number;
  department_wise_counts: DepartmentWiseCount[];
}



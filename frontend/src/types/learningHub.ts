import type { EmployeeDepartmentNested } from "./index";

export interface LearningCategory {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
}

export interface LearningMaterial {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  external_url?: string | null;
  tags?: string | null;
  views: number;
  is_approved: boolean;
  created_by?: string | null;
  creator?: UserSummary | null;
  created_at: string;
  updated_at: string;
  is_bookmarked?: boolean;
}

export interface LearningModule {
  id: string;
  title: string;
  description?: string | null;
  category_id?: string | null;
  category?: LearningCategory | null;
  department_id?: string | null;
  department?: EmployeeDepartmentNested | null;
  training_id?: string | null;
  training?: { id: string; title: string } | null;
  created_by?: string | null;
  creator?: UserSummary | null;
  created_at: string;
  updated_at: string;
  materials?: LearningMaterial[];

  // Computed properties
  material_count?: number;
  contributor_count?: number;
  last_updated_date?: string | null;
  is_bookmarked?: boolean;
}

export interface MostViewedMaterial {
  id: string;
  title: string;
  module_id: string;
  module_title: string;
  views: number;
}

export interface MostActiveContributor {
  user_id: string;
  full_name: string;
  email: string;
  material_count: number;
}

export interface RecentUpload {
  id: string;
  title: string;
  module_id: string;
  module_title: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface LearningHubAnalytics {
  total_modules: number;
  total_materials: number;
  most_viewed: MostViewedMaterial[];
  most_active_contributors: MostActiveContributor[];
  recent_uploads: RecentUpload[];
}

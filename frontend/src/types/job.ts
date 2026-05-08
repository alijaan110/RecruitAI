export type JobStatus = 'draft' | 'published' | 'closed' | 'archived';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';

export interface Job {
  id: string; title: string; department?: string; location?: string;
  employment_type: EmploymentType; description: string;
  requirements: string[]; nice_to_have: string[]; keywords: string[];
  salary_min?: number; salary_max?: number; salary_currency: string;
  status: JobStatus; public_slug: string;
  total_applications: number; avg_score?: number;
  published_at?: string; closes_at?: string; created_at: string; updated_at: string;
}

export interface JobCreate {
  title: string; department?: string; location?: string;
  employment_type: EmploymentType; description: string;
  requirements: string[]; nice_to_have: string[]; keywords?: string[];
  salary_min?: number; salary_max?: number; salary_currency: string;
  closes_at?: string;
}

export type JobUpdate = Partial<JobCreate>;

export interface JobStats {
  total: number; received: number; screening: number;
  interview: number; offer: number; hired: number; rejected: number;
  avg_score: number;
}

export interface PublicJob extends Omit<Job, 'total_applications' | 'avg_score' | 'status'> {}

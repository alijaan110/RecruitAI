import { Application } from './application';

export type CandidateSource = 'direct' | 'linkedin' | 'indeed' | 'rozee' | 'referral';

export interface ParsedCV {
  skills: string[];
  education: Array<{ degree: string; institution: string; year?: number; grade?: string }>;
  experience: Array<{ title: string; company: string; duration_months: number; description?: string }>;
  total_experience_months: number;
  summary?: string;
  languages?: string[];
}

export interface Candidate {
  id: string; tenant_id: string; full_name: string; email: string;
  phone?: string; linkedin_url?: string; portfolio_url?: string; location?: string;
  source: CandidateSource; cv_file_name?: string;
  parsed_data: ParsedCV; created_at: string;
  total_applications?: number; highest_score?: number;
}

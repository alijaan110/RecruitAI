import { Candidate } from './candidate';
import { Job } from './job';

export type AppStage = 'received' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface ScoreBreakdown {
  keyword_score: number; skills_match: number; experience_score: number;
  overall_score: number; matched_keywords: string[]; missing_keywords: string[];
}

export interface Application {
  id: string; job_id: string; candidate_id: string; tenant_id: string;
  stage: AppStage; keyword_score?: number; overall_score?: number;
  score_breakdown?: ScoreBreakdown;
  is_starred: boolean; is_disqualified: boolean; disqualify_reason?: string;
  cover_letter?: string; applied_at: string; last_stage_at: string;
  candidate: Candidate; job: Pick<Job, 'id' | 'title' | 'public_slug'>;
}

export interface StageHistoryEntry {
  id: string; from_stage?: AppStage; to_stage: AppStage;
  changed_by_name?: string; note?: string; created_at: string;
}

export interface CandidateNote {
  id: string; application_id: string; author_name: string;
  note_type: 'general' | 'interview' | 'rejection' | 'offer';
  content: string; is_private: boolean; created_at: string;
}

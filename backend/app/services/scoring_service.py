import math
import structlog
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = structlog.get_logger()

class ScoringService:
    @staticmethod
    def compute_keyword_score(jd_text: str, cv_text: str) -> float:
        if not jd_text or not cv_text:
            return 0.0
        try:
            vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1,2), stop_words='english')
            tfidf = vectorizer.fit_transform([jd_text, cv_text])
            score = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0] * 100
            return round(min(score, 100.0), 2)
        except Exception as e:
            logger.error("compute_keyword_score failed", error=str(e))
            return 0.0

    @staticmethod
    def compute_skills_match(job_keywords: list[str], cv_text: str, parsed_skills: list[str]) -> tuple[float, list[str], list[str]]:
        combined = (cv_text + " " + " ".join(parsed_skills)).lower()
        matched = []
        missing = []
        for k in job_keywords:
            if k.lower() in combined:
                matched.append(k)
            else:
                missing.append(k)
                
        score = (len(matched) / len(job_keywords) * 100) if job_keywords else 0.0
        return round(score, 2), matched, missing

    @staticmethod
    def compute_experience_score(total_months: int) -> float:
        breakpoints = {0: 0, 6: 30, 12: 50, 24: 70, 36: 85, 48: 92, 60: 100}
        
        if total_months >= 60:
            return 100.0
            
        keys = sorted(breakpoints.keys())
        for i in range(len(keys) - 1):
            lower_bound, upper_bound = keys[i], keys[i+1]
            if lower_bound <= total_months <= upper_bound:
                # Linear interpolation
                lower_score, upper_score = breakpoints[lower_bound], breakpoints[upper_bound]
                fraction = (total_months - lower_bound) / (upper_bound - lower_bound)
                score = lower_score + (upper_score - lower_score) * fraction
                return round(score, 2)
                
        return 0.0

    @classmethod
    def compute_score(cls, cv_text: str, parsed_data: dict, job_keywords: list[str],
                      job_requirements: list[str], job_description: str) -> dict:
        try:
            jd_text = " ".join(job_keywords + job_requirements) + " " + job_description
            keyword_score = cls.compute_keyword_score(jd_text, cv_text)
            skills_score, matched, missing = cls.compute_skills_match(
                job_keywords, cv_text, parsed_data.get("skills", [])
            )
            exp_score = cls.compute_experience_score(parsed_data.get("total_experience_months", 0))
            
            overall = round(keyword_score * 0.5 + skills_score * 0.35 + exp_score * 0.15, 2)
            
            return {
                "keyword_score": keyword_score,
                "skills_match": skills_score,
                "experience_score": exp_score,
                "overall_score": min(overall, 100.0),
                "matched_keywords": matched,
                "missing_keywords": missing,
            }
        except Exception as e:
            logger.error("compute_score failed", error=str(e))
            return {
                "keyword_score": 0.0,
                "skills_match": 0.0,
                "experience_score": 0.0,
                "overall_score": 0.0,
                "matched_keywords": [],
                "missing_keywords": [],
            }

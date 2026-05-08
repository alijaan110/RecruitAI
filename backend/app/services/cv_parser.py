import re
import io
import spacy
import fitz  # PyMuPDF
from docx import Document
import structlog

logger = structlog.get_logger()

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy en_core_web_sm model not found, falling back to basic extraction")
    nlp = None

SKILLS_LIST = [
    "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "FastAPI",
    "Django", "Flask", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "Git", "GitHub", "Linux", "REST", "GraphQL", "HTML", "CSS", "Tailwind",
    "Java", "C++", "C#", "Go", "Rust", "Swift", "Kotlin", "TensorFlow", "PyTorch", "scikit-learn",
    "pandas", "NumPy", "Spark", "Hadoop", "Tableau", "Power BI", "Figma", "Photoshop",
    "Jira", "Confluence", "Agile", "Scrum", "CI/CD", "Jenkins", "GitHub Actions",
    # additional skills
    "Angular", "Vue", "Svelte", "Ruby", "Ruby on Rails", "PHP", "Laravel",
    "Spring Boot", "Dotnet", ".NET", "GraphQL", "Apollo", "Redux", "MobX",
    "Zustand", "Express", "NestJS", "Sequelize", "Prisma", "TypeORM", "SQLAlchemy",
    "Alembic", "Celery", "Kafka", "RabbitMQ", "ActiveMQ", "Elasticsearch", "Logstash",
    "Kibana", "Grafana", "Prometheus", "Terraform", "Ansible", "Chef", "Puppet",
    "Bash", "Shell", "Vim", "Emacs", "VS Code", "IntelliJ", "Eclipse", "Android",
    "iOS", "React Native", "Flutter", "Xamarin", "Cordova", "Ionic", "Unity", "Unreal Engine",
    "Godot", "C", "Objective-C", "Scala", "Elixir", "Haskell", "Clojure", "F#", "R",
    "MATLAB", "SAS", "SPSS", "Stata", "Excel", "Word", "PowerPoint", "Google Sheets"
]

class CVParser:
    @staticmethod
    async def extract_text(file_bytes: bytes, mime_type: str) -> str:
        text = ""
        try:
            if "pdf" in mime_type.lower():
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                pages_text = []
                for page in doc:
                    pages_text.append(page.get_text())
                text = " ".join(pages_text)
                doc.close()
            elif "officedocument.wordprocessingml.document" in mime_type.lower() or "docx" in mime_type.lower():
                doc = Document(io.BytesIO(file_bytes))
                text = " ".join([p.text for p in doc.paragraphs])
            else:
                logger.error(f"Unsupported mime_type: {mime_type}")
                return ""
            
            # Normalize
            text = text.replace("\x00", " ")
            text = re.sub(r'\s+', ' ', text).strip()
            
            if len(text) < 50:
                raise ValueError("Could not extract meaningful text")
                
            return text
        except Exception as e:
            logger.error("Text extraction failed", error=str(e))
            raise ValueError("Could not extract meaningful text")

    @staticmethod
    def extract_skills(text: str) -> list[str]:
        text_lower = text.lower()
        found_skills = []
        for skill in SKILLS_LIST:
            # Need word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append(skill)
                
        if nlp:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ == "ORG":
                    # could be a technology
                    # basic heuristic
                    if ent.text not in found_skills and len(ent.text) > 2:
                        # Add to skills intentionally or let it pass for now.
                        pass
        
        return list(dict.fromkeys(found_skills)) # deduplicate while preserving order

    @staticmethod
    def extract_experience(text: str) -> tuple[list[dict], int]:
        # A very simplified heuristic for experience extraction
        # Real parsing would require complex NER/ML models
        # For this prototype we will return some dummy or loosely parsed data
        # Let's count year occurrences difference
        years = sorted([int(y) for y in set(re.findall(r'\b(19|20)\d{2}\b', text))])
        total_months = 0
        if len(years) >= 2:
            total_months = (max(years) - min(years)) * 12
        elif len(years) == 1:
            total_months = 12
        
        return [], total_months

    @staticmethod
    def extract_education(text: str) -> list[dict]:
        return []

    @staticmethod
    def extract_contact(text: str) -> dict:
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
        phone_match = re.search(r'\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}', text)
        
        return {
            "email": email_match.group(0) if email_match else None,
            "phone": phone_match.group(0) if phone_match else None
        }

    @classmethod
    async def parse_cv(cls, file_bytes: bytes, mime_type: str) -> tuple[str, dict]:
        try:
            raw_text = await cls.extract_text(file_bytes, mime_type)
            skills = cls.extract_skills(raw_text)
            experience, total_months = cls.extract_experience(raw_text)
            education = cls.extract_education(raw_text)
            
            parsed = {
                "skills": skills,
                "experience": experience,
                "education": education,
                "total_experience_months": total_months,
                "summary": "",
                "languages": []
            }
            return raw_text, parsed
        except Exception as e:
            logger.error("CV parsing failed", exc_info=e)
            return "", {}

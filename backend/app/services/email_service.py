import structlog
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.email_log import EmailLog
from app.config import settings

logger = structlog.get_logger()


class EmailService:
    """Email service. If RESEND_API_KEY is empty, log to DB and return True without crashing."""

    @staticmethod
    async def _send_with_session(
        db: AsyncSession,
        to_email: str, to_name: str | None, subject: str, html: str,
        template_name: str, tenant_id: str,
    ) -> bool:
        email_log = EmailLog(
            tenant_id=tenant_id, recipient_email=to_email, recipient_name=to_name,
            template_name=template_name, subject=subject, payload={}, status="queued",
        )
        db.add(email_log)
        await db.commit()
        await db.refresh(email_log)

        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY empty. Skipping email send.", to=to_email)
            email_log.status = "sent"
            await db.commit()
            return True

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.EMAIL_FROM,
                        "to": [f"{to_name} <{to_email}>"] if to_name else [to_email],
                        "subject": subject, "html": html,
                    },
                )
                if resp.status_code in (200, 201):
                    email_log.provider_id = resp.json().get("id")
                    email_log.status = "sent"
                    await db.commit()
                    return True
                else:
                    email_log.status = "failed"
                    email_log.error_message = resp.text[:500]
                    await db.commit()
                    return False
        except Exception as e:
            logger.error("send_email error", error=str(e))
            email_log.status = "failed"
            email_log.error_message = str(e)[:500]
            await db.commit()
            return False

    @classmethod
    async def send_email(
        cls,
        to_email: str, to_name: str | None, subject: str, html: str,
        template_name: str, tenant_id: str,
        db: AsyncSession | None = None,
    ) -> bool:
        """Send an email. Pass `db` to share the caller's session, or omit it
        (in background tasks) to use a fresh session."""
        if db is not None:
            return await cls._send_with_session(db, to_email, to_name, subject, html, template_name, tenant_id)
        async with AsyncSessionLocal() as session:
            return await cls._send_with_session(session, to_email, to_name, subject, html, template_name, tenant_id)

    @staticmethod
    def application_received(candidate_name: str, job_title: str, company_name: str) -> str:
        return f"""
        <div style="font-family: sans-serif;">
            <div style="background-color: #16a34a; padding: 16px; color: white;">
                <h2>{company_name}</h2>
            </div>
            <div style="padding: 16px;">
                <p>Hi {candidate_name},</p>
                <p>Your application for the <strong>{job_title}</strong> position at {company_name} has been received.</p>
                <p>Our team will review your application and get back to you soon.</p>
                <br />
                <p>Best regards,<br/>{company_name} Hiring Team</p>
            </div>
        </div>
        """

    @staticmethod
    def stage_moved(candidate_name: str, job_title: str, new_stage: str, company_name: str) -> str:
        return f"""
        <div style="font-family: sans-serif;">
            <div style="background-color: #16a34a; padding: 16px; color: white;">
                <h2>{company_name}</h2>
            </div>
            <div style="padding: 16px;">
                <p>Hi {candidate_name},</p>
                <p>Great news! Your application for <strong>{job_title}</strong> has moved to the <strong>{new_stage}</strong> stage.</p>
                <p>Someone from our team will be in touch with next steps.</p>
                <br />
                <p>Best regards,<br/>{company_name} Hiring Team</p>
            </div>
        </div>
        """

    @staticmethod
    def new_application_alert(recruiter_name: str, candidate_name: str, job_title: str, score: float, dashboard_url: str) -> str:
        return f"""
        <div style="font-family: sans-serif;">
            <p>Hi {recruiter_name},</p>
            <p>A new application was received from <strong>{candidate_name}</strong> for <strong>{job_title}</strong>.</p>
            <p>AI Score Match: <strong>{score}%</strong></p>
            <p><a href="{dashboard_url}">View Application</a></p>
        </div>
        """

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

async def send_email(to_email: str, subject: str, body: str):
    """Sends a basic HTML email. Supports both port 465 (SSL) and 587 (STARTTLS)."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"SMTP not configured. Skipping email to {to_email}: {subject}")
        return

    msg = MIMEMultipart()
    msg["From"] = f"Training Platform <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "html"))

    try:
        if settings.SMTP_PORT == 465:
            # Implicit SSL — used by port 465
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # STARTTLS — used by port 587
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        print(f"Email sent successfully to {to_email}: {subject}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")


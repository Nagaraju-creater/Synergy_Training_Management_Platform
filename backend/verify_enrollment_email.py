import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.email_templates import build_enrollment_confirmation_html

def test_generation():
    html_content = build_enrollment_confirmation_html(
        employee_name="Johnathan Doe",
        training_name="Advanced Cloud Architecture & Microservices",
        category_name="Engineering & Infrastructure",
        program_date="Monday, June 15, 2026",
        start_time="10:00 AM",
        end_time="12:30 PM",
        duration_hours=2.5,
        trainer_name="Srinivasan Ramanujan",
        venue="Online (Microsoft Teams)",
        meeting_link="https://teams.microsoft.com/l/meetup-join/test-meeting-id",
        training_id="8f92b7c4-5d9e-4b6e-af6f-667a100819fe",
        action_url="http://localhost:5173/trainings/8f92b7c4-5d9e-4b6e-af6f-667a100819fe",
        contact_email="ld@synergy.com"
    )

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "enrollment_email_preview.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Preview HTML successfully written to: {output_path}")

if __name__ == "__main__":
    test_generation()

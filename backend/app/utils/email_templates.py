import html

def build_enrollment_confirmation_html(
    employee_name: str,
    training_name: str,
    category_name: str,
    program_date: str,
    start_time: str,
    end_time: str,
    duration_hours: float,
    trainer_name: str | None,
    venue: str | None,
    meeting_link: str | None,
    training_id: str,
    action_url: str,
    contact_email: str | None
) -> str:
    """
    Generates a highly polished, responsive, and mobile-friendly HTML email
    for training enrollment confirmations under the Synergy Training Platform branding.
    """
    import typing
    
    def safe_escape(val: typing.Any) -> str:
        if val is None:
            return ""
        return html.escape(str(val))

    # Safe HTML escaping for user inputs to prevent injection issues in HTML emails
    employee_name_esc = safe_escape(employee_name)
    training_name_esc = safe_escape(training_name)
    category_name_esc = safe_escape(category_name)
    program_date_esc = safe_escape(program_date)
    start_time_esc = safe_escape(start_time)
    end_time_esc = safe_escape(end_time)
    trainer_name_esc = safe_escape(trainer_name) if trainer_name else "To Be Determined"
    venue_esc = safe_escape(venue) if venue else "To Be Determined"
    training_id_esc = safe_escape(training_id)
    action_url_esc = safe_escape(action_url)
    contact_email_esc = safe_escape(contact_email) if contact_email else "ld@synergy.com"

    # Format duration nicely
    duration_text = f"{duration_hours:g} hr" if duration_hours == 1 else f"{duration_hours:g} hrs"

    # Joining instructions text based on delivery mode / venue
    venue_lower = venue.lower() if venue else ""
    instructions_text = (
        "Please join the online session 5-10 minutes prior to the start time. "
        "Make sure your audio and video connections are verified."
        if "online" in venue_lower or "zoom" in venue_lower or "teams" in venue_lower or meeting_link
        else "Please report to the specified venue 10 minutes before the scheduled start time."
    )
    if meeting_link:
        meeting_info = f'<div style="margin-top: 12px; font-size: 13px; color: #64748b;"><strong>Meeting Link:</strong> <a href="{safe_escape(meeting_link)}" style="color: #4f46e5; text-decoration: underline;">Join Meeting</a></div>'
    else:
        meeting_info = ""

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enrollment Confirmed</title>
    <style>
        /* CSS reset & client-specific styles */
        body, table, td, a {{
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }}
        table, td {{
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }}
        img {{
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }}
        table {{
            border-collapse: collapse !important;
        }}
        body {{
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }}
        /* Hover effect for buttons */
        .btn-hover:hover {{
            background-color: #4338ca !important;
        }}
        /* Responsive rules */
        @media screen and (max-width: 600px) {{
            .email-container {{
                width: 100% !important;
                padding: 10px !important;
            }}
            .card {{
                padding: 16px !important;
            }}
            .detail-label, .detail-value {{
                display: block !important;
                width: 100% !important;
                text-align: left !important;
                padding: 4px 0 !important;
            }}
            .detail-value {{
                border-bottom: 1px solid #f1f5f9 !important;
                padding-bottom: 8px !important;
            }}
            .detail-label {{
                border-bottom: none !important;
                padding-top: 8px !important;
            }}
        }}
    </style>
</head>
<body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 24px 0;">
                <!-- Main Email Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); width: 600px; max-width: 600px;">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td bgcolor="#4f46e5" style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); text-align: left;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <!-- Logo / Brand Title -->
                                        <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; display: inline-block;">
                                            Synergy <span style="font-weight: 300; opacity: 0.9;">Training Platform</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 16px;">
                                        <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.4;">
                                            Your training enrollment has been successfully confirmed.
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px; background-color: #ffffff;">
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                                Dear <strong>{employee_name_esc}</strong>,
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                                You have been successfully enrolled in the following training program through the Synergy Training Platform. Please ensure your availability and attend the session as scheduled.
                            </p>

                            <!-- Training Information Card -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff; margin-bottom: 24px;">
                                <tr>
                                    <td>
                                        <!-- Highlighted Date & Time Box (Prominent Highlight) -->
                                        <div style="background-color: #e0e7ff; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4338ca; letter-spacing: 0.05em; padding-bottom: 6px;">
                                                        SCHEDULE DETAILS
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-size: 18px; font-weight: 800; color: #1e1b4b; padding-bottom: 4px; line-height: 1.2;">
                                                        {program_date_esc}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-size: 15px; font-weight: 600; color: #312e81; line-height: 1.3;">
                                                        {start_time_esc} - {end_time_esc} <span style="font-weight: 400; opacity: 0.85;">({duration_text})</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>

                                        <!-- Detail Grid -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.5; color: #1e293b;">
                                            <!-- Training Title -->
                                            <tr>
                                                <td width="35%" class="detail-label" style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    Training Name
                                                </td>
                                                <td width="65%" class="detail-value" style="padding: 10px 0; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    {training_name_esc}
                                                </td>
                                            </tr>
                                            <!-- Training Category -->
                                            <tr>
                                                <td class="detail-label" style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    Category
                                                </td>
                                                <td class="detail-value" style="padding: 10px 0; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    {category_name_esc}
                                                </td>
                                            </tr>
                                            <!-- Trainer -->
                                            <tr>
                                                <td class="detail-label" style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    Trainer
                                                </td>
                                                <td class="detail-value" style="padding: 10px 0; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    {trainer_name_esc}
                                                </td>
                                            </tr>
                                            <!-- Venue -->
                                            <tr>
                                                <td class="detail-label" style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    Venue / Platform
                                                </td>
                                                <td class="detail-value" style="padding: 10px 0; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    {venue_esc}
                                                </td>
                                            </tr>
                                            <!-- Training ID -->
                                            <tr>
                                                <td class="detail-label" style="padding: 10px 0; font-weight: 600; color: #64748b; border-bottom: none; vertical-align: top;">
                                                    Training ID
                                                </td>
                                                <td class="detail-value" style="padding: 10px 0; font-family: monospace; font-size: 12px; color: #475569; border-bottom: none; vertical-align: top;">
                                                    {training_id_esc}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Important Information Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 28px; border: 1px solid #f1f5f9;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #334155; letter-spacing: 0.05em; text-transform: uppercase;">
                                            Important Instructions
                                        </h4>
                                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475569;">
                                            <li style="margin-bottom: 6px;">
                                                <strong>Schedule:</strong> {program_date_esc} at {start_time_esc} - {end_time_esc} ({duration_text})
                                            </li>
                                            <li style="margin-bottom: 6px;">
                                                <strong>Joining:</strong> {instructions_text}
                                            </li>
                                            <li style="margin-bottom: 0;">
                                                <strong>Contact:</strong> For any assistance, please reach out to the program coordinator/organizer at <a href="mailto:{contact_email_esc}" style="color: #4f46e5; text-decoration: none;">{contact_email_esc}</a>.
                                            </li>
                                        </ul>
                                        {meeting_info}
                                    </td>
                                </tr>
                            </table>

                            <!-- Call To Action Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 12px;">
                                        <a href="{action_url_esc}" class="btn-hover" style="display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.15); transition: background-color 0.2s ease-in-out;">
                                            View Training Details
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td bgcolor="#f8fafc" style="padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                            <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #475569;">
                                Synergy Training Platform
                            </p>
                            <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">
                                Learning • Compliance • Growth
                            </p>
                            <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #94a3b8;">
                                This is an automated email sent because you enrolled in a training program.<br>
                                Please do not reply directly to this message.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def build_effectiveness_assessment_email_html(
    employee_name: str,
    training_name: str,
    training_date: str,
    trainer_name: str | None,
    due_datetime_str: str,
    action_url: str,
) -> str:
    """
    Branded 'Action Required' HTML email for effectiveness assessment assignment.
    Sent immediately when a training is marked completed for present attendees.
    """
    import html as _html

    def esc(v):
        return _html.escape(str(v)) if v else ""

    emp = esc(employee_name)
    trn = esc(training_name)
    date_str = esc(training_date)
    trainer = esc(trainer_name) if trainer_name else "Your Trainer"
    due = esc(due_datetime_str)
    url = esc(action_url)

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required – Training Effectiveness Assessment</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table {{ border-collapse: collapse !important; }}
    body {{ margin: 0 !important; padding: 0 !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    .btn-hover:hover {{ background-color: #b45309 !important; }}
  </style>
</head>
<body style="background-color: #f8fafc; margin: 0; padding: 0;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 600px;">

          <!-- Header Banner (Amber/Warning) -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                      Synergy <span style="font-weight: 300; opacity: 0.9;">Training Platform</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.4;">
                      ⏱ Action Required: Training Effectiveness Assessment
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                Dear <strong>{emp}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Congratulations on completing <strong>{trn}</strong>! To close the loop on your learning journey, please complete your <strong>Training Effectiveness Assessment</strong> within the next 48 hours.
              </p>

              <!-- Training Info Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #fffbeb; margin-bottom: 24px;">
                <tr>
                  <td>
                    <!-- Due Date Highlight -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #d97706; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #92400e; letter-spacing: 0.05em; padding-bottom: 6px;">ASSESSMENT DUE BY</div>
                      <div style="font-size: 20px; font-weight: 800; color: #78350f;">{due}</div>
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.5; color: #1e293b;">
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9;">Training</td>
                        <td width="60%" style="padding: 8px 0; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">{trn}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9;">Date</td>
                        <td style="padding: 8px 0; color: #334155; border-bottom: 1px solid #f1f5f9;">{date_str}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Trainer</td>
                        <td style="padding: 8px 0; color: #334155;">{trainer}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 28px; border: 1px solid #f1f5f9;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em;">Important</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475569;">
                      <li style="margin-bottom: 6px;">You have <strong>48 hours</strong> from the training completion time to submit your evaluation.</li>
                      <li style="margin-bottom: 6px;">After the deadline, the assessment will be marked as <strong>Overdue</strong>.</li>
                      <li>Your feedback directly contributes to improving future training programs.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="{url}" class="btn-hover" style="display: inline-block; padding: 14px 28px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 6px rgba(217, 119, 6, 0.15);">
                      Start Effectiveness Assessment →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center; background-color: #f8fafc;">
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #475569;">Synergy Training Platform</p>
              <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">Learning • Compliance • Growth</p>
              <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #94a3b8;">This is an automated notification. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_effectiveness_reminder_email_html(
    employee_name: str,
    training_name: str,
    due_datetime_str: str,
    remaining_label: str,  # e.g. "24 hours", "6 hours"
    action_url: str,
) -> str:
    """
    Reminder email for effectiveness assessment – sent at 24h and 6h before the deadline.
    Uses a red/urgent color scheme to convey urgency.
    """
    import html as _html

    def esc(v):
        return _html.escape(str(v)) if v else ""

    emp = esc(employee_name)
    trn = esc(training_name)
    due = esc(due_datetime_str)
    remaining = esc(remaining_label)
    url = esc(action_url)

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder – Effectiveness Assessment Due Soon</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table {{ border-collapse: collapse !important; }}
    body {{ margin: 0 !important; padding: 0 !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
  </style>
</head>
<body style="background-color: #f8fafc; margin: 0; padding: 0;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 600px;">

          <!-- Header Banner (Red/Urgent) -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                      Synergy <span style="font-weight: 300; opacity: 0.9;">Training Platform</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.4;">
                      🚨 Reminder: Effectiveness Assessment Due in {remaining}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                Dear <strong>{emp}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                This is a reminder that your Training Effectiveness Assessment for <strong>{trn}</strong> is due in <strong style="color: #dc2626;">{remaining}</strong>. Please complete it before the deadline to avoid being marked as Overdue.
              </p>

              <!-- Due Date Box -->
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #991b1b; letter-spacing: 0.05em; padding-bottom: 6px;">ASSESSMENT DUE BY</div>
                <div style="font-size: 20px; font-weight: 800; color: #7f1d1d;">{due}</div>
              </div>

              <!-- CTA -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="{url}" style="display: inline-block; padding: 14px 28px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15);">
                      Complete Assessment Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center; background-color: #f8fafc;">
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #475569;">Synergy Training Platform</p>
              <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">Learning • Compliance • Growth</p>
              <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #94a3b8;">This is an automated notification. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

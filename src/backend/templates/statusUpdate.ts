/**
 * Application Status Update HTML Email Template for Allianza.io
 */

interface StatusUpdateData {
  agentName: string;
  studentName: string;
  universityName: string;
  programName: string;
  newStatus: string;
  actionRequiredText?: string | null;
  portalLink?: string;
}

export default function statusUpdateTemplate(data: StatusUpdateData) {
  const { agentName, studentName, universityName, programName, newStatus, actionRequiredText, portalLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content-box { padding: 20px !important; }
      .status-badge { display: block !important; text-align: center !important; margin-bottom: 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #0A1128; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Allianza<span style="color: #3b82f6;">.io</span></h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Ecosystem Notification Engine</p>
            </td>
          </tr>
          <tr>
            <td class="content-box" style="padding: 40px 35px; background-color: #ffffff;">
              <p style="font-size: 16px; line-height: 24px; color: #1e293b; margin-top: 0;">Dear <strong>${agentName}</strong>,</p>
              <p style="font-size: 15px; line-height: 24px; color: #475569;">There has been an immediate update regarding a student application profile in your pipeline network.</p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 25px 0; padding: 20px;">
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; padding-bottom: 4px;">Student Name</td>
                        <td style="font-size: 15px; color: #0f172a; font-weight: 700; text-align: right;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; padding: 8px 0 4px 0;">Institution</td>
                        <td style="font-size: 14px; color: #334155; font-weight: 500; text-align: right; padding-top: 4px;">${universityName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; padding: 4px 0 12px 0;">Program</td>
                        <td style="font-size: 14px; color: #334155; font-weight: 500; text-align: right; padding-top: 4px;">${programName}</td>
                      </tr>
                    </table>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 10px 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 14px; color: #0f172a; font-weight: 600; vertical-align: middle;">Current Status:</td>
                        <td align="right">
                          <span class="status-badge" style="background-color: #eff6ff; color: #1d4ed8; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; border: 1px solid #bfdbfe; display: inline-block;">
                            ${newStatus}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${actionRequiredText ? `
              <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px; color: #c2410c; font-weight: 600; line-height: 20px;">⚠️ Action Required: ${actionRequiredText}</p>
              </div>` : ''}
              <p style="font-size: 15px; line-height: 24px; color: #475569;">Please log into your Allianza agent portal interface immediately to verify documentation updates.</p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${portalLink || 'https://allianza.io/login'}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block;">Launch Allianza Workspace</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 35px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 10px 0;">This is an automated operational pipeline transmission from Allianza.io. Please do not reply directly.</p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; 2026 Allianza Global Networks. All Rights Reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

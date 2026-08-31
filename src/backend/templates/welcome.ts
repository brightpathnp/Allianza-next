/**
 * New Agent Welcome & Onboarding HTML Email Template for Allianza.io
 */

interface WelcomeData {
  agentName: string;
  verifyLink: string;
}

export default function welcomeTemplate(data: WelcomeData) {
  const { agentName, verifyLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Allianza.io</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content-box { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #0A1128; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Allianza<span style="color: #3b82f6;">.io</span></h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Partner Onboarding Network</p>
            </td>
          </tr>
          <tr>
            <td class="content-box" style="padding: 40px 35px; background-color: #ffffff;">
              <p style="font-size: 16px; line-height: 24px; color: #1e293b; margin-top: 0;">Welcome to the Alliance, <strong>${agentName}</strong>!</p>
              <p style="font-size: 15px; line-height: 24px; color: #475569;">
                Your professional agency portal profile has been successfully generated. To begin routing student applications to global institutions and tracking commissions, please verify your account.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block; box-shadow: 0 2px 5px rgba(37, 99, 235, 0.2);">
                      Activate Partner Portal
                    </a>
                  </td>
                </tr>
              </table>
              <h4 style="color: #0f172a; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps to Live Recruitment:</h4>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #475569; line-height: 22px;">
                <tr><td style="padding: 4px 0;">👉 <strong>Complete Profile:</strong> Update agency location and primary contacts.</td></tr>
                <tr><td style="padding: 4px 0;">👉 <strong>Upload Compliance:</strong> Add business registrations to clear your Document Vault.</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 35px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
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

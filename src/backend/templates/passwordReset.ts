/**
 * Password Reset Authorization HTML Email Template for Allianza.io
 */

interface PasswordResetData {
  name: string;
  resetLink: string;
}

export default function passwordResetTemplate(data: PasswordResetData) {
  const { name, resetLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #0A1128; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Allianza<span style="color: #3b82f6;">.io</span></h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 35px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${name}</strong>,</p>
              <p style="font-size: 15px; line-height: 24px; color: #475569;">
                We received a request to reset the account password associated with your Allianza access portal. Click the button below to establish new credentials:
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" target="_blank" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block;">
                      Reset Password Securely
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; line-height: 20px; color: #94a3b8; margin-bottom: 0;">
                🔒 This secure token link will remain valid for a limited window. If you did not make this request, you can safely ignore this email; your credentials remain securely protected.
              </p>
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

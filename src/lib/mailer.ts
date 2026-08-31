import nodemailer from 'nodemailer';

// Lazy initialization of transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !user || !pass) {
      console.warn('⚠️ SMTP environment variables are not fully configured. Email notifications will be disabled.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: true, // true for 465
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
};

export const sendWelcomeEmail = async (email: string, fullName: string) => {
  const mailer = getTransporter();
  if (!mailer) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #0059E7; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Welcome to Allianza.io</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello ${fullName},</p>
        <p>Welcome to the <strong>Allianza.io Network</strong>! We are thrilled to have you join our sovereign infrastructure for global academic recruitment.</p>
        <p>As a validated partner, you are now equipped to streamline your recruitment operations. Here are your recommended next steps to get started:</p>
        <ul style="line-height: 1.6;">
          <li><strong>Complete Profile Verification:</strong> Ensure your agency details are up-to-date and all required documentation is submitted.</li>
          <li><strong>Explore University Target Pipelines:</strong> Review available programs and university partnerships to start aligning your recruitment efforts.</li>
        </ul>
        <p>If you have any questions, our support team is always here to help.</p>
        <p>Best regards,<br>The Allianza.io Team</p>
      </div>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: `"Allianza.io" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Allianza.io Network',
      html: html,
    });
  } catch (err) {
    console.warn("⚠️ Failed to send welcome email via SMTP:", err);
  }
};

export const sendAccountProcessingEmail = async (email: string, fullName: string) => {
  const mailer = getTransporter();
  if (!mailer) return;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #0059E7; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Account Request Received</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello ${fullName},</p>
        <p>Thank you for submitting your account creation request to <strong>Allianza.io</strong>.</p>
        <p>We have received your application and it is currently being processed by our team.</p>
        <p>Please allow us up to <strong>48 hours</strong> to review your request. You will receive an email notification once a decision has been made.</p>
        <p>Best regards,<br>The Allianza.io Team</p>
      </div>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: `"Allianza.io" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Account Creation Request Received',
      html: html,
    });
  } catch (err) {
    console.warn("⚠️ Failed to send account processing email via SMTP:", err);
  }
};

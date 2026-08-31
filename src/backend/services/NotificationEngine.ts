import nodemailer from 'nodemailer';
import welcomeTemplate from '../templates/welcome';
import passwordResetTemplate from '../templates/passwordReset';
import statusUpdateTemplate from '../templates/statusUpdate';
import newDirectMessageTemplate from '../templates/newDirectMessage';
import accountApprovedTemplate from '../templates/accountApproved';

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // Port 465 forces implicit TLS/SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: true, 
      maxConnections: 5,
      maxMessages: 100
    });
  }
  return cachedTransporter;
}

interface WelcomePayload {
  agentName: string;
  verifyLink: string;
}

interface PasswordResetPayload {
  name: string;
  resetLink: string;
}

interface StatusUpdatePayload {
  agentName: string;
  studentName: string;
  universityName: string;
  programName: string;
  newStatus: string;
  actionRequiredText?: string | null;
  portalLink?: string;
}

interface DirectMessagePayload {
  recipientName: string;
  senderName: string;
  messageExcerpt: string;
  actionUrl: string;
}

interface AccountApprovalPayload {
  partnerName: string;
  portalLink: string;
  partnerType: 'Agent' | 'University';
}

export const NotificationEngine = {
  async sendWelcomeEmail(recipientEmail: string, payload: WelcomePayload) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.warn('SMTP not configured, skipping welcome email');
        return { success: false, error: 'SMTP not configured' };
      }
      const htmlContent = welcomeTemplate({ 
        agentName: payload.agentName, 
        verifyLink: payload.verifyLink 
      });
      const info = await transporter.sendMail({
        from: `"Allianza.io" <${process.env.SMTP_USER || 'welcome@allianza.io'}>`,
        to: recipientEmail,
        subject: "🤝 Welcome to Allianza.io — Let's activate your partner workspace",
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Warning: Failed to send welcome email:', err.message || err);
      return { success: false, error: err.message };
    }
  },

  async sendPasswordReset(recipientEmail: string, payload: PasswordResetPayload) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        return { success: false, error: 'SMTP not configured' };
      }
      const htmlContent = passwordResetTemplate({ 
        name: payload.name, 
        resetLink: payload.resetLink 
      });
      const info = await transporter.sendMail({
        from: `"Allianza.io Security" <${process.env.SMTP_USER || 'welcome@allianza.io'}>`,
        to: recipientEmail,
        subject: '🔒 Security Alert: Account Password Reset Request',
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Warning: Failed to send password reset email:', err.message || err);
      return { success: false, error: err.message };
    }
  },

  async sendApplicationStatusUpdate(recipientEmail: string, payload: StatusUpdatePayload) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        return { success: false, error: 'SMTP not configured' };
      }
      const htmlContent = statusUpdateTemplate({
        agentName: payload.agentName,
        studentName: payload.studentName,
        universityName: payload.universityName,
        programName: payload.programName,
        newStatus: payload.newStatus,
        actionRequiredText: payload.actionRequiredText || null,
        portalLink: payload.portalLink || 'https://allianza.io/login'
      });
      const info = await transporter.sendMail({
        from: `"Allianza.io" <${process.env.SMTP_USER || 'welcome@allianza.io'}>`,
        to: recipientEmail,
        subject: `🚨 [Update] Status Change: ${payload.studentName} — ${payload.newStatus}`,
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Warning: Failed to send status update email:', err.message || err);
      return { success: false, error: err.message };
    }
  },

  async sendNewDirectMessage(recipientEmail: string, payload: DirectMessagePayload) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        return { success: false, error: 'SMTP not configured' };
      }
      const htmlContent = newDirectMessageTemplate({
        recipientName: payload.recipientName,
        senderName: payload.senderName,
        messageExcerpt: payload.messageExcerpt,
        actionUrl: payload.actionUrl
      });
      const info = await transporter.sendMail({
        from: `"Allianza.io Hub" <${process.env.SMTP_USER || 'welcome@allianza.io'}>`,
        to: recipientEmail,
        subject: `💬 New Message from ${payload.senderName}`,
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Warning: Failed to send direct message notification:', err.message || err);
      return { success: false, error: err.message };
    }
  },

  async sendAccountApproval(recipientEmail: string, payload: AccountApprovalPayload) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        return { success: false, error: 'SMTP not configured' };
      }
      const htmlContent = accountApprovedTemplate({
        partnerName: payload.partnerName,
        portalLink: payload.portalLink,
        partnerType: payload.partnerType
      });
      const info = await transporter.sendMail({
        from: `"Allianza.io Network" <${process.env.SMTP_USER || 'welcome@allianza.io'}>`,
        to: recipientEmail,
        subject: `✅ Partnership Approved: Welcome to the Allianza.io Network`,
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Warning: Failed to send account approval email:', err.message || err);
      return { success: false, error: err.message };
    }
  }
};

export default NotificationEngine;

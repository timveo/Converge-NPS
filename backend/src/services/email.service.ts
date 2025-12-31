/**
 * Email Service
 *
 * Handles all email sending via SendGrid
 *
 * Setup:
 * 1. Create a SendGrid account at https://sendgrid.com
 * 2. Create an API key with "Mail Send" permissions
 * 3. Set SENDGRID_API_KEY in your .env file
 * 4. Verify a sender identity or domain in SendGrid dashboard
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@converge-nps.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Converge NPS';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Send a generic email
   */
  static async send(options: SendEmailOptions): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: options.subject,
        html: options.html,
        text: options.text || '',
      };

      const response = await sgMail.send(msg);
      console.log('Email sent successfully:', response[0].statusCode);
      return true;
    } catch (error: any) {
      console.error('Email send error:', error?.response?.body || error.message || error);
      return false;
    }
  }

  /**
   * Send 2FA verification code
   */
  static async sendTwoFactorCode(email: string, code: string, userName?: string): Promise<boolean> {
    // Extract first name from full name
    const firstName = userName ? userName.split(' ')[0] : null;
    const greeting = firstName ? `Welcome to Converge @ NPS, ${firstName}!` : 'Welcome to Converge @ NPS!';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Verification Code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Converge @ NPS</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            <p style="font-size: 16px; margin-bottom: 30px;">Your verification code is:</p>
            <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">This code will expire in <strong>5 minutes</strong>.</p>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">If you did not request this code, you can safely ignore this email.</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 10px;">See you at the event!</p>
            <p style="font-size: 14px; color: #666; font-style: italic;">— The NPS Foundation Team</p>
          </div>
        </body>
      </html>
    `;

    const text = `${greeting}

Your verification code is: ${code}

This code will expire in 5 minutes.

If you did not request this code, you can safely ignore this email.

See you at the event!

— The NPS Foundation Team`;

    return this.send({
      to: email,
      subject: `${code} is your Converge NPS verification code`,
      html,
      text,
    });
  }

  /**
   * Send email verification link
   */
  static async sendEmailVerification(email: string, token: string, userName?: string): Promise<boolean> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const greeting = userName ? `Hi ${userName},` : 'Hi,';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Converge NPS</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            <p style="font-size: 16px; margin-bottom: 30px;">Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${verifyUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Verify Email</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">This link will expire in <strong>24 hours</strong>.</p>
            <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #888; word-break: break-all;">${verifyUrl}</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>Naval Postgraduate School - Converge Conference</p>
          </div>
        </body>
      </html>
    `;

    const text = `${greeting}

Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.

- Converge NPS`;

    return this.send({
      to: email,
      subject: 'Verify your email for Converge NPS',
      html,
      text,
    });
  }

  /**
   * Send password reset link
   */
  static async sendPasswordReset(email: string, token: string, userName?: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const greeting = userName ? `Hi ${userName},` : 'Hi,';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Converge NPS</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            <p style="font-size: 16px; margin-bottom: 30px;">We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${resetUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">This link will expire in <strong>1 hour</strong>.</p>
            <p style="font-size: 14px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>Naval Postgraduate School - Converge Conference</p>
          </div>
        </body>
      </html>
    `;

    const text = `${greeting}

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

- Converge NPS`;

    return this.send({
      to: email,
      subject: 'Reset your Converge NPS password',
      html,
      text,
    });
  }

  /**
   * Send walk-in check-in confirmation email
   */
  static async sendWalkInCheckinEmail(email: string, fullName: string): Promise<boolean> {
    const firstName = fullName ? fullName.split(' ')[0] : 'there';
    const appUrl = 'https://Converge.npsfoundation.org';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <title>Welcome to Converge</title>
          <style>
            :root { color-scheme: light; supported-color-schemes: light; }
          </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #003770 0%, #104a8e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Converge NPS</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">You are now checked in for Converge @ NPS! Make the most of this three-day event with the <a href="${appUrl}" style="color: #003770; text-decoration: underline;">Converge @ NPS app</a>.</p>
            <ul style="font-size: 15px; margin-bottom: 25px; padding-left: 20px; color: #444;">
              <li style="margin-bottom: 6px;">Connect with other participants and industry partners</li>
              <li style="margin-bottom: 6px;">View collaborative opportunities or submit your own</li>
              <li style="margin-bottom: 6px;">RSVP for breakout sessions, panels, demos, workshops and more</li>
            </ul>
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Next Steps:</p>
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${appUrl}" style="display: inline-block; background: #003770; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Go to App</a>
            </div>
            <p style="font-size: 14px; color: #636b78; margin-bottom: 20px;">On the login page, select <strong>Forgot Password</strong> and enter the email you used at check-in to create your password.</p>
            <p style="font-size: 14px; color: #636b78;">Questions? Email <a href="mailto:converge@npsfoundation.org" style="color: #003770;">converge@npsfoundation.org</a></p>
          </div>
          <div style="text-align: center; padding: 20px; color: #636b78; font-size: 12px;">
            <p>Naval Postgraduate School - Converge Conference</p>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${firstName},

You are now checked in for Converge @ NPS! Make the most of this three-day event with the Converge @ NPS app (${appUrl}).

- Connect with other participants and industry partners
- View collaborative opportunities or submit your own
- RSVP for breakout sessions, panels, demos, workshops and more

Next Steps:

1. Go to App: ${appUrl}
2. On the login page, select "Forgot Password" and use the email you used at check in
3. Follow the instructions to create a new password
4. Log in and create your profile

Questions? Email converge@npsfoundation.org

- Converge NPS`;

    return this.send({
      to: email,
      subject: 'Converge NPS - Set up your account',
      html,
      text,
    });
  }
}

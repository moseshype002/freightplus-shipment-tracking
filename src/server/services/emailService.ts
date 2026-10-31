import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const BRAND_NAME = 'Freight Plus';

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function createEmailTemplate(
  heading: string,
  message: string,
  code: string,
  purpose: string
): string {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:30px;background:#07111f;font-family:Arial,sans-serif;color:#e2e8f0;">
      <div style="max-width:520px;margin:0 auto;background:#0f1d30;border:1px solid #243750;border-radius:16px;overflow:hidden;">
        <div style="padding:28px;text-align:center;border-bottom:1px solid #243750;">
          <h1 style="margin:0;color:#22d3ee;font-size:27px;letter-spacing:1px;">FREIGHT PLUS</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;letter-spacing:2px;">SHIPMENT MANAGEMENT</p>
        </div>

        <div style="padding:32px 25px;text-align:center;">
          <h2 style="color:#f8fafc;font-size:23px;">${heading}</h2>
          <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">${message}</p>

          <div style="margin:28px 0;padding:20px;background:#142940;border:1px solid #155e75;border-radius:12px;">
            <p style="margin:0 0 10px;color:#94a3b8;font-size:12px;">YOUR ${purpose} CODE</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#22d3ee;">${code}</div>
          </div>

          <p style="color:#fbbf24;font-size:13px;">This code expires in 15 minutes.</p>

          <p style="color:#94a3b8;font-size:13px;line-height:1.6;">
            For your security, never share this code with anyone.
            If you did not request it, you can safely ignore this email.
          </p>
        </div>

        <div style="padding:18px;text-align:center;border-top:1px solid #243750;color:#64748b;font-size:11px;">
          &copy; ${new Date().getFullYear()} Freight Plus. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `;
}

async function sendCodeEmail(
  email: string,
  heading: string,
  message: string,
  purpose: string
): Promise<string> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key is not configured.');
  }

  const code = generateCode();

  const { error } = await resend.emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: [email],
    subject: `${purpose} Code | Freight Plus`,
    html: createEmailTemplate(heading, message, code, purpose),
  });

  if (error) {
    console.error('Freight Plus email delivery error:', error);
    throw new Error('Unable to send email. Please try again later.');
  }

  return code;
}

export async function sendVerificationEmail(email: string): Promise<string> {
  return sendCodeEmail(
    email,
    'Verify Your Email Address',
    'Welcome to Freight Plus. Please use the verification code below to confirm your email address and complete your registration.',
    'VERIFICATION'
  );
}

export async function sendPasswordResetEmail(email: string): Promise<string> {
  return sendCodeEmail(
    email,
    'Password Reset Request',
    'We received a request to reset your Freight Plus account password. Use the code below to continue.',
    'PASSWORD RESET'
  );
}
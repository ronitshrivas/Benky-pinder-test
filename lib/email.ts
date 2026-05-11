import nodemailer from 'nodemailer';

function requireEnv(value: string | undefined, name: string) {
  const cleaned = value?.trim();
  if (!cleaned || cleaned === 'your-app-password-here') {
    throw new Error(`Missing or invalid ${name}. Set a real Gmail app password in .env.local.`);
  }
  return cleaned;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: requireEnv(process.env.EMAIL_USER, 'EMAIL_USER'),
      pass: requireEnv(process.env.EMAIL_PASSWORD, 'EMAIL_PASSWORD'),
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

type InvoiceEmailPayload = {
  to: string;
  userName: string;
  itemTitle: string;
  amount: number;
  currency: string;
  paymentId?: string;
  orderId?: string;
  receiptUrl?: string;
  type: 'course' | 'retreat' | 'admin_notification';
  courseAccessUrl?: string;
};

export async function sendInvoiceEmail(
  to: string,
  userName: string,
  itemTitle: string,
  amount: number,
  currency: string,
  paymentId: string,
  type: 'course' | 'retreat',
  courseAccessUrl?: string
): Promise<void>;
export async function sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void>;
export async function sendInvoiceEmail(
  payloadOrTo: string | InvoiceEmailPayload,
  userName?: string,
  itemTitle?: string,
  amount?: number,
  currency?: string,
  paymentId?: string,
  type?: 'course' | 'retreat',
  courseAccessUrl?: string
) {
  const payload: InvoiceEmailPayload =
    typeof payloadOrTo === 'string'
      ? {
          to: payloadOrTo,
          userName: userName || '',
          itemTitle: itemTitle || '',
          amount: amount || 0,
          currency: currency || 'AUD',
          paymentId,
          type: type || 'course',
          courseAccessUrl,
        }
      : payloadOrTo;

  const {
    to,
    userName: resolvedUserName,
    itemTitle: resolvedItemTitle,
    amount: resolvedAmount,
    currency: resolvedCurrency,
    paymentId: resolvedPaymentId,
    orderId,
    receiptUrl,
    type: resolvedType,
    courseAccessUrl: resolvedCourseAccessUrl,
  } = payload;

  const currencySymbol = '$';
  const paymentReference = resolvedPaymentId || orderId || receiptUrl || '';

  const html = `
    <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto; background: #F8F6F0;">
      <div style="background: #1B2A4A; padding: 40px; text-align: center;">
        <h1 style="color: #C9A84C; font-family: 'Cormorant Garamond', serif; font-size: 28px; margin: 0;">
          Becky Pinder
        </h1>
      </div>
      <div style="padding: 40px;">
        <h2 style="color: #1B2A4A; font-family: 'Cormorant Garamond', serif;">Payment Confirmation</h2>
        <p>Dear ${resolvedUserName},</p>
        <p>Thank you for your purchase! Here are your details:</p>
        <div style="background: white; border: 1px solid #C9A84C; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Item:</td><td style="padding: 8px 0; font-weight: 600;">${resolvedItemTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Type:</td><td style="padding: 8px 0;">${resolvedType === 'course' ? 'Online Course' : resolvedType === 'retreat' ? 'Retreat Booking' : 'Admin Notification'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Amount:</td><td style="padding: 8px 0; font-weight: 600; color: #C9A84C;">${currencySymbol}${resolvedAmount.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Payment ID:</td><td style="padding: 8px 0; font-size: 12px;">${paymentReference}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Date:</td><td style="padding: 8px 0;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
          </table>
        </div>
        ${resolvedType === 'course' && resolvedCourseAccessUrl ? `
          <div style="background: #1B2A4A; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: white; margin: 0 0 15px 0;">Your course is ready to access:</p>
            <a href="${resolvedCourseAccessUrl}" style="display: inline-block; background: #C9A84C; color: #1B2A4A; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: 600;">
              Start Learning ->
            </a>
          </div>
        ` : ''}
        ${resolvedType === 'retreat' ? `
          <p>I'll be in touch shortly with more details about the retreat. If you have any questions, please don't hesitate to reach out.</p>
        ` : ''}
        <p style="margin-top: 30px;">With love and light,<br><strong>Becky Pinder</strong></p>
      </div>
      <div style="background: #0D1B2A; padding: 20px; text-align: center;">
        <p style="color: #C9A84C; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Becky Pinder Yoga & Wellness</p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: `Payment Confirmation - ${resolvedItemTitle}`,
    html,
  });
}

export async function sendOTPEmail(to: string, otp: string) {
  const html = `
    <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto; background: #F8F6F0;">
      <div style="background: #1B2A4A; padding: 40px; text-align: center;">
        <h1 style="color: #C9A84C; font-family: 'Cormorant Garamond', serif; font-size: 28px; margin: 0;">
          Becky Pinder 
        </h1>
      </div>
      <div style="padding: 40px; text-align: center;">
        <h2 style="color: #1B2A4A;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="background: #1B2A4A; display: inline-block; padding: 15px 40px; border-radius: 8px; margin: 20px 0;">
          <span style="color: #C9A84C; font-size: 32px; letter-spacing: 8px; font-weight: 700;">${otp}</span>
        </div>
        <p style="color: #6B7280; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: 'Your Verification Code - Becky Pinder Yoga',
    html,
  });
}

export async function sendContactNotification(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  const html = `
    <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 20px; text-align: center;">
        <h2 style="color: #C9A84C; margin: 0;">New Inquiry</h2>
      </div>
      <div style="padding: 20px;">
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 3px solid #C9A84C; padding-left: 15px; color: #333;">${message}</blockquote>
      </div>
    </div>
  `;

  await sendEmail({
    to: process.env.ADMIN_EMAIL || '',
    subject: `New Inquiry: ${subject}`,
    html,
  });
}

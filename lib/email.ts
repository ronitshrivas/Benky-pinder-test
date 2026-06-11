import nodemailer from 'nodemailer';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beckypinder.com.au';
const logoUrl = `${appUrl}/images/logo.png`;

function requireEnv(value: string | undefined, name: string) {
  const cleaned = value?.trim();
  if (!cleaned || cleaned === 'your-app-password-here') {
    throw new Error(`Missing or invalid ${name}. Set a real value in .env.local.`);
  }
  return cleaned;
}

function createTransporter() {
  const host = requireEnv(process.env.EMAIL_HOST, 'EMAIL_HOST');
  const port = Number(requireEnv(process.env.EMAIL_PORT, 'EMAIL_PORT'));

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
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
  const cleanTo = to.trim();
  const fromEmail = requireEnv(process.env.EMAIL_FROM || process.env.EMAIL_USER, 'EMAIL_FROM or EMAIL_USER');
  const fromName = 'Becky Pinder Yoga';

  console.log(`Sending email to: ${cleanTo} with subject: ${subject}`);

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: cleanTo,
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
  paymentLabel?: string;
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
          currency: currency || 'USD',
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
    paymentLabel: resolvedPaymentLabel,
    courseAccessUrl: resolvedCourseAccessUrl,
  } = payload;

  const currencySymbol = '$';
  const paymentReference = resolvedPaymentId || orderId || receiptUrl || '';

  const html = `
    <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto; background: #F8F6F0;">
      <div style="background: #1B2A4A; padding: 30px 40px; text-align: center;">
        <img src="${logoUrl}" alt="Becky Pinder Logo" style="max-height: 80px; max-width: 250px; display: inline-block; vertical-align: middle;" />
      </div>
      <div style="padding: 40px;">
        <h2 style="color: #1B2A4A; font-family: 'Cormorant Garamond', serif;">Payment Confirmation</h2>
        <p>Hi ${resolvedUserName},</p>
        <p>Thank you for your purchase! Here are your details:</p>
        <div style="background: white; border: 1px solid #C9A84C; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Item:</td><td style="padding: 8px 0; font-weight: 600;">${resolvedItemTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Type:</td><td style="padding: 8px 0;">${resolvedType === 'course' ? 'Online Course' : resolvedType === 'retreat' ? 'Retreat Booking' : 'Admin Notification'}</td></tr>
            ${resolvedPaymentLabel ? `<tr><td style="padding: 8px 0; color: #6B7280;">Option:</td><td style="padding: 8px 0;">${resolvedPaymentLabel}</td></tr>` : ''}
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
          <p>${resolvedPaymentLabel === 'Deposit' 
            ? "Your deposit has been received and your spot is secured! I'll be in touch shortly with more details and instructions for paying the remaining balance." 
            : "Your full payment has been received and your spot is confirmed! I'll be in touch shortly with more details about the retreat."
          }</p>
          <p>If you have any questions in the meantime, please don't hesitate to reach out.</p>
        ` : ''}
        <p style="margin-top: 30px;">Warm wishes,<br><strong>Becky Pinder</strong></p>
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
      <div style="background: #1B2A4A; padding: 30px 40px; text-align: center;">
        <img src="${logoUrl}" alt="Becky Pinder Logo" style="max-height: 80px; max-width: 250px; display: inline-block; vertical-align: middle;" />
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

export async function sendComplimentaryVideoEmail(
  to: string,
  watchUrl: string,
  videoTitle: string = '10-Minute Radiance Boost Morning Practice'
) {
  const html = `
    <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto; background: #F8F6F0;">
      <div style="background: #1B2A4A; padding: 30px 40px; text-align: center;">
        <img src="${logoUrl}" alt="Becky Pinder Logo" style="max-height: 80px; max-width: 250px; display: inline-block; vertical-align: middle;" />
      </div>
      <div style="padding: 40px;">
        <h2 style="color: #1B2A4A; font-family: 'Cormorant Garamond', serif; font-size: 28px; margin-bottom: 8px;">
          Welcome to Becky's Inner Circle 🌿
        </h2>
        <p style="color: #4B5563; line-height: 1.7; margin-bottom: 20px;">
          Thank you for joining! As a gift, your complimentary video is ready and waiting for you:
        </p>
        <div style="background: white; border: 1px solid #C9A84C; border-radius: 10px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="font-family: 'Cormorant Garamond', serif; font-size: 20px; color: #1B2A4A; margin: 0 0 8px 0; font-weight: 600;">
            ${videoTitle}
          </p>
          <p style="color: #6B7280; font-size: 13px; margin: 0;">
            Your personal access link — no login required
          </p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a
            href="${watchUrl}"
            style="display: inline-block; background: #1B2A4A; color: #C9A84C; padding: 16px 40px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase;"
          >
            Watch Your Free Video →
          </a>
        </div>
        <p style="color: #6B7280; font-size: 13px; line-height: 1.6; margin-top: 24px;">
          As an Inner Circle member, you'll also be the first to hear about new retreats, classes and offerings.
          I'm so happy to have you here.
        </p>
        <p style="margin-top: 30px; color: #1B2A4A;">
          With love,<br />
          <strong style="font-family: 'Cormorant Garamond', serif; font-size: 18px;">Becky Pinder</strong>
        </p>
      </div>
      <div style="background: #0D1B2A; padding: 20px; text-align: center;">
        <p style="color: #C9A84C; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Becky Pinder Yoga &amp; Wellness</p>
        <p style="color: #6B7280; margin: 6px 0 0; font-size: 11px;">
          You received this because you joined Becky's Inner Circle.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: `Your complimentary video is ready — ${videoTitle}`,
    html,
  });
}

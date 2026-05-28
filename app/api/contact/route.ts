import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beckypinder.com.au';
const logoUrl = `${appUrl}/images/logo.png`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message, phone } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    // Save inquiry to Firestore
    const inquiryRef = adminDb.collection('inquiries').doc();
    await inquiryRef.set({
      id: inquiryRef.id,
      name,
      email,
      phone: phone || '',
      subject: subject || 'General Inquiry',
      message,
      status: 'new',
      createdAt: new Date().toISOString(),
    });

    // Send notification email to Becky
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'becky@beckypinder.com.au',
      subject: `New Inquiry: ${subject || 'General'} from ${name}`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0D1B2A; padding: 20px; text-align: center;">
            <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">New Website Inquiry</h1>
          </div>
          <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This inquiry was submitted via beckypinder.com.au</p>
          </div>
        </div>
      `,
    });

    // Send confirmation to the user
    await sendEmail({
      to: email,
      subject: 'Thank you for your inquiry — Becky Pinder Yoga',
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0D1B2A; padding: 25px; text-align: center;">
            <img src="${logoUrl}" alt="Becky Pinder Logo" style="max-height: 70px; max-width: 220px; display: inline-block; vertical-align: middle;" />
          </div>
          <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
            <p>Hi ${name},</p>
            <p>Thank you for reaching out. I've received your message and will get back to you within 24-48 hours.</p>
            <p>In the meantime, feel free to explore my <a href="https://beckypinder.com.au/courses" style="color: #D4AF37;">online courses</a> or upcoming <a href="https://beckypinder.com.au/retreats" style="color: #D4AF37;">retreats</a>.</p>
            <p style="margin-top: 20px;">Warm wishes,<br/><strong>Becky</strong></p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, id: inquiryRef.id });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit' }, { status: 500 });
  }
}

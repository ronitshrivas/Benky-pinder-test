import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

// Email transporter (configure with your SMTP)
const transporter = nodemailer.createTransport({
  host: functions.config().smtp?.host || 'smtp.gmail.com',
  port: parseInt(functions.config().smtp?.port || '587'),
  secure: false,
  auth: {
    user: functions.config().smtp?.user || '',
    pass: functions.config().smtp?.pass || '',
  },
});

// ─── On User Create ─────────────────────────────────────────────────────────
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role: 'user',
      purchasedCourses: [],
      registeredRetreats: [],
      emailVerified: user.emailVerified || false,
      createdAt: new Date().toISOString(),
    });

    // Send welcome email
    if (user.email) {
      await transporter.sendMail({
        from: '"Becky Pinder Yoga" <noreply@beckypinder.com>',
        to: user.email,
        subject: 'Welcome to Becky Pinder Yoga & Wellness',
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0D1B2A; padding: 30px; text-align: center;">
              <h1 style="color: #D4AF37; font-size: 28px; margin: 0;">Welcome, ${user.displayName || 'Beautiful Soul'}</h1>
            </div>
            <div style="padding: 30px; background: #fff;">
              <p>Thank you for joining the Becky Pinder Yoga community.</p>
              <p>With 35 years of devoted practice and over 15 years of teaching, I'm passionate about sharing the benefits of mindful awareness and focused intention to support every aspect of our being — physical, mental, emotional, and spiritual.</p>
              <p>Explore what's available:</p>
              <ul>
                <li><strong>Online Courses</strong> — Video-based yoga programs you can follow at your own pace</li>
                <li><strong>Luxury Retreats</strong> — Immersive wellness escapes in beautiful locations</li>
                <li><strong>Blog</strong> — Articles on yoga, wellness, and mindful living</li>
              </ul>
              <p style="margin-top: 20px;">With love & light,<br/><strong>Becky</strong></p>
            </div>
          </div>
        `,
      });
    }
  } catch (error) {
    console.error('Error creating user document:', error);
  }
});

// ─── On Order Create — Send Invoice ─────────────────────────────────────────
export const onOrderCreate = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap) => {
    const order = snap.data();
    if (!order || !order.userEmail) return;

    try {
      await transporter.sendMail({
        from: '"Becky Pinder Yoga" <noreply@beckypinder.com>',
        to: order.userEmail,
        subject: `Payment Confirmation — ${order.itemTitle}`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0D1B2A; padding: 30px; text-align: center;">
              <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">Payment Confirmed</h1>
            </div>
            <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
              <p>Dear ${order.userName},</p>
              <p>Thank you for your purchase! Here are your details:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666;">Item</td>
                  <td style="padding: 10px 0; font-weight: bold;">${order.itemTitle}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666;">Amount</td>
                  <td style="padding: 10px 0; font-weight: bold;">£${order.amount}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666;">Order ID</td>
                  <td style="padding: 10px 0; font-size: 12px;">${snap.id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666;">Date</td>
                  <td style="padding: 10px 0;">${new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                </tr>
              </table>
              ${order.type === 'course' ? `
                <div style="background: #f8f6f0; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: bold;">Your course is ready!</p>
                  <a href="https://beckypinder.com/dashboard" style="display: inline-block; background: #D4AF37; color: #0D1B2A; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Access Your Course</a>
                </div>
              ` : `
                <div style="background: #f8f6f0; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: bold;">Your retreat spot is confirmed!</p>
                  <p style="margin: 0; font-size: 14px; color: #666;">We'll be in touch with more details closer to the date.</p>
                </div>
              `}
              <p style="margin-top: 20px; font-size: 12px; color: #999;">If you have any questions, reply to this email or contact us at becky@beckypinder.com</p>
            </div>
          </div>
        `,
      });

      // Notify admin
      await transporter.sendMail({
        from: '"Becky Pinder Website" <noreply@beckypinder.com>',
        to: functions.config().admin?.email || 'becky@beckypinder.com',
        subject: `💰 New ${order.type} purchase: £${order.amount}`,
        html: `
          <p><strong>New purchase!</strong></p>
          <p>Customer: ${order.userName} (${order.userEmail})</p>
          <p>Item: ${order.itemTitle}</p>
          <p>Amount: £${order.amount}</p>
          <p>Type: ${order.type}</p>
        `,
      });
    } catch (error) {
      console.error('Error sending invoice email:', error);
    }
  });

// ─── Scheduled: Clean up expired OTPs ────────────────────────────────────────
export const cleanupExpiredOtps = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = new Date().toISOString();
    const expired = await db.collection('otps').where('expiresAt', '<', now).get();
    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Cleaned up ${expired.size} expired OTPs`);
  });

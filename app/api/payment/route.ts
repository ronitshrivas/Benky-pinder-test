import { NextRequest, NextResponse } from 'next/server';
import { Client, Environment } from 'square';
import { adminDb } from '@/lib/firebase-admin';
import { sendInvoiceEmail } from '@/lib/email';

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceId, amount, currency, userId, userEmail, userName, itemId, itemTitle, itemType, itemThumbnail, itemVideoUrl, paymentLabel } = body;
    const paymentCurrency = 'USD';
    if (currency && currency.toUpperCase() !== paymentCurrency) {
      console.warn(`Normalizing payment currency from ${currency} to ${paymentCurrency} for Square checkout.`);
    }

    // Validate required fields
    if (!sourceId || !amount || !userId || !userEmail || !itemId || !itemTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process payment with Square
    const { result } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `${userId.slice(-10)}_${itemId.slice(-10)}_${Date.now()}`,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // Convert to smallest currency unit
        currency: paymentCurrency,
      },
      buyerEmailAddress: userEmail,
      note: `${itemTitle}${paymentLabel ? ` - ${paymentLabel}` : ''} - ${userName}`,
    });

    if (result.payment?.status === 'COMPLETED') {
      // Create order record in Firestore
      const orderRef = adminDb.collection('orders').doc();
      const orderData = {
        id: orderRef.id,
        userId,
        userEmail,
        userName,
        itemId,
        itemTitle,
        type: itemType || 'course',
        amount,
        currency: paymentCurrency,
        status: 'completed',
        squarePaymentId: result.payment.id,
        squareReceiptUrl: result.payment.receiptUrl,
        itemThumbnail: itemThumbnail || '',
        itemVideoUrl: itemVideoUrl || '',
        paymentLabel: paymentLabel || '',
        createdAt: new Date().toISOString(),
      };
      await orderRef.set(orderData);

      // Grant course access to user
      if (itemType === 'course') {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const purchasedCourses = userData?.purchasedCourses || [];
        if (!purchasedCourses.includes(itemId)) {
          await userRef.update({
            purchasedCourses: [...purchasedCourses, itemId],
          });
        }
      } else if (itemType === 'retreat') {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const registeredRetreats = userData?.registeredRetreats || [];
        if (!registeredRetreats.includes(itemId)) {
          await userRef.update({
            registeredRetreats: [...registeredRetreats, itemId],
          });
        }
        // Decrease spots left
        const retreatRef = adminDb.collection('retreats').doc(itemId);
        const retreatDoc = await retreatRef.get();
        const retreatData = retreatDoc.data();
        if (retreatData && retreatData.spotsLeft > 0) {
          await retreatRef.update({ spotsLeft: retreatData.spotsLeft - 1, registrations: (retreatData.registrations || 0) + 1 });
        }
      }

      // Send invoice email, but don't fail the payment if email delivery breaks.
      try {
        await sendInvoiceEmail({
          to: userEmail,
          userName,
          itemTitle,
          amount,
          currency: paymentCurrency,
          orderId: orderRef.id,
          receiptUrl: result.payment.receiptUrl || '',
          type: itemType,
        });
      } catch (emailError) {
        console.error('Customer invoice email failed:', emailError);
      }

      // Notify Becky, but keep the payment successful even if SMTP is down.
      try {
        await sendInvoiceEmail({
          to: process.env.ADMIN_EMAIL || 'becky@beckypinder.com',
          userName: 'Admin Notification',
          itemTitle: `New ${itemType} purchase: ${itemTitle} by ${userName} (${userEmail})`,
          amount,
          currency: paymentCurrency,
          orderId: orderRef.id,
          receiptUrl: '',
          type: 'admin_notification',
        });
      } catch (emailError) {
        console.error('Admin notification email failed:', emailError);
      }

      return NextResponse.json({
        success: true,
        orderId: orderRef.id,
        receiptUrl: result.payment.receiptUrl,
      });
    } else {
      return NextResponse.json({ error: 'Payment not completed', status: result.payment?.status }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Payment error:', error);
    if (error?.code === 16 || /UNAUTHENTICATED/i.test(error?.message || '')) {
      return NextResponse.json(
        {
          error:
            'Firebase Admin authentication failed while saving the order. Your service account key is missing, revoked, or belongs to the wrong project.',
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: error.message || 'Payment processing failed' }, { status: 500 });
  }
}

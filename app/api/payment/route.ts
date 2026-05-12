import { NextRequest, NextResponse } from 'next/server';
import { Client, Environment } from 'square';
import { capturePayPalOrder } from '@/lib/paypal';
import { adminDb } from '@/lib/firebase-admin';
import { sendInvoiceEmail } from '@/lib/email';

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox,
});

// ─── Shared: write order + grant access + send emails ────────────────────────
async function fulfillOrder({
  provider,
  userId,
  userEmail,
  userName,
  itemId,
  itemTitle,
  itemType,
  amount,
  currency,
  itemThumbnail,
  itemVideoUrl,
  paymentLabel,
  squarePaymentId,
  squareReceiptUrl,
  paypalOrderId,
  paypalCaptureId,
}: {
  provider: 'square' | 'paypal';
  userId: string;
  userEmail: string;
  userName: string;
  itemId: string;
  itemTitle: string;
  itemType: string;
  amount: number;
  currency: string;
  itemThumbnail: string;
  itemVideoUrl: string;
  paymentLabel: string;
  squarePaymentId?: string;
  squareReceiptUrl?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
}) {
  const orderRef = adminDb.collection('orders').doc();
  const orderData: Record<string, any> = {
    id: orderRef.id,
    provider,
    userId,
    userEmail,
    userName,
    itemId,
    itemTitle,
    type: itemType || 'course',
    amount,
    currency,
    status: 'completed',
    itemThumbnail: itemThumbnail || '',
    itemVideoUrl: itemVideoUrl || '',
    paymentLabel: paymentLabel || '',
    createdAt: new Date().toISOString(),
    // Provider-specific fields (undefined values are excluded by Firestore)
    ...(squarePaymentId ? { squarePaymentId } : {}),
    ...(squareReceiptUrl ? { squareReceiptUrl } : {}),
    ...(paypalOrderId ? { paypalOrderId } : {}),
    ...(paypalCaptureId ? { paypalCaptureId } : {}),
  };
  await orderRef.set(orderData);

  // Grant course access
  if (itemType === 'course') {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const purchasedCourses = userDoc.data()?.purchasedCourses || [];
    if (!purchasedCourses.includes(itemId)) {
      await userRef.update({ purchasedCourses: [...purchasedCourses, itemId] });
    }
  }

  // Grant retreat access + decrement spots
  if (itemType === 'retreat') {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const registeredRetreats = userDoc.data()?.registeredRetreats || [];
    if (!registeredRetreats.includes(itemId)) {
      await userRef.update({ registeredRetreats: [...registeredRetreats, itemId] });
    }
    const retreatRef = adminDb.collection('retreats').doc(itemId);
    const retreatDoc = await retreatRef.get();
    const retreatData = retreatDoc.data();
    if (retreatData && retreatData.spotsLeft > 0) {
      await retreatRef.update({
        spotsLeft: retreatData.spotsLeft - 1,
        registrations: (retreatData.registrations || 0) + 1,
      });
    }
  }

  // Customer invoice email
  try {
    await sendInvoiceEmail({
      to: userEmail,
      userName,
      itemTitle,
      amount,
      currency,
      orderId: orderRef.id,
      receiptUrl: squareReceiptUrl || '',
      paymentLabel: paymentLabel || '',
      type: (itemType || 'course') as 'course' | 'retreat' | 'admin_notification',
    });
  } catch (emailError) {
    console.error('Customer invoice email failed:', emailError);
  }

  // Admin notification email
  try {
    await sendInvoiceEmail({
      to: process.env.ADMIN_EMAIL || 'becky@beckypinder.com',
      userName: 'Admin Notification',
      itemTitle: `New ${itemType} purchase [${provider}]: ${itemTitle} by ${userName} (${userEmail})`,
      amount,
      currency,
      orderId: orderRef.id,
      receiptUrl: '',
      paymentLabel: paymentLabel || '',
      type: 'admin_notification',
    });
  } catch (emailError) {
    console.error('Admin notification email failed:', emailError);
  }

  return orderRef.id;
}

// ─── POST /api/payment ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider = 'square',
      sourceId,         // Square token
      paypalOrderId,    // PayPal order id (after buyer approves)
      amount,
      currency = 'AUD',
      userId,
      userEmail,
      userName,
      itemId,
      itemTitle,
      itemType,
      itemThumbnail,
      itemVideoUrl,
      paymentLabel,
    } = body;

    const paymentCurrency = (currency || 'AUD').toUpperCase();

    // Validate common required fields
    if (!amount || !userId || !userEmail || !itemId || !itemTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Square path ──────────────────────────────────────────────────────────
    if (provider === 'square') {
      if (!sourceId) {
        return NextResponse.json({ error: 'Missing sourceId for Square payment' }, { status: 400 });
      }

      const { result } = await squareClient.paymentsApi.createPayment({
        sourceId,
        idempotencyKey: `${userId.slice(-10)}_${itemId.slice(-10)}_${Date.now()}`,
        amountMoney: {
          amount: BigInt(Math.round(amount * 100)),
          currency: paymentCurrency,
        },
        buyerEmailAddress: userEmail,
        note: `${itemTitle}${paymentLabel ? ` - ${paymentLabel}` : ''} - ${userName}`,
      });

      if (result.payment?.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Payment not completed', status: result.payment?.status },
          { status: 400 }
        );
      }

      const orderId = await fulfillOrder({
        provider: 'square',
        userId,
        userEmail,
        userName,
        itemId,
        itemTitle,
        itemType,
        amount,
        currency: paymentCurrency,
        itemThumbnail: itemThumbnail || '',
        itemVideoUrl: itemVideoUrl || '',
        paymentLabel: paymentLabel || '',
        squarePaymentId: result.payment.id,
        squareReceiptUrl: result.payment.receiptUrl,
      });

      return NextResponse.json({
        success: true,
        orderId,
        receiptUrl: result.payment.receiptUrl,
      });
    }

    // ── PayPal path ──────────────────────────────────────────────────────────
    if (provider === 'paypal') {
      if (!paypalOrderId) {
        return NextResponse.json({ error: 'Missing paypalOrderId for PayPal payment' }, { status: 400 });
      }

      const capture = await capturePayPalOrder(paypalOrderId);

      if (capture.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'PayPal payment not completed', status: capture.status },
          { status: 400 }
        );
      }

      const orderId = await fulfillOrder({
        provider: 'paypal',
        userId,
        userEmail,
        userName,
        itemId,
        itemTitle,
        itemType,
        amount,
        currency: paymentCurrency,
        itemThumbnail: itemThumbnail || '',
        itemVideoUrl: itemVideoUrl || '',
        paymentLabel: paymentLabel || '',
        paypalOrderId,
        paypalCaptureId: capture.captureId,
      });

      return NextResponse.json({ success: true, orderId });
    }

    return NextResponse.json({ error: `Unknown payment provider: ${provider}` }, { status: 400 });
  } catch (error: any) {
    console.error('Payment error:', error);
    if (error?.code === 16 || /UNAUTHENTICATED/i.test(error?.message || '')) {
      return NextResponse.json(
        {
          error:
            'Firebase Admin authentication failed while saving the order. Your service account key is missing, revoked, or belongs to the wrong project.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}

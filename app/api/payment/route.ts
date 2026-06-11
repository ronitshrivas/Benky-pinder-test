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

  // Grant course access (handles both standard courses and bundles)
  if (itemType === 'course' && !userId.startsWith('guest_')) {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const purchasedCourses = userDoc.data()?.purchasedCourses || [];
    const courseExpiry: Record<string, string> = userDoc.data()?.courseExpiry || {};
    
    // Fetch course details to see if it's a bundle
    const courseDoc = await adminDb.collection('courses').doc(itemId).get();
    const courseData = courseDoc.data();
    
    // Calculate 6 months from now
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    const expiryIso = expiryDate.toISOString();
    
    let nextCourses = [...purchasedCourses, itemId];
    courseExpiry[itemId] = expiryIso;
    
    if (courseData?.isBundle && Array.isArray(courseData.bundledCourses)) {
      nextCourses = [...nextCourses, ...courseData.bundledCourses];
      // Apply same expiry to all bundled courses
      for (const bundledId of courseData.bundledCourses) {
        courseExpiry[bundledId] = expiryIso;
      }
    }
    
    // Deduplicate array
    nextCourses = Array.from(new Set(nextCourses));
    
    await userRef.update({ 
      purchasedCourses: nextCourses,
      courseExpiry,
      updatedAt: new Date().toISOString(),
    });
  }

  // Grant retreat access
  if (itemType === 'retreat' && !userId.startsWith('guest_')) {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const registeredRetreats = userDoc.data()?.registeredRetreats || [];
    if (!registeredRetreats.includes(itemId)) {
      await userRef.update({ registeredRetreats: [...registeredRetreats, itemId] });
    }
  }

  // Customer invoice email
  try {
    const cleanUserEmail = userEmail.trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beckypinder.com.au';
    const courseAccessUrl = itemType === 'course' 
      ? `${appUrl}/dashboard/courses/${itemId}` 
      : undefined;

    await sendInvoiceEmail({
      to: cleanUserEmail,
      userName,
      itemTitle,
      amount,
      currency,
      orderId: orderRef.id,
      paymentId: squarePaymentId || paypalCaptureId,
      receiptUrl: squareReceiptUrl || '',
      paymentLabel: paymentLabel || '',
      type: (itemType || 'course') as 'course' | 'retreat' | 'admin_notification',
      courseAccessUrl,
    });
  } catch (emailError) {
    console.error('Customer invoice email failed:', emailError);
  }


  // Admin notification email
  try {
    await sendInvoiceEmail({
      to: process.env.ADMIN_EMAIL || 'becky@beckypinder.com.au',
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

      // 1. Check the merchant's location to verify currency support
      const { result: locationResult } = await squareClient.locationsApi.retrieveLocation(
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
      );
      const merchantCurrency = locationResult.location?.currency || 'AUD';

      if (paymentCurrency !== merchantCurrency) {
        return NextResponse.json(
          {
            error: `Currency Mismatch: Your Square account is set to ${merchantCurrency}, but you tried to charge in ${paymentCurrency}. To charge in ${paymentCurrency}, you must use a Square account registered in a country that supports it (e.g., Australia for AUD).`,
            merchantCurrency,
            requestedCurrency: paymentCurrency,
          },
          { status: 400 }
        );
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
    console.error('Global Payment API Error:', error);
    
    let message = error.message || 'Payment processing failed';
    let statusCode = 500;

    // 1. Handle Square specific API errors
    if (error.result && error.result.errors && Array.isArray(error.result.errors)) {
      const squareErrors = error.result.errors;
      if (squareErrors.length > 0) {
        // Extract the most descriptive message from the first error
        message = squareErrors[0].detail || squareErrors[0].message || message;
        statusCode = 400; // Client-side solvable usually if it's a Square API error
      }
    }

    // 2. Handle known string patterns in message
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('unauthenticated') || error.code === 16) {
      message = 'Internal database authentication error. Please try again later.';
      statusCode = 500;
    } else if (lowerMessage.includes('invalid_client')) {
      message = 'PayPal authentication failure. Please contact support.';
      statusCode = 500;
    } else if (lowerMessage.includes('insufficient_funds')) {
      message = 'Transaction declined: Insufficient funds.';
      statusCode = 400;
    } else if (lowerMessage.includes('cvv_failure')) {
      message = 'Transaction declined: Invalid CVV.';
      statusCode = 400;
    } else if (lowerMessage.includes('card_declined')) {
      message = 'Transaction declined: Your card was declined. Please try another card.';
      statusCode = 400;
    } else if (lowerMessage.includes('expired_card')) {
      message = 'Transaction declined: Your card has expired.';
      statusCode = 400;
    }

    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }

}

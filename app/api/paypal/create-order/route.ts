import { NextRequest, NextResponse } from 'next/server';
import { createPayPalOrder } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = 'AUD', itemTitle } = body;

    if (!amount || !itemTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, itemTitle' },
        { status: 400 }
      );
    }

    const orderId = await createPayPalOrder(
      Number(amount),
      currency.toUpperCase(),
      itemTitle
    );

    return NextResponse.json({ orderId });
  } catch (error: any) {
    console.error('PayPal create-order error:', error);
    const message = error.message || '';
    let friendlyMessage = 'Failed to create PayPal order';
    
    if (message.includes('invalid_client')) {
      friendlyMessage = 'PayPal authentication failed. Please contact the administrator.';
    }

    return NextResponse.json(
      { error: friendlyMessage },
      { status: 500 }
    );
  }
}

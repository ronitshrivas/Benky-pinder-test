import { Client, Environment } from 'square';

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' 
    ? Environment.Production 
    : Environment.Sandbox,
});

export const paymentsApi = squareClient.paymentsApi;
export const ordersApi = squareClient.ordersApi;

export async function processPayment(
  sourceId: string,
  amount: number,
  currency: string,
  buyerEmail: string,
  note: string
) {
  const idempotencyKey = crypto.randomUUID();
  
  const response = await paymentsApi.createPayment({
    sourceId,
    idempotencyKey,
    amountMoney: {
      amount: BigInt(Math.round(amount * 100)), // Convert to cents
      currency,
    },
    buyerEmailAddress: buyerEmail,
    note,
    locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  });

  return response.result;
}

import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = 'ptp-secret-verify';

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }
  console.warn('❌ Webhook verification failed');
  return new NextResponse('Verification failed', { status: 403 });
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    console.log('📩 Webhook event received:', JSON.stringify(body, null, 2));

    // Handle different types of webhook events here
    // For example:
    // - messages
    // - messaging_postbacks
    // - messaging_optins
    // etc.

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
};

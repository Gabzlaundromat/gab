import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { databaseService } from '@/lib/database';
import { OrderStatus, PaymentStatus } from '@/lib/types';
import { whatsappService } from '@/lib/notifications';

// Verify Paystack webhook signature
function verifyPaystackSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');
  
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyPaystackSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    
    console.log('Paystack webhook received:', event.event);

    switch (event.event) {
      case 'charge.success':
        await handlePaymentSuccess(event.data);
        break;
        
      case 'charge.failed':
        await handlePaymentFailed(event.data);
        break;
        
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
        
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
        
      default:
        console.log('Unhandled Paystack event:', event.event);
    }

    return NextResponse.json({ status: 'success' });
    
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(data: any) {
  try {
    const { reference, amount, customer, metadata } = data;
    
    if (!metadata?.orderId) {
      console.error('No orderId in payment metadata');
      return;
    }

    // Update order payment status
    const updateResponse = await databaseService.updateOrderPaymentStatus(
      metadata.orderId,
      PaymentStatus.PAID,
      reference,
      amount
    );

    if (updateResponse.success) {
      // Update order status to confirmed (payment received)
      await databaseService.updateOrderStatus(
        metadata.orderId,
        OrderStatus.CONFIRMED,
        'system',
        'Payment confirmed - Order ready for pickup'
      );

      // Send WhatsApp notification
      if (metadata.customerPhone && metadata.customerName) {
        await whatsappService.sendPickupConfirmation(
          metadata.customerPhone,
          metadata.customerName,
          metadata.orderNumber || metadata.orderId
        );
      }

      console.log(`Payment successful for order ${metadata.orderId}`);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(data: any) {
  try {
    const { reference, metadata } = data;
    
    if (!metadata?.orderId) {
      console.error('No orderId in payment metadata');
      return;
    }

    // Update order payment status
    await databaseService.updateOrderPaymentStatus(
      metadata.orderId,
      PaymentStatus.FAILED,
      reference,
      0
    );

    // Send payment failure notification
    if (metadata.customerPhone && metadata.customerName) {
      await whatsappService.sendPaymentReminder(
        metadata.customerPhone,
        metadata.customerName,
        metadata.orderNumber || metadata.orderId,
        metadata.amount || 0
      );
    }

    console.log(`Payment failed for order ${metadata.orderId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleTransferSuccess(data: any) {
  // Handle successful bank transfer
  console.log('Transfer successful:', data);
}

async function handleTransferFailed(data: any) {
  // Handle failed bank transfer
  console.log('Transfer failed:', data);
} 
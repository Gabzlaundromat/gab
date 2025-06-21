'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { paymentService } from '@/lib/payment';
import { databaseService } from '@/lib/database';

export default function PaymentCallbackPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
    orderNumber?: string;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const orderId = searchParams.get('orderId');

      if (!reference) {
        setVerificationResult({
          success: false,
          message: 'Payment reference not found'
        });
        setIsVerifying(false);
        return;
      }

      try {
        // Verify payment with Paystack
        const verificationResponse = await paymentService.verifyPayment(reference);

        if (verificationResponse.success && verificationResponse.data) {
          const paymentData = verificationResponse.data;

          if (paymentData.status === 'success') {
            // Payment successful
            let orderNumber = '';
            
            if (orderId) {
              // Get order details to show order number
              const orderResponse = await databaseService.getOrderById(orderId);
              if (orderResponse.success && orderResponse.data) {
                orderNumber = orderResponse.data.order.orderNumber;
              }
            }

            setVerificationResult({
              success: true,
              message: 'Payment successful! Your order has been confirmed.',
              orderId,
              orderNumber
            });

            // Redirect to order details after 3 seconds
            if (orderId) {
              setTimeout(() => {
                router.push(`/orders/${orderId}?payment=success`);
              }, 3000);
            }
          } else {
            // Payment failed
            setVerificationResult({
              success: false,
              message: 'Payment was not successful. Please try again.'
            });
          }
        } else {
          setVerificationResult({
            success: false,
            message: 'Unable to verify payment. Please contact support.'
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationResult({
          success: false,
          message: 'An error occurred while verifying payment.'
        });
      }

      setIsVerifying(false);
    };

    verifyPayment();
  }, [searchParams, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Payment
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your payment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {verificationResult?.success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Payment Successful! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                {verificationResult.message}
              </p>
              {verificationResult.orderNumber && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    <strong>Order Number:</strong> #{verificationResult.orderNumber}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    You'll receive WhatsApp notifications about your order status.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {verificationResult.orderId && (
                  <Link
                    href={`/orders/${verificationResult.orderId}`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    View Order Details
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {verificationResult?.message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/book"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Try Again
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Need help? Contact us at{' '}
                    <a href="tel:+234800GABZLAG" className="text-blue-600 hover:text-blue-700">
                      +234 800 GABZ LAG
                    </a>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
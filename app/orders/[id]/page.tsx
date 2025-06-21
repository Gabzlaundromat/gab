'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { PaystackButton } from '@/components/PaystackPayment';

interface OrderDetailsPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if redirected from successful payment
    if (searchParams.get('payment') === 'success') {
      setShowPaymentSuccess(true);
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }

    loadOrderDetails();
  }, [isAuthenticated, router, params.id, searchParams]);

  const loadOrderDetails = async () => {
    try {
      const response = await databaseService.getOrderById(params.id);
      
      if (response.success && response.data) {
        const { order: orderData, items } = response.data;
        
        // Check if user owns this order (for security)
        if (orderData.customerId !== user?.$id) {
          setError('Order not found or access denied');
          return;
        }
        
        setOrder(orderData);
        setOrderItems(items);
      } else {
        setError(response.error || 'Failed to load order details');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.CONFIRMED:
        return 'bg-blue-100 text-blue-800';
      case OrderStatus.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800';
      case OrderStatus.READY:
        return 'bg-green-100 text-green-800';
      case OrderStatus.DELIVERED:
        return 'bg-gray-100 text-gray-800';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return '⏳';
      case OrderStatus.CONFIRMED:
        return '✅';
      case OrderStatus.IN_PROGRESS:
        return '🧽';
      case OrderStatus.READY:
        return '📦';
      case OrderStatus.DELIVERED:
        return '🎉';
      case OrderStatus.CANCELLED:
        return '❌';
      default:
        return '📋';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-green-100 text-green-800';
      case PaymentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case PaymentStatus.FAILED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
              Gab'z Laundromat
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {showPaymentSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>Payment Successful!</strong> Your order has been confirmed and we'll start processing it soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
              <p className="text-gray-600 mt-1">
                Placed on {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{getStatusIcon(order.status)}</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getPaymentStatusColor(order.paymentStatus)}`}>
                  Payment: {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div key={item.$id} className="flex justify-between items-start border-b border-gray-200 pb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.itemDescription || 'Laundry Item'}</h3>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                        {item.weight && ` • Weight: ${item.weight}kg`}
                      </p>
                      {item.specialInstructions && (
                        <p className="text-sm text-blue-600 mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatNairaFromKobo(item.totalPrice)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatNairaFromKobo(item.unitPrice)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Addresses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Pickup Address</h3>
                  <p className="text-gray-600 text-sm">
                    {typeof order.pickupAddress === 'string' ? order.pickupAddress : 
                      `${order.pickupAddress.street}, ${order.pickupAddress.area}, ${order.pickupAddress.lga}`
                    }
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Delivery Address</h3>
                  <p className="text-gray-600 text-sm">
                    {typeof order.deliveryAddress === 'string' ? order.deliveryAddress : 
                      `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.lga}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Timeline</h2>
              <div className="space-y-4">
                {order.orderHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                      {getStatusIcon(entry.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {entry.status.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(entry.timestamp).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatNairaFromKobo(order.totalAmount)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatNairaFromKobo(order.discountAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-lg font-semibold">{formatNairaFromKobo(order.finalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium text-gray-900 mb-3">Payment Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Method</span>
                    <span className="font-medium capitalize">
                      {order.paymentMethod?.replace('_', ' ') || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium capitalize ${
                      order.paymentStatus === PaymentStatus.PAID ? 'text-green-600' : 
                      order.paymentStatus === PaymentStatus.PENDING ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Payment Action */}
                {order.paymentStatus === PaymentStatus.PENDING && order.paymentMethod === PaymentMethod.ONLINE && (
                  <div className="mt-4">
                    <PaystackButton
                      paymentData={{
                        email: user.email,
                        amount: order.finalAmount,
                        currency: 'NGN',
                        metadata: {
                          orderId: order.$id,
                          customerId: user.$id,
                          customerName: user.name,
                          phoneNumber: user.phone,
                          orderNumber: order.orderNumber
                        },
                        callback_url: `${window.location.origin}/payment/callback?orderId=${order.$id}`
                      }}
                      onSuccess={(reference: string) => {
                        console.log('Payment successful:', reference);
                        window.location.reload();
                      }}
                      onClose={() => {
                        console.log('Payment cancelled');
                      }}
                    >
                      Complete Payment
                    </PaystackButton>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-700 text-sm mb-4">
                Contact our customer support team for any questions about your order.
              </p>
              <div className="space-y-2 text-sm">
                <a href="tel:+234800GABZLAG" className="flex items-center text-blue-600 hover:text-blue-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +234 800 GABZ LAG
                </a>
                <a href="https://wa.me/234800GABZLAG" className="flex items-center text-blue-600 hover:text-blue-700">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  WhatsApp Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
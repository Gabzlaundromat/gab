'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderItem, Service } from '@/lib/types';
import OrderReceipt from '@/components/OrderReceipt';
import Link from 'next/link';

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadOrderData();
  }, [isAuthenticated, id, router]);

  const loadOrderData = async () => {
    try {
      // Load order and items
      const orderResponse = await databaseService.getOrderById(id as string);
      if (!orderResponse.success || !orderResponse.data) {
        setError('Order not found');
        return;
      }

      const { order, items } = orderResponse.data;
      
      // Verify this order belongs to the current user
      if (order.customerId !== user?.$id) {
        setError('Access denied');
        return;
      }

      setOrder(order);
      setOrderItems(items);

      // Load services
      const servicesResponse = await databaseService.getActiveServices();
      if (servicesResponse.success && servicesResponse.data) {
        setServices(servicesResponse.data);
      }

    } catch (error) {
      console.error('Failed to load order data:', error);
      setError('Failed to load order data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
          <p className="text-gray-600 mb-4">{error || 'The requested order could not be found.'}</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Gab'z Laundromat
              </Link>
              <span className="text-sm text-gray-500 hidden sm:block">
                Order Receipt
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Order Confirmed Successfully!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Your order #{order.orderNumber} has been received and confirmed. 
                {order.deliveryType === 'pickup' 
                  ? ' You can bring this receipt when visiting our store.'
                  : ' We will contact you to confirm the pickup time.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Receipt */}
        <OrderReceipt
          order={order}
          orderItems={orderItems}
          services={services}
          onPrint={handlePrint}
        />

        {/* Actions */}
        <div className="flex justify-center space-x-4 mt-8 print:hidden">
          <Link
            href={`/orders/${order.$id}`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            View Order Details
          </Link>
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 
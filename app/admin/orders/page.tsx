'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderStatus } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';

export default function AdminOrdersPage() {
  const { user, isAuthenticated, userRole } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') {
      router.push('/admin/login');
      return;
    }

    loadOrders();
  }, [isAuthenticated, userRole, router]);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus, searchTerm, dateFilter]);

  const loadOrders = async () => {
    try {
      // Load all orders (you might want to paginate this in a real app)
      const responses = await Promise.all([
        databaseService.getOrdersByStatus(OrderStatus.PENDING),
        databaseService.getOrdersByStatus(OrderStatus.PICKED_UP),
        databaseService.getOrdersByStatus(OrderStatus.IN_PROGRESS),
        databaseService.getOrdersByStatus(OrderStatus.READY),
        databaseService.getOrdersByStatus(OrderStatus.DELIVERED),
        databaseService.getOrdersByStatus(OrderStatus.CANCELLED)
      ]);

      const allOrders: Order[] = [];
      responses.forEach(response => {
        if (response.success && response.data) {
          allOrders.push(...response.data);
        }
      });

      // Sort by creation date (newest first)
      allOrders.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Filter by search term (order number or customer details)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        const orderNumberMatch = order.orderNumber.toLowerCase().includes(searchLower);
        
        // Handle address search based on delivery type
        let addressMatch = false;
        if (order.deliveryType === 'delivery') {
          const pickupAddressStr = order.pickupAddress ? 
            `${order.pickupAddress.street} ${order.pickupAddress.area} ${order.pickupAddress.lga}`.toLowerCase() : '';
          const deliveryAddressStr = order.deliveryAddress ? 
            `${order.deliveryAddress.street} ${order.deliveryAddress.area} ${order.deliveryAddress.lga}`.toLowerCase() : '';
          addressMatch = pickupAddressStr.includes(searchLower) || deliveryAddressStr.includes(searchLower);
        }
        
        return orderNumberMatch || addressMatch;
      });
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.$createdAt).toISOString().split('T')[0];
        return orderDate === dateFilter;
      });
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;

    try {
      const response = await databaseService.updateOrderStatus(
        orderId,
        newStatus,
        user.$id,
        `Status updated to ${newStatus} by ${user.name}`
      );

      if (response.success) {
        // Update local state
        setOrders(prev => 
          prev.map(order => 
            order.$id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.PICKED_UP:
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
      case OrderStatus.PICKED_UP:
        return '🚚';
      case OrderStatus.IN_PROGRESS:
        return '🧽';
      case OrderStatus.READY:
        return '✅';
      case OrderStatus.DELIVERED:
        return '📦';
      case OrderStatus.CANCELLED:
        return '❌';
      default:
        return '📋';
    }
  };

  const getNextStatusAction = (currentStatus: OrderStatus) => {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        return { status: OrderStatus.PICKED_UP, label: 'Mark Picked Up', color: 'blue' };
      case OrderStatus.PICKED_UP:
        return { status: OrderStatus.IN_PROGRESS, label: 'Start Processing', color: 'purple' };
      case OrderStatus.IN_PROGRESS:
        return { status: OrderStatus.READY, label: 'Mark Ready', color: 'green' };
      case OrderStatus.READY:
        return { status: OrderStatus.DELIVERED, label: 'Mark Delivered', color: 'gray' };
      default:
        return null;
    }
  };

  if (!isAuthenticated || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-2xl font-bold text-blue-600">
                Gab'z Admin
              </Link>
              <span className="text-sm text-gray-500 hidden sm:block">
                Order Management
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/customers"
                className="text-gray-600 hover:text-gray-900"
              >
                Customers
              </Link>
              <Link
                href="/admin/services"
                className="text-gray-600 hover:text-gray-900"
              >
                Services
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">
            Track and manage all customer orders across Lagos State
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Orders</option>
                <option value={OrderStatus.PENDING}>Pending</option>
                <option value={OrderStatus.PICKED_UP}>Picked Up</option>
                <option value={OrderStatus.IN_PROGRESS}>In Progress</option>
                <option value={OrderStatus.READY}>Ready</option>
                <option value={OrderStatus.DELIVERED}>Delivered</option>
                <option value={OrderStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order number, address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedStatus('all');
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="w-20 h-6 bg-gray-200 rounded"></div>
                      <div className="w-24 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-6 text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {orders.length === 0 
                  ? "No orders have been placed yet."
                  : "Try adjusting your filters to see more orders."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const nextAction = getNextStatusAction(order.status);
                
                return (
                  <div
                    key={order.$id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                          {getStatusIcon(order.status)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-600">
                            <p>
                              Created: {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p>
                              Type: {order.deliveryType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
                              {order.deliveryType === 'delivery' && order.pickupAddress && 
                                ` | Pickup: ${order.pickupAddress.area}, ${order.pickupAddress.lga}`
                              }
                            </p>
                            <p>Payment: {order.paymentMethod} | Amount: {formatNairaFromKobo(order.finalAmount)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {nextAction && (
                          <button
                            onClick={() => updateOrderStatus(order.$id, nextAction.status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              nextAction.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                              nextAction.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                              nextAction.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                              'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                          >
                            {nextAction.label}
                          </button>
                        )}
                        
                        <Link
                          href={`/admin/orders/${order.$id}`}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </Link>
                        
                        {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                          <button
                            onClick={() => updateOrderStatus(order.$id, OrderStatus.CANCELLED)}
                            className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        {filteredOrders.length > 20 && (
          <div className="mt-8 flex justify-center">
            <div className="text-sm text-gray-600">
              Showing first 20 orders. Pagination coming soon.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
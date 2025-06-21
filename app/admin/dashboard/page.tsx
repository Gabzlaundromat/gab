'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderStatus, Service } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, userRole, logout } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    todayRevenue: 0,
    totalCustomers: 0
  });

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') {
      router.push('/admin/login');
      return;
    }

    loadDashboardData();
  }, [isAuthenticated, userRole, router]);

  const loadDashboardData = async () => {
    try {
      // Load recent orders
      const recentOrdersResponse = await databaseService.getOrdersByStatus(OrderStatus.PENDING, 20);
      if (recentOrdersResponse.success && recentOrdersResponse.data) {
        setOrders(recentOrdersResponse.data);
      }

      // Load today's orders
      const today = new Date().toISOString().split('T')[0];
      const todayOrdersResponse = await databaseService.getOrdersByDate(today);
      if (todayOrdersResponse.success && todayOrdersResponse.data) {
        setTodayOrders(todayOrdersResponse.data);
        
        // Calculate today's revenue
        const revenue = todayOrdersResponse.data.reduce((sum, order) => sum + order.finalAmount, 0);
        setStats(prev => ({ ...prev, todayRevenue: revenue }));
      }

      // Load order statistics
      const pendingResponse = await databaseService.getOrdersByStatus(OrderStatus.PENDING);
      const inProgressResponse = await databaseService.getOrdersByStatus(OrderStatus.IN_PROGRESS);
      
      setStats(prev => ({
        ...prev,
        pendingOrders: pendingResponse.data?.length || 0,
        inProgressOrders: inProgressResponse.data?.length || 0,
        totalOrders: (pendingResponse.data?.length || 0) + (inProgressResponse.data?.length || 0)
      }));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
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
        // Refresh data
        loadDashboardData();
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

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  if (!isAuthenticated || userRole !== 'admin' || !user) {
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
                Staff Dashboard
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/orders"
                className="text-gray-600 hover:text-gray-900"
              >
                Orders
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
              
              <div className="relative">
                <button
                  onClick={() => {
                    const menu = document.getElementById('admin-menu');
                    menu?.classList.toggle('hidden');
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block">{user.name}</span>
                </button>
                
                <div id="admin-menu" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user.name}! Manage orders and monitor business operations.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgressOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatNairaFromKobo(stats.todayRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                <p className="text-2xl font-bold text-gray-900">{todayOrders.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link
            href="/admin/orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">New Order</h3>
                <p className="text-blue-100 text-sm">Create manual order</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/services/manage"
            className="bg-white hover:bg-gray-50 border border-gray-200 p-6 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Services</h3>
                <p className="text-gray-600 text-sm">Update pricing & availability</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="bg-white hover:bg-gray-50 border border-gray-200 p-6 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reports</h3>
                <p className="text-gray-600 text-sm">View analytics & insights</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/timeslots"
            className="bg-white hover:bg-gray-50 border border-gray-200 p-6 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Time Slots</h3>
                <p className="text-gray-600 text-sm">Manage availability</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Pending Orders</h2>
              <Link
                href="/admin/orders"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all orders
              </Link>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="w-20 h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending orders</h3>
                <p className="text-gray-600">
                  All caught up! No orders waiting for processing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 10).map((order) => (
                  <div
                    key={order.$id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatNairaFromKobo(order.finalAmount)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateOrderStatus(order.$id, OrderStatus.PICKED_UP)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Mark Picked Up
                        </button>
                        <Link
                          href={`/admin/orders/${order.$id}`}
                          className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
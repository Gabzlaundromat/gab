'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service, ServiceType } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';

export default function ServicesPage() {
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('');

  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: ServiceType.WASH_FOLD, label: 'Wash & Fold' },
    { value: ServiceType.DRY_CLEANING, label: 'Dry Cleaning' },
    { value: ServiceType.IRONING, label: 'Ironing' },
    { value: ServiceType.EXPRESS, label: 'Express' }
  ];

  const lagosAreas = [
    'Lagos Island', 'Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja', 
    'Surulere', 'Yaba', 'Gbagada', 'Magodo', 'Ojodu'
  ];

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, selectedType, selectedArea]);

  const loadServices = async () => {
    try {
      const response = await databaseService.getActiveServices();
      if (response.success && response.data) {
        setServices(response.data);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    if (selectedType !== 'all') {
      filtered = filtered.filter(service => service.type === selectedType);
    }

    if (selectedArea) {
      filtered = filtered.filter(service => 
        service.availableAreas.includes(selectedArea)
      );
    }

    setFilteredServices(filtered);
  };

  const getServiceIcon = (type: ServiceType) => {
    switch (type) {
      case ServiceType.WASH_FOLD:
        return '🧺';
      case ServiceType.DRY_CLEANING:
        return '👔';
      case ServiceType.IRONING:
        return '👕';
      case ServiceType.EXPRESS:
        return '⚡';
      default:
        return '🧽';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Gab'z Laundromat
              </Link>
              <span className="text-sm text-gray-500 hidden sm:block">
                Our Services
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900"
              >
                Home
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Our Laundry Services</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Professional cleaning services designed for Lagos lifestyle. 
              From everyday wash & fold to premium dry cleaning.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Service Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ServiceType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Area Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Area
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Areas</option>
                {lagosAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredServices.length} of {services.length} services
          </div>
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or check back later for more services.
            </p>
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedArea('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service) => (
              <div
                key={service.$id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="p-6">
                  {/* Service header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getServiceIcon(service.type)}</span>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {service.name}
                        </h3>
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                          {service.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {service.description}
                  </p>

                  {/* Pricing */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Base Price:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatNairaFromKobo(service.basePrice)}
                      </span>
                    </div>
                    
                    {service.pricePerKg && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Per kg:</span>
                        <span className="text-sm font-medium text-gray-700">
                          {formatNairaFromKobo(service.pricePerKg)}
                        </span>
                      </div>
                    )}

                    {service.pricePerItem && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Per item:</span>
                        <span className="text-sm font-medium text-gray-700">
                          {formatNairaFromKobo(service.pricePerItem)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">Duration:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {service.estimatedDuration} hours
                    </span>
                  </div>

                  {/* Service areas */}
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">
                      Available in:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {service.availableAreas.slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {area}
                        </span>
                      ))}
                      {service.availableAreas.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{service.availableAreas.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={isAuthenticated ? `/book?service=${service.$id}` : '/register'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg font-medium transition-colors block"
                  >
                    {isAuthenticated ? 'Book This Service' : 'Sign Up to Book'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Book Your Laundry Service?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Quick pickup, professional cleaning, and convenient delivery across Lagos State.
          </p>
          <Link
            href={isAuthenticated ? "/book" : "/register"}
            className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-block"
          >
            {isAuthenticated ? "Book Service Now" : "Get Started Today"}
          </Link>
        </div>
      </div>
    </div>
  );
}
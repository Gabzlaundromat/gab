'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeaturedServices();
  }, []);

  const loadFeaturedServices = async () => {
    try {
      const response = await databaseService.getActiveServices();
      if (response.success && response.data) {
        // Get first 3 services for featured section
        setFeaturedServices(response.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">
                Gab'z Laundromat
              </div>
              <span className="text-sm text-gray-500 hidden sm:block">
                Lagos Premier Laundry Service
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Welcome, {user?.name}
                  </span>
                  <Link
                    href="/dashboard"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Lagos Premier 
              <br />
              <span className="text-blue-200">Laundry Service</span>
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Professional laundry pickup and delivery service across Lagos State. 
              Perfect for busy professionals, entrepreneurs, and Gen Z customers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href={isAuthenticated ? "/book" : "/register"}
                className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors w-full sm:w-auto"
              >
                Book Laundry Service
              </Link>
              <Link
                href="/services"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors w-full sm:w-auto"
              >
                View Services
              </Link>
            </div>

            {/* Service Areas */}
            <div className="text-center">
              <p className="text-blue-200 mb-4">Serving Lagos Areas:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {['Lagos Island', 'Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja', 'Surulere'].map((area) => (
                  <span
                    key={area}
                    className="bg-blue-500/30 text-blue-100 px-3 py-1 rounded-full text-sm"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Gab'z Laundromat?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We understand the fast-paced lifestyle in Lagos. That's why we've designed our service 
              to be as convenient and reliable as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick Pickup & Delivery</h3>
              <p className="text-gray-600">
                Same-day pickup and 24-48 hour turnaround across Lagos State
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Quality</h3>
              <p className="text-gray-600">
                Expert care for all fabric types with eco-friendly cleaning solutions
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Online Booking</h3>
              <p className="text-gray-600">
                Book online, track your order, and pay with multiple Nigerian payment options
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-lg text-gray-600">
              Professional laundry services tailored for Lagos lifestyle
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {featuredServices.map((service) => (
                <div key={service.$id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {formatNairaFromKobo(service.basePrice)}
                      {service.pricePerKg && <span className="text-sm text-gray-500">/kg</span>}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {service.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              href="/services"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Simple steps to get your laundry done professionally
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center font-bold text-xl">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Book Online</h3>
              <p className="text-gray-600">
                Schedule pickup time and select your services
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center font-bold text-xl">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We Pickup</h3>
              <p className="text-gray-600">
                Our team collects your laundry from your location
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center font-bold text-xl">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We Clean</h3>
              <p className="text-gray-600">
                Professional cleaning with care and attention
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center font-bold text-xl">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We Deliver</h3>
              <p className="text-gray-600">
                Fresh, clean clothes delivered back to you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Experience Lagos' Best Laundry Service?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers across Lagos State. Book your first pickup today!
          </p>
          <Link
            href={isAuthenticated ? "/book" : "/register"}
            className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-block"
          >
            {isAuthenticated ? "Book Now" : "Get Started Today"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Gab'z Laundromat</h3>
              <p className="text-gray-400 mb-4">
                Lagos Premier Laundry Service providing convenient pickup and delivery 
                across Lagos State.
              </p>
              <p className="text-gray-400">
                📞 +234 800 000 0000<br />
                📧 hello@gabzlaundromat.com
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Wash & Fold</li>
                <li>Dry Cleaning</li>
                <li>Ironing Service</li>
                <li>Express Service</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Service Areas</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Lagos Island</li>
                <li>Victoria Island</li>
                <li>Ikoyi</li>
                <li>Lekki</li>
                <li>Ikeja</li>
                <li>Surulere</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Gab'z Laundromat. All rights reserved. | Lagos State, Nigeria</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

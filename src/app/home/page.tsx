import Link from 'next/link'
import React from 'react'
import { GamificationWidget } from '@/components/gamification'
import { TrackPageView } from '@/components/gamification/ActivityTracker'

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <TrackPageView page="home" delay={3000} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to StudyHub
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your ultimate platform for collaborative learning and academic success
          </p>

          {/* Gamification Quick Stats */}
          <div className="flex justify-center mb-6">
            <GamificationWidget type="quick-stats" />
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Find Study Buddies - Featured */}
          <Link href="/matches/request" className="group">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <span className="material-symbols-outlined text-3xl mr-3">group</span>
                <h3 className="text-xl font-semibold">Find Study Buddies</h3>
              </div>
              <p className="text-blue-100 mb-4">
                Connect with like-minded students for collaborative learning
              </p>
              <div className="flex items-center text-white font-medium">
                <span>Get Started</span>
                <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </Link>

          {/* Browse Courses */}
          <Link href="/courses" className="group">
            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
              <div className="flex items-center mb-4">
                <span className="material-symbols-outlined text-3xl mr-3 text-green-600">school</span>
                <h3 className="text-xl font-semibold text-gray-900">Browse Courses</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Explore course materials and join discussions
              </p>
              <div className="flex items-center text-green-600 font-medium">
                <span>Explore</span>
                <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </Link>

          {/* Access Resources */}
          <Link href="/resources" className="group">
            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
              <div className="flex items-center mb-4">
                <span className="material-symbols-outlined text-3xl mr-3 text-orange-600">library_books</span>
                <h3 className="text-xl font-semibold text-gray-900">Study Resources</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Access shared notes, documents, and study materials
              </p>
              <div className="flex items-center text-orange-600 font-medium">
                <span>Browse</span>
                <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </Link>

          {/* Gamification Hub */}
          <Link href="/gamification" className="group">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <span className="material-symbols-outlined text-3xl mr-3">emoji_events</span>
                <h3 className="text-xl font-semibold">Achievements</h3>
              </div>
              <p className="text-yellow-100 mb-4">
                Track your progress and compete with fellow students
              </p>
              <div className="flex items-center text-white font-medium">
                <span>View Progress</span>
                <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats or Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/profile" className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined text-2xl text-blue-600 mr-3">person</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Your Profile</h3>
                  <p className="text-sm text-gray-600">View and edit your profile</p>
                </div>
              </Link>

              <Link href="/discussions" className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined text-2xl text-purple-600 mr-3">forum</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Discussions</h3>
                  <p className="text-sm text-gray-600">Join course discussions</p>
                </div>
              </Link>

              <Link href="/matches/results" className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined text-2xl text-green-600 mr-3">diversity_3</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Your Matches</h3>
                  <p className="text-sm text-gray-600">View study buddy matches</p>
                </div>
              </Link>

              <Link href="/gamification" className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined text-2xl text-yellow-600 mr-3">emoji_events</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Achievements</h3>
                  <p className="text-sm text-gray-600">Track your progress</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Gamification Sidebar */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Progress</h2>
            <GamificationWidget type="stats" size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
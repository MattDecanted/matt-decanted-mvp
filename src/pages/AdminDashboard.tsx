import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p className="text-gray-600 mb-6">Manage your wine education platform</p>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Total Users</p>
          <h2 className="text-2xl font-bold">1,247</h2>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Active Subscribers</p>
          <h2 className="text-2xl font-bold">456</h2>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Courses</p>
          <h2 className="text-2xl font-bold">12</h2>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Modules</p>
          <h2 className="text-2xl font-bold">67</h2>
        </div>
      </div>

      {/* Management Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-700 mb-1">📚 Course Management</h3>
          <p className="text-sm text-gray-600 mb-2">Create and manage wine education courses</p>
          <Link to="/admin/courses" className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Courses
          </Link>
        </div>

        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-700 mb-1">👥 User Management</h3>
          <p className="text-sm text-gray-600 mb-2">Manage user accounts and roles</p>
          <Link to="/admin/users" className="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Users
          </Link>
        </div>

        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-700 mb-1">📩 Lead Management</h3>
          <p className="text-sm text-gray-600 mb-2">View and export leads</p>
          <Link to="/admin/leads" className="inline-block mt-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded">
            View Leads
          </Link>
        </div>

        <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-700 mb-1">💬 Community Management</h3>
          <p className="text-sm text-gray-600 mb-2">Manage discussions and events</p>
          <Link to="/admin/community" className="inline-block mt-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Community
          </Link>
        </div>

        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-700 mb-1">🎥 Media Library</h3>
          <p className="text-sm text-gray-600 mb-2">Manage videos and downloads</p>
          <Link to="/admin/media" className="inline-block mt-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Media
          </Link>
        </div>

        <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-indigo-700 mb-1">📈 Analytics & Reports</h3>
          <p className="text-sm text-gray-600 mb-2">View detailed analytics</p>
          <Link to="/admin/analytics" className="inline-block mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded">
            Analytics
          </Link>
        </div>

        <div className="bg-sky-100 border border-sky-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-sky-700 mb-1">🌐 Translation Management</h3>
          <p className="text-sm text-gray-600 mb-2">Manage multi-language content</p>
          <Link to="/admin/translations" className="inline-block mt-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Translations
          </Link>
        </div>

        <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-orange-700 mb-1">📄 Content Items</h3>
          <p className="text-sm text-gray-600 mb-2">Manage special content</p>
          <Link to="/admin/content" className="inline-block mt-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Content
          </Link>
        </div>

        <div className="bg-pink-100 border border-pink-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-pink-700 mb-1">🧩 Swirdle Management</h3>
          <p className="text-sm text-gray-600 mb-2">Manage daily word puzzles</p>
          <Link to="/admin/swirdle" className="inline-block mt-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Swirdle
          </Link>
        </div>

        <div className="bg-lime-100 border border-lime-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-lime-700 mb-1">🕵️‍♂️ Guess What Challenges</h3>
          <p className="text-sm text-gray-600 mb-2">Manage weekly blind challenges</p>
          <Link to="/admin/guess-what" className="inline-block mt-2 bg-lime-600 hover:bg-lime-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Challenges
          </Link>
        </div>

        <div className="bg-pink-100 border border-pink-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-pink-700 mb-1">📘 Vocab Challenge Management</h3>
          <p className="text-sm text-gray-600 mb-2">Manage daily wine vocab quizzes</p>
          <Link to="/admin/vocab" className="inline-block mt-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Vocab Quizzes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

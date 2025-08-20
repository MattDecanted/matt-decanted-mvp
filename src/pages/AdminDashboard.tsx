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
        {/* Existing cards ... */}
        {/* ... all unchanged blocks above ... */}

        <div className="bg-pink-100 border border-pink-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-pink-700 mb-1">📘 Vocab Challenge Management</h3>
          <p className="text-sm text-gray-600 mb-2">Manage daily wine vocab quizzes</p>
          <Link to="/admin/vocab" className="inline-block mt-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Vocab Quizzes
          </Link>
        </div>

        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-700 mb-1">📊 Trial Quiz Management</h3>
          <p className="text-sm text-gray-600 mb-2">Create and schedule short quizzes</p>
          <Link to="/admin/quizzes" className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded">
            Manage Quizzes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  // TEMP: Replace with real role check
  const isAdmin = user?.email === 'trish@smidgewines.com';

  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-bold text-center">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/swirdle">
          <Card className="hover:shadow-lg transition">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">🟣 Swirdle Manager</h2>
              <p>Edit daily wine words & hints</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/courses">
          <Card className="hover:shadow-lg transition">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">🟢 Course Manager</h2>
              <p>Create, update, or delete wine lessons</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/testimonials">
          <Card className="hover:shadow-lg transition">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">🟠 Testimonials</h2>
              <p>View and manage social proof</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;

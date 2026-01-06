
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Layout } from './components/Layout';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/Admin';
import { db } from './services/db';
import { UserRole } from './types';

const PrivateRoute: React.FC<{ children: React.ReactElement, adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const user = db.getCurrentUser();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== UserRole.ADMIN) return <Navigate to="/dashboard" />;
  return children;
};

const App: React.FC = () => {
  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <PrivateRoute adminOnly>
                  <AdminPanel />
                </PrivateRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
      <Analytics />
    </>
  );
};

export default App;

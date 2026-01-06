
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import Welcome from './pages/Welcome.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AdminPanel from './pages/Admin.tsx';
import { db } from './services/db.ts';
import { UserRole } from './types.ts';

const PrivateRoute: React.FC<{ children: React.ReactElement, adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const user = db.getCurrentUser();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== UserRole.ADMIN) return <Navigate to="/dashboard" />;
  return children;
};

const App: React.FC = () => {
  return (
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
  );
};

export default App;
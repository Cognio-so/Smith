import React from 'react';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from "./context/AuthContext"
import Dashboard from './pages/Dashboard';
import SettingsPage from './components/SettingsPage';
import HomePage from './pages/HomePage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Add this div to index.html or create it dynamically
const portalContainer = document.createElement('div');
portalContainer.id = 'overlay-root';
document.body.appendChild(portalContainer);

const App = () => {
  return (
    <AuthProvider>
      <div className="relative">
        <Routes>
          <Route path='/' element={<HomePage/>}/>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;

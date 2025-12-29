// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import AdminDashboard from './pages/adminDashboard';
import AdminPortal from './pages/AdminPortal';
import UnitDashboard from './pages/UnitDashboard';
import UserDashboard from './pages/UserDashboard';
import SimulationMap from './pages/SimulationMap';
import Analytics from './pages/Analytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import websocketService from './services/websocketService';
import './App.css';
import SigninPage from "./components/SigninPage";

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (user) {
      console.log('User authenticated, connecting WebSocket...');
      websocketService.connect().catch(err => {
        console.error('Failed to connect to WebSocket:', err);
      });
    } else {
      console.log('User not authenticated, disconnecting WebSocket...');
      websocketService.disconnect();
    }

    return () => {
      // Clean up on unmount
      websocketService.disconnect();
    };
  }, [user]);

  return (
    <Routes>
      <Route path="/signin" element={<SigninPage />}/>
      <Route path="/" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPortal />
        </ProtectedRoute>
      } />
      <Route path="/units" element={
        <ProtectedRoute>
          <UnitDashboard />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <UserDashboard />
        </ProtectedRoute>
      } />
      <Route path="/simulation" element={
        <ProtectedRoute>
          <SimulationMap />
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
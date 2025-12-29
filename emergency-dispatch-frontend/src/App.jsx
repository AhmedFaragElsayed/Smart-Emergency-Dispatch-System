import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import SigninPage from "./components/SigninPage"

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (user) {
      websocketService.connect().catch(err => {
        console.error('Failed to connect to WebSocket:', err);
      });
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
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

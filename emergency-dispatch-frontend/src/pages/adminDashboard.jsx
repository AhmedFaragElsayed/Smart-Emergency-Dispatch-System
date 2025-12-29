import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import '../styles/adminDashBoard.css';

function AdminDashBoard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="home-page">
      <div className="hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <h1>🚨 Smart Emergency Dispatch System</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'white', fontWeight: '600' }}>Welcome, {user?.userName || 'User'}</span>
            <NotificationBell />
            <button 
              onClick={() => { logout(); navigate('/signin'); }}
              style={{
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      <div className="navigation-cards">
        <div className="nav-card" onClick={() => navigate('/admin')}>
          <div className="nav-card-icon">👨‍💼</div>
          <h2>Admin Portal</h2>
          <p>Manage incidents and dispatch emergency units</p>
          <button className="nav-button">Go to Admin Portal →</button>
        </div>
        
        <div className="nav-card" onClick={() => navigate('/simulation')}>
          <div className="nav-card-icon">🗺️</div>
          <h2>Simulation Map</h2>
          <p>View real-time simulation of emergency incidents</p>
          <button className="nav-button">Go to Simulation Map →</button>
        </div>
        
        <div className="nav-card" onClick={() => navigate('/units')}>
          <div className="nav-card-icon">🚑</div>
          <h2>Unit Dashboard</h2>
          <p>Manage emergency units and their availability</p>
          <button className="nav-button">Go to Unit Dashboard →</button>
        </div>
        
        <div className="nav-card" onClick={() => navigate('/users')}>
          <div className="nav-card-icon">👨‍💼👩‍💼</div>
          <h2>User Dashboard</h2>
          <p>Users adding and removing</p>
          <button className="nav-button">Go to User Dashboard →</button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashBoard;

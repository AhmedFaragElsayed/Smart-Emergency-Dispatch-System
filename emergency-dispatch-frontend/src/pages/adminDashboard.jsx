import { useNavigate } from 'react-router-dom';
import '../styles/adminDashBoard.css';

function AdminDashBoard() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="hero">
        <h1>🚨 Smart Emergency Dispatch System</h1>
      </div>
      
      <div className="navigation-cards">
        <div className="nav-card" onClick={() => navigate('/admin')}>
          <div className="nav-card-icon">👨‍💼</div>
          <h2>Admin Portal</h2>
          <p>Manage incidents and dispatch emergency units</p>
          <button className="nav-button">Go to Admin Portal →</button>
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

import { useState } from 'react'
import AdminPortal from './pages/AdminPortal'
import UnitDashboard from './pages/UnitDashboard'
// import userDashBoard from './pages/userDashBoard'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'admin':
        return <AdminPortal />
      case 'unit':
        return <UnitDashboard />
      case 'user':
        return <userDashBoard />
      default:
        return (
          <div className="home-page">
            <div className="hero">
              <h1>🚨 Smart Emergency Dispatch System</h1>
            </div>
            
            <div className="navigation-cards">
              <div className="nav-card" onClick={() => setCurrentPage('admin')}>
                <div className="nav-card-icon">👨‍💼</div>
                <h2>Admin Portal</h2>
                <p>Manage incidents and dispatch emergency units</p>
                <button className="nav-button">Go to Admin Portal →</button>
              </div>
              
              <div className="nav-card" onClick={() => setCurrentPage('unit')}>
                <div className="nav-card-icon">🚑</div>
                <h2>Unit Dashboard</h2>
                <p>Manage emergency units and their availability</p>
                <button className="nav-button">Go to Unit Dashboard →</button>
              </div>
              
              <div className="nav-card" onClick={() => setCurrentPage('user')}>
                <div className="nav-card-icon">👨‍💼👩‍💼</div>
                <h2>User Dashboard</h2>
                <p>Users adding and removing</p>
                <button className="nav-button">Go to User Dashboard →</button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app">
      {currentPage !== 'home' && (
        <nav className="top-nav">
          <button className="back-button" onClick={() => setCurrentPage('home')}>
            ← Back to Home
          </button>
        </nav>
      )}
      {renderPage()}
    </div>
  )
}

export default App

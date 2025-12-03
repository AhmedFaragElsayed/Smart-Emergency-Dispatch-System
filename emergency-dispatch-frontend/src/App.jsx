import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/adminDashboard';
import AdminPortal from './pages/AdminPortal';
import UnitDashboard from './pages/UnitDashboard';
// import UserDashboard from './pages/UserDashboard';
import './App.css';
import SigninPage from "./components/SigninPage"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/units" element={<UnitDashboard />} />
        <Route path="/signin" element={<SigninPage />}/>
        {/* <Route path="/users" element={<UserDashboard />} /> */}
      </Routes>
    </Router>
  );
}
export default App;

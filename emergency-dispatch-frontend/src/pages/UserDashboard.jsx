import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import NotificationBell from '../components/NotificationBell';
import OverdueAlert from '../components/OverdueAlert';
import '../styles/UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    userName: '',
    fname: '',
    lname: '',
    password: '',
    role: 'Admin'
  });
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await apiService.fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiService.updateUser(editingUser.userID, formData);
      } else {
        await apiService.createUser(formData);
      }
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      userName: user.userName,
      fname: user.fname,
      lname: user.lname,
      password: user.password || '',
      role: user.role
    });
    setIsFormVisible(true);
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find(u => u.userID === id);
    const userName = userToDelete ? `${userToDelete.fname} ${userToDelete.lname} (${userToDelete.userName})` : `User #${id}`;
    
    if (confirm(`Are you sure you want to delete ${userName}?`)) {
      try {
        console.log('Deleting user with ID:', id);
        await apiService.deleteUser(id);
        alert(`User ${userName} deleted successfully`);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        alert(`Failed to delete user: ${errorMessage}\n\nThis user might not exist or there might be a server error.`);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      userName: '',
      fname: '',
      lname: '',
      password: '',
      role: 'Admin'
    });
    setEditingUser(null);
    setIsFormVisible(false);
  };

  const userRoles = ['Admin'];

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <button className="back-button" onClick={() => navigate('/')}>← Back to Home</button>
        <h1>👨‍💼 User Management</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <NotificationBell />
          <OverdueAlert />
          <button 
            className="btn-primary" 
            onClick={() => setIsFormVisible(!isFormVisible)}
          >
            {isFormVisible ? 'Cancel' : 'Add New User'}
          </button>
        </div>
      </div>

      {isFormVisible && (
        <div className="user-form-container">
          <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="userName">Username *</label>
                <input
                  id="userName"
                  type="text"
                  value={formData.userName}
                  onChange={(e) => setFormData({...formData, userName: e.target.value})}
                  required
                  placeholder="Enter username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                >
                  {userRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fname">First Name *</label>
                <input
                  id="fname"
                  type="text"
                  value={formData.fname}
                  onChange={(e) => setFormData({...formData, fname: e.target.value})}
                  required
                  placeholder="Enter first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lname">Last Name *</label>
                <input
                  id="lname"
                  type="text"
                  value={formData.lname}
                  onChange={(e) => setFormData({...formData, lname: e.target.value})}
                  required
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required={!editingUser}
                placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingUser ? '✓ Update User' : '➕ Add User'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-container">
        <h2>All Users ({users.length})</h2>
        {users.length === 0 ? (
          <div className="no-users">
            <p>No users available. Add one to get started!</p>
          </div>
        ) : (
          <div className="users-grid">
            {users.map(user => (
              <div key={user.userID} className="user-card">
                <div className="user-header">
                  <div className="user-id">#{user.userID}</div>
                  <div className={`user-role role-${user.role.toLowerCase()}`}>
                    {user.role}
                  </div>
                </div>
                
                <div className="user-body">
                  <div className="user-icon">
                    {user.role === 'Admin' && '👨‍💼'}
                    {user.role === 'Dispatcher' && '📞'}
                    {user.role === 'Manager' && '🎯'}
                    {user.role === 'Operator' && '🎧'}
                  </div>
                  <h3>{user.fname} {user.lname}</h3>
                  
                  <div className="user-details">
                    <div className="detail-item">
                      <span className="detail-label">User ID:</span>
                      <span className="detail-value">#{user.userID}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Username:</span>
                      <span className="detail-value">{user.userName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">First Name:</span>
                      <span className="detail-value">{user.fname}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Name:</span>
                      <span className="detail-value">{user.lname}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Role:</span>
                      <span className="detail-value">{user.role}</span>
                    </div>
                  </div>
                </div>

                <div className="user-actions">
                  <button 
                    className="btn-edit" 
                    onClick={() => handleEdit(user)}
                    title="Edit user"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn-delete" 
                    onClick={() => handleDelete(user.userID)}
                    title="Delete user"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiService {
  async fetchIncidents() {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents`);
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching incidents:', error);
      throw error;
    }
  }

  async fetchEmergencyUnits(incidentType) {
    try {
      const url = `${API_BASE_URL}/emergency-units?type=${incidentType}`;
      console.log('Fetching emergency units from:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch emergency units (Status: ${response.status})`);
      }
      const data = await response.json();
      console.log('Fetched units:', data);
      return data;
    } catch (error) {
      console.error('Error fetching emergency units:', error);
      throw error;
    }
  }

  async dispatchIncident(incidentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to dispatch incident');
      }
      return await response.json();
    } catch (error) {
      console.error('Error dispatching incident:', error);
      throw error;
    }
  }

  async assignUnit(unitId, incidentId, userId) {
    try {
      // Use the provided userId from the logged-in user
      const userIdToUse = userId || 2; // Fallback to 2 if not provided
      const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unitId, incidentId, userId: userIdToUse }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to assign unit';
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error('Error assigning unit:', error);
      throw error;
    }
  }

  async createUnit(unitData) {
    const response = await fetch(`${API_BASE_URL}/emergency-units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unitData),
    });
    if (!response.ok) throw new Error('Failed to create unit');
    return await response.json();
  }

  async updateUnit(unitId, unitData) {
    const response = await fetch(`${API_BASE_URL}/emergency-units/${unitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unitData),
    });
    if (!response.ok) throw new Error('Failed to update unit');
    return await response.json();
  }

  async deleteUnit(unitId) {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-units/${unitId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => '');
        const errorMessage = errorData || `Failed to delete unit (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteUnit:', error);
      throw error;
    }
  }

  async fetchUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async createUser(userData) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return await response.json();
  }

  async updateUser(userId, userData) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return await response.json();
  }

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => '');
        const errorMessage = errorData || `Failed to delete user (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }
}

const apiService = new ApiService();
export default apiService;

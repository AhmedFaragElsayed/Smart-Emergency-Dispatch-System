// src/services/apiService.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9696';

class ApiService {
  // Authentication
  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Incidents
  async fetchIncidents() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents`);
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching incidents:', error);
      throw error;
    }
  }

  // Emergency Units
  async fetchEmergencyUnits(type = '') {
    try {
      let url = `${API_BASE_URL}/api/emergency-units`;
      if (type) {
        url = `${API_BASE_URL}/api/emergency-units/type/${type}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch emergency units');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching emergency units:', error);
      throw error;
    }
  }

  async fetchAvailableUnits(type = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emergency-units/available`);
      if (!response.ok) {
        throw new Error('Failed to fetch available units');
      }
      const allUnits = await response.json();
      if (type) {
        return allUnits.filter(unit => unit.type === type);
      }
      return allUnits;
    } catch (error) {
      console.error('Error fetching available units:', error);
      throw error;
    }
  }

  async createUnit(unitData) {
    const response = await fetch(`${API_BASE_URL}/api/emergency-units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unitData),
    });
    if (!response.ok) throw new Error('Failed to create unit');
    return await response.json();
  }

  async updateUnit(unitId, unitData) {
    const response = await fetch(`${API_BASE_URL}/api/emergency-units/${unitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unitData),
    });
    if (!response.ok) throw new Error('Failed to update unit');
    return await response.json();
  }

  async deleteUnit(unitId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emergency-units/${unitId}`, {
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

  // Users
  async fetchUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
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
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return await response.json();
  }

  async updateUser(userId, userData) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return await response.json();
  }

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
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

  // Assignments
  async assignUnit(unitId, incidentId, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          unitId, 
          incidentId, 
          userId: userId || 1 // Default to admin user if not provided
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to assign unit';
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error('Error assigning unit:', error);
      throw error;
    }
  }

  // Analytics & Reports
  async fetchDispatchMetrics(params = {}) {
    const { from, to, topN, heatmapK } = params;
    try {
      const query = new URLSearchParams();
      if (from) query.append('from', from);
      if (to) query.append('to', to);
      if (topN) query.append('topN', topN || 5);
      if (heatmapK) query.append('heatmapK', heatmapK || 10);
      
      const url = `${API_BASE_URL}/api/reports/dispatch/metrics?${query.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to fetch analytics metrics (Status: ${response.status}) ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching dispatch metrics:', error);
      throw error;
    }
  }

  async downloadDispatchReportPdf(params = {}) {
    const { from, to, topN, heatmapK } = params;
    try {
      const query = new URLSearchParams();
      if (from) query.append('from', from);
      if (to) query.append('to', to);
      if (topN) query.append('topN', topN || 5);
      if (heatmapK) query.append('heatmapK', heatmapK || 10);
      
      const url = `${API_BASE_URL}/api/reports/dispatch/pdf?${query.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to download PDF (Status: ${response.status}) ${text}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Error downloading dispatch report PDF:', error);
      throw error;
    }
  }

  // Simulation
  async startSimulation() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/simulation/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start simulation');
      }
      return await response.text();
    } catch (error) {
      console.error('Error starting simulation:', error);
      throw error;
    }
  }

  async stopSimulation() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/simulation/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop simulation');
      }
      return await response.text();
    } catch (error) {
      console.error('Error stopping simulation:', error);
      throw error;
    }
  }

  // Generate Random Units
  async generateRandomUnits(count) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emergency-units/generator/generate-random?count=${count}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate random units');
      }
      return await response.json();
    } catch (error) {
      console.error('Error generating random units:', error);
      throw error;
    }
  }

  // Update Unit Location
  async updateUnitLocation(unitId, latitude, longitude) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emergency-units/${unitId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update unit location');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating unit location:', error);
      throw error;
    }
  }

  // Monitor endpoints
  async fetchMonitorIncidents() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/monitor/incidents`);
      if (!response.ok) throw new Error('Failed to fetch monitor incidents');
      return await response.json();
    } catch (error) {
      console.error('Error fetching monitor incidents:', error);
      throw error;
    }
  }

  async fetchMonitorUnits() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/monitor/units`);
      if (!response.ok) throw new Error('Failed to fetch monitor units');
      return await response.json();
    } catch (error) {
      console.error('Error fetching monitor units:', error);
      throw error;
    }
  }
}

const apiService = new ApiService();
export default apiService;
# 🚨 Smart Emergency Dispatch System

The Smart Emergency Dispatch Optimization System is a comprehensive real-time platform designed to enhance emergency response efficiency in urban areas. The system connects emergency vehicles, dispatch centers, and citizens through a centralized database with live WebSocket updates.


## ✨ Features

### Core Functionality
- **Real-time Incident Management**: Create, update, and track emergency incidents with live status updates
- **Emergency Unit Management**: Manage ambulances, fire trucks, and police cars with availability tracking
- **Smart Unit Assignment**: Assign emergency units to incidents based on type and availability
- **User Management**: Admin user management with role-based access
- **Live Notifications**: Real-time push notifications for new incidents and assignments
- **Auto-Resolution**: Automatically free units when incidents are resolved
- **Interactive Dashboard**: Comprehensive admin portal with filtering and real-time updates

### Real-time Features
- **WebSocket Integration**: Live updates across all connected clients
- **Incident Status Tracking**: Pending → Dispatched → In Progress → Resolved
- **Unit Availability**: Real-time status updates (Available/Unavailable)
- **Persistent Notifications**: Notifications stored in database and localStorage
- **Cross-page Persistence**: State maintained across navigation

## 🛠 Technology Stack

### Backend
- **Framework**: Spring Boot 3.x
- **Language**: Java 
- **Database**: MySQL
- **WebSocket**: STOMP over SockJS
- **ORM**: Spring Data JPA
- **Build Tool**: Maven
- **Dependencies**:
  - Spring Web
  - Spring WebSocket
  - Spring Data JPA
  - MySQL Connector
  - Lombok
  - Jackson (JSON processing)

### Frontend
- **Framework**: React 18
- **Language**: JavaScript (ES6+)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom CSS
- **WebSocket Client**: STOMP.js + SockJS
- **Routing**: React Router v6
- **HTTP Client**: Fetch API + Axios
- **State Management**: React Context API + Hooks

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────┬──────────────┬─────────────────────────┐  │
│  │   Admin     │    Unit      │        User             │  │
│  │  Portal     │  Dashboard   │      Dashboard          │  │
│  └─────────────┴──────────────┴─────────────────────────┘  │
│           │                                                  │
│  ┌────────┴─────────────────────────────────────────────┐  │
│  │    WebSocket Service + API Service + Auth Context    │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼──────────────────────────────────────────────┘
            │
     ┌──────┴──────┐
     │   WebSocket │ HTTP REST API
     │   (STOMP)   │
     └──────┬──────┘
            │
┌───────────┴──────────────────────────────────────────────┐
│              Backend (Spring Boot)                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │         Controllers (REST + WebSocket)           │    │
│  ├──────────────────────────────────────────────────┤    │
│  │                   Services                        │    │
│  │  - IncidentService                               │    │
│  │  - EmergencyUnitService                          │    │
│  │  - AssignmentService                             │    │
│  │  - UserService                                   │    │
│  │  - NotificationService                           │    │
│  │  - IncidentMonitorService                        │    │
│  │  - EmergencyUnitMonitorService                   │    │
│  ├──────────────────────────────────────────────────┤    │
│  │              Repositories (JPA)                   │    │
│  └──────────────────────────────────────────────────┘    │
│                      │                                     │
│                      ▼                                     │
│              ┌──────────────┐                             │
│              │    MySQL     │                             │
│              │   Database   │                             │
│              └──────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

## 📦 Prerequisites

### Backend Requirements
- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+

### Frontend Requirements
- Node.js 18+ 
- npm 9+ or yarn

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/AhmedFaragElsayed/Smart-Emergency-Dispatch-System.git
cd Smart-Emergency-Dispatch-System
```

### 2. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE emergency_dispatch;
```

The application will automatically create tables on first run using the schema defined in `data.sql`.

### 3. Backend Setup

Navigate to backend directory:
```bash
cd emergency-dispatch-backend
```

Configure database in `src/main/resources/application.properties`:
```properties
spring.application.name=smartDispatchApp
spring.datasource.url=jdbc:mysql://localhost:3306/emergency_dispatch
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

Install dependencies and build:
```bash
mvn clean install
```

### 4. Frontend Setup

Navigate to frontend directory:
```bash
cd ../emergency-dispatch-frontend
```

Install dependencies:
```bash
npm install
```

Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:9696/api
```

## ▶️ Running the Application

### Start Backend Server
```bash
cd emergency-dispatch-backend
mvn spring-boot:run
```
Backend runs on: `http://localhost:9696`

### Start Frontend Development Server
```bash
cd emergency-dispatch-frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

## 📡 API Documentation

### Base URL
```
http://localhost:9696/api
```

### Endpoints

#### Incidents
- `GET /incidents` - Get all incidents
- `GET /incidents/{id}` - Get incident by ID
- `POST /incidents` - Create new incident
- `PUT /incidents/{id}` - Update incident
- `DELETE /incidents/{id}` - Delete incident

#### Emergency Units
- `GET /emergency-units` - Get all units
- `GET /emergency-units?type={type}` - Get units by type
- `GET /emergency-units/{id}` - Get unit by ID
- `POST /emergency-units` - Create new unit
- `PUT /emergency-units/{id}` - Update unit
- `DELETE /emergency-units/{id}` - Delete unit

#### Assignments
- `GET /assignments` - Get all assignments
- `POST /assignments` - Create assignment
- `PUT /assignments/{id}/deactivate` - Deactivate assignment

#### Users
- `GET /users` - Get all users
- `GET /users/{id}` - Get user by ID
- `POST /users` - Create user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

#### Authentication
- `POST /auth/signin` - User login

#### Notifications
- `GET /notifications/user/{userId}` - Get notifications for user
- `GET /notifications` - Get all notifications

## 🗄 Database Schema

### Core Tables

**User**
- `userID` (PK)
- `username` (Unique)
- `fname`, `lname`
- `password`
- `role`

**Incident**
- `incidentId` (PK)
- `type` (Medical, Fire, Police)
- `latitude`, `longtitude`
- `needs`
- `severityLevel`
- `status` (Pending, Dispatched, In Progress, Resolved)
- `reportedTime`

**EmergencyUnit**
- `unitID` (PK)
- `type` (Ambulance, Fire Truck, Police Car)
- `capacity`
- `latitude`, `longtitude`
- `status` (Available/Unavailable)

**Assignment**
- `assignmentId` (PK)
- `incidentId` (FK)
- `unitID` (FK)
- `userID` (FK)
- `assignmentTime`
- `resolutionTime`
- `isActive`

**Notification**
- `notificationId` (PK)
- `userID` (FK)
- `incidentId` (FK)
- `unitID` (FK)
- `message`
- `notificationTime`

## 🔌 WebSocket Events

### Topics

**Incident Updates**
- Topic: `/topic/incidents-monitor/update`
- Payload: Incident object with assignments

**Unit Updates**
- Topic: `/topic/units-monitor/update`
- Payload: Emergency unit object

**Assignment Updates**
- Topic: `/topic/assignments`
- Payload: Assignment object

**Notifications**
- Topic: `/topic/notifications`
- Payload: Notification object

### WebSocket Connection
```javascript
const socket = new SockJS('http://localhost:9696/ws');
const stompClient = new Client({
  webSocketFactory: () => socket,
  reconnectDelay: 5000
});
```

## 🎨 Key Features Explained

### 1. Real-time Incident Management
- Create incidents with type, location, severity
- Live status updates across all connected clients
- Filter by status, type, and severity
- Automatic status progression

### 2. Smart Unit Assignment
- Type-based unit selection (Medical → Ambulance)
- Availability checking before assignment
- Multiple units per incident support
- Automatic unit release on incident resolution

### 3. Notification System
- Real-time push notifications for admins
- Persistent storage in database
- localStorage caching for offline access
- Read/unread tracking
- Cross-page persistence

### 4. Auto-Resolution Flow
```
Incident Status: Resolved
    ↓
Find All Active Assignments
    ↓
Deactivate Each Assignment
    ↓
Set Units to Available
    ↓
Broadcast Updates via WebSocket
```

## 🔐 Authentication

Default admin credentials:
- Username: `admin`
- Password: `admin123`

(Create additional users via User Dashboard)

## 📱 Application Pages

1. **Sign In Page** - User authentication
2. **Home Dashboard** - Navigation hub
3. **Admin Portal** - Incident management and dispatch
4. **Unit Dashboard** - Emergency unit CRUD operations
5. **User Dashboard** - User management

## 🐛 Troubleshooting

### Backend Issues
- **Database Connection**: Verify MySQL is running and credentials are correct
- **Port Conflict**: Ensure port 9696 is available
- **Build Errors**: Run `mvn clean install -U`

### Frontend Issues
- **API Connection**: Check VITE_API_BASE_URL in .env
- **WebSocket**: Ensure backend is running before frontend
- **Dependencies**: Delete `node_modules` and run `npm install`

## 📝 License

This project is licensed under the MIT License.

## 👥 Contributors

- Ahmed Farag Elsayed (@AhmedFaragElsayed)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For questions or support, please open an issue on GitHub.

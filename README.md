# 🚨 Smart Emergency Dispatch System

A comprehensive real-time emergency dispatch platform designed to enhance emergency response efficiency in urban areas. The system connects emergency vehicles, dispatch centers, and citizens through a centralized database with live WebSocket updates, real-time GPS tracking, and advanced analytics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Java](https://img.shields.io/badge/Java-17%2B-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-green)
![React](https://img.shields.io/badge/React-19-blue)

## 📋 Table of Contents

- [1. Introduction](#1-introduction)
- [2. System Analysis & Design](#2-system-analysis--design)
- [3. Implementation Details](#3-implementation-details)
- [4. User Interface & Experience](#4-user-interface--experience)
- [5. Setup & Deployment Guide](#5-setup--deployment-guide)
- [6. Future Enhancements](#6-future-enhancements)
- [7. Conclusion](#7-conclusion)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 1. Introduction

### 1.1 Problem Statement
Urban emergency response systems often face challenges with delayed communication, inefficient resource allocation, and lack of real-time visibility. Traditional dispatch systems may rely on manual updates or fragmented data sources, leading to slower response times and suboptimal unit utilization during critical incidents.

### 1.2 Project Objectives
The Smart Emergency Dispatch System aims to solve these issues by providing:
- **Real-time Visibility**: Live tracking of all emergency units and incidents on an interactive map.
- **Automated Dispatching**: Intelligent algorithms to suggest or assign the nearest available units based on incident type and severity.
- **Data-Driven Insights**: Comprehensive analytics to monitor response times and identify bottlenecks.
- **Scalability**: A robust architecture capable of handling high-frequency updates from hundreds of units simultaneously.

## 2. System Analysis & Design

### 2.1 System Architecture

The system follows a modern microservices-ready architecture, separating the frontend client from the backend services, communicating via REST APIs and WebSockets.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                      │
│  ┌───────────┬─────────────┬─────────────┬────────────┬──────────┐  │
│  │   Admin   │    Unit     │    User     │ Simulation │ Analytics│  │
│  │   Portal  │  Dashboard  │  Dashboard  │    Map     │   Page   │  │
│  └───────────┴─────────────┴─────────────┴────────────┴──────────┘  │
│                              │                                      │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │   WebSocket Service + API Service + Auth Context + Leaflet   │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  HTTP REST + STOMP  │
                    │     WebSocket       │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────────┐
│                     Backend (Spring Boot 4.0)                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  Controllers Layer                             │  │
│  │  REST: Incident, EmergencyUnit, Assignment, User, Auth,        │  │
│  │        Notification, Analytics, Report, LocationUpdate         │  │
│  │  WebSocket: IncidentMonitor, EmergencyUnitMonitor              │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │                    Services Layer                              │  │
│  │  IncidentService, EmergencyUnitService, AssignmentService,     │  │
│  │  UserService, NotificationService, ReportService,              │  │
│  │  RedisLocationService, IncidentMonitorService,                 │  │
│  │  EmergencyUnitMonitorService                                   │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │                  Repositories (JPA)                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│              │                                    │                  │
│              ▼                                    ▼                  │
│     ┌────────────────┐                  ┌────────────────┐           │
│     │     MySQL      │                  │     Redis      │           │
│     │   (Primary)    │                  │   (Caching)    │           │
│     └────────────────┘                  └────────────────┘           │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

#### Backend
| Technology | Version | Purpose |
| :-- | :-- | :-- |
| Spring Boot | 4.0.0 | Application Framework |
| Java | 17+ | Programming Language |
| MySQL | 8.0+ | Primary Database |
| Redis | Latest | Location Caching & Real-time Data |
| Spring Data JPA | - | ORM & Database Access |
| Spring WebSocket | - | Real-time Communication (STOMP) |
| Spring Data Redis | - | Redis Integration |
| JasperReports | 6.20.0 | PDF Report Generation |
| Springdoc OpenAPI | 2.6.0 | API Documentation |
| Lombok | - | Boilerplate Reduction |
| Jackson | - | JSON Processing |
| HikariCP | - | Connection Pooling |

#### Frontend
| Technology | Version | Purpose |
| :-- | :-- | :-- |
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool & Dev Server |
| Tailwind CSS | 4.1.17 | Utility-First Styling |
| React Router | 7.10.0 | Client-side Routing |
| STOMP.js | 7.0.0 | WebSocket Client |
| SockJS Client | 1.6.1 | WebSocket Fallback |
| Leaflet | 1.9.4 | Interactive Maps |
| Chart.js | 4.4.0 | Data Visualization |
| react-chartjs-2 | 5.2.1 | React Chart Components |
| Axios | 1.13.2 | HTTP Client |

### 2.3 Database Design

The database schema is designed to ensure data integrity while supporting high-performance queries for real-time operations.

#### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌───────────────┐
│    User     │       │  Assignment  │       │   Incident    │
├─────────────┤       ├──────────────┤       ├───────────────┤
│ userID (PK) │◄──────│ userID (FK)  │──────►│ incidentId(PK)│
│ username    │       │ unitID (FK)  │       │ type          │
│ fname       │       │ incidentId   │       │ latitude      │
│ lname       │       │ assignmentId │       │ longtitude    │
│ password    │       │ isActive     │       │ severityLevel │
│ role        │       │ assignTime   │       │ status        │
└─────────────┘       │ resolveTime  │       │ reportedTime  │
                      └──────────────┘       │ needs         │
                             │               └───────────────┘
                             │
                             ▼
                    ┌───────────────┐       ┌───────────────┐
                    │ EmergencyUnit │       │ Notification  │
                    ├───────────────┤       ├───────────────┤
                    │ unitID (PK)   │◄──────│ unitID (FK)   │
                    │ type          │       │ incidentId(FK)│
                    │ latitude      │       │ longtitude    │
                    │ capacity      │       │ userID (FK)   │
                    │ status        │       │ message       │
                    └───────────────┘       │ notifyTime    │
                                            └───────────────┘
```

#### Core Entities & Enums
- **IncidentType**: `FIRE`, `POLICE`, `AMBULANCE`
- **IncidentStatus**: `PENDING`, `DISPATCHED`, `IN_PROGRESS`, `RESOLVED`
- **EmergencyUnitType**: `FIRE`, `AMBULANCE`, `POLICE`
- **SeverityLevel**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

## 3. Implementation Details

### 3.1 Core Features
- **Real-time Incident Management**: Create, update, and track emergency incidents with live status updates
- **Emergency Unit Management**: Manage ambulances, fire trucks, and police cars with availability tracking
- **Smart Unit Assignment**: Assign emergency units to incidents based on type and availability
- **Multiple Units per Incident**: Support for assigning multiple units to large-scale emergencies
- **User Management**: Admin user management with role-based access control
- **Live Notifications**: Real-time push notifications for new incidents and assignments
- **Auto-Resolution**: Automatically free units when incidents are resolved
- **Interactive Dashboard**: Comprehensive admin portal with filtering and real-time updates

### 3.2 Advanced Algorithms & Logic

#### Real-time GPS Simulation & Redis Caching
To handle high-frequency location updates from hundreds of units without overwhelming the primary database, the system utilizes **Redis** as a high-speed ephemeral data store.
- **Mechanism**: Units push location updates to a Redis cache.
- **Batching**: The backend aggregates these updates and broadcasts them in batches via WebSocket to the frontend.
- **Benefit**: Reduces database load and ensures smooth animation on the frontend map.

#### Smart Unit Assignment Logic
The assignment algorithm ensures optimal resource utilization:
1. **Filter**: Select units matching the incident type (e.g., Fire Truck for Fire).
2. **Availability Check**: Exclude units currently `BUSY` or `UNAVAILABLE`.
3. **Proximity (Future)**: Calculate distance to incident (simulated in current version).
4. **Assignment**: Link unit to incident, update statuses, and notify dispatchers.

#### Auto-Resolution Workflow
When an incident is marked as `RESOLVED`:
```
Incident Status: Resolved
    ↓
Find All Active Assignments linked to Incident
    ↓
Deactivate Each Assignment (Set resolution time)
    ↓
Set Linked Units to 'AVAILABLE'
    ↓
Broadcast Updates via WebSocket to all clients
```

## 4. User Interface & Experience

The frontend is built with **React 19** and **Tailwind CSS** to provide a responsive and modern user experience.

### 4.1 Application Pages

| Page | Route | Description |
| :-- | :-- | :-- |
| **Sign In** | `/signin` | Secure user authentication entry point. |
| **Home Dashboard** | `/` | Central navigation hub with system overview. |
| **Admin Portal** | `/admin` | Main command center for managing incidents and dispatching units. |
| **Unit Dashboard** | `/units` | CRUD operations for emergency units and fleet management. |
| **User Dashboard** | `/users` | Administrative interface for managing system users and roles. |
| **Simulation Map** | `/simulation` | Real-time visual tracking of units and incidents on an interactive map. |
| **Analytics** | `/analytics` | Data visualization dashboard for response times and incident trends. |

## 5. Setup & Deployment Guide

### 5.1 Prerequisites

#### Backend Requirements
- **Java**: JDK 17 or higher
- **Maven**: 3.6+
- **MySQL**: 8.0+
- **Redis**: 6.0+ (Critical for real-time location tracking)

#### Frontend Requirements
- **Node.js**: 18+
- **npm**: 9+ (or yarn)

### 5.2 Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/AhmedFaragElsayed/Smart-Emergency-Dispatch-System.git
cd Smart-Emergency-Dispatch-System
```

#### 2. Database Setup
Create a MySQL database:
```sql
CREATE DATABASE dispatch;
```
Start Redis server (Default port 6379).

#### 3. Backend Setup
Navigate to `emergency-dispatch-backend` and configure `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/dispatch
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.data.redis.host=localhost
spring.data.redis.port=6379
```
Build the project:
```bash
mvn clean install
```

#### 4. Frontend Setup
Navigate to `emergency-dispatch-frontend`, install dependencies, and configure `.env`:
```bash
npm install

VITE_API_BASE_URL=http://localhost:9696/api
```

### 5.3 Running the Application

#### Start Backend Server
```bash
cd emergency-dispatch-backend
mvn spring-boot:run
```
- **Backend API**: `http://localhost:9696`
- **Swagger UI**: `http://localhost:9696/swagger-ui.html`

#### Start Frontend Development Server
```bash
cd emergency-dispatch-frontend
npm run dev
```
- **Frontend**: `http://localhost:5173`

### 5.4 API Documentation

The system exposes a comprehensive REST API documented via Swagger/OpenAPI.

#### Key Endpoints
| Resource | Method | Endpoint | Description |
| :-- | :-- | :-- | :-- |
| **Incidents** | GET | `/incidents` | Retrieve all incidents |
| | POST | `/incidents` | Report a new incident |
| **Units** | GET | `/emergency-units` | List all emergency units |
| | GET | `/emergency-units?type={type}` | Filter units by type |
| **Assignments** | POST | `/assignments` | Dispatch a unit to an incident |
| **Analytics** | GET | `/analytics/dispatch` | Retrieve system performance metrics |

## 6. Future Enhancements

- **AI-Powered Dispatching**: Implement machine learning models to predict incident hotspots and pre-position units.
- **Mobile App for Responders**: A dedicated mobile application for field units to receive assignments and update status.
- **Traffic Integration**: Integrate real-time traffic data (Google Maps API) for more accurate ETA calculations.
- **Multi-Tenancy**: Support multiple cities or districts within a single deployment.

## 7. Conclusion

The Smart Emergency Dispatch System successfully demonstrates a modern, scalable approach to emergency management. By leveraging real-time technologies like WebSockets and Redis, combined with a robust Spring Boot backend and React frontend, the system provides a powerful tool for improving response times and operational efficiency in emergency scenarios.
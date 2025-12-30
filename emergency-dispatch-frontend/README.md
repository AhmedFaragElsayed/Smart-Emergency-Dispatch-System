# 🌐 Emergency Dispatch Frontend

React frontend for the Smart Emergency Dispatch System.

## 📋 Overview

A modern React 19 application built with Vite, featuring real-time WebSocket updates, interactive maps, and comprehensive analytics.

## 🏗 Project Structure

```
emergency-dispatch-frontend/
├── src/
│   ├── api/              # API call functions
│   ├── assets/           # Static assets
│   ├── components/       # Reusable UI components
│   │   ├── EmergencyUnitCard.jsx
│   │   ├── IncidentCard.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── OverdueAlert.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── SigninPage.jsx
│   ├── context/          # React Context providers
│   │   └── AuthContext.jsx
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   │   ├── adminDashboard.jsx
│   │   ├── AdminPortal.jsx
│   │   ├── Analytics.jsx
│   │   ├── SimulationMap.jsx
│   │   ├── UnitDashboard.jsx
│   │   └── UserDashboard.jsx
│   ├── services/         # API & WebSocket services
│   │   ├── apiService.js
│   │   └── websocketService.js
│   ├── styles/           # CSS stylesheets
│   ├── utils/            # Utility functions
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## ⚙️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file:
```env
VITE_API_BASE_URL=http://localhost:9696/api
```

### 3. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🚀 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🔌 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.0 | UI framework |
| react-router-dom | 7.10.0 | Routing |
| @stomp/stompjs | 7.0.0 | WebSocket client |
| sockjs-client | 1.6.1 | WebSocket fallback |
| leaflet | 1.9.4 | Interactive maps |
| chart.js | 4.4.0 | Data visualization |
| react-chartjs-2 | 5.2.1 | React chart components |
| axios | 1.13.2 | HTTP client |
| tailwindcss | 4.1.17 | CSS framework |

## 📱 Pages

| Page | Route | Description |
|------|-------|-------------|
| Sign In | `/signin` | Authentication |
| Dashboard | `/` | Main navigation |
| Admin Portal | `/admin` | Incident management |
| Units | `/units` | Emergency unit CRUD |
| Users | `/users` | User management |
| Simulation | `/simulation` | Live GPS map |
| Analytics | `/analytics` | Charts & reports |

## 🎨 Features

- **Real-time Updates**: WebSocket integration for live data
- **Interactive Map**: Leaflet-based GPS simulation
- **Charts**: Response time and incident analytics
- **Responsive Design**: Tailwind CSS styling
- **Protected Routes**: Authentication-based access control
# 🔧 Emergency Dispatch Backend

Spring Boot backend for the Smart Emergency Dispatch System.

## 📋 Overview

This is a Spring Boot 4.0 application that provides REST APIs and WebSocket endpoints for real-time emergency dispatch management.

## 🏗 Project Structure

```
emergency-dispatch-backend/
├── src/
│   ├── main/
│   │   ├── java/com/emergency/dispatch/
│   │   │   ├── config/          # WebSocket & CORS configuration
│   │   │   ├── controller/      # REST & WebSocket controllers
│   │   │   ├── dto/             # Data Transfer Objects
│   │   │   ├── enums/           # IncidentType, UnitType, Status enums
│   │   │   ├── model/           # JPA Entity models
│   │   │   ├── repository/      # Spring Data JPA repositories
│   │   │   ├── scheduler/       # Scheduled tasks
│   │   │   ├── service/         # Business logic services
│   │   │   └── smartDispatchApp.java
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── data.sql         # Initial seed data
│   │       └── reports/         # JasperReports templates
│   └── test/                    # Unit & integration tests
├── pom.xml
└── README.md
```

## ⚙️ Configuration

Edit `src/main/resources/application.properties`:

```properties
# Server
server.port=9696

# MySQL Database
spring.datasource.url=jdbc:mysql://localhost:3306/dispatch
spring.datasource.username=root
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update

# Redis Cache
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.type=redis
```

## 🚀 Build and Run

### Prerequisites
- Java 17+
- Maven 3.6+
- MySQL 8.0+
- Redis 6.0+

### Build
```bash
mvn clean install
```

### Run
```bash
mvn spring-boot:run
```

### Run Tests
```bash
mvn test
```

### Package for Production
```bash
mvn clean package -DskipTests
java -jar target/redis_project-0.0.1-SNAPSHOT.jar
```

## 📡 API Endpoints

- **REST API**: `http://localhost:9696/api`
- **Swagger UI**: `http://localhost:9696/swagger-ui.html`
- **WebSocket**: `ws://localhost:9696/ws`

## 🔌 Key Dependencies

| Dependency | Purpose |
|------------|---------|
| spring-boot-starter-webmvc | REST API |
| spring-boot-starter-websocket | Real-time updates |
| spring-boot-starter-data-jpa | Database ORM |
| spring-boot-starter-data-redis | Caching |
| mysql-connector-j | MySQL driver |
| springdoc-openapi | Swagger docs |
| jasperreports | PDF reports |
| lombok | Boilerplate reduction |

## 📊 Database Schema

The application uses 5 main entities:
- **User** - System users with roles
- **Incident** - Emergency incidents
- **EmergencyUnit** - Vehicles (ambulance, fire truck, police car)
- **Assignment** - Unit-to-incident mappings
- **Notification** - Push notifications

# Emergency Dispatch Backend

Maven-based Java backend for the Smart Emergency Dispatch System.

## Project Structure

```
emergency-dispatch-backend/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/emergency/dispatch/
│   │   │       └── App.java
│   │   └── resources/
│   └── test/
│       ├── java/
│       │   └── com/emergency/dispatch/
│       │       └── AppTest.java
│       └── resources/
├── pom.xml
└── README.md
```

## Build and Run

### Build the project
```bash
mvn clean install
```

### Run the application
```bash
mvn exec:java -Dexec.mainClass="com.emergency.dispatch.App"
```

### Run tests
```bash
mvn test
```

## Requirements

- Java 17 or higher
- Maven 3.6 or higher

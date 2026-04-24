# OmniCharge Technical Documentation

## 1. Project Overview
**OmniCharge** is a state-of-the-art, enterprise-grade mobile recharge platform designed to provide a seamless, secure, and highly available experience for users to perform instant mobile recharges across various operators.

### Purpose
The platform serves as a unified gateway for mobile recharges, utility payments, and transaction history management. It aims to bridge the gap between consumers and service providers through a robust, automated ecosystem.

### Problem it Solves
- **Fragmented Recharge Channels**: Provides a single point for multiple operators.
- **Transactional Reliability**: Uses a Saga-based distributed transaction model to ensure payment and recharge consistency.
- **Real-time Observability**: Solves the "black box" problem in distributed systems by providing deep tracing and metrics.

### High-Level Architecture
OmniCharge follows a **cloud-native microservices architecture**. It decouples core business domains into independent services that communicate asynchronously via a message broker and synchronously via REST APIs through a centralized API Gateway.

---

## 2. Technology Stack
The platform leverages a modern, high-performance stack:

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Language** | Java 25 (LTS) | Latest performance features and robust ecosystem. |
| **Framework** | Spring Boot 3.5.x | Industry standard for microservices with rapid development tools. |
| **Database** | PostgreSQL 16 | Relational consistency and advanced JSON support for audit logs. |
| **Messaging** | RabbitMQ | Reliable asynchronous event-driven communication and Saga orchestration. |
| **Caching/OTP** | Redis | sub-millisecond latency for OTP storage and frequent data caching. |
| **Observability** | ELK Stack, Zipkin | Centralized logging and distributed tracing for debugging. |
| **Monitoring** | Prometheus, Grafana | Real-time metrics collection and visual dashboards. |
| **Frontend** | Angular 18+ | Enterprise-grade UI framework with strong typing and component modularity. |
| **Containerization**| Docker & Compose | Consistent environments from development to production. |

---

## 3. Architecture Explanation

### Microservices Principles
The system is built on highly independent services, each owning its own data and lifecycle.

### Core Infrastructure Services
- **Eureka Discovery Server**: Handles service registration and discovery, allowing services to find each other dynamically without hardcoded URLs.
- **Config Server (Native)**: Centralizes configuration management, allowing real-time updates without service restarts.
- **API Gateway**: The single entry point for the frontend; handles routing, cross-origin resource sharing (CORS), and global security headers.

### Communication Flow
- **Synchronous**: Feign Clients (Spring Cloud OpenFeign) are used for internal service-to-service calls where immediate response is needed.
- **Asynchronous**: RabbitMQ handles event propagation (e.g., `PaymentApprovedEvent`) to ensure loose coupling and high availability.

---

## 4. Detailed Service Breakdown

### User Service
- **Purpose**: Manages user identity, authentication, and profiles.
- **Key Functionalities**: Phone OTP authentication (primary), Google OAuth 2.0 (secondary), JWT generation, profile enrichment.
- **Important Classes**: 
  - `AuthService`: Core authentication logic.
  - `JwtUtil`: Token generation and validation.
  - `UserRepository`: Data access for user entities.
  - `SmsService`: Integration for OTP delivery.
- **APIs**:
  - `POST /api/auth/send-otp`: Dispatches OTP to mobile.
  - `POST /api/auth/verify-phone-otp`: Validates OTP and returns JWT.
  - `GET /api/users/profile`: Retrieves authenticated user details.
- **Dependencies**: Spring Security, Spring Data JPA, Redis, RabbitMQ.

### Operator Service
- **Purpose**: Handles telecom operator data and recharge plans.
- **Key Functionalities**: Automatic operator detection by mobile number prefix, plan browsing by category (DATA, UNLIMITED, etc.).
- **Important Classes**: 
  - `OperatorDetectionService`: Prefix-based logic for identifying providers.
  - `PlanService`: Manage recharge plan lifecycle.
  - `SystemCacheService`: Redis-based caching for plans.
- **APIs**:
  - `GET /api/operators`: List all active operators.
  - `GET /api/operators/detect/{mobile}`: Auto-detect operator for a number.
  - `GET /api/operators/{id}/plans`: Multi-category plan listing.
- **Dependencies**: Spring Data JPA, Redis.

### Recharge Service
- **Purpose**: Orchestrates the recharge process and maintains history.
- **Key Functionalities**: Initiating recharges, managing the Saga flow, providing user transaction history.
- **Important Classes**: 
  - `RechargeService`: Main business logic for recharges.
  - `RechargeSagaConsumer`: RabbitMQ listener for payment completion.
  - `RechargeHistoryRepository`: Audit trail for all transactions.
- **APIs**:
  - `POST /api/recharges/initiate`: Starts a new recharge transaction.
  - `GET /api/recharges/history`: paginated transaction history for the user.
- **Dependencies**: Spring Data JPA, RabbitMQ, Feign Client.

### Payment Service
- **Purpose**: Financial transaction management.
- **Key Functionalities**: Razorpay API integration, payment status tracking, refund management.
- **Important Classes**:
  - `RazorpayPaymentService`: Direct integration with Razorpay SDK.
  - `PaymentService`: Internal orchestration and state management.
- **APIs**:
  - `POST /api/payments/create-order`: Generates a gateway order ID.
  - `POST /api/payments/verify`: Cryptographic verification of payment signatures.
- **Dependencies**: Razorpay Java SDK, Postgres.

### Notification Service
- **Purpose**: Omnichannel communications.
- **Key Functionalities**: Sending OTPs via SMS, recharge confirmation emails, system alerts.
- **Important Classes**:
  - `EmailService`: JavaMailSender integration for templates.
  - `SmsService`: SMS gateway abstraction.
- **Dependencies**: Spring Mail, RabbitMQ.

---

## 5. Infrastructure & DevOps

### Containerization Strategy
Every component of OmniCharge is dockerized. We use multi-stage Dockerfiles to keep production images slim (~150MB instead of 500MB+).

### Docker Compose
A master `docker-compose.yml` orchestrates the entire stack, including databases, message brokers, and monitoring tools. It uses **Docker Healthchecks** to ensure services start in the correct order (e.g., waiting for Postgres before starting User Service).

### Environment Configuration
Sensitive data (API keys, passwords) are managed via a `.env` file, which is loaded into the Docker Compose environment but excluded from version control to prevent security leaks.

### Deployment
Currently optimized for **Azure VM** deployments using a "Single Node" approach for smaller scales, with a clear path to **Kubernetes** by migrating Docker Compose definitions to Helm charts.

---

## 6. Database & Messaging

### PostgreSQL
Each service uses a dedicated schema or database instance in the Postgres cluster. This ensures data isolation (Database-per-Service pattern).

### RabbitMQ Topology
Uses **Topics** and **Fanouts** for flexible event routing.
- `recharge.initiated.exchange` -> Notifies Payment to start charging.
- `payment.approved.exchange` -> Notifies Recharge to fulfill and Notification to alert user.

### Redis
Used for:
- **OTP Storage**: Expiring keys handle 5-minute validity automatically.
- **Rate Limiting**: Throttling auth attempts to prevent brute force.

---

## 7. Frontend Explanation

Built with **Angular**, the frontend is designed with a "Core/Feature" split:
- **App Core**: Interceptors (for JWT), Guards (for Auth), and global Services.
- **Features**: Lazy-loaded modules for Dashboard, Recharge Flow, and Profile.
- **Responsive Design**: Mobile-first architecture ensured by utility-first CSS and Flexbox.

---

## 8. Security & Authentication

### JWT-Based Auth
Uses stateless JSON Web Tokens.
- **Access Token**: Short-lived (15 mins), carries claims like `roles` and `userId`.
- **Refresh Token**: Long-lived (7 days), stored in HTTP-only cookies to prevent XSS.

### Phone OTP (Primary)
A modern "passwordless" approach. Verified via cryptographic hashes stored in Redis, ensuring even if Redis is compromised, OTPs aren't visible as plain text.

---

## 10. Logging, Monitoring & Observability

### Centralized Logging (ELK)
All service logs are forwarded to **Logstash**, indexed in **Elasticsearch**, and visualized in **Kibana**. This allows searching for "transactionId" across all services at once.

### Distributed Tracing (Zipkin)
Micrometer Tracing injects a `traceId` and `spanId` into every request. You can see the full timeline of a request as it hops from Gateway -> Recharge -> Payment.

### Metrics (Prometheus/Grafana)
Services expose `/actuator/prometheus` endpoints. Grafana provides dashboards for:
- Request latency (P95, P99)
- JVM Memory usage
- Database connection pool health

---

## 11. Testing & Code Quality

### Testing Strategy
- **Unit Tests**: Using JUnit 5 and Mockito to test isolated logic (e.g., `OperatorDetectionService`).
- **Integration Tests**: `@SpringBootTest` with `@MockBean` for verifying service interactions.

### Quality Gates
- **JaCoCo**: Enforces code coverage (target > 95%).
- **SonarQube**: Automatically scans for "code smells," vulnerabilities, and technical debt.

---

## 12. Workflow / Execution Flow (The Recharge Saga)

1.  **User Selection**: User selects a plan and provides a mobile number.
2.  **Order Creation**: Frontend calls `payment-service` via Gateway to get a `razorpayOrderId`.
3.  **Payment Processing**: User pays via Razorpay UI; Frontend sends proof to `payment-service`.
4.  **Verification**: `payment-service` verifies the signature. If valid, it publishes `PaymentApprovedEvent`.
5.  **Fulfillment**: `recharge-service` consumes the event, marks recharge as SUCCESS, and updates status.
6.  **Notification**: `notification-service` consumes the event and sends an SMS/Email to the user.

---

## 13. Strengths & Improvements

### Strengths
- **Resilient Architecture**: Circuit breakers (Resilience4j) prevent cascading failures.
- **Modern Observability**: First-class support for tracing and metrics.
- **Developer Friendly**: Full Docker setup allows "One-click" start for new devs.

### Potential Improvements
- **Kubernetes Migration**: Moving from Compose to K8s for auto-scaling.
- **Caching Strategy**: Implementing more aggressive caching for recharge plans to reduce DB load.
- **E2E Testing**: Adding Playwright or Cypress for full-flow frontend automated tests.

---

## 14. Conclusion
OmniCharge represents a powerful implementation of modern microservices patterns. From its secured passwordless authentication to its Saga-orchestrated transactions and comprehensive observability stack, it is built to handle the demands of a high-volume recharge platform while remaining maintainable and scalable.

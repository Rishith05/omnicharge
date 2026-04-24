# ⚡ Recharge Service - Test Coverage Report

## 1. Overview
The **Recharge Service** acts as the core SAGA Orchestrator and Plan Initiator. Testing it safely required isolating external `FeignClients` to the Operator/User systems and stubbing asynchronous RabbitMQ message bindings natively.

## 2. Component Coverage
| Component | Test Class | Coverage Detail |
| :--- | :--- | :--- |
| **RechargeService** | `RechargeServiceTest.java` | Mocks `OperatorServiceClient` mapping Resilience4j paths (`isSuccess()`, null references). Validates `publishRechargeInitiated()` calls on success. |
| **SagaConsumer** | `RechargeSagaConsumerTest.java` | Feeds predefined `PaymentApprovedEvent` triggering `SUCCESS` reductions and generating decoupled `RechargeCompletedEvent` triggers. |
| **EventProducer** | `RechargeEventProducerTest.java` | Wraps `RabbitTemplate` bindings to `omnicharge.exchange` for precise payload captures. |
| **Recharge API** | `RechargeControllerTest.java` | Tests consumer pagination and default endpoint setups bypassing global security filters. |
| **Internal API** | `InternalRechargeControllerTest.java` | Asserts `/api/internal/recharges` responses serving asynchronous payment orchestrations. |
| **Admin API** | `AdminRechargeControllerTest.java` | Tests metrics retrieval maps generating valid `RechargeStatsResponse` projections. |

## 3. Centralized Logging Integration Tests
| Test Class | Coverage Detail |
| :--- | :--- |
| **RechargeServiceBusinessOperationPropertyTest** | Property-based tests validating RECHARGE_INITIATED and RECHARGE_EXPIRED event logging with 100+ iterations |
| **RechargeSagaEventLoggingPropertyTest** | Property-based tests validating SAGA_PAYMENT_APPROVED, SAGA_PAYMENT_REJECTED, and SAGA_EVENT_PUBLISHED logging with 100+ iterations |

## 4. Maven Execution Result
```console
[INFO] Tests run: 31, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  26.151 s
[INFO] Finished at: 2026-03-29T18:26:27+05:30
[INFO] ------------------------------------------------------------------------
```

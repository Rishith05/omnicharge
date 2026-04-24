# Logging Service API

## Endpoints

### AdminLogController
* `GET /api/admin/logs` - Full paged index of global system activity with extensive search filters (service name, level, time range, traceId).
* `GET /api/admin/logs/trace/{traceId}` - Uses Zipkin `traceId` correlation ID to fetch the entire chronological chain of linked events for a request journey.
* `GET /api/admin/logs/stats` - Endpoint returning structured log statistics mapping occurrences per service and error levels generated over the past N hours.

## Request Flow
1. **Passive Event Capture**: Logs from standard Spring Boot `Slf4j` instances are streamed seamlessly off a dedicated, independent message queue. 
2. **Persistence Processing**: The `LogEventConsumer` maps the JSON representation of the `LogEvent` payload to the database storage `LogEntryRepository` running PostgreSQL.
3. **Trace Retrieval Lookup**: The overarching UI fetches the logs based on timestamp orders and presents the exact execution journey spanning across all decoupled environments (Gateway $\rightarrow$ Auth $\rightarrow$ Database Layer). No application-halting logging calls block user-facing latency. 

## Cache Usage
* **None**: Heavily stores structured data natively into the relational database to allow complex `ORDER BY l.timestamp DESC` filtering queries for the CMS monitoring engine.

## RabbitMQ Communication
* **Producers**: 
  - `None` directly from the standalone Microservice app backend. (Any microservice can push raw Strings as a Producer instance via `slf4j` / Aspect oriented logic).
* **Consumers**: 
  - `LogEventConsumer`: Drains messages off `logging.queue` mapped dynamically to the isolated fanout `omnicharge.logging.exchange` routing rules setup by `LoggingConstants`.

## Sync vs Async Calls
* **Synchronous**: The `AdminLogController` mapping operations are standard direct DB blocking lookups for CMS display tracking.
* **Asynchronous**: The event log emission pipeline runs fully autonomously through the fast-access AMQP listener `consumeLogEvent(LogEvent event)`.


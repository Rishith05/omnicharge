# Use official lightweight Java 21 image
FROM eclipse-temurin:21-jre-alpine

# Create spring user and group
RUN addgroup -S spring && adduser -S spring -G spring

# Install curl for healthchecks and create logs directory
RUN apk add --no-cache curl && \
    mkdir -p /logs && \
    chown spring:spring /logs

# Set fallback directory environment variable
ENV LOGGING_FALLBACK_DIRECTORY=/logs

# Set non-root user
# Use root to avoid permission issues with mapped volumes
USER root

ENV LOGGING_FALLBACK_DIRECTORY=/logs
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

ENTRYPOINT ["sh", "-c", "mkdir -p /logs && java ${JAVA_OPTS} -jar /app.jar"]

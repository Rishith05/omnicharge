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
USER root

# Optimize JVM settings inside container
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Copy the pre-built JAR from the target directory
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Run the application
ENTRYPOINT ["sh", "-c", "mkdir -p /logs && java ${JAVA_OPTS} -jar /app.jar"]

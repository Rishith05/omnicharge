import os
import re

# 1. Update all Dockerfiles
services = ["discovery-server", "api-gateway", "user-service", "operator-service", 
            "recharge-service", "payment-service", "notification-service", "logging-service"]

for service in services:
    dockerfile_path = os.path.join(service, "Dockerfile")
    if os.path.exists(dockerfile_path):
        with open(dockerfile_path, "r") as f:
            content = f.read()

        content = content.replace("USER spring:spring", "USER root")
        content = content.replace('ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar /app.jar"]', 
                                  'ENTRYPOINT ["sh", "-c", "mkdir -p /logs && java ${JAVA_OPTS} -jar /app.jar"]')
        
        with open(dockerfile_path, "w") as f:
            f.write(content)

# 2. Update docker-compose.yml to use simpler nc healthchecks
compose_path = "docker-compose.yml"
with open(compose_path, "r") as f:
    compose = f.read()

# Replace any wget/curl based actuator healthcheck with nc based healthcheck matching the port
def replacer(match):
    port = match.group(1)
    return f'["CMD-SHELL", "nc -z localhost {port} || exit 1"]'

# Match lines like: test: ["CMD-SHELL", "wget -q --spider http://localhost:8761/actuator/health || exit 1"]
# Or test: ["CMD", "curl", "-f", "http://localhost:8081/actuator/health"]
compose = re.sub(r'\["CMD(?:-SHELL)?",\s*".*?http://localhost:(\d+)/actuator/health.*?"\]', replacer, compose)

with open(compose_path, "w") as f:
    f.write(compose)

print("Updates completed successfully.")

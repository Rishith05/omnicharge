@echo off
setlocal enabledelayedexpansion
if exist .env (
    echo Loading environment variables from .env...
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
)
echo Starting OmniCharge Services Natively with Maven Wrapper...

echo Cleaning omnicharge-common...
cd omnicharge-common && call mvnw.cmd clean install -DskipTests && cd ..

start "Eureka Server" cmd /k "cd discovery-server && call mvnw.cmd clean spring-boot:run"
timeout /t 8 /nobreak

start "Config Server" cmd /k "cd config-server && call mvnw.cmd clean spring-boot:run"
timeout /t 10 /nobreak

start "API Gateway" cmd /k "cd api-gateway && call mvnw.cmd clean spring-boot:run"
start "User Service" cmd /k "cd user-service && call mvnw.cmd clean spring-boot:run"
start "Operator Service" cmd /k "cd operator-service && call mvnw.cmd clean spring-boot:run"
start "Recharge Service" cmd /k "cd recharge-service && call mvnw.cmd clean spring-boot:run"
start "Payment Service" cmd /k "cd payment-service && call mvnw.cmd clean spring-boot:run"
start "Notification Service" cmd /k "cd notification-service && call mvnw.cmd clean spring-boot:run"
start "Logging Service" cmd /k "cd logging-service && call mvnw.cmd clean spring-boot:run"

echo All services launched!

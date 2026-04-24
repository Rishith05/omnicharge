@echo off
echo ======================================================
echo OmniCharge Docker Deployment Script
echo ======================================================

echo [1/2] Building Backend Microservices...
echo --- Installing omnicharge-common ---
cd omnicharge-common
call mvnw.cmd clean install -DskipTests
cd ..

for %%d in (config-server discovery-server api-gateway user-service operator-service recharge-service payment-service notification-service logging-service) do (
    if exist "%%d\mvnw.cmd" (
        echo --- Building %%d ---
        cd %%d
        call mvnw.cmd clean package -DskipTests
        cd ..
    )
)

echo [2/2] Starting Docker Containers...
docker-compose up --build -d

echo ======================================================
echo Deployment initiated! 
echo Frontend: http://localhost:4200
echo API Gateway: http://localhost:8080
echo Eureka Dashboard: http://localhost:8761
echo Config Server: http://localhost:8888
echo ======================================================
pause

@echo off
echo Running tests for all microservices...

for %%d in (api-gateway config-server discovery-server logging-service notification-service operator-service payment-service recharge-service user-service) do (
    if exist "%%d\mvnw.cmd" (
        echo ======= Testing %%d =======
        cd %%d
        call mvnw.cmd test
        cd ..
    ) else if exist "%%d\pom.xml" (
        echo ======= Testing %%d (no mvnw) =======
        cd %%d
        call mvn test
        cd ..
    )
)
echo Done testing backend.

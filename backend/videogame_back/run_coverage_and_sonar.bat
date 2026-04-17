@echo off
REM Ejecutar pytest con coverage ANTES de sonar-scanner
echo.
echo ========================================
echo Paso 1: Ejecutando pytest con coverage...
echo ========================================
python -m pytest --cov=. --cov-report=xml:coverage.xml --cov-report=term-missing -v

REM Verificar que coverage.xml se generó
if not exist coverage.xml (
    echo ERROR: coverage.xml no se generó
    exit /b 1
)

echo.
echo ========================================
echo Paso 2: Ejecutando Sonar Scanner...
echo ========================================
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="sqp_02f46b2e786cc835f01909b702c0fc7f6a1cc5a0" -v "c:/Users/kuiss/Desktop/kuki/trabajos_chidos/Projectos_personales/UTEZ_8_VideoGame/backend/videogame_back:/usr/src" sonarsource/sonar-scanner-cli

echo.
echo ========================================
echo Análisis completado!
echo ========================================
pause

# SonarQube Scan (Docker)

This backend is configured for SonarScanner with the properties file at:
- videogame_back/sonar-project.properties

## Where to run the scan

Run SonarScanner from:
- backend/videogame_back

That folder contains manage.py and the sonar-project.properties file.

## Docker command (Windows CMD)

1) Start SonarQube:
docker run -d -p 9000:9000 sonarqube:latest

2) Run scan from backend/videogame_back:
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="TU_TOKEN" -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli

Expected result:
- ANALYSIS SUCCESSFUL

Open SonarQube:
- http://localhost:9000

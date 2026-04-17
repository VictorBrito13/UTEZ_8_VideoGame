# Guía de SonarQube + SonarScanner para el Backend

Este documento explica como crear el proyecto y ejecutar el analisis de SonarQube para el backend ubicado en `backend/videogame_back`.

---

## 1. Crear proyecto en SonarQube

1. Crear el proyecto local.
2. Generar el token.
3. Guardar el token para usarlo en el escaneo.

---

## 2. Configurar sonar-project.properties

### Ubicacion
El archivo debe estar en la raiz del backend que se va a analizar, en este caso:

```text
backend/videogame_back
```

### Ejemplo base
El proyecto del backend ya usa un archivo `sonar-project.properties` propio. La idea es mantener ahi la configuracion del analisis.

### Atributos principales
- `sonar.projectKey`: identificador unico del proyecto.
- `sonar.projectName`: nombre visible en la interfaz.
- `sonar.projectVersion`: version del proyecto.
- `sonar.sources`: ruta del codigo fuente.
- `sonar.sourceEncoding`: codificacion de archivos.
- `sonar.inclusions`: archivos que se quieren analizar.
- `sonar.exclusions`: archivos o carpetas que no se analizan.
- `sonar.tests`: ubicacion de los tests.
- `sonar.test.inclusions`: patron de archivos de prueba.

### Ejemplo orientativo para backend
```properties
sonar.projectKey=game
sonar.projectName=game
sonar.projectVersion=1.0

sonar.sources=.
sonar.sourceEncoding=UTF-8
sonar.inclusions=**/*.py
sonar.exclusions=**/migrations/**,**/__pycache__/**,**/.venv/**,**/venv/**,**/env/**,**/*.pyc,**/logs/**,**/.pytest_cache/**

sonar.tests=.
sonar.test.inclusions=**/tests.py,**/test_*.py,**/tests/**/*.py
```

---

## 3. Crear token

1. Entrar a SonarQube.
2. Ir a `My Account`.
3. Abrir `Security`.
4. Generar el token.

### Nota importante
Si el token falla, el error comun es:

```text
401 Unauthorized
```

---

## 4. Ejecutar analisis

Desde la raiz del backend:

```bash
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="TU_TOKEN" -v "$PWD:/usr/src" sonarsource/sonar-scanner-cli
```

### En Windows
```bash
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="TU_TOKEN" -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli
```

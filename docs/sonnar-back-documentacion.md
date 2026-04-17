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

## 4. Ejecutar análisis con Pytest + Sonar

### Requisitos previos (SOLO PRIMERA VEZ)

1. Instalar dependencias de desarrollo:
```bash
cd c:\Users\kuiss\Desktop\kuki\trabajos_chidos\Projectos_personales\UTEZ_8_VideoGame\backend
pip install pytest pytest-cov pytest-django pytest-asyncio
cd videogame_back
```

2. Verificar que existen estos archivos en `backend/videogame_back`:
   - `pytest.ini` ✅
   - `.coveragerc` ✅
   - `sonar-project.properties` ✅

3. Asegurarse de que Docker esté abierto antes de ejecutar Sonar.

### Paso 1: ejecutar tests con cobertura

Copiar y pegar este comando en CMD desde `backend/videogame_back`:

```bash
cd /d "c:\Users\kuiss\Desktop\kuki\trabajos_chidos\Projectos_personales\UTEZ_8_VideoGame\backend\videogame_back" && C:/Users/kuiss/AppData/Local/Programs/Python/Python311/python.exe -m pytest --cov=. --cov-report=xml --cov-report=term-missing -v
```

### Paso 2: ejecutar SonarScanner

Cuando pytest termine bien, copiar y pegar este comando:

```bash
cd /d "c:\Users\kuiss\Desktop\kuki\trabajos_chidos\Projectos_personales\UTEZ_8_VideoGame\backend\videogame_back" && docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="sqp_02f46b2e786cc835f01909b702c0fc7f6a1cc5a0" -v "c:/Users/kuiss/Desktop/kuki/trabajos_chidos/Projectos_personales/UTEZ_8_VideoGame/backend/videogame_back:/usr/src" sonarsource/sonar-scanner-cli
```

### Qué hace este comando:
1. ✅ Navega a la carpeta `backend/videogame_back`
2. ✅ Ejecuta `pytest` con cobertura y genera `coverage.xml`
3. ✅ Ejecuta SonarScanner con la cobertura ya creada
4. ✅ Sonar lee `coverage.xml` y actualiza el proyecto

### Resultado esperado:
- Coverage de New Code debería estar **80%+**
- Verás el reporte en: `http://host.docker.internal:9000/dashboard?id=game`

### Si falla pytest:
Revisa los errores en la salida y corrige. Sonar solo debe correr cuando pytest termina sin errores.

### Si falla Sonar:
Verifica que Docker esté corriendo y el token sea válido.

### Comando corto para la escuela

Si quieres hacerlo sin pensar, usa este comando único:

```bash
cd /d "c:\Users\kuiss\Desktop\kuki\trabajos_chidos\Projectos_personales\UTEZ_8_VideoGame\backend\videogame_back" && C:/Users/kuiss/AppData/Local/Programs/Python/Python311/python.exe -m pytest --cov=. --cov-report=xml --cov-report=term-missing -v && docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="sqp_02f46b2e786cc835f01909b702c0fc7f6a1cc5a0" -v "c:/Users/kuiss/Desktop/kuki/trabajos_chidos/Projectos_personales/UTEZ_8_VideoGame/backend/videogame_back:/usr/src" sonarsource/sonar-scanner-cli
```

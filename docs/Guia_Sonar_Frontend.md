# Guía de Análisis con SonarQube (Frontend)

Esta guía documenta el proceso paso a paso para ejecutar el análisis de código estático con SonarQube **exclusivamente para el proyecto del Frontend**, sin mezclarlo con el código ni las métricas del Backend.

---

## 1. Requisitos Previos

1. **Docker Instalado y Corriendo:** Necesitas Docker para poder levantar el escáner de manera aislada sin instalar dependencias globales en tu máquina.
2. **Servidor SonarQube Activo:** Debes tener tu servidor local de SonarQube ejecutándose (usualmente en `http://localhost:9000` o `http://host.docker.internal:9000`).
3. **Token de Acceso:** Necesitas un token generado desde tu panel de SonarQube con permisos para publicar el análisis.
Este lo generas en My Account -> Security -> Generate Token.

---

## 2. Configuración del Proyecto (`sonar-project.properties`)

Asegúrate de que en la raíz del frontend (`d:\UTEZ_8_VideoGame\frontend\videogame_front\`) exista el archivo `sonar-project.properties`. Este archivo le indica a SonarQube qué analizar y qué ignorar. 

El archivo debe verse similar a esto:

```properties
# Llave única del proyecto en SonarQube para el Frontend
sonar.projectKey=sonnar_videogame

# URL del servidor local de SonarQube
sonar.host.url=http://localhost:9000

# Directorio que contiene el código fuente
sonar.sources=src

# Archivos específicos o extensiones a incluir en el análisis
sonar.inclusions=**/*.ts,**/*.tsx,**/*.css,**/*.js,**/*.jsx

# Carpetas o archivos a excluir (librerías, compilados, etc.)
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/public/**,**/*.test.tsx,**/*.spec.tsx,**/*.test.ts,**/*.spec.ts

# Codificación del código fuente
sonar.sourceEncoding=UTF-8
```

> **Importante:** Al tener `sonar.sources=src` y este archivo dentro de la carpeta `videogame_front`, garantizamos que SonarQube **solo** revise el código de UI de React, ignorando cualquier rastro del Backend (Django/Python).

---

## 3. Ejecutar el Escáner de SonarQube

Una vez configurado y asegurándote de que tu terminal está ubicada en la ruta del frontend:

```bash
cd d:\UTEZ_8_VideoGame\frontend\videogame_front
```

Ejecuta el siguiente comando. Este comando utiliza la imagen oficial de SonarScanner en Docker para leer el archivo properties y enviarlo al dashboard local.

### En Consola / PowerShell (Windows / WSL)

```powershell
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="tu_token_aqui" -v "${PWD}:/usr/src" sonarsource/sonar-scanner-cli
```

*Si el `${PWD}` no funciona correctamente en tu Command Prompt de Windows clásico, puedes usar `%cd%`:*

```cmd
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="tu_token_aqui" -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli
```

**Explicación del Comando:**
- `docker run --rm`: Crea un contenedor temporal y lo elimina al finalizar.
- `-e SONAR_HOST_URL`: Apunta a nuestro servidor. Usamos `host.docker.internal` para que Docker se pueda comunicar con el `localhost` de tu máquina.
- `-e SONAR_TOKEN`: Tu token de autenticación.
- `-v "${PWD}:/usr/src"`: Mapea tu carpeta del frontend actual hacia la carpeta `/usr/src` dentro del contenedor virtual para que el escáner la pueda leer.
- `sonarsource/sonar-scanner-cli`: Nombre de la imagen de Docker oficial a utilizar.

---

## 4. Visualizar los Resultados

Cuando la consola arroje el mensaje verde de **`EXECUTION SUCCESS`**, el análisis se habrá completado.

1. Abre tu navegador de preferencia.
2. Ingresa a la URL del dashboard especificado: `http://localhost:9000/dashboard?id=sonnar_videogame`.
3. Verás las métricas exclusivas del Frontend: *Reliability (Bugs), Security (Vulnerabilidades), Maintainability (Code Smells y Effort).*

### Consejos para el Frontend:
- Para no aumentar la Deuda Técnica (Effort), recuerda evitar "Codes Smells" típicos de React como anidación excesiva de `if / else`, funciones complejas dentro de Hooks (`Cognitive Complexity`) o el uso variables globales en desuso como `window` en su lugar opta por `globalThis`.
- Todos los cambios deben realizarse y probarse siempre manteniendo la norma de no cambiar la lógica base visual del sistema.

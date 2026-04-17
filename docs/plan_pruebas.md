# Plan de pruebas manuales — DevCore Nexus (producción)

Documento orientado a validación manual en el entorno productivo. Cada caso incluye la **operación**, los **pasos**, el **resultado esperado** y filas para anotar **fecha**, **ejecutor**, **entorno (prod)**, **resultado (OK / No OK)** y **observaciones**.

---

## 1. Autenticación y sesión

### 1.1 Inicio de sesión con credenciales válidas


| Campo                  | Contenido                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Autenticar un usuario existente.                                                                                                                                  |
| **Pasos**              | 1. Abrir la URL de la aplicación y navegar a la pantalla de inicio de sesión. 2. Introducir un nombre de usuario y contraseña correctos. 3. Enviar el formulario. |
| **Resultado esperado** | Se obtiene acceso a la aplicación (por ejemplo, redirección al panel principal). No se muestra un mensaje de error de credenciales.                               |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 1.2 Inicio de sesión con credenciales inválidas


| Campo                  | Contenido                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Rechazar acceso cuando los datos son incorrectos.                                                                    |
| **Pasos**              | 1. Ir a la pantalla de inicio de sesión. 2. Introducir un usuario o contraseña incorrectos. 3. Enviar el formulario. |
| **Resultado esperado** | No se accede al panel. Se muestra un mensaje coherente de error (por ejemplo, credenciales inválidas).               |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 1.3 Registro de nuevo usuario


| Campo                  | Contenido                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Crear una cuenta desde el flujo de registro.                                                                                  |
| **Pasos**              | 1. Navegar a la pantalla de registro. 2. Completar los campos requeridos con datos válidos y únicos. 3. Enviar el formulario. |
| **Resultado esperado** | La cuenta se crea correctamente y el usuario puede iniciar sesión con las credenciales registradas                            |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 1.4 Cierre de sesión


| Campo                  | Contenido                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Finalizar la sesión del usuario autenticado.                                                                                     |
| **Pasos**              | 1. Iniciar sesión correctamente. 2. Ejecutar la acción de cierre de sesión (logout) desde el panel                               |
| **Resultado esperado** | La sesión termina. Al intentar acceder a rutas protegidas, se exige autenticación de nuevo (redirección al login o equivalente). |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 1.5 Acceso a rutas protegidas sin sesión


| Campo                  | Contenido                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Comprobar que el panel y funciones privadas no son accesibles sin token.                                                                      |
| **Pasos**              | 1. Cerrar sesión o abrir una ventana de navegación privada sin credenciales. 2. Intentar abrir directamente la URL del panel principal (`/`). |
| **Resultado esperado** | No se muestra el contenido del usuario autenticado; se redirige al inicio de sesión u otra pantalla pública definida.                         |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 2. Panel principal (dashboard) y perfil

### 2.1 Visualización del panel tras login


| Campo                  | Contenido                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Verificar que el panel carga datos del perfil.                                                                          |
| **Pasos**              | 1. Iniciar sesión. 2. Esperar a que cargue el panel principal.                                                          |
| **Resultado esperado** | La interfaz se muestra sin errores visibles críticos y, si aplica, se reflejan datos del perfil obtenidos del servidor. |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 2.2 Cambio de avatar (sprite de entrenador)


| Campo                  | Contenido                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Actualizar el avatar del perfil.                                                                                                                                    |
| **Pasos**              | 1. En el panel, localizar la selección de avatar o sprite de entrenador. 2. Elegir una opción distinta a la actual. 3. Confirmar o guardar si el flujo lo requiere. |
| **Resultado esperado** | El avatar mostrado se actualiza y permanece tras recargar la página o volver a entrar al panel.                                                                     |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 2.3 Navegación desde el panel a módulos


| Campo                  | Contenido                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Operación**          | Acceder a Leaderboard, Pokédex e Inventario desde el panel.                                                                          |
| **Pasos**              | 1. Desde el panel, usar los enlaces o tarjetas hacia Leaderboard (`/leaderboard`), Pokédex (`/pokedex`) e Inventario (`/inventory`). |
| **Resultado esperado** | Cada enlace abre la pantalla correcta sin error 404 en la aplicación cliente.                                                        |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 3. Pokédex

### 3.1 Listado o consulta de especies


| Campo                  | Contenido                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Consultar el archivo de especies y estadísticas.                                                                                                      |
| **Pasos**              | 1. Iniciar sesión. 2. Ir a la Pokédex. 3. Revisar el listado o detalle disponible en la interfaz.                                                     |
| **Resultado esperado** | Se muestran las criaturas o entradas según el diseño (nombres, stats u otros campos visibles). No hay pantalla en blanco por fallo de carga evidente. |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 4. Inventario

### 4.1 Visualización de ítems


| Campo                  | Contenido                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Ver el inventario del jugador.                                                                                             |
| **Pasos**              | 1. Iniciar sesión. 2. Abrir la pantalla de inventario (`/inventory`).                                                      |
| **Resultado esperado** | Se listan los ítems (por ejemplo, objetos de curación o buff) con cantidades o estados coherentes con la lógica del juego. |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 4.2 Uso de un ítem (si la UI lo permite en inventario)


| Campo                  | Contenido                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Aplicar un ítem desde el inventario cuando corresponda.                                                                         |
| **Pasos**              | 1. Abrir inventario. 2. Seleccionar un ítem usable según la interfaz. 3. Confirmar la acción si existe confirmación.            |
| **Resultado esperado** | La cantidad o el estado del ítem se actualiza y cualquier efecto esperado (mensaje o feedback visual) se muestra correctamente. |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 5. Matchmaking y combate

### 5.1 Entrada a búsqueda de partida


| Campo                  | Contenido                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Iniciar el flujo de emparejamiento.                                                                                                                               |
| **Pasos**              | 1. Iniciar sesión. 2. Navegar a matchmaking (`/matchmaking`). 3. Observar el estado de búsqueda (cola, mensajes de ELO o ampliación de búsqueda).                 |
| **Resultado esperado** | La conexión por WebSocket muestra estado de búsqueda o mensajes informativos; no se queda indefinidamente sin feedback salvo timeout o mensaje de error definido. |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 5.2 Cancelación de búsqueda (si está disponible)


| Campo                  | Contenido                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Cancelar la búsqueda de oponente.                                                                             |
| **Pasos**              | 1. Entrar en matchmaking y esperar a estar en cola o buscando. 2. Pulsar cancelar o volver atrás según la UI. |
| **Resultado esperado** | La búsqueda se detiene y el estado vuelve a inactivo o se muestra mensaje de cancelación coherente.           |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 5.3 Inicio de batalla al encontrar oponente


| Campo                  | Contenido                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Pasar de matchmaking a la arena de combate.                                                                                                                                     |
| **Pasos**              | 1. Con dos cuentas o un oponente disponible, completar el emparejamiento. 2. Esperar la notificación de oponente encontrado. 3. Verificar la redirección a `/battle/:battleId`. |
| **Resultado esperado** | Se abre la pantalla de batalla con identificador de batalla en la URL y la interfaz de combate visible.                                                                         |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 5.4 Acciones de combate (ataques y habilidades)


| Campo                  | Contenido                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Operación**          | Ejecutar turnos de combate.                                                                                                                |
| **Pasos**              | 1. En la batalla, seleccionar acciones disponibles (ataque, habilidad, etc.). 2. Observar vida, animaciones o números de daño según la UI. |
| **Resultado esperado** | El estado del combate se actualiza; los valores de vida o efectos reflejan las acciones sin desincronización obvia.                        |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 5.5 Uso de ítems en batalla


| Campo                  | Contenido                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Usar objetos del inventario durante la batalla.                                                                   |
| **Pasos**              | 1. En la pantalla de batalla, abrir o seleccionar uso de ítem. 2. Aplicar un ítem permitido a un objetivo válido. |
| **Resultado esperado** | El ítem se consume o actualiza según reglas; el efecto (curación, buff, etc.) se refleja en la UI.                |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 5.6 Chat de batalla


| Campo                  | Contenido                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Enviar y recibir mensajes en el chat de la batalla.                                                                                                           |
| **Pasos**              | 1. Con ambos jugadores en la misma batalla, escribir un mensaje corto en el campo de chat. 2. Enviar. 3. Verificar en el otro cliente que el mensaje aparece. |
| **Resultado esperado** | Los mensajes se muestran en ambos lados en orden razonable; errores de conexión muestran estado o mensaje acorde.                                             |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 5.7 Fin de batalla y resultado


| Campo                  | Contenido                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Concluir el combate y ver el resultado.                                                                                   |
| **Pasos**              | 1. Jugar hasta que termine la batalla (vencedor definido). 2. Revisar pantalla de fin de batalla o overlay.               |
| **Resultado esperado** | Se indica claramente el ganador o el resultado; la navegación posterior (volver al panel, etc.) funciona según el diseño. |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 6. Clasificación (Leaderboard)

### 6.1 Visualización del ranking global


| Campo                  | Contenido                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Consultar la tabla de clasificación por ELO.                                                                      |
| **Pasos**              | 1. Iniciar sesión. 2. Ir a Leaderboard (`/leaderboard`). 3. Revisar posiciones, nombres y puntuaciones mostradas. |
| **Resultado esperado** | La lista se carga y muestra entradas ordenadas según la lógica del juego (por ejemplo, por ELO).                  |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 6.2 Actualización tras partidas (validación puntual)


| Campo                  | Contenido                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Operación**          | Comprobar que el ranking refleja cambios tras combates que alteren ELO.                                                                          |
| **Pasos**              | 1. Anotar posición o ELO visible del usuario de prueba. 2. Completar una batalla que deba modificar el ELO. 3. Volver al Leaderboard y comparar. |
| **Resultado esperado** | Los valores mostrados son coherentes con el resultado del combate (dentro de la lógica del sistema).                                             |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 7. Disponibilidad y API

### 7.1 Comprobación de salud del backend


| Campo                  | Contenido                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Operación**          | Verificar que el servicio responde.                                                                                                                                      |
| **Pasos**              | 1. Realizar una petición GET al endpoint de salud del backend (`/api/health` o el definido en despliegue). 2. Revisar el código de estado HTTP y el cuerpo de respuesta. |
| **Resultado esperado** | Respuesta exitosa (por ejemplo, 200) indicando que el servicio está operativo.                                                                                           |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 7.2 Carga de la aplicación web


| Campo                  | Contenido                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Validar que el front se sirve correctamente.                                                                         |
| **Pasos**              | 1. Abrir la URL base del cliente en el navegador. 2. Comprobar que la aplicación carga sin error de red persistente. |
| **Resultado esperado** | La SPA o página inicial se renderiza; no hay pantalla de error del servidor de archivos estáticos.                   |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## 8. Regresión rápida transversal

### 8.1 Recarga y persistencia de sesión


| Campo                  | Contenido                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Mantener sesión tras recargar.                                                                                                      |
| **Pasos**              | 1. Iniciar sesión. 2. Recargar la página en una vista autenticada (por ejemplo, panel).                                             |
| **Resultado esperado** | El usuario sigue autenticado mientras el token sea válido; si el token expiró, el comportamiento es el definido (logout o refresh). |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


### 8.2 Navegación con botón atrás del navegador


| Campo                  | Contenido                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Operación**          | Evitar estados rotos al usar historial.                                                                                                 |
| **Pasos**              | 1. Navegar entre varias pantallas autenticadas (panel → inventario → leaderboard). 2. Usar el botón “atrás” del navegador varias veces. |
| **Resultado esperado** | Las pantallas se muestran de forma coherente; no aparecen datos de otro usuario ni errores inesperados por historial.                   |
| **Fecha** | |
| **Ejecutor** | |
| **Entorno** | prod |
| **Resultado (OK / No OK)** | |
| **Observaciones** | |


---

## Registro de ejecución

En cada tabla, complete **Fecha**, **Ejecutor** y, si aplica, **Observaciones**. **Entorno** usa el valor indicativo `prod` (ajuste si ejecuta en otro entorno). En **Resultado (OK / No OK)** escriba **OK** o **No OK** según coincida o no con el resultado esperado.

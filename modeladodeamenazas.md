# Modelado de Amenazas del Proyecto

**Empresa:** DevCore Nexus  
**Lema:** "Transformamos ideas en soluciones digitales."  
**Proyecto:** Videojuego Web RPG PvP  
**Grado y Grupo:** 8° C  
**Fecha:** 27/02/2026  
**Integrantes:** * José Eduardo Casarrubias Alemán  
* Victor Javier Brito Vega  
* Josue Manuel Rosales García  
* Diego Adir Mesino Escobar  
* Gael Castañeda Beltrán  
* Sergio Jhoel Garduño Cruz  

---

### Módulo 1: Control de Acceso

#### R1.1 Iniciar sesión
* **Roles:** Usuario
* **Descripción:** El sistema permitirá a los usuarios autenticarse de forma segura para acceder a las funcionalidades del juego.
* **Datos de entrada:** Usuario*, Contraseña*
* **Datos de salida:** Acceso al sistema, Permisos asociados al usuario, Token de sesión.

**Elemento:** Campo de Usuario (Login Form - API Endpoint `/api/login`)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Inyección de código (SQL/NoSQL) y XSS. Inicio de sesión frecuente (spam).
* **Medidas Ideales:** Validación de formato y filtrado de caracteres especiales. Implementar bloqueo temporal de cuenta tras múltiples intentos fallidos (Rate limiting).
* **Evidencia:** Se configuró el `Throttle` global en `settings.py` restringiendo a usuarios anónimos a 10 peticiones/minuto.

**Elemento:** Campo de Contraseña (Almacenamiento BD)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Exposición de credenciales en base de datos.
* **Medidas:** Almacenamiento cifrado mediante algoritmos de hash seguros (Argon2 o BCrypt). Nunca texto plano.

**Elemento:** Token de Sesión (JWT - Access Token)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Intercepción de credenciales en red.
* **Medidas:** Forzar el uso de HTTPS en todo el sitio web para encriptar la comunicación.

#### R1.2 Manejo de sesión
* **Roles:** Usuario
* **Descripción:** El sistema gestionará las sesiones de los usuarios para controlar el acceso a recursos protegidos y WebSockets.

**Elemento:** Access Token JWT (Control de Expiración)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Robo de token (Session Hijacking). Reutilización de token (Replay Attack).
* **Medidas:** Tiempo de expiración corto para el Access Token. Configurado a 15 min.

**Elemento:** Validación de JWT en Peticiones HTTP (Django)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Acceso no autorizado a rutas protegidas.
* **Medidas:** Validación estricta del token en los middlewares de Django en cada petición HTTP y previo al handshake del WebSocket.

**Elemento:** Autenticación de WebSocket (Handshake con JWT)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Conexión de usuarios no autenticados en tiempo real.
* **Medidas:** Validación del JWT antes de establecer la conexión mediante `JWTQueryParamMiddleware`.

---

### Módulo 2: Gestión de Usuarios y Perfil

#### R2.1 Registro de usuario
* **Roles:** Usuario no registrado
* **Datos de entrada:** Usuario*, Correo electrónico*, Contraseña*

**Elemento:** Campo de Nombre de Usuario (Register form)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Nombres inapropiados o inyección en el Alias.
* **Medidas Ideales:** Validación con lista negra (groserías) y lista blanca de caracteres.
* **Evidencia:** Se agregó el método `validate_username` en `UserRegistrationSerializer` con validación de expresiones regulares y filtro de palabras ofensivas (BAD_WORDS).

**Elemento:** Campo de Correo Electrónico (Register form)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Conflictos de datos y saturación de base de datos.
* **Medidas:** Validación de unicidad de correo y usuario directamente en el modelo de base de datos.

**Elemento:** Campo de Contraseña (Register form)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Creación de contraseñas débiles.
* **Medidas:** Validación obligatoria de complejidad (longitud mínima, uso de mayúsculas, números y símbolos).

#### R2.2 Gestión de avatar
* **Roles:** Usuario

**Elemento:** Selección de Opciones de Avatar (Personalization Form)
* **Estado en Proyecto:** ❌ NO Implementado (Grave)
* **Riesgos:** Manipulación de valores para usar assets bloqueados.
* **Medidas Ideales:** Validación en servidor de que el usuario posee el nivel o permiso para usar dicho ítem visual.

**Elemento:** Subida de Imagen de Avatar (File Upload - Base64 Decoder)
* **Estado en Proyecto:** ❌ NO Implementado (Grave)
* **Riesgos:** Carga de archivos maliciosos (Web Shells o desbordamiento de String).
* **Medidas Ideales:** Restricción estricta de extensiones válidas y validación de cabeceras (MIME type).
* **Debería Ser Modificado:** Tu `ProfileSerializer` recibe `foto_data` en Base64 y lo inyecta a decodificador binario. JAMÁS filtras si el base64 es de verdad un `.jpg` o un script ofuscado.

---

### Módulo 3: Gestión de Criaturas

#### R3.1 Crear equipo de criaturas
* **Roles:** Usuario
* **Datos de entrada:** IDs de las criaturas seleccionadas (Máx. 3).

**Elemento:** Selección y Guardado de Equipo (Team Selection)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Superar numéricamente el límite de criaturas.
* **Medidas:** Validación estricta del lado del servidor. Se verifica programáticamente al agregar que el número del equipo sea válido (`is_team_full`).

#### R3.2 Consulta de estadísticas
* **Roles:** Usuario
* **Datos de entrada:** Solicitud de consulta (ID de criatura).

**Elemento:** ID de Criatura (Consultation Request)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Acceso a criaturas que no pertenecen al usuario. Envío de IDs inválidos o manipulados.
* **Medidas:** Validar que el ID exista. Verificar que la criatura sea pública o que la consulta respete la privacidad.

---

### Módulo 4: Combate PvP

#### R4.1 Matchmaking (Emparejamiento)
* **Roles:** Usuario, Sistema

**Elemento:** Control de Ingreso a la cola (API de Matchmaking)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Abuso del endpoint (Spam). Saturación de la cola de emparejamiento.
* **Medidas Ideales:** Control de frecuencia (Throttling) de peticiones.
* **Evidencia:** Existe un rate limit sobre WebSockets en `_handle_join` (`combat/consumers.py`) que bloquea a los 5 intentos cada 10 segundos.

**Elemento:** Lógica de Emparejamiento en Backend (Cooldown 1 Minuto)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Manipulación de parámetros para forzar combates con cuentas secundarias.
* **Medidas Ideales:** Protección contra cuentas secundarias - Verificación de historial de partidas (cooldown).
* **Evidencia:** La función `_have_played_together_recently` en `combat/matchmaking/service.py` evita que dos jugadores peleen seguidamente protegiendo 1 minuto tras cada partida.

#### R4.2 Acciones de combate
* **Roles:** Usuario (en turno)

**Elemento:** Acción del Jugador (Attack / Object Use)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Manipulación de paquetes cliente enviando daño falso.
* **Medidas:** El cliente solo envía la intención (tipo de acción). El `damage_service.py` hace restas matemáticas exclusivamente en el backend.

**Elemento:** Máquina de Estados del Turno (Shifts)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Desincronización del estado del juego / atacan todos a la vez.
* **Medidas:** Validar turno activo mediante el booleano `is_player_turn()`. Rechazar acciones inválidas.

---

### Módulo 5: Chat en Tiempo Real

#### R5.1 Envío y Recepción de mensajes
* **Roles:** Usuario (en combate)

**Elemento:** Bloque de Contenido y Anti-Vulgaridad del Chat (Payload WS)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Inyección de Scripts (XSS) y Groserías.
* **Medidas:** Sanitize (`bleach.clean()`) y Censura de palabras implementados en `chat/utils.py`.

**Elemento:** Procesamiento de Mensajes en Backend (Chat Handler)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Sobrecarga del sistema por mensajes excesivos.
* **Medidas:** Validación del contenido antes de retransmitir y rate limiting (`_check_rate_limit()` bloqueando a los 5 intentos en `chat/consumers.py`).

**Elemento:** Comunicación WebSocket Segura (`wss://`)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Intercepción de mensajes (Man-in-the-Middle).
* **Medidas:** El cliente Angular/React configura la ruta sobre wss:// cuando detecta que la API Base es remota segura.

---

### Módulo 6: Inventario y Objetos

#### R6.1 y R6.2 Gestión y Uso de Objetos
* **Roles:** Usuario

**Elemento:** Inventario del Usuario (Database Locks)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Duplicación de ítems (Race Conditions).
* **Medidas:** Uso de transacciones de base de datos (`@transaction.atomic` y `select_for_update()`) en `inventory/services.py` al consumir ítems.

**Elemento:** Consumo de Objetos en Backend (Uso de items)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Uso múltiple del mismo objeto en paralelo. Aplicación de efectos inválidos.
* **Medidas:** Validar existencia del objeto y verificar `cantidad > 0` antes de consumir.

---

### Módulo 7: Ranking

#### R7.1 y R7.2 Actualización y Consulta de Ranking
* **Roles:** Sistema, Usuario

**Elemento:** Actualización de Ranking (Elo Calculation)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Manipulación de victorias engañando al ranking.
* **Medidas:** El servidor calcula el resultado automáticamente cerrando la sala cuando la vida llega a 0 (`BattleStatus.FINISHED`).

**Elemento:** Tabla de Ranking (Base de Datos)
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Modificación no autorizada de puntuaciones.
* **Medidas:** Restricción de escritura solo al sistema mediante el ORM.

**Elemento:** Validación de Integridad del Combate
* **Estado en Proyecto:** ✅ Implementado
* **Riesgos:** Registro de victorias falsas.
* **Medidas:** Verificar que el combate terminó correctamente confirmando estado de salud a 0 en backend.
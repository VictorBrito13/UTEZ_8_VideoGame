

Seguridad en el Desarrollo de Aplicaciones


Modelado de Amenazas del Proyecto
Empresa: DevCore Nexus
Proyecto: Videojuego Web RPG PvP
Grado y Grupo: 8° C 
Fecha: 27/02/2026
Integrantes:
José Eduardo Casarrubias Alemán
Victor Javier Brito Vega
Josue Manuel Rosales García
Diego Adir Mesino Escobar
Gael Castañeda Beltrán
Sergio Jhoel Garduño Cruz





ÍNDICE:
Módulo 1: Control de Acceso	4
R1.1 Iniciar sesión	4
R1.2 Manejo de sesión	4
Módulo 2: Gestión de Usuarios y Perfil	5
R2.1 Registro de usuario	5
R2.2 Gestión de avatar	6
Módulo 3: Gestión de Criaturas	6
R3.1 Crear equipo de criaturas	6
R3.2 Consulta de estadísticas	7
Módulo 4: Combate PvP	7
R4.1 Matchmaking (Emparejamiento)	7
R4.2 Acciones de combate	8
Módulo 5: Chat en Tiempo Real	9
R5.1 Envío y Recepción de mensajes	9
Módulo 6: Inventario y Objetos	10
R6.1 y R6.2 Gestión y Uso de Objetos	10
Módulo 7: Ranking	10
R7.1 y R7.2 Actualización y Consulta de Ranking	10


Módulo 1: Control de Acceso

R1.1 Iniciar sesión
Roles: Usuario
Descripción: El sistema permitirá a los usuarios autenticarse de forma segura para acceder a las funcionalidades del juego.
Datos de entrada: Usuario*, Contraseña*
Datos de salida: Acceso al sistema, Permisos asociados al usuario, Token de sesión.
Elemento
Riesgos
Medidas
Campo de Usuario (Login Form)
Inyección de código (SQL/NoSQL) y XSS.
Inicio de sesión frecuente (spam)
Validación de formato y filtrado de caracteres especiales. Implementar bloqueo temporal de cuenta tras múltiples intentos fallidos (Rate limiting)
Campo de Contraseña (Login Form)
Exposición de credenciales en base de datos.
Almacenamiento cifrado mediante algoritmos de hash seguros (Argon2 o BCrypt). Nunca texto plano.
Token de Sesión (JWT - Access Token)
Intercepción de credenciales en red.
Forzar el uso de HTTPS en todo el sitio web para encriptar la comunicación.


R1.2 Manejo de sesión
Roles: Usuario
Descripción: El sistema gestionará las sesiones de los usuarios para controlar el acceso a recursos protegidos y WebSockets.
Datos de entrada: Token de sesión (JWT)
Datos de salida: Acceso o restricción al sistema y canales de comunicación.
Elemento
Riesgos
Medidas
Access Token JWT (Control de Expiración)
Robo de token (Session Hijacking). Reutilización de token (Replay Attack).
Tiempo de expiración corto para el Access Token. Configurado a 15 min.
Validación de JWT en Peticiones HTTP (Django)
Acceso no autorizado a rutas protegidas.
Validación estricta del token en los middlewares de Django en cada petición HTTP y previo al handshake del WebSocket.
Autenticación de WebSocket (Handshake con JWT)
Conexión de usuarios no autenticados en tiempo real.
Validación del JWT antes de establecer la conexión mediante `JWTQueryParamMiddleware`.



Módulo 2: Gestión de Usuarios y Perfil

R2.1 Registro de usuario
Roles: Usuario no registrado
Descripción: Permite a nuevos jugadores crear una cuenta en el sistema.
Datos de entrada: Usuario*, Correo electrónico*, Contraseña*
Datos de salida: Confirmación de registro, Creación de perfil inicial.
Elemento
Riesgos
Medidas
Campo de Nombre de Usuario (Register form)
Nombres inapropiados o inyección en el Alias.
Validación con lista negra (groserías) y lista blanca de caracteres.
Campo de Correo Electrónico (Register form)
Conflictos de datos y saturación de base de datos.
Validación de unicidad de correo y usuario directamente en el modelo de base de datos.
Campo de Contraseña (Register form)
Creación de contraseñas débiles.
Validación obligatoria de complejidad (longitud mínima, uso de mayúsculas, números y símbolos).


R2.2 Gestión de avatar
Roles: Usuario
Descripción: El usuario podrá personalizar su avatar visual dentro del sistema.
Datos de entrada: Opciones de personalización / Subida de imagen.
Datos de salida: Avatar actualizado en el perfil.
Elemento
Riesgos
Medidas
Selección de Opciones de Avatar (Personalization Form)
Manipulación de valores para usar assets bloqueados.
Validación en servidor de que el usuario posee el nivel o permiso para usar dicho ítem visual.
Subida de Imagen de Avatar (File Upload)
Carga de archivos maliciosos (Web Shells o desbordamiento de String).
Restricción estricta de extensiones válidas y validación de cabeceras (MIME type).





Módulo 3: Gestión de Criaturas

R3.1 Crear equipo de criaturas
Roles: Usuario
Descripción: El usuario podrá seleccionar y administrar su equipo activo de criaturas.
Datos de entrada: IDs de las criaturas seleccionadas (Máx. 3).
Datos de salida: Equipo validado y guardado en base de datos.
Elemento
Riesgos
Medidas
Selección y Guardado de Equipo (Team Selection)
Superar numéricamente el límite de criaturas.
Validación estricta del lado del servidor para garantizar que la lista no exceda los límites del juego.


R3.2 Consulta de estadísticas
Roles: Usuario
Descripción: El sistema mostrará estadísticas, salud y habilidades de las criaturas.
Datos de entrada: Solicitud de consulta (ID de criatura).
Datos de salida: Información detallada de la criatura.
Elemento
Riesgos
Medidas
ID de Criatura (Consultation Request)
Acceso a criaturas que no pertenecen al usuario.  Envío de IDs inválidos o manipulados
Validar que el ID exista
Verificar que la criatura sea pública.


Módulo 4: Combate PvP
R4.1 Matchmaking (Emparejamiento)
Roles: Usuario, Sistema
Descripción: Emparejamiento de jugadores de nivel similar para combates 1v1.
Datos de entrada: Solicitud de búsqueda de combate.
Datos de salida: Redirección a sala de combate iniciada.
Elemento
Riesgos
Medidas
Control de Ingreso a la cola (API de Matchmaking)
Abuso del endpoint (Spam).
Saturación de la cola de emparejamiento
Control de frecuencia (Throttling) de peticiones para evitar que un usuario sature la cola de emparejamiento.
Validación de estado (no permitir múltiples solicitudes activas)
Lógica de Emparejamiento en Backend
Manipulación de parámetros para forzar combates con cuentas secundarias.
Protección contra cuentas secundarias - Verificación de historial de partidas para prevenir emparejamientos repetidos entre mismos jugadores (cooldown de 2 horas)


R4.2 Acciones de combate
Roles: Usuario (en turno)
Descripción: El usuario podrá ejecutar acciones (atacar, usar objeto, etc.) durante su turno.
Datos de entrada: Acción seleccionada, Objetivo.
Datos de salida: Cálculo de daño y actualización del estado de la partida.



Elemento
Riesgos
Medidas
Acción del Jugador (Attack / Object Use)
Manipulación de paquetes cliente enviando daño falso.
El cliente solo envía la intención (tipo de acción)
Máquina de Estados del Turno(Shifts)
Desincronización del estado del juego / atacan todos a la vez.
Validar turno activo antes de procesar cualquier acción. Rechazar acciones inválidas según el estado actual


Módulo 5: Chat en Tiempo Real

R5.1 Envío y Recepción de mensajes
Roles: Usuario (en combate)
Descripción: Comunicación bidireccional entre jugadores mediante WebSockets.
Datos de entrada: Mensaje de texto.
Datos de salida: Mensaje renderizado en la pantalla del oponente.
Elemento
Riesgos
Medidas
Bloque de Contenido y Anti-Vulgaridad del Chat (Payload WS)
Inyección de Scripts (XSS) y Groserías.
Sanitize y Censura de palabras.
Procesamiento de Mensajes en Backend (Chat Handler)
Sobrecarga del sistema por mensajes excesivos
Validación del contenido antes de retransmitir
Aplicar rate limiting por usuario
Comunicación WebSocket Segura (wss://)
Intercepción de mensajes (Man-in-the-Middle)
Manipulación de datos en tránsito
Uso obligatorio de wss://
Cifrado TLS en toda la comunicación


Módulo 6: Inventario y Objetos

R6.1 y R6.2 Gestión y Uso de Objetos
Roles: Usuario
Descripción: El usuario podrá visualizar y consumir objetos (ej. pociones) durante el combate.
Datos de entrada: Solicitud de inventario / ID de objeto seleccionado.
Datos de salida: Lista de objetos / Aplicación del efecto del objeto y consumo del mismo.
Elemento
Riesgos
Medidas
Inventario del Usuario (Database)
Duplicación de ítems (Race Conditions)
Corrupción de datos
Uso de transacciones de base de datos (atomic transactions en Django) al consumir ítems para evitar usos múltiples simultáneos.
Consumo de Objetos en Backend (Uso de Ítems)
Uso múltiple del mismo objeto en paralelo
Aplicación de efectos inválidos
Validar existencia del objeto
Verificar cantidad > 0 antes de consumir
Reducir cantidad dentro de la misma transacción


Módulo 7: Ranking

R7.1 y R7.2 Actualización y Consulta de Ranking
Roles: Sistema, Usuario
Descripción: Actualización automática de la clasificación pública tras cada combate y consulta por parte de los jugadores.
Datos de entrada: Resultado del combate / Solicitud de visualización.
Datos de salida: Puntos Elo asignados / Tabla de clasificación.
Elemento
Riesgos
Medidas
Actualización de Ranking (Elo Calculation)
Manipulación de victorias engañando al ranking.
El servidor calcula el resultado y puntos automáticamente y Validar integridad del combate antes de actualizar
Actualización programática restringida.
Tabla de Ranking (Base de Datos)
Modificación no autorizada de puntuaciones
Corrupción de datos
Restricción de escritura solo al sistema
Integridad de datos (transacciones)
Validación de Integridad del Combate
Registro de victorias falsas
Combates manipulados o incompletos
Verificar que el combate terminó correctamente en el servidor
Confirmar estado final (salud = 0) antes de actualizar ranking



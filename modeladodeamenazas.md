

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
Usuario
Inyección de código (SQL/NoSQL) y XSS.
Inicio de sesión frecuente (spam)
Validación de formato y filtrado de caracteres especiales.
Implementar bloqueo temporal de cuenta tras múltiples intentos fallidos (Rate limiting).
Contraseña
Exposición de credenciales en base de datos.
Almacenamiento cifrado mediante algoritmos de hash seguros (Argon2 o BCrypt). Nunca texto plano.
Sesión
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
Token JWT
Reutilización prolongada de sesión (Robo de token).
Tiempo de expiración corto para el Access Token y validación periódica mediante Refresh Token.
Token JWT
Acceso no autorizado a rutas protegidas.
Validación estricta del token en los middlewares de Django en cada petición HTTP y previo al handshake del WebSocket.



Módulo 2: Gestión de Usuarios y Perfil

R2.1 Registro de usuario
Roles: Usuario no registrado
Descripción: Permite a nuevos jugadores crear una cuenta en el sistema.
Datos de entrada: Usuario*, Correo electrónico*, Contraseña*
Datos de salida: Confirmación de registro, Creación de perfil inicial.
Elemento
Riesgos
Medidas
Datos de usuario
Inyección de código o scripts maliciosos.
Nombres inapropiados
Validación, sanitización y uso de listas blancas para caracteres permitidos en el nombre de usuario.
Validar que los nombres no tengan palabras inapropiadas.
Registro duplicado
Conflictos de datos y saturación de base de datos.
Validación de unicidad de correo y usuario directamente en el modelo de base de datos.
Contraseña
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
personalización del perfil
Manipulación de valores para usar assets bloqueados.
Validación en servidor de que el usuario posee el nivel o permiso para usar dicho ítem visual.
Archivos (si aplica)
Carga de archivos con código malicioso (Web Shells).
Restricción estricta de extensiones (ej. solo .png, .jpg), validación del tipo MIME real y límite de tamaño máximo del archivo (ej. 2MB).



Módulo 3: Gestión de Criaturas

R3.1 Crear equipo de criaturas
Roles: Usuario
Descripción: El usuario podrá seleccionar y administrar su equipo activo de criaturas.
Datos de entrada: IDs de las criaturas seleccionadas (Máx. 3).
Datos de salida: Equipo validado y guardado en base de datos.
Elemento
Riesgos
Medidas
Selección de criaturas
Superar el límite de criaturas permitidas (ej. llevar 6 en lugar de 3).
Validación estricta del lado del servidor para garantizar que la lista no exceda los límites del juego.


R3.2 Consulta de estadísticas
Roles: Usuario
Descripción: El sistema mostrará estadísticas, salud y habilidades de las criaturas.
Datos de entrada: Solicitud de consulta (ID de criatura).
Datos de salida: Información detallada de la criatura.
Elemento
Riesgos
Medidas
Consulta
Acceso indebido a datos de criaturas de otros jugadores.
Control de acceso basado en permisos; validar que la entidad consultada sea pública o pertenezca al usuario.










Módulo 4: Combate PvP
R4.1 Matchmaking (Emparejamiento)
Roles: Usuario, Sistema
Descripción: Emparejamiento de jugadores de nivel similar para combates 1v1.
Datos de entrada: Solicitud de búsqueda de combate.
Datos de salida: Redirección a sala de combate iniciada.
Elemento
Riesgos
Medidas
Solicitud
Abuso del sistema (Denegación de Servicio - DoS).
Control de frecuencia (Throttling) de peticiones para evitar que un usuario sature la cola de emparejamiento.
Emparejamiento
Manipulación de parámetros para forzar combates con cuentas secundarias.
Lógica y selección aleatoria calculada 100% en el servidor. Ocultar IDs de sesión temporal.


R4.2 Acciones de combate
Roles: Usuario (en turno)
Descripción: El usuario podrá ejecutar acciones (atacar, usar objeto, etc.) durante su turno.
Datos de entrada: Acción seleccionada, Objetivo.
Datos de salida: Cálculo de daño y actualización del estado de la partida.
Elemento
Riesgos
Medidas
Acción
Trampa o modificación de valores (ej. enviar paquete con "Daño = 9999").
El cliente solo envía la "intención" de atacar. El cálculo de daño y probabilidades matemáticas se hacen obligatoriamente en el servidor.
Turno
Desincronización o ataque fuera de turno.
Implementar una máquina de estados en el backend que rechace cualquier acción recibida si no es el turno del jugador emisor.





Módulo 5: Chat en Tiempo Real

R5.1 Envío y Recepción de mensajes
Roles: Usuario (en combate)
Descripción: Comunicación bidireccional entre jugadores mediante WebSockets.
Datos de entrada: Mensaje de texto.
Datos de salida: Mensaje renderizado en la pantalla del oponente.
Elemento
Riesgos
Medidas
Mensajes
Ataques Cross-Site Scripting (XSS).
Malas palabras entre los jugadores.
Sanitización rigurosa del contenido; escapar etiquetas HTML y scripts antes de retransmitir el mensaje al otro cliente
Implementar una validación de palabras malas, groserías, etc. para cambiarlas por *, # o una frase contraproducente (no grosera).
Frecuencia
Spam excesivo para bloquear la visibilidad o trabar el cliente del rival.
Límite de mensajes por segundo por usuario desde el backend de WebSockets (Django Channels).
Conexión
Interceptación de los mensajes del chat.
Obligar el uso del protocolo seguro wss:// (WebSocket Secure) en lugar de ws:// en el entorno de producción.






Módulo 6: Inventario y Objetos

R6.1 y R6.2 Gestión y Uso de Objetos
Roles: Usuario
Descripción: El usuario podrá visualizar y consumir objetos (ej. pociones) durante el combate.
Datos de entrada: Solicitud de inventario / ID de objeto seleccionado.
Datos de salida: Lista de objetos / Aplicación del efecto del objeto y consumo del mismo.
Elemento
Riesgos
Medidas
Inventario
Duplicación de ítems por problemas de concurrencia (Race Conditions).
Uso de transacciones de base de datos (atomic transactions en Django) al consumir ítems para evitar usos múltiples simultáneos.
Objeto
Uso de objetos no permitidos o agotados.
Validación de reglas del juego en el backend: verificar existencia del ítem, cantidad > 0 y pertinencia del efecto antes de aplicarlo.



Módulo 7: Ranking

R7.1 y R7.2 Actualización y Consulta de Ranking
Roles: Sistema, Usuario
Descripción: Actualización automática de la clasificación pública tras cada combate y consulta por parte de los jugadores.
Datos de entrada: Resultado del combate / Solicitud de visualización.
Datos de salida: Puntos Elo asignados / Tabla de clasificación.

Elemento
Riesgos
Medidas
Resultado
Manipulación de la victoria enviando reportes falsos al servidor.
El servidor es el único juez. Al detectar que la salud de un jugador llega a 0, el propio servidor cierra la sala y actualiza la base de datos de ranking automáticamente.
Consulta
Extracción masiva de datos de la plataforma (Web Scraping).
Implementar paginación en las consultas a la API y limitación de solicitudes (Rate Limit) a la ruta del Leaderboard.



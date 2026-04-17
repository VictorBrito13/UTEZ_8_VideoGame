Documento de Especificación de Requerimientos (SRS)
Proyecto: Videojuego Web RPG "Monster Battle" PvP
Empresa / Equipo: DevCore Nexus Grado y Grupo: 8° C | IDyGS Fecha: 27/02/2026

Actores / Roles del Sistema

Rol
Descripción
Usuario
Jugador registrado (casual o competitivo) que interactúa con el sistema para gestionar su perfil, criaturas y participar en combates.
Sistema
Plataforma (Backend/Servidor) que ejecuta la lógica del juego, valida reglas, empareja jugadores y gestiona la seguridad.


Requerimientos Funcionales (RF)
Módulo: Autenticación y Perfil
RF-01 – Registro de Usuario
Actor: Usuario | Prioridad: Alta
Descripción: El sistema deberá permitir a nuevos usuarios registrarse proporcionando la información requerida para la creación de una cuenta.
Criterios de Aceptación:
El sistema valida que los datos obligatorios estén completos y no contengan caracteres maliciosos.
No se permiten registros duplicados de correo o nombre de usuario.
Las contraseñas se almacenan cifradas (ej. Argon2 / BCrypt).
RF-02 – Inicio de Sesión
Actor: Usuario | Prioridad: Alta
Descripción: El sistema deberá permitir a los usuarios autenticarse mediante credenciales válidas.
Criterios de Aceptación:
Las credenciales deben validarse correctamente contra la base de datos.

El sistema genera un token de sesión válido (JWT).
Se deniega el acceso y se bloquea temporalmente tras múltiples intentos fallidos.
RF-03 – Cierre de Sesión
Actor: Usuario | Prioridad: Media
Descripción: El sistema deberá permitir al usuario cerrar su sesión activa.
Criterios de Aceptación:
El token JWT queda invalidado o eliminado del cliente.
El usuario pierde acceso inmediato a funciones protegidas y WebSockets.
RF-04 – Gestión de Perfil
Actor: Usuario | Prioridad: Media
Descripción: El usuario podrá visualizar y actualizar información básica de su perfil y personalizar su avatar.
Criterios de Aceptación:
El sistema muestra la información actual.
Se permiten modificaciones válidas dentro de los rangos permitidos.



Módulo: Gestión de Criaturas e Inventario
RF-05 – Gestión de Equipo de Criaturas
Actor: Usuario | Prioridad: Alta
Descripción: El sistema permitirá al usuario formar un equipo limitado de criaturas para combate.
Criterios de Aceptación:
Se respeta el límite máximo permitido (exactamente 3 criaturas).
Solo criaturas válidas y pertenecientes al usuario pueden añadirse.
RF-06 – Visualización de Estadísticas
Actor: Usuario | Prioridad: Media
Descripción: El sistema permitirá consultar atributos y habilidades de las criaturas.
Criterios de Aceptación:
La interfaz muestra la salud, daño base, velocidad y categoría de la criatura.
RF-07 – Inventario
Actor: Usuario | Prioridad: Media
Descripción: El sistema permitirá visualizar y gestionar objetos disponibles.
Criterios de Aceptación:
El inventario muestra únicamente objetos disponibles con cantidad mayor a cero.
El sistema actualiza el inventario tras su uso mediante transacciones atómicas.



Módulo: Motor de Combate PvP (Tiempo Real)

RF-08 – Matchmaking PvP
Actor: Usuario / Sistema | Prioridad: Alta
Descripción: El sistema deberá emparejar jugadores disponibles para combate 1v1.
Criterios de Aceptación:
Solo usuarios autenticados con JWT pueden emparejarse.
Se notifica a ambos clientes vía WebSocket cuando el combate inicia.
RF-09 – Inicialización de Combate
Actor: Sistema | Prioridad: Alta
Descripción: El sistema configura el estado inicial del combate.
Criterios de Aceptación:
El servidor carga los equipos de 3 criaturas de ambos jugadores.
Se establece un canal privado exclusivo de WebSockets para la partida.
RF-10 – Gestión de Turnos
Actor: Sistema | Prioridad: Alta
Descripción: El sistema administra turnos alternados entre jugadores.
Criterios de Aceptación:
El orden inicial y la alternancia se calculan en base a la velocidad de las criaturas activas.
RF-11 – Acciones de Combate
Actor: Usuario | Prioridad: Alta
Descripción: El usuario podrá: Atacar, Usar habilidad o Usar objeto.
Criterios de Aceptación:
El servidor valida que la acción enviada corresponde al jugador que tiene el turno activo.
RF-12 – Cálculo de Daño y Efectos
Actor: Sistema | Prioridad: Alta
Descripción: El sistema calculará los resultados considerando estadísticas y efectos especiales.
Criterios de Aceptación:
El cálculo se procesa 100% en el servidor (backend).
Se aplican probabilidades matemáticas (ej. 30% de parálisis) de forma segura.
RF-13 – Finalización de Combate
Actor: Sistema | Prioridad: Alta
Descripción: El sistema determinará el ganador y actualizará el estado del combate.
Criterios de Aceptación:
La partida termina automáticamente cuando un jugador pierde a sus 3 criaturas.
Se cierra el canal de WebSocket privado de la partida de forma limpia.



Módulo: Sistema Social y Core

RF-14 – Actualización de Ranking
Actor: Sistema | Prioridad: Media
Descripción: El sistema actualizará el ranking con base en los resultados obtenidos.
Criterios de Aceptación:
Las estadísticas de victorias/derrotas se guardan en la base de datos tras la validación de victoria.
RF-15 – Visualización de Ranking
Actor: Usuario | Prioridad: Media
Descripción: El usuario podrá consultar el ranking general.
Criterios de Aceptación:
El sistema devuelve la lista pública ordenada sin exponer datos sensibles de los usuarios.
RF-16 – Chat en Tiempo Real
Actor: Usuario | Prioridad: Alta
Descripción: El sistema permitirá el envío y recepción de mensajes durante el combate.
Criterios de Aceptación:
Los mensajes se transmiten instantáneamente vía WebSocket.
El chat es visible únicamente para los dos jugadores en esa partida específica.
RF-17 – Validación de Mensajes
Actor: Sistema | Prioridad: Media
Descripción: El sistema validará y sanitizará mensajes para evitar contenido indebido.
Criterios de Aceptación:
El contenido es filtrado para evitar inyecciones XSS antes de ser retransmitido.
RF-18 – Control de Acceso
Actor: Sistema | Prioridad: Alta
Descripción: El sistema restringirá funcionalidades a usuarios autenticados.
Criterios de Aceptación:
Los middlewares de Django validan el token JWT en cada petición HTTP y en el handshake del WebSocket.
RF-19 – Manejo de Errores
Actor: Sistema | Prioridad: Alta
Descripción: El sistema deberá manejar errores sin exponer información sensible.
Criterios de Aceptación:
El sistema aplica el principio de "fallar seguro" devolviendo JSONs limpios.
El modo Debug está desactivado.
RF-20 – Persistencia de Información
Actor: Sistema | Prioridad: Alta
Descripción: El sistema almacenará de forma persistente información relevante del juego.
Criterios de Aceptación:
Se utiliza MySQL mediante el ORM de Django.

Se evitan consultas SQL crudas.




Requerimientos No Funcionales (RNF)
RNF-01 Seguridad: El sistema deberá aplicar prácticas de codificación segura obligatorias: sanitización en el servidor , cifrado de contraseñas con Argon2 o BCrypt , uso de WebSockets seguros (wss://) y gestión de secretos fuera de repositorios (ej. Git).
RNF-02 Rendimiento: Las acciones de combate y el chat deberán ejecutarse en tiempos mínimos razonables para garantizar la competitividad. Se empleará Daphne como servidor ASGI para gestionar eficientemente la concurrencia de WebSockets a través de Django Channels.
RNF-03 Disponibilidad: El sistema deberá estar disponible y soportar reconexiones rápidas durante el periodo de pruebas y entregas académicas, previniendo caídas por denegación de servicio (DoS) limitando la frecuencia de solicitudes (Throttling).
RNF-04 Escalabilidad: La arquitectura del código estará basada en módulos de funcionalidad (Arquitectura Feature-Based). Esto facilitará que diferentes equipos de DevCore Nexus puedan incorporar futuras características (como PvE o Torneos) sin conflictos de archivos ni rediseños completos.


Seguridad en el desarrollo de aplicaciones

Guia de desarrollo del proyecto

Empresa: DevCore Nexus

8° C | IDyGS.
20/02/2026









ÍNDICE:
1. Estándares de Programación	3
2. Arquitectura del Sistema	3
2.1. Arquitectura General	3
2.2. Tecnologías de uso	4
2.3. Implementación de librerías y frameworks de seguridad	4
3. Diseño de API REST y Comunicación	5
4. Modelo de Datos y Lógica	5
4.2. Ejemplo de flujo General	5
5. Seguridad y Manejo de Datos	6
5.1 Autenticación	6
5.2 Seguridad en WebSockets	6
5.3 Manejo de Sesiones	6
5.4 Creación de Base de Datos y Datos Iniciales	6
5.6 Autenticación	6
5.7 Consultas seguras de base de datos	7
5.8 Validación de Datos	7
5.9 Manejo de errores y excepciones	7
6. Metodología de Desarrollo y Flujos de Trabajo	7
6.1 Metodología Ágil (Scrum)	8
6.2 Control de Versiones (Git)	8
7. Consideraciones Finales	8



1. Estándares de Programación 
Para mantener un código limpio y uniforme, todo el equipo deberá apegarse a las siguientes convenciones de nombrado en ambos entornos:
Clases y Componentes (React/Django): Se utilizará la notación PascalCase. La primera letra de cada palabra va en mayúscula y sin espacios. (Ejemplo: CriaturaBattle, UserProfile).
Variables, Propiedades y Funciones (React/JS): Se utilizará la notación camelCase. La primera palabra en minúscula y la primera letra de las siguientes en mayúscula. (Ejemplo: healthPoints, obtenerListaUsuarios).
Variables y Funciones (Django/Python): Se utilizará el estándar PEP8, empleando snake_case (todo en minúsculas separado por guiones bajos). (Ejemplo: puntos_vida, calcular_dano).
Idioma del código: Las variables, funciones y métodos se escribirán en inglés.
2. Arquitectura del Sistema

2.1. Arquitectura General
Arquitectura Feature-Based (basada en funcionalidades). A diferencia de la arquitectura tradicional por capas, organizaremos el código por "módulos de funcionalidad". Cada carpeta contendrá su propia lógica, componentes y estilos.
Ventaja: Facilita el escalamiento y permite que diferentes equipos trabajen en aspectos diferentes simultáneamente sin conflictos de archivos.
Cada módulo incluye:
Lógica
Componentes
Estilos
Comunicación en tiempo real (si aplica)
(Nota para examen: Las APIs de Estadísticas e Inventario están en sus respectivos módulos /creatures/ y /inventory/ siguiendo esta estructura modular).

Módulos principales:
Autenticación
Perfil y Avatar
Combate
Chat
Inventario
Ranking
2.2. Tecnologías de uso
Cada tecnología utilizada dentro del proyecto cumple una función específica dentro de la arquitectura del sistema, asegurando una correcta separación de responsabilidades, rendimiento adecuado y facilidad de mantenimiento.
Lenguajes de Programación: Python 3.x (Backend), JavaScript / TypeScript (Frontend).
Frameworks y Librerías Base: Django, Django REST Framework, Django Channels (Backend). React, Redux Toolkit, Tailwind CSS (Frontend).
Base de Datos Relacional: MySQL.
Comunicación Tiempo Real: WebSockets (Notificaciones en tiempo real o Chat), HTTP/REST (usuarios, ranking, inventario).

2.3. Implementación de librerías y frameworks de seguridad
Se deben seleccionar librerías y framework de autores confiables, con mantención y desarrollo activo. Se hará uso de:
Django Security Middlewares: Para protección nativa contra vulnerabilidades comunes y sanitizar los datos de entrada de nuestra API.
SimpleJWT: Como librería especializada y confiable para la emisión y verificación de JSON Web Tokens (JWT).
Argon2 / BCrypt: Como algoritmos criptográficos especialmente diseñados para el almacenamiento seguro de contraseñas. Nunca se almacenarán contraseñas en texto plano.

3. Diseño de API REST y Comunicación
Las operaciones de las interfaces programables deben utilizar el protocolo HTTP. Para asegurar la interoperabilidad, el diseño de la API seguirá la arquitectura REST:
Métodos HTTP permitidos: GET (solicitar), POST (crear), PUT/PATCH (actualizar), DELETE (eliminar).
Reglas de URIs:
Usar siempre sustantivos en minúscula para describir los recursos (ej. /api/usuarios).
No usar / al final de la URI.
No utilizar caracteres especiales ni acentos.
(Nota para examen: Los nuevos endpoints siguen este estándar: /api/creatures/, /api/user-creatures/ y /api/inventory/).
4. Modelo de Datos y Lógica
4.1. Ejemplos de entidades principales:
Usuario / Cuenta
Entidad de Dominio
Regla de Acción
MensajeChat
4.2. Ejemplo de flujo General
Emparejamiento de conexiones o asignación de sesiones concurrentes.
Inicialización del entorno o carga de estado inicial.
Procesamiento de la cola de tareas alternadas según prioridad o velocidad de respuesta.
Selección y envío de petición del cliente:
Ejecutar acción principal estándar.
Aplicar regla de acción específica.
Modificar estado de un objeto en inventario/memoria
Cálculo de resultados de la transacción en el servidor.
Aplicación de eventos secundarios o procesos asíncronos.
Verificación de condiciones de cierre o éxito de la operación.
Actualización de métricas globales y guardado en base de datos.
(Ejemplo de Lógica de Negocio - Condición alterada: Al ejecutar una acción base, aplicar la fórmula de impacto correspondiente. Existe un 30% de probabilidad de detonar un evento secundario que reduzca la velocidad de procesamiento de la entidad afectada por un ciclo).
5. Seguridad y Manejo de Datos 
5.1 Autenticación
JWT para sesiones.
Tokens verificados en WebSockets.


5.2 Seguridad en WebSockets
Autenticación previa al handshake.
Validación de usuario activo.
Canales privados por usuario.


5.3 Manejo de Sesiones
El manejo de sesiones se realizará de forma segura mediante mecanismos de autenticación basados en tokens. La duración, renovación e invalidación de sesiones se gestionará conforme a las necesidades del proyecto, asegurando el control de acceso a los recursos del sistema.
5.4 Creación de Base de Datos y Datos Iniciales
La base de datos del sistema se implementará utilizando un sistema de gestión de bases de datos relacional.
5.6 Autenticación
Para garantizar la seguridad del sistema, se utilizarán librerías y frameworks especializados que permitan proteger la información y prevenir vulnerabilidades comunes. Entre las medidas contempladas se incluyen:
Uso de Django REST Framework SimpleJWT para la gestión segura de tokens JWT.
Protección contra ataques CSRF y XSS mediante los mecanismos integrados de Django.
Configuración de políticas de seguridad HTTP (headers de seguridad).
Uso de cifrado para el almacenamiento de contraseñas mediante algoritmos hash seguros.
Estas herramientas permitirán fortalecer la autenticación, autorización y protección general de la aplicación.
5.7 Consultas seguras de base de datos
Usaremos consultas parametrizadas para evitar inyecciones SQL además de funciones nativas del motor de base de datos.
Se empleará el ORM de Django, evitando la construcción manual de consultas SQL.
Se validarán los datos antes de ser procesados o almacenados.
Se limitarán los privilegios de acceso a la base de datos según el rol del sistema.
Estas prácticas aseguran la integridad y confidencialidad de la información almacenada.

5.8 Validación de Datos
La validación de datos debe ser, como mínimo, a través de mecanismos de lista negra (datos conocidos como maliciosos), y como mejor práctica se validará a través de lista blanca.
Regla de Oro: Toda validación de datos debe ser siempre realizada en el servidor y nunca exclusivamente del lado del cliente (React).
Se utilizarán los Serializers de Django REST Framework para garantizar que las entradas cumplan con la longitud, tipo y formato esperados antes de interactuar con la base de datos.
(Nota para examen: Usamos serializers anidados en el Inventario para enviar datos completos y validados al frontend en una sola petición).

5.9 Manejo de errores y excepciones
El sistema se desarrollará de forma tal que aplique el principio de "fallar seguro".
Se hará uso de los bloques try-catch y manejadores de excepciones nativos de Django.
Bajo ninguna circunstancia se debe exponer información sensible o privada en los mensajes de error mostrados al usuario. El modo Debug debe estar obligatoriamente desactivado en los entornos de producción.

6. Metodología de Desarrollo y Flujos de Trabajo
6.1 Metodología Ágil (Scrum) 
El desarrollo del proyecto se llevará a cabo utilizando una metodología ágil basada en Scrum, con el objetivo de permitir una evolución progresiva del sistema y facilitar la adaptación a cambios durante el proceso de desarrollo.
El trabajo se organizará en iteraciones (sprints) con una duración aproximada de dos semanas, dentro de las cuales se realizarán actividades de análisis, desarrollo, integración y pruebas, de acuerdo con las prioridades definidas por el equipo de desarrollo.
Se llevarán a cabo reuniones breves de seguimiento (dailies) con el propósito de revisar avances, identificar bloqueos y coordinar actividades, ajustando su duración y frecuencia según las necesidades del proyecto.
Planeación por Sprints:
La planeación de los sprints se realizará de manera progresiva y flexible, considerando el avance del proyecto y los resultados obtenidos en cada iteración. A continuación, se describe una orientación general de los temas que podrán abordarse durante los sprints, sin que esto represente una asignación rígida de entregables.

6.2 Control de Versiones (Git) 
Flujo Git: main (estable), develop (integración), feat/* (nuevas funcionalidades).
Convención de Commits:
feat: Nueva funcionalidad.
fix: Corrección de errores.
docs: Cambios en documentación.
style: Formateo de código.
refactor: Mejora de código existente.
test: Añadir o corregir pruebas.
chore: Tareas de mantenimiento.
7. Consideraciones Finales
Este proyecto está diseñado para ser escalable, seguro y modular, permitiendo la incorporación futura de: PvE, Torneos, Nuevas criaturas, Nuevas habilidades y una Aplicación móvil.


Elaborado por:
Equipo de Desarrollo de la empresa DevCore Nexus
Referencia:
Lineamientos GINFO – Guía GobDigital – Principios de Codificación Segura.




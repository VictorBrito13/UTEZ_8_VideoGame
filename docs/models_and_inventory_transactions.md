Implementación de Modelos – DevCore Nexus Descripción General
En este cambio se implementaron los modelos principales del sistema backend para el videojuego web RPG Monster Battle PvP, siguiendo la arquitectura basada en funcionalidades (Feature-Based Architecture) establecida en la guía de desarrollo.
Se crearon múltiples aplicaciones dentro del proyecto con el objetivo de separar responsabilidades por módulo, facilitando la escalabilidad, el mantenimiento del código y el trabajo colaborativo.
Arquitectura Implementada
Se dividió el sistema en las siguientes aplicaciones:
•	creatures 
•	inventory 
•	profile 
•	combat 
•	chat 
Cada aplicación contiene sus propios modelos, lógica y responsabilidad específica dentro del sistema.
Módulo: Creatures
Modelos:
•	Type: Representa el tipo de criatura (ej. fuego, agua). 
•	Creature: Define las criaturas jugables con atributos base como vida, daño y velocidad. 
•	Ability: Representa habilidades con efectos y probabilidades. 
•	CreatureAbility: Relación entre criaturas y habilidades (muchos a muchos). 
Propósito:
Permitir la definición estructurada de entidades principales del combate.
Validaciones:
•	Vida y daño deben ser mayores a 0. 
•	Probabilidad de efectos entre 0 y 1. 
Módulo: Inventory
Modelos:
•	Object: Representa objetos consumibles o utilizables. 
•	Inventory: Inventario asociado a cada usuario. 
•	InventoryItem: Relación entre inventario y objetos con cantidad. 
Propósito:
Gestionar los recursos disponibles del usuario.
Validaciones:
•	La cantidad de objetos no puede ser negativa. 

Módulo: Profile
Modelos:
•	UserCreature: Relación entre usuario y criaturas poseídas. 
•	Team: Equipo activo del usuario. 
•	TeamCreature: Criaturas asignadas al equipo. 
•	Ranking: Estadísticas del jugador (victorias, derrotas, elo). 
Propósito:
Gestionar la progresión del jugador y su estado dentro del sistema.
Validaciones:
•	Nivel mayor a 0. 
•	Máximo 3 criaturas por equipo. 

Módulo: Combat
Modelo:
•	Battle: Representa un combate entre dos jugadores. 
Propósito:
Gestionar el estado de las partidas PvP.
Módulo: Chat
Modelo:
•	ChatMessage: Mensajes enviados durante el combate. 
Propósito:
Permitir comunicación en tiempo real entre jugadores.

Uso de ORM
Todos los modelos fueron implementados utilizando el ORM de Django, evitando el uso de consultas SQL crudas, lo cual garantiza:
•	Mayor seguridad (prevención de SQL Injection) 
•	Mejor mantenimiento del código 
•	Cumplimiento de la guía de desarrollo 

Estándares Aplicados
Se siguieron los estándares definidos en la guía:
•	Clases en PascalCase 
•	Variables en snake_case 
•	Código en idioma inglés 
•	Uso de buenas prácticas de Django (ORM, validaciones en modelos) 

Validaciones Implementadas
Se añadieron validaciones a nivel de modelo utilizando métodos clean() y save() para garantizar la integridad de los datos independientemente del origen de la información.

Resultado
Este cambio establece la base estructural del sistema backend, permitiendo:
•	Implementación futura de API REST 
•	Integración con frontend (React) 
•	Desarrollo de lógica de negocio (combate, inventario, ranking) 
•	Escalabilidad del proyecto 
Notas Finales
•	No se utilizaron consultas SQL directas 
•	Los modelos están listos para ser usados con serializers y endpoints 
•	La estructura modular permite futuras extensiones como PvE o torneos

-------------------------------------------------------------------------------

Reporte – Transacciones Atómicas en Inventario
Descripción
Se implementó la lógica para el uso seguro de objetos en el inventario del usuario, evitando problemas de concurrencia (race conditions) mediante transacciones atómicas.
Objetivo
Garantizar que el consumo de objetos:
•	Sea consistente 
•	Evite duplicaciones o pérdidas 
•	Mantenga la integridad de los datos 

Implementación
Modelos
Se utilizaron los modelos:
•	Object 
•	Inventory 
•	InventoryItem 
Se agregó validación para evitar cantidades negativas.

Lógica (services.py)
Se creó la función:
use_object(user, object_id, target_creature_id=None)
Incluye:
•	@transaction.atomic → asegura operación completa 
•	select_for_update() → evita accesos simultáneos 
•	Validación de existencia y cantidad 
•	Aplicación de efectos (heal, damage, buffs) 

Endpoint
POST /api/inventory/use-object/
•	Requiere autenticación 
•	Permite consumir objetos del inventario 

Control de Concurrencia
Se implementó:
•	Transacciones atómicas 
•	Bloqueo de filas en base de datos 
Evita:
•	Uso duplicado de ítems 
•	Inconsistencias 

Guía de Desarrollo
Se cumplió con:
•	snake_case en Python 
•	Separación por apps 
•	Lógica en services.py 
•	Uso de serializers 
Conclusión
El sistema es seguro, funcional y cumple con los requerimientos.
Queda listo para integrarse con otros módulos como combate.
# Cambios en el sistema de combate estilo Pokémon

## Resumen

Se implementaron mejoras en el sistema de combate para que el flujo sea más cercano a una batalla de estilo Pokémon:

- Cada criatura tiene hasta 4 ataques asignados en ranuras (slots) 1-4.
- Los jugadores eligen una habilidad antes de que el turno se resuelva.
- El orden de ataque se determina por la velocidad de la criatura activa.
- Se introdujo un sistema de efectividad de tipos con 18 tipos de Pokémon estándar.
- Se añadió daño base a las habilidades para separar el golpe base de los modificadores.
- Se agregó soporte para habilidades especiales pasivas con activación aleatoria (~30%).
- El cambio de criatura consume el turno del jugador.

## Cambios implementados

### `creatures.models`

- `SpecialAbility`: modelo de habilidades pasivas que pueden paralizar, quemar, congelar, envenenar, etc.
- `Creature.special_ability`: relación opcional con una habilidad especial pasiva.
- `Ability.ability_type`: tipo del movimiento.
- `Ability.base_damage`: daño base fijo de la habilidad.
- `CreatureAbility.slot`: ranura 1-4 para ordenar los ataques del Pokémon.
- `CreatureAbility` ahora valida que un Pokémon tenga un máximo de 4 ataques.

### `creatures.serializers`

- Se adicionó `SpecialAbilitySerializer` y se serializa la habilidad especial de la criatura.
- `CreatureSerializer` devuelve las habilidades en orden de slot mediante `CreatureAbilitySerializer`.
- `AbilitySerializer` incluye `ability_type` y `base_damage`.

### `combat.damage_models` y `combat.damage_service`

- Se migró el esquema de tipos a 18 tipos Pokémon estándar.
- Se añadió matriz de efectividad completa entre tipos.
- La fórmula de daño usa `ability_base_damage + attacker_attack - defender_defense` y después aplica el multiplicador de tipo.
- Se asegura que el daño final sea al menos 1.

### `combat.battle_consumer`

- La acción `attack` ahora requiere `ability_id` y guarda la selección del ataque.
- Si ambos jugadores ya eligieron un ataque, la batalla se resuelve con orden según velocidad.
- Si un jugador cambia criatura (`swap`), el turno termina inmediatamente.
- Se agregó la lógica de activación de habilidades especiales pasivas.
- Se mejoró la gestión de turnos y la limpieza de selecciones una vez resuelto el enfrentamiento.

## Plan de pruebas manuales recomendadas

1. Selección de ataque antes de resolución
   - Verificar que el servidor acepta `ability_id` y espera la selección del rival.
   - Confirmar que el turno no avanza hasta que ambos jugadores hayan elegido.

2. Orden por velocidad
   - Comprobar que el Pokémon con mayor velocidad ataca primero.
   - Validar que el segundo ataque no se realiza si el primero causa debilitación.

3. Cambio de criatura cuesta turno
   - Ejecutar swap y confirmar que el turno pasa al rival sin ataque adicional.

4. Habilidad especial pasiva
   - Asignar una habilidad especial a una criatura y probar varios ataques.
   - Confirmar que la habilidad puede activarse y que su efecto queda registrado en el estado del combate.

5. Integridad de slots
   - Confirmar que cada criatura solamente puede tener 4 ataques y que están ordenados del 1 al 4.

## Pruebas automatizadas añadidas

- Se agrega `backend/videogame_back/test_combat_rules.py`.
- Cubre validación de `Ability` y `CreatureAbility`.
- Verifica la creación de `SpecialAbility` con su probabilidad por defecto.
- Comprueba que el límite de 4 ataques por criatura es respetado.
- Incluye inicialización del sistema de tipos y efectividades.

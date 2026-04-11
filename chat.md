# Reporte de Implementación: Chat de Combate (VID-015)

Este documento detalla la implementación del módulo de chat en tiempo real para el proyecto **Monster Battle**, justificando cada cambio con base en la documentación oficial del equipo **DevCore Nexus**.

## Resumen de la Tarea: VID-015
**Objetivo:** Implementar un chat de combate con sanitización de mensajes (XSS y Filtro de palabras).

---

## 🛡️ Cumplimiento de Estándares y Seguridad

### 1. Arquitectura y Tecnología
*   **Referencia:** [Development Standards (RNF-04)](file:///docs/development_standards.md) y [Requerimientos (RNF-04)](file:///requerimientos.md).
    *   *Estándar:* Uso de **Feature-Based Architecture**.
    *   *Implementación:* Se creó la aplicación independiente `chat` en el backend para encapsular toda la lógica social, evitando acoplamiento con el motor de combate.
*   **Referencia:** [Development Standards (3.1 Tech Stack)](file:///docs/development_standards.md).
    *   *Estándar:* Uso de **Django Channels** y **Daphne** para WebSockets.
    *   *Implementación:* Se integraron `channels` y `daphne` en las dependencias y se configuró `asgi.py` para manejar el tráfico asíncrono.

### 2. Seguridad en el Servidor (Sanitización)
*   **Referencia:** [Modelado de Amenazas (R5.1)](file:///modeladodeamenazas.md).
    *   *Estándar:* "Toda validación de mensajes debe realizarse en el lado del servidor".
    *   *Implementación:* En [consumers.py](file:///backend/videogame_back/chat/consumers.py), el método `receive` llama a la función `process_message` antes de retransmitir cualquier dato al grupo.
*   **Referencia:** [Modelado de Amenazas (R5.1 - XSS)](file:///modeladodeamenazas.md) y [Requerimientos (RF-17)](file:///requerimientos.md).
    *   *Estándar:* "Escape de scripts para evitar inyecciones XSS".
    *   *Implementación:* Se implementó la función `sanitize_message` en [utils.py](file:///backend/videogame_back/chat/utils.py) utilizando la librería `bleach`, la cual elimina o escapa cualquier etiqueta HTML sospechosa.
*   **Referencia:** [Modelado de Amenazas (R5.1 - Filtro)](file:///modeladodeamenazas.md).
    *   *Estándar:* "Censurar palabras ofensivas mediante una Blacklist".
    *   *Implementación:* Se creó la función `filter_bad_words` en `utils.py` que detecta palabras prohibidas y las reemplaza por asteriscos (`****`).

### 3. Persistencia de Datos
*   **Referencia:** [Requerimientos (RF-14/RF-20)](file:///requerimientos.md).
    *   *Estándar:* Almacenamiento persistente en base de datos.
    *   *Implementación:* Los mensajes se guardan en tiempo real en la tabla `ChatMessage` de **MySQL** mediante el método asíncrono `save_message` en el consumidor, asegurando que el historial de chat se mantenga para auditorías.

### 4. Estándares de Codificación
*   **Referencia:** [Guía de Desarrollo (4.1 API y Protocolos)](file:///guiadedesarrollo.md).
    *   *Estándar:* Uso de **PascalCase** para clases y **snake_case** para Python.
    *   *Implementación:* Se definieron clases como `ChatConsumer` y funciones/variables como `battle_id` y `user_id` cumpliendo con la guía.

---

## ✅ Conclusión del Módulo
La tarea se completó a la perfección siguiendo la **Guía de Desarrollo**, garantizando que el chat sea eficiente (Daphne/Channels), seguro (Bleach/XSS Filter) y robusto (MySQL/ORM).

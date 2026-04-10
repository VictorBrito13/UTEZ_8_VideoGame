# Arquitectura del Frontend: Pokedex Archive

Este documento describe la estructura del proyecto y los patrones de diseño utilizados en el frontend para facilitar la colaboración y el mantenimiento.

## 🏗️ Arquitectura General
El proyecto sigue una **Arquitectura Basada en Características (Feature-Based Architecture)** o **Vertical Slicing**. En lugar de agrupar archivos por tipo (todos los componentes juntos, todos los hooks juntos), los agrupamos por su **dominio de negocio**.

### Ventajas:
- **Modularidad**: Cada característica es independiente.
- **Escalabilidad**: Es fácil añadir nuevas funcionalidades sin afectar las existentes.
- **Mantenibilidad**: La lógica y la UI de una función específica están en un solo lugar.

---

## 📂 Estructura de Directorios (`/src`)

### 1. `src/api/`
Contiene la configuración global de Axios/Fetch.
- `apiClient.ts`: Instancia central con interceptores para tokens JWT y baseURL.

### 2. `src/common/`
Componentes de UI genéricos y utilidades compartidas.
- `ui/`: Componentes atómicos de diseño (Botones, inputs, contenedores base).
- `layouts/`: Estructuras de página compartidas (Navbar, Sidebar).

### 3. `src/features/` (Núcleo)
Contiene las carpetas divididas por funcionalidades: `auth`, `combat`, `dashboard`, `inventory`, etc.
Dentro de cada feature verás:
- `pages/`: Componentes de alto nivel que representan las rutas.
- `components/`: Componentes específicos de esa funcionalidad.
- `services/`: Lógica de API específica de esa funcionalidad.
- `hooks/`: Lógica de estado y efectos extraída (Custom Hooks).
- `types.ts`: Definiciones de interfaces exclusivas de la característica.

### 4. `src/assets/`
Archivos estáticos como imágenes, iconos locales y fuentes.

### 5. `src/index.css`
Estilos globales, variables de CSS (diseño atómico) y utilidades de Tailwind personalizadas.

---

## 🚀 Patrones de Diseño

- **Separación de Concern (Separación de lógicas)**: Las páginas (`pages`) solo orquestan, mientras que los `hooks` manejan la lógica de API y estado. Los `components` preferiblemente son presentacionales.
- **Atomic Design**: Reutilizamos componentes base en `common/ui` para mantener la consistencia visual.
- **Framer Motion para Animaciones**: Todas las transiciones y efectos visuales ("feel" de terminal) se manejan con esta librería.
- **Design System Dinámico**: Usamos variables de CSS en `index.css` que permiten cambiar temas o ajustar la estética global rápidamente.

---

## 🛠️ Tecnologías Clave
- **Vite**: Build tool veloz.
- **React + TypeScript**: Seguridad de tipos en todo el flujo.
- **Tailwind CSS**: Estilizado mediante clases de utilidad.
- **Lucide React**: Biblioteca de iconos consistente.
- **Axios**: Comunicación fluida con el backend Django.

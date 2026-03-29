# Development Guide - DevCore Nexus

This document establishes the standards, architecture, and workflows required for the development of the application.

---

## 1. Project Technologies
The technology stack is defined to ensure separation of concerns and optimal performance:
* **Backend:** Python 3.x with Django, Django REST Framework, and Django Channels.
* **Frontend:** JavaScript / TypeScript with React, Redux Toolkit, and Tailwind CSS.
* **Relational Database:** MySQL.
* **Communication:** WebSockets (real-time chat/notifications) and HTTP/REST (users, ranking, inventory).

---

## 2. Programming Standards
To maintain clean and uniform code, all team members must adhere to these naming conventions:
* **Language:** Variables, functions, and methods must be written in **English**.
* **Classes and Components (React/Django):** Use `PascalCase` (e.g., `CriaturaBattle`, `UserProfile`).
* **Variables, Properties, and Functions (React/JS):** Use `camelCase` (e.g., `healthPoints`, `getUsersList`).
* **Variables and Functions (Django/Python):** Follow the PEP8 standard using `snake_case` (e.g., `puntos_vida`, `calcular_dano`).

### API REST Design
* **Permitted HTTP Methods:** GET (request), POST (create), PUT/PATCH (update), DELETE (delete).
* **URI Rules:** Use lowercase nouns (e.g., `/api/users`), do not use trailing slashes `/`, and avoid special characters or accents.

---

## 3. Architecture and Folder Structure
The project follows a **Feature-Based Architecture**, organizing code by "functional modules" rather than traditional layers.

Each folder must contain its own logic, components, and styles.
**Main Modules:**
* Authentication
* Profile and Avatar
* Combat
* Chat
* Inventory
* Ranking

---

## 4. Git and GitHub Workflow
Version control is managed to ensure code stability and organized integration.

### Branching Strategy (Git Flow)
* `main`: Stable code ready for production.
* `develop`: Main integration branch.
* `feat/*`: Temporary branches for developing new features.

### Commit Conventions
Messages must specify the type of change using the following prefixes:
* `feat:` New functionality.
* `fix:` Bug correction.
* `docs:` Documentation changes.
* `style:` Code formatting.
* `refactor:` Improvements to existing code.
* `test:` Adding or correcting tests.
* `chore:` Maintenance tasks.

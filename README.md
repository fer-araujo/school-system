# 🏫 Sistema de Control de Asistencia Escolar (School System)

Un sistema robusto, escalable y en tiempo real para gestionar la asistencia del personal escolar. Diseñado para soportar la complejidad de los horarios educativos modernos (turnos divididos, talleres, días de consejo técnico, etc.) mediante el escaneo ágil de códigos QR.

## 🚀 Características Principales

* **Escáner Inteligente:** Registro rápido de entradas y salidas mediante códigos QR dinámicos.
* **Gestión de Horarios Complejos:** Soporte nativo para turnos divididos (múltiples entradas y salidas en un mismo día).
* **Detección Automática de Retardos:** El sistema calcula si un trabajador llegó tarde basándose en los bloques de horario de su turno asignado (incluye tolerancia configurable).
* **Centro de Mando (Admin Dashboard):** Un panel de administración completo con:
    * **Registro Diario:** Monitoreo en tiempo real de quién está en el plantel y quién ya completó su turno.
    * **Calendario General:** CRUD para gestionar días festivos (oficiales de ley, asuetos de la SEP o días internos de la escuela) que bloquean automáticamente el escáner.
    * **Permisos e Incapacidades:** Bloqueo temporal de asistencia justificada por vacaciones o motivos médicos.
    * **Gestión de Turnos:** Creación de "moldes" de horarios y asignación temporal o indefinida a los trabajadores.

## 🛠️ Stack Tecnológico

* **Frontend:** React, TypeScript.
* **Estilos:** Tailwind CSS.
* **Iconografía:** Lucide React.
* **Backend & Base de Datos:** Firebase (Firestore).

## 📐 Arquitectura

Este proyecto sigue los principios de la **Arquitectura Hexagonal (Clean Architecture)** para asegurar que la lógica de negocio esté completamente aislada de las herramientas externas y el framework de UI.

La estructura de carpetas se divide en:
* `/domain`: El corazón del sistema. Modelos e interfaces estrictamente tipadas (Cero dependencias de React o Firebase).
* `/infrastructure`: Los adaptadores externos. Aquí reside toda la comunicación directa con Firebase.
* `/application`: Los Casos de Uso. Contiene la lógica paso a paso (ej. `ProcessQRScan`, `ManageShifts`).
* `/app`: La capa de presentación (React). Interfaces de usuario, componentes y contextos.

## ⚙️ Instalación y Configuración Local

1. Clona el repositorio:
   \`\`\`bash
   git clone https://github.com/TuUsuario/school-system.git
   \`\`\`

2. Instala las dependencias:
   \`\`\`bash
   npm install
   \`\`\`

3. Configura las variables de entorno:
   Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales de Firebase:
   \`\`\`env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
   VITE_FIREBASE_PROJECT_ID=tu_project_id
   # ... resto de la configuración
   \`\`\`

4. Inicia el servidor de desarrollo:
   \`\`\`bash
   npm run dev
   \`\`\`

## 🔒 Reglas de Negocio Implementadas

* **Integridad de Datos:** No se puede registrar una salida sin una entrada previa, ni registrar una doble entrada simultánea.
* **Bloqueo por Asueto:** Si la fecha actual coincide con un día inhábil en el catálogo, el escáner rechaza cualquier lectura.
* **Precisión de Turnos:** Si un trabajador entra a destiempo según su bloque asignado (ej. bloque de 9:00 AM, escanea 9:15 AM), el periodo se marca internamente con una bandera de retardo.

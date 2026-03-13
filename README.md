# Scripts Manager

App de escritorio para gestionar y ejecutar scripts (Python, Node.js, Bash, PowerShell, CMD) desde una interfaz visual con logs en tiempo real.

## Requisitos

- Node.js 18+
- Windows 10/11 x64

> Los intérpretes (Python, Node, Bash, etc.) deben estar instalados en el sistema donde se ejecute la app.

---

## Desarrollo

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar en modo dev

```bash
npm run dev
```

Abre la ventana de Electron con hot-reload activo.

---

## Generar instalador (.exe)

### Requisito previo (una sola vez)

Activar **Modo de desarrollador** en Windows (necesario para que electron-builder pueda crear symlinks):

```
Configuración → Sistema → Para programadores → Modo de desarrollador → ON
```

### Empaquetar

```bash
npm run package
```

Genera dos artefactos en la carpeta `release/`:

| Archivo | Descripción |
|---|---|
| `Scripts Manager Setup 1.0.0.exe` | Instalador con wizard (recomendado para compartir) |
| `win-unpacked/Scripts Manager.exe` | Versión portable, sin instalación |

> **SmartScreen:** Windows puede mostrar una advertencia al ejecutar el instalador por primera vez ("aplicación desconocida"). Hacer clic en **Más información → Ejecutar de todas formas**.

---

## Uso

1. Clic en **+** para agregar un script
2. Completar nombre, ruta del archivo, intérprete y argumentos opcionales
3. Seleccionar el script en la lista y presionar **▶ Run**
4. Ver el output en tiempo real en el panel inferior
5. **■ Stop** para detener la ejecución en cualquier momento

### Intérpretes soportados

| Intérprete | Extensiones típicas |
|---|---|
| Python / Python3 | `.py` |
| Node.js | `.js`, `.ts` |
| Bash | `.sh` |
| PowerShell | `.ps1` |
| CMD | `.bat`, `.cmd` |

---

## Estructura del proyecto

```
scripts-manager/
├── src/
│   ├── main/index.js         # Proceso principal Electron (IPC, ejecución de scripts)
│   ├── preload/index.js      # Bridge seguro entre main y renderer (window.api)
│   └── renderer/src/
│       ├── App.jsx           # UI completa (sidebar, formulario, logs)
│       └── App.css           # Estilos (tema oscuro)
├── electron.vite.config.mjs  # Configuración de build
└── package.json
```

Los scripts guardados se almacenan en:
```
C:\Users\<usuario>\AppData\Roaming\scripts-manager\scripts.json
```

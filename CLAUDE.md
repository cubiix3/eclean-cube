# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**eclean** — Windows PC optimization tool built with Electron + React 18 + TypeScript + Tailwind v4.

## Commands

```bash
npm run dev       # Start Electron in dev mode (hot reload)
npm run build     # Build main/preload/renderer via electron-vite
npm run dist      # Build + package for Windows (portable + NSIS installer)
```

No test runner or linter is configured. TypeScript strict mode (`"strict": true`) is the only enforced quality gate.

## Architecture

### Process Model

```
Renderer (React)  →  Preload (contextBridge)  →  Main (ipcMain)  →  PowerShell
   window.api.*        ipcRenderer.invoke()       ipcMain.handle()    persistent process
```

- **Main** (`src/main/`): Electron main process. Creates frameless BrowserWindow + MiniWidget + Tray. Registers IPC handlers from `src/main/ipc/` and delegates to services in `src/main/services/`.
- **Preload** (`src/preload/index.ts`): Exposes `window.api` with 30+ typed namespaces via `contextBridge`. Context isolation is on, node integration is off.
- **Renderer** (`src/renderer/`): React SPA using HashRouter. All pages lazy-loaded. Entry: `main.tsx` → `App.tsx`.
- **Shared** (`src/shared/types.d.ts`): All TypeScript interfaces and the `Window.api` declaration.

### PowerShell Service (`src/main/services/powershell.ts`)

Single persistent `powershell.exe` process with serial command queue. Commands delimited by `___ECLEAN_CMD_END___`. Two main helpers:
- `runPowerShell(cmd)` — returns raw string
- `runPowerShellJSON<T>(cmd)` — appends `ConvertTo-Json` and parses

30-second timeout per command. The app requires admin elevation (`requestedExecutionLevel: requireAdministrator`).

### IPC Pattern

```ts
// Main — register handler
ipcMain.handle('cleaner:scanAll', async () => { ... })
// With validation:
handleWithValidation('cleaner:clean', validators.stringArray, async (paths) => { ... })

// Renderer — call via window.api (typed in preload)
const result = await window.api.cleaner.scanAll()
```

- `ipcRenderer.invoke()` / `ipcMain.handle()` for async request/response
- `ipcRenderer.send()` / `ipcMain.on()` for fire-and-forget
- `mainWindow.webContents.send()` / `ipcRenderer.on()` for push events (sensors, progress, etc.)
- Input validation via `handleWithValidation()` in `src/main/ipc/validate.ts`

### State Management

One Zustand store per module (12 stores in `src/renderer/stores/`). Stores call `window.api.*` directly. Cross-store access via `useXxxStore.getState()`.

### Routing

HashRouter with 24 routes defined in `App.tsx`. All pages wrapped in `<ErrorBoundary>` and `<PageTransition>` (framer-motion fade+slide, 200ms). Sidebar highlights via `useNavigationStore`.

## Key Conventions

- **Import alias:** `@/` maps to `src/renderer/`
- **Styling:** Tailwind v4 (Vite plugin, no config file). Dark theme with `--accent-color` CSS variable. `.glass` class for glassmorphism cards.
- **Icons:** lucide-react
- **Animations:** framer-motion
- **Commit format:** Conventional commits (`feat:`, `fix:`, `chore:`)
- **Module structure:** Each feature lives in `src/renderer/modules/<name>/` with its own page and sub-components, a corresponding IPC handler in `src/main/ipc/`, and a service in `src/main/services/`.

## Build Configuration

- `electron-vite` v5 with `externalizeDepsPlugin()` for main/preload
- Two tsconfig files: `tsconfig.node.json` (main + preload + shared) and `tsconfig.web.json` (renderer + shared)
- `electron-builder.yml`: targets Windows x64 portable + NSIS
- `type: "commonjs"` in package.json (Electron main uses CJS; renderer uses ESM via Vite)

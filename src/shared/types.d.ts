interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => void
}

interface ElectronAPI {
  window: WindowAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

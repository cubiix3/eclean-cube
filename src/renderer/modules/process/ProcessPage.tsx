import { useProcessStore } from '@/stores/processStore'
import ProcessManager from './ProcessManager'

export default function ProcessPage() {
  const { processCount } = useProcessStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Process Manager</h1>
        <p className="text-sm text-white/40 mt-1">
          Monitor and manage running processes
          {processCount > 0 && (
            <span className="text-white/30"> &middot; {processCount} processes running</span>
          )}
        </p>
      </div>

      <ProcessManager />
    </div>
  )
}

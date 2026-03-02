import QuickOptimize from './QuickOptimize'

export default function OptimizerPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Optimizer</h1>
        <p className="text-sm text-white/40 mt-1">Fine-tune your system</p>
      </div>

      {/* Quick Optimize Wizard */}
      <QuickOptimize />
    </div>
  )
}

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Lock,
  Zap,
  Gamepad2,
  Battery,
  Globe,
  Palette,
  Wrench,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { useOptimizerStore } from '@/stores/optimizerStore'

// ──────────────────────────────────────────────
// Icon Map
// ──────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Shield,
  Lock,
  Zap,
  Gamepad2,
  Battery,
  Globe,
  Palette,
  Wrench
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  privacy: 'from-violet-500 to-purple-600',
  security: 'from-blue-500 to-cyan-500',
  performance: 'from-amber-500 to-orange-500',
  gaming: 'from-green-500 to-emerald-500',
  power: 'from-yellow-500 to-amber-500',
  network: 'from-cyan-500 to-blue-500',
  uiux: 'from-pink-500 to-rose-500',
  maintenance: 'from-slate-400 to-zinc-500'
}

// ──────────────────────────────────────────────
// Step Indicator
// ──────────────────────────────────────────────

function StepIndicator() {
  const { wizardStep } = useOptimizerStore()

  const steps = [
    { num: 1, label: 'Select Priorities' },
    { num: 2, label: 'Analyzing' },
    { num: 3, label: 'Review & Apply' }
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => {
        const isActive = wizardStep === step.num
        const isCompleted = wizardStep > step.num
        return (
          <div key={step.num} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                  ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
                  ${isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10' : ''}
                  ${!isActive && !isCompleted ? 'bg-white/5 text-white/30 border border-white/10' : ''}
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.num}
              </div>
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isActive ? 'text-white' : isCompleted ? 'text-white/60' : 'text-white/30'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-px mx-1 transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-500/40' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────
// Step 1: Select Categories
// ──────────────────────────────────────────────

function StepSelectCategories() {
  const {
    categories,
    selectedCategories,
    toggleCategory,
    selectAllCategories,
    deselectAllCategories,
    setWizardStep,
    analyzeSelectedCategories
  } = useOptimizerStore()

  const handleNext = () => {
    setWizardStep(2)
    analyzeSelectedCategories()
  }

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Select Priorities</h2>
          <p className="text-sm text-white/40 mt-0.5">Choose which areas you want to optimize</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAllCategories}
            className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={deselectAllCategories}
            className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon] || Wrench
          const isSelected = selectedCategories.includes(cat.id)
          const gradient = CATEGORY_GRADIENTS[cat.id] || 'from-gray-500 to-gray-600'

          return (
            <motion.button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                glass rounded-xl p-4 text-left transition-all duration-200 cursor-pointer relative overflow-hidden group
                ${isSelected ? 'border-blue-500/30 bg-blue-500/10' : 'hover:bg-white/[0.07]'}
              `}
            >
              {/* Selection indicator */}
              <div
                className={`
                  absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200
                  ${isSelected ? 'bg-blue-500 scale-100' : 'bg-white/10 scale-90'}
                `}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Icon with gradient */}
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 opacity-90 group-hover:opacity-100 transition-opacity`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>

              <h3 className="text-sm font-medium text-white mb-1">{cat.name}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{cat.description}</p>
            </motion.button>
          )
        })}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleNext}
          disabled={selectedCategories.length === 0}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
            ${
              selectedCategories.length > 0
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }
          `}
        >
          Analyze System
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// Step 2: Analyzing
// ──────────────────────────────────────────────

function StepAnalyzing() {
  const {
    categories,
    selectedCategories,
    analyzedCategories,
    isAnalyzing,
    setWizardStep
  } = useOptimizerStore()

  useEffect(() => {
    if (!isAnalyzing && analyzedCategories.length === selectedCategories.length && selectedCategories.length > 0) {
      const timer = setTimeout(() => {
        setWizardStep(3)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isAnalyzing, analyzedCategories.length, selectedCategories.length, setWizardStep])

  const selectedCats = categories.filter((c) => selectedCategories.includes(c.id))

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="text-center mb-8">
        <h2 className="text-lg font-semibold text-white">Analyzing System</h2>
        <p className="text-sm text-white/40 mt-0.5">Scanning your current configuration...</p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {selectedCats.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon] || Wrench
          const isDone = analyzedCategories.includes(cat.id)
          const isActive =
            !isDone &&
            analyzedCategories.length ===
              selectedCategories.indexOf(cat.id)
          const gradient = CATEGORY_GRADIENTS[cat.id] || 'from-gray-500 to-gray-600'

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: selectedCategories.indexOf(cat.id) * 0.05 }}
              className={`
                glass rounded-lg p-4 flex items-center gap-4 transition-all duration-300
                ${isDone ? 'border-emerald-500/20' : ''}
                ${isActive ? 'border-blue-500/20 bg-blue-500/5' : ''}
              `}
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white">{cat.name}</h3>
                <p className="text-xs text-white/40">{cat.description}</p>
              </div>

              <div className="flex-shrink-0">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10" />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// Risk Badge
// ──────────────────────────────────────────────

function RiskBadge({ level }: { level: 'safe' | 'moderate' | 'advanced' }) {
  const styles = {
    safe: 'bg-green-500/20 text-green-400',
    moderate: 'bg-amber-500/20 text-amber-400',
    advanced: 'bg-red-500/20 text-red-400'
  }

  const labels = {
    safe: 'Safe',
    moderate: 'Moderate',
    advanced: 'Advanced'
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${styles[level]}`}>
      {labels[level]}
    </span>
  )
}

// ──────────────────────────────────────────────
// Step 3: Review & Apply
// ──────────────────────────────────────────────

function StepReviewApply() {
  const {
    tweaks,
    categories,
    selectedCategories,
    tweakStatus,
    selectedTweakIds,
    toggleTweakSelection,
    selectAllTweaks,
    deselectAllTweaks,
    applySelectedTweaks,
    revertTweak,
    revertAll,
    isApplying,
    isReverting,
    backupData,
    setWizardStep,
    resetWizard
  } = useOptimizerStore()

  const relevantTweaks = tweaks.filter((t) => selectedCategories.includes(t.category))
  const groupedByCategory = selectedCategories
    .map((catId) => {
      const cat = categories.find((c) => c.id === catId)
      const catTweaks = relevantTweaks.filter((t) => t.category === catId)
      return { category: cat, tweaks: catTweaks }
    })
    .filter((g) => g.tweaks.length > 0)

  const notAppliedCount = relevantTweaks.filter((t) => !tweakStatus[t.id]).length
  const appliedCount = relevantTweaks.filter((t) => tweakStatus[t.id]).length
  const hasBackups = Object.keys(backupData).length > 0

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Header with stats */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Review & Apply</h2>
          <p className="text-sm text-white/40 mt-0.5">
            {appliedCount} already applied, {notAppliedCount} ready to optimize
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWizardStep(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </button>
          <button
            onClick={selectAllTweaks}
            className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={deselectAllTweaks}
            className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Tweak List by Category */}
      <div className="space-y-6 mb-6">
        {groupedByCategory.map(({ category, tweaks: catTweaks }) => {
          if (!category) return null
          const Icon = CATEGORY_ICONS[category.icon] || Wrench
          const gradient = CATEGORY_GRADIENTS[category.id] || 'from-gray-500 to-gray-600'

          return (
            <div key={category.id}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-7 h-7 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center`}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white">{category.name}</h3>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Tweaks */}
              <div className="space-y-1.5">
                {catTweaks.map((tweak) => {
                  const isApplied = tweakStatus[tweak.id]
                  const isSelected = selectedTweakIds.includes(tweak.id)
                  const hasUndo = !!backupData[tweak.id]

                  return (
                    <motion.div
                      key={tweak.id}
                      layout
                      className={`
                        glass rounded-lg p-3.5 flex items-center gap-3 transition-all duration-200 group
                        ${isApplied ? 'border-l-2 border-l-emerald-500/50' : ''}
                      `}
                    >
                      {/* Toggle / Checkbox */}
                      {!isApplied ? (
                        <button
                          onClick={() => toggleTweakSelection(tweak.id)}
                          className={`
                            w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all cursor-pointer border
                            ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white/5 border-white/20 hover:border-white/40'
                            }
                          `}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium">{tweak.name}</span>
                          <RiskBadge level={tweak.riskLevel} />
                          {isApplied && (
                            <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">
                              Applied
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
                          {tweak.description}
                        </p>
                      </div>

                      {/* Undo button */}
                      {isApplied && hasUndo && (
                        <button
                          onClick={() => revertTweak(tweak.id)}
                          disabled={isReverting}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-400/70 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Undo
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex gap-2">
          {hasBackups && (
            <button
              onClick={revertAll}
              disabled={isReverting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer"
            >
              {isReverting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Undo All
            </button>
          )}
          <button
            onClick={resetWizard}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            Start Over
          </button>
        </div>

        <button
          onClick={applySelectedTweaks}
          disabled={isApplying || selectedTweakIds.length === 0}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
            ${
              selectedTweakIds.length > 0 && !isApplying
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }
          `}
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Apply Selected ({selectedTweakIds.length})
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// Main QuickOptimize
// ──────────────────────────────────────────────

export default function QuickOptimize() {
  const { wizardStep, fetchTweaks, isLoading } = useOptimizerStore()

  useEffect(() => {
    fetchTweaks()
  }, [fetchTweaks])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <StepIndicator />
      <AnimatePresence mode="wait">
        {wizardStep === 1 && <StepSelectCategories />}
        {wizardStep === 2 && <StepAnalyzing />}
        {wizardStep === 3 && <StepReviewApply />}
      </AnimatePresence>
    </div>
  )
}

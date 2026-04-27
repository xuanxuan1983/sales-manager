import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
// Target store - no dependency on core for now
// import { useMedicalCoreStore } from './core'

export interface TargetValues {
  salesA: number
  salesB: number
}

export interface ScenarioConfig {
  baseMultiplier: number
  worstMultiplier: number
  bestMultiplier: number
}

export const useMedicalTargetStore = defineStore('medicalTarget', () => {
  // const core = useMedicalCoreStore()

  // ============ State ============
  const globalTarget = ref<TargetValues>({ salesA: 10000000, salesB: 8000000 })
  const regionTargets = ref<Record<string, TargetValues>>({})
  const scenarios = ref<ScenarioConfig>({
    baseMultiplier: 1.0,
    worstMultiplier: 0.8,
    bestMultiplier: 1.2
  })
  const activeScenarioKey = ref<'base' | 'worst' | 'best'>('base')

  // ============ Computed ============
  const currentTarget = computed<TargetValues>(() => {
    const multiplier = scenarios.value[`${activeScenarioKey.value}Multiplier`]
    return {
      salesA: Math.round(globalTarget.value.salesA * multiplier),
      salesB: Math.round(globalTarget.value.salesB * multiplier)
    }
  })

  const getUnallocatedTarget = computed<TargetValues>(() => {
    const allocated = Object.values(regionTargets.value).reduce(
      (sum, t) => ({ salesA: sum.salesA + (t?.salesA || 0), salesB: sum.salesB + (t?.salesB || 0) }),
      { salesA: 0, salesB: 0 }
    )
    return {
      salesA: currentTarget.value.salesA - allocated.salesA,
      salesB: currentTarget.value.salesB - allocated.salesB
    }
  })

  // ============ Actions ============
  const setGlobalTarget = (salesA: number, salesB?: number) => {
    if (salesB !== undefined) {
      globalTarget.value = { salesA, salesB }
    } else {
      // If only one value provided, update only that field
      globalTarget.value.salesA = salesA
    }
  }

  const setRegionTarget = (regionId: string, salesA: number, salesB?: number) => {
    const existing = regionTargets.value[regionId] || { salesA: 0, salesB: 0 }
    regionTargets.value[regionId] = { 
      salesA, 
      salesB: salesB !== undefined ? salesB : existing.salesB 
    }
  }

  const importCityStats = (stats: Record<string, { gdp: number; pop: number; name: string }>) => {
    // Store city stats for use in target calculations
    // This is a placeholder implementation
    console.log('Imported city stats:', stats)
  }

  return {
    // State
    globalTarget,
    regionTargets,
    scenarios,
    activeScenarioKey,
    // Computed
    currentTarget,
    getUnallocatedTarget,
    // Actions
    setGlobalTarget,
    setRegionTarget,
    importCityStats
  }
})

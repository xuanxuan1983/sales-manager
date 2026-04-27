# Sales Manager - AI Agent Guide

## Project Overview

A Vue 3 + TypeScript + Vite sales management dashboard for medical/healthcare industry.

## Tech Stack

- Vue 3 (Composition API, `<script setup>`)
- TypeScript
- Vite
- Element Plus (UI components)
- Pinia (state management)
- Vue Router
- ECharts + vue-echarts (charts)
- VXE Table (data tables)
- xlsx + file-saver (Excel import/export)

## Project Structure

```
src/
  views/           # Page components
    Dashboard.vue
    SalesCockpit.vue
    OrderList.vue
    ClientManagement.vue
    DistributorManagement.vue
    ProductAnalysis.vue
    RegionAnalysis.vue
    CustomerAnalysis.vue
    TeamPerformance.vue
    TargetManagement.vue
    IndicatorCenter.vue
    StrategyMatrix.vue
    HeadcountPlanning.vue
    DataImport.vue
  stores/          # Pinia stores
    sales.ts
    medicalSales.ts
  utils/           # Utilities
    export.ts
    import.ts
  types/           # TypeScript types
    sales.ts
  router/          # Vue Router config
    index.ts
```

## Development Commands

```bash
npm install
npm run dev      # Start dev server
npm run build    # Build for production
```

## Key Features

- Sales data visualization (ECharts)
- Order management (VXE Table)
- Client/Distributor management
- Product/Region/Customer analysis
- Team performance tracking
- Target management
- Data import/export (Excel)

## Notes for AI Agents

- Uses Element Plus components (el-*, El*)
- Table data uses VXE Table (vxe-table, vxe-column)
- Charts use vue-echarts (v-chart component)
- State management via Pinia stores
- Medical sales data structure in medicalSales.ts

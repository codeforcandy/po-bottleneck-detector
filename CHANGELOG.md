# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-03-25

### Added
- D3.js force-directed PO Bottleneck Detector visualization
- CSV upload with drag-and-drop and click-to-browse (PapaParse)
- SVG rendering for < 1,000 nodes with full DOM interactivity
- Canvas rendering for 1,000-2,000 nodes with Retina DPI scaling
- Web Worker for force simulation pre-computation (prevents UI freeze)
- Shared encoding layer: radius, color, opacity, accessibility borders
- Configurable SLA thresholds per lifecycle stage
- Tooltip on hover with PO details (ID, vendor, amount, days stuck)
- Detail panel with vertical timeline showing PO journey through stages
- Top bar with filterable aggregate counts (Critical / Stalling / On Track)
- Ghost node empty state previewing the visualization
- Dark theme design system (Inter + JetBrains Mono, full color palette)
- Error handling for malformed CSVs, empty files, invalid data
- Sample CSV templates for SAP, Oracle, and NetSuite exports
- 60 unit tests (Vitest) covering encoding, parsing, config, simulation, renderer logic

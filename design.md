# NMR Buffer pH Estimation Web Application - Development Brief

## Project Overview

Create a web application hosted on GitHub Pages that estimates sample pH, temperature, ionic strength, and chemical shift referencing from NMR buffer chemical shifts. The application reads a community-maintained buffer database (JSON format) from a GitHub repository and provides an interactive interface for parameter estimation.

## Core Functionality

### Data Source

- Single JSON database file containing buffer parameters and sample metadata
- Database structure separates experimental samples (with calibration metadata) from buffer entries (with chemical shift and pKa parameters)
- Application fetches latest database version from GitHub repository on load

### Parameter Estimation

The application performs nonlinear least-squares fitting to estimate:

- pH (always fitted)
- Temperature (optionally refined from nominal value)
- Ionic strength (optionally refined from nominal value)
- Chemical shift reference offsets per nucleus (optionally refined, one per nucleus type)

Fitting uses multi-nuclear chemical shift data from selected buffers, with automatic peak assignment/matching and proper uncertainty propagation.

## User Interface Design

### Initial Setup Section

**Solvent Selection**

- Dropdown to select solvent system (10% D₂O, 100% D₂O, H₂O, other)
- Filters available buffers to show only those measured in selected solvent
- Must be selected before buffer selection becomes available

**Experimental Conditions**

- Text input: Nominal temperature (K)
- Text input: Nominal ionic strength (M)
- Checkboxes (enabled by default): “Refine temperature during fitting”, “Refine ionic strength during fitting”

### Buffer Selection

Display available buffers (filtered by solvent) as visual tiles/cards showing:

- Buffer name
- Icons for available nuclei (¹H, ¹⁹F, ³¹P, etc.)
- pKa range (e.g., “pKa 6.5, 9.1”)

User clicks tiles to toggle selection. Selected buffers show highlighted border.

Always include DSS as an available option (if measured DSS present, allows reference validation).

Layout: Alphabetically ordered grid of tiles.

### Chemical Shift Reference Configuration

For each nucleus type present in selected buffers:

**Referencing dropdown**: “Referenced to DSS” / “Not referenced”

If “Referenced to DSS”:

- Optional text input: “DSS chemical shift (ppm)” [if user wants to use measured DSS for validation/refinement]

If “Not referenced”:

- Optional text input: “Spectrometer ¹H frequency (MHz)”
- If frequency provided: Application calculates appropriate zero for this nucleus using standard IUPAC Ξ ratios relative to DSS, adds one degree of freedom (reference offset) to fitting
- If frequency not provided: Adds one degree of freedom per nucleus to fitting, requires at least N+1 observed shifts for N parameters to estimate

Note: When reference offsets are fitted, this increases parameter count and may preclude refinement of temperature/ionic strength unless sufficient data is available.

### Chemical Shift Visualisation

**One plot per nucleus type**, displayed as tabs or side-by-side panels.

Each plot shows:

- X-axis: Chemical shift (ppm)
- Y-axis: pH
- Curves: Chemical shift vs pH for each selected buffer’s resonances in this nucleus
- Curves calculated at user’s nominal temperature and ionic strength (update when these change)
- Curve labels: Buffer name and resonance ID (e.g., “Phosphate H2PO4”, “Tris H_alpha”)
- Colour-coded by buffer for clarity

### Chemical Shift Input

**Per-nucleus simple input**: For each nucleus type, provide text area for entering observed chemical shifts.

Format: One shift per line (simple numbers only):

```
2.45
3.82
3.15
7.21
```

**Automatic peak assignment**:

- Application attempts to match observed shifts to predicted buffer resonances
- Matching algorithm uses nominal pH, temperature, ionic strength to predict expected shifts
- Assigns each observed peak to nearest predicted resonance
- Visual feedback: as shifts are entered, vertical lines appear on plot at those positions
- Matched assignments shown with connecting lines or colour coding to predicted curves
- Debounce plot updates (500ms after typing stops)

**Assignment confidence/warnings**:

- Flag ambiguous assignments where multiple buffers have similar predicted shifts
- Warn if observed shift is far from any predicted resonance
- Allow user to see assignment details (which shift matched to which buffer/resonance)
- Optionally allow manual override of automatic assignments if needed

### Calculation and Results

**Calculate Button**

- Triggers nonlinear fitting with automatic assignment
- Shows loading indicator during calculation
- May iterate: initial assignment at nominal conditions → fit → reassign with refined conditions → refit
- Debounced if inputs change rapidly

**Real-time Visual Feedback**
During/after fitting:

- Horizontal line on each plot showing fitted pH
- Uncertainty band (shaded region) showing pH confidence interval
- Visual markers showing final peak assignments (connecting observed shifts to assigned buffer curves)
- If temperature/ionic strength/reference refined, plots update to show curves at refined conditions

**Fitted Parameters Display**

Show clearly:

```
pH: 7.34 ± 0.05

Temperature: 297.2 ± 0.3 K (nominal: 298.0 K)
⚠ Refined temperature differs from nominal by 0.8 K

Ionic strength: 0.148 ± 0.008 M (nominal: 0.150 M)

Chemical shift referencing:
  ¹H: Referenced to DSS at 0.00 ppm (fixed)
  ³¹P: +0.15 ± 0.02 ppm offset refined
  ¹⁹F: -1.23 ± 0.05 ppm offset refined
```

Flag substantial deviations from nominal values with warning icons and explanatory text.

**Peak Assignments Display**

Table showing automatic assignments:

```
Nucleus | Observed (ppm) | Assigned to      | Predicted (ppm) | Residual (ppm)
--------|----------------|------------------|-----------------|---------------
¹H      | 2.45          | Phosphate H2PO4  | 2.46           | -0.01
¹H      | 3.82          | Tris H_alpha     | 3.80           | +0.02
³¹P     | 3.15          | Phosphate        | 3.14           | +0.01
```

Highlight poor matches or ambiguous assignments.

**Residuals and Diagnostics**

Summary statistics:

- χ² value
- RMSD (ppm)
- Residuals in units of estimated uncertainty (z-scores)

Highlight problematic assignments (|z-score| > 2) to help users identify issues.

**Degrees of Freedom Check**

Display parameter count vs observation count:

```
Parameters to fit: 5 (pH, T, I, ¹H ref, ¹⁹F ref)
Observations: 8 chemical shifts
Degrees of freedom: 3 ✓
```

Warn if underdetermined (DoF ≤ 0) and suggest fixing some parameters or adding more data.

**Buffer Citations**

Collapsible section or separate tab showing:

- For each buffer used, formatted citation with:
  - Authors
  - Buffer name and ID
  - Sample measurement details (date, calibration methods)
  - DOI link to dataset
  - Link to raw data repository

Formatted ready to copy into lab notebook or methods section.

**Download Options**

Buttons to download:

1. **PDF Report**: Formatted document including fitted parameters, plots, assignments, residuals table, citations
1. **JSON Data**: Machine-readable file with inputs, outputs, assignments, and metadata for reproducibility
1. **Plots**: Individual PNG/SVG files of each chemical shift vs pH plot with fitted results
1. **Citation file**: Text file with formatted citations for all buffers used

## Technical Implementation

### Technology Stack

**Frontend Framework**: React

- State management handles reactive updates (user changes conditions → plots update)
- Component-based architecture for clean separation of concerns
- Well-documented deployment to GitHub Pages

**Plotting Library**: Plotly.js

- Interactive plots with zoom, hover tooltips
- Easy to overlay multiple curve types (reference curves, observed shifts, fitted pH)
- Supports export to static images

**Numerical Analysis**: Separate, clean JavaScript module

- Core calculations isolated from UI code
- Pure functions for all numerical operations
- Well-documented, readable implementation
- Can be understood, tested, and modified independently

**Build Tool**: Vite or Create React App

- Simple build process
- Optimised production bundles
- Hot reload during development

### Code Architecture

```
src/
├── numerical/                    # Pure numerical analysis (no React/UI)
│   ├── bufferModel.js           # pKa corrections, shift predictions
│   ├── peakAssignment.js        # Automatic shift → buffer matching
│   ├── fitting.js               # Levenberg-Marquardt optimizer
│   ├── uncertainty.js           # Jacobian-based uncertainty propagation
│   └── validation.js            # Check DoF, extrapolation, etc.
│
├── components/                   # React UI components
│   ├── DatabaseLoader.jsx
│   ├── SolventSelector.jsx
│   ├── ConditionsPanel.jsx
│   ├── BufferSelector.jsx
│   ├── ReferencingPanel.jsx
│   ├── NucleusTabPanel.jsx
│   │   ├── ChemicalShiftPlot.jsx
│   │   └── ShiftInputArea.jsx
│   ├── CalculateButton.jsx
│   └── ResultsPanel/
│       ├── FittedParameters.jsx
│       ├── AssignmentsTable.jsx
│       ├── ResidualsDisplay.jsx
│       ├── CitationsSection.jsx
│       └── DownloadButtons.jsx
│
└── App.jsx                       # Main component, state orchestration
```

### Numerical Analysis Module (Clean Separation)

All numerical code in `src/numerical/` consists of pure functions with clear inputs/outputs, no UI dependencies.

**bufferModel.js**:

```javascript
// Calculate pKa at given temperature and ionic strength
function calculatePKa(pKaParams, temperature, ionicStrength) { ... }

// Calculate chemical shift for a resonance at given conditions
function predictShift(resonanceParams, pH, temperature, ionicStrength) { ... }

// Calculate ionisation state populations
function ionisationFractions(pH, pKaValues) { ... }
```

**peakAssignment.js**:

```javascript
// Match observed shifts to buffer resonances
function assignPeaks(observedShifts, bufferDatabase, conditions) {
  // Returns: array of assignments with confidence scores
}

// Score quality of an assignment
function assignmentScore(observedShift, predictedShift, uncertainty) { ... }
```

**fitting.js**:

```javascript
// Main fitting function
function fitParameters(observations, bufferDatabase, initialGuess, options) {
  // observations: {nucleus, shift, assignment}[]
  // options: {refineTemp, refineIonicStrength, refineReference}
  // Returns: {fittedParams, uncertainty, residuals, convergence}
}

// Objective function for optimizer
function residualFunction(params, observations, bufferDatabase) { ... }

// Levenberg-Marquardt implementation or wrapper
function levenbergMarquardt(objectiveFn, initialParams, options) { ... }
```

**uncertainty.js**:

```javascript
// Calculate Jacobian matrix numerically
function calculateJacobian(residualFn, params, step) { ... }

// Propagate to parameter uncertainties
function parameterUncertainties(jacobian, residualVariance) { ... }
```

**validation.js**:

```javascript
// Check degrees of freedom
function checkDegreesOfFreedom(nObservations, nParameters) { ... }

// Check if conditions are within measurement ranges
function checkExtrapolation(conditions, bufferRanges) { ... }

// Validate assignment quality
function validateAssignments(assignments, residuals) { ... }
```

All functions well-documented with JSDoc comments, unit testable, and readable.

### React Component Responsibilities

**App.jsx**:

- Manage global state (selected buffers, conditions, observations, fitted results)
- Coordinate data flow between components
- Call numerical analysis functions
- No direct numerical calculations

**Individual Components**:

- Pure presentation/interaction
- Call callbacks to update parent state
- Receive data as props
- No numerical logic

### Data Flow

1. App loads → fetch buffer database JSON from GitHub
1. User selects solvent → filter buffers, populate selector
1. User selects buffers → load their parameters, generate plot curves
1. User enters conditions → update plot curves for T/I
1. User enters shifts → attempt automatic assignment, show as vertical lines on plots
1. User clicks Calculate:

- Call `assignPeaks()` to get initial assignments
- Call `fitParameters()` with assignments and options
- If refinement enabled, may iterate assignment/fitting
- Update UI with results

1. Display results, enable downloads

### Automatic Peak Assignment Algorithm

1. **Initial prediction**: For each selected buffer and nominal conditions, predict chemical shifts for all resonances
1. **Matching**: For each observed shift, find closest predicted shift(s)
1. **Scoring**: Assign confidence based on distance and uniqueness

- High confidence: single nearby prediction
- Medium confidence: nearby prediction but other buffers also close
- Low confidence: no predictions within reasonable range

1. **Ambiguity handling**: If multiple buffers predict similar shifts, try fitting with different assignment hypotheses, choose best fit
1. **Iteration**: After initial fit, recalculate predictions with refined parameters, verify assignments still make sense

### Error Handling

- Invalid/missing database: clear error message, link to GitHub issues
- Network failure: cache last successful database load in localStorage
- Fitting convergence failure: show diagnostic message, suggest checking inputs
- Physically unrealistic results (T < 0 K, negative I): flag and suggest reviewing assignments
- Missing required data for selected model: inform user what’s needed
- Ambiguous peak assignments: show warnings, allow manual override
- Insufficient degrees of freedom: clear message about needing more data or fixing parameters

### Validation and User Warnings

Show warnings for:

- Extrapolation beyond measurement ranges (pH, T, I)
- Large refined parameter deviations from nominal
- Poor fit residuals for individual peaks
- Ambiguous automatic assignments
- Insufficient data for requested refinements
- Underdetermined fitting problem (DoF ≤ 0)

Display information messages for:

- Degrees of freedom count
- Which parameters are being fitted vs fixed
- Iteration count if assignment/fitting loops
- Convergence status

## Deployment

- Host on GitHub Pages from repository
- Database JSON in same repository (or separate data repository)
- Automatic deployment on push to main branch
- Version control for database updates
- DOI via Zenodo for buffer data


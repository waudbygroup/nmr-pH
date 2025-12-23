/**
 * Fitting Module
 *
 * Nonlinear least-squares fitting using Levenberg-Marquardt algorithm.
 * Estimates pH, temperature, ionic strength, and reference offsets from chemical shifts.
 */

import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { predictBufferShifts, getBufferPKaValues, predictShift } from './bufferModel.js';
import { assignPeaks, getAssignedPeaksForFitting } from './peakAssignment.js';
import { calculateParameterUncertainties } from './uncertainty.js';

/**
 * Default fitting options.
 */
const DEFAULT_OPTIONS = {
  refineTemperature: false,
  refineIonicStrength: false,
  refineReferences: {}, // { nucleus: boolean }
  maxIterations: 100,
  tolerance: 1e-8,
  initialPH: 7.0
};

/**
 * Build parameter vector from conditions.
 *
 * @param {Object} conditions - Current conditions
 * @param {Object} options - Fitting options
 * @returns {Object} { params: Array, parameterMap: Object }
 */
export function buildParameterVector(conditions, options) {
  const params = [conditions.pH];
  const parameterMap = {
    pH: { index: 0, name: 'pH' }
  };

  let index = 1;

  if (options.refineTemperature) {
    params.push(conditions.temperature);
    parameterMap.temperature = { index, name: 'Temperature (K)' };
    index++;
  }

  if (options.refineIonicStrength) {
    params.push(conditions.ionicStrength);
    parameterMap.ionicStrength = { index, name: 'Ionic strength (M)' };
    index++;
  }

  // Reference offsets per nucleus
  for (const [nucleus, refine] of Object.entries(options.refineReferences)) {
    if (refine) {
      params.push(conditions.referenceOffsets?.[nucleus] ?? 0);
      parameterMap[`ref_${nucleus}`] = { index, name: `${nucleus} reference offset (ppm)` };
      index++;
    }
  }

  return { params, parameterMap };
}

/**
 * Extract conditions from parameter vector.
 *
 * @param {Array<number>} params - Parameter vector
 * @param {Object} parameterMap - Map of parameter names to indices
 * @param {Object} baseConditions - Base conditions for fixed parameters
 * @returns {Object} Conditions object
 */
export function extractConditions(params, parameterMap, baseConditions) {
  const conditions = {
    pH: params[parameterMap.pH.index],
    temperature: parameterMap.temperature
      ? params[parameterMap.temperature.index]
      : baseConditions.temperature,
    ionicStrength: parameterMap.ionicStrength
      ? params[parameterMap.ionicStrength.index]
      : baseConditions.ionicStrength,
    referenceOffsets: { ...baseConditions.referenceOffsets }
  };

  // Extract reference offsets
  for (const [key, mapping] of Object.entries(parameterMap)) {
    if (key.startsWith('ref_')) {
      const nucleus = key.slice(4);
      conditions.referenceOffsets[nucleus] = params[mapping.index];
    }
  }

  return conditions;
}

/**
 * Create residual function for fitting.
 *
 * @param {Array<Object>} assignedPeaks - Assigned peaks for fitting
 * @param {Map<string, Object>} buffersMap - Map of buffer_id to buffer object
 * @param {Map<string, Object>} samplesMap - Map of sample_id to sample object
 * @param {Object} parameterMap - Map of parameter names to indices
 * @param {Object} baseConditions - Base conditions for fixed parameters
 * @returns {Function} Residual function for optimizer
 */
export function createResidualFunction(assignedPeaks, buffersMap, samplesMap, parameterMap, baseConditions) {
  return function(params) {
    const conditions = extractConditions(params, parameterMap, baseConditions);
    const residuals = [];

    for (const peak of assignedPeaks) {
      const buffer = buffersMap.get(peak.buffer_id);
      const sample = samplesMap.get(buffer.sample_id);

      if (!buffer) {
        throw new Error(`Buffer not found: ${peak.buffer_id}`);
      }

      // Find the resonance
      const resonances = buffer.chemical_shifts[peak.nucleus] ?? [];
      const resonance = resonances.find(r => r.resonance_id === peak.resonance_id);

      if (!resonance) {
        throw new Error(`Resonance not found: ${peak.resonance_id} in ${peak.buffer_id}`);
      }

      // Calculate predicted shift
      const refTemp = sample?.reference_temperature_K ?? 298.15;
      const refIonic = sample?.reference_ionic_strength_M ?? 0;
      const pKaValues = getBufferPKaValues(buffer, conditions.temperature, conditions.ionicStrength, refTemp);

      let predictedShift = predictShift(
        resonance,
        pKaValues,
        conditions.pH,
        conditions.temperature,
        conditions.ionicStrength,
        refTemp,
        refIonic
      );

      // Apply reference offset if applicable
      const refOffset = conditions.referenceOffsets[peak.nucleus] ?? 0;
      predictedShift += refOffset;

      // Residual = observed - predicted
      residuals.push(peak.observed_shift - predictedShift);
    }

    return residuals;
  };
}

/**
 * Create model function for Levenberg-Marquardt.
 * Returns predicted shifts given parameters.
 *
 * @param {Array<Object>} assignedPeaks - Assigned peaks for fitting
 * @param {Map<string, Object>} buffersMap - Map of buffer_id to buffer object
 * @param {Map<string, Object>} samplesMap - Map of sample_id to sample object
 * @param {Object} parameterMap - Map of parameter names to indices
 * @param {Object} baseConditions - Base conditions for fixed parameters
 * @returns {Function} Model function
 */
export function createModelFunction(assignedPeaks, buffersMap, samplesMap, parameterMap, baseConditions) {
  // ml-levenberg-marquardt expects a function that takes (params) and returns array of predicted values
  // It minimizes the sum of squares of (data - predicted)
  return function(params) {
    const conditions = extractConditions(params, parameterMap, baseConditions);
    const predicted = [];

    for (const peak of assignedPeaks) {
      const buffer = buffersMap.get(peak.buffer_id);
      const sample = samplesMap.get(buffer.sample_id);

      const resonances = buffer.chemical_shifts[peak.nucleus] ?? [];
      const resonance = resonances.find(r => r.resonance_id === peak.resonance_id);

      const refTemp = sample?.reference_temperature_K ?? 298.15;
      const refIonic = sample?.reference_ionic_strength_M ?? 0;
      const pKaValues = getBufferPKaValues(buffer, conditions.temperature, conditions.ionicStrength, refTemp);

      let predictedShift = predictShift(
        resonance,
        pKaValues,
        conditions.pH,
        conditions.temperature,
        conditions.ionicStrength,
        refTemp,
        refIonic
      );

      const refOffset = conditions.referenceOffsets[peak.nucleus] ?? 0;
      predictedShift += refOffset;

      predicted.push(predictedShift);
    }

    return predicted;
  };
}

/**
 * Perform nonlinear least-squares fitting to estimate parameters.
 *
 * @param {Object} observedShifts - Object mapping nucleus -> array of observed shifts
 * @param {Array<Object>} buffers - Array of selected buffer objects
 * @param {Map<string, Object>} samplesMap - Map of sample_id to sample object
 * @param {Object} initialConditions - Initial conditions (pH, temperature, ionicStrength)
 * @param {Object} [options] - Fitting options
 * @returns {Object} Fitting results
 */
export function fitParameters(observedShifts, buffers, samplesMap, initialConditions, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Initial assignment at initial conditions
  let assignments = assignPeaks(
    observedShifts,
    buffers,
    samplesMap,
    opts.initialPH ?? initialConditions.pH ?? 7.0,
    initialConditions.temperature,
    initialConditions.ionicStrength
  );

  let assignedPeaks = getAssignedPeaksForFitting(assignments);

  if (assignedPeaks.length === 0) {
    return {
      success: false,
      error: 'No peaks could be assigned to buffer resonances',
      assignments
    };
  }

  // Build maps for quick lookup
  const buffersMap = new Map(buffers.map(b => [b.buffer_id, b]));

  // Build parameter vector
  const baseConditions = {
    temperature: initialConditions.temperature,
    ionicStrength: initialConditions.ionicStrength,
    referenceOffsets: initialConditions.referenceOffsets ?? {},
    pH: opts.initialPH ?? initialConditions.pH ?? 7.0
  };

  const { params: initialParams, parameterMap } = buildParameterVector(baseConditions, opts);

  // Check degrees of freedom
  const nParams = initialParams.length;
  const nObs = assignedPeaks.length;
  const dof = nObs - nParams;

  if (dof < 0) {
    return {
      success: false,
      error: `Underdetermined system: ${nObs} observations, ${nParams} parameters (DoF = ${dof})`,
      assignments,
      nObservations: nObs,
      nParameters: nParams,
      degreesOfFreedom: dof
    };
  }

  // Create model function
  const modelFn = createModelFunction(assignedPeaks, buffersMap, samplesMap, parameterMap, baseConditions);

  // Prepare data for ml-levenberg-marquardt
  // x values are just indices (we need them but they're not really used)
  const xData = assignedPeaks.map((_, i) => i);
  const yData = assignedPeaks.map(p => p.observed_shift);

  // Wrap model function to match expected signature
  const wrappedModel = params => (x => modelFn(params)[x]);

  // Set up parameter bounds
  const minValues = initialParams.map((_, i) => {
    if (i === parameterMap.pH.index) return 0;
    if (parameterMap.temperature && i === parameterMap.temperature.index) return 273;
    if (parameterMap.ionicStrength && i === parameterMap.ionicStrength.index) return 0;
    return -10; // Reference offsets
  });

  const maxValues = initialParams.map((_, i) => {
    if (i === parameterMap.pH.index) return 14;
    if (parameterMap.temperature && i === parameterMap.temperature.index) return 373;
    if (parameterMap.ionicStrength && i === parameterMap.ionicStrength.index) return 1;
    return 10; // Reference offsets
  });

  try {
    // Run Levenberg-Marquardt
    const result = levenbergMarquardt(
      { x: xData, y: yData },
      wrappedModel,
      {
        initialValues: initialParams,
        minValues,
        maxValues,
        maxIterations: opts.maxIterations,
        errorTolerance: opts.tolerance,
        damping: 1.5,
        dampingStepUp: 11,
        dampingStepDown: 9
      }
    );

    const fittedParams = result.parameterValues;
    const fittedConditions = extractConditions(fittedParams, parameterMap, baseConditions);

    // Re-assign peaks with fitted conditions
    const finalAssignments = assignPeaks(
      observedShifts,
      buffers,
      samplesMap,
      fittedConditions.pH,
      fittedConditions.temperature,
      fittedConditions.ionicStrength
    );

    // Calculate residuals at final parameters
    const residualFn = createResidualFunction(assignedPeaks, buffersMap, samplesMap, parameterMap, baseConditions);
    const residuals = residualFn(fittedParams);
    const sumSquares = residuals.reduce((sum, r) => sum + r * r, 0);
    const rmsd = Math.sqrt(sumSquares / residuals.length);

    // Calculate chi-squared (assuming unit variance for now)
    const chiSquared = sumSquares;
    const reducedChiSquared = dof > 0 ? chiSquared / dof : chiSquared;

    // Calculate parameter uncertainties
    const uncertainties = calculateParameterUncertainties(
      fittedParams,
      residualFn,
      reducedChiSquared
    );

    // Build result object
    const parameterResults = {};
    for (const [key, mapping] of Object.entries(parameterMap)) {
      parameterResults[key] = {
        value: fittedParams[mapping.index],
        uncertainty: uncertainties[mapping.index],
        name: mapping.name
      };
    }

    return {
      success: true,
      parameters: parameterResults,
      conditions: fittedConditions,
      assignments: finalAssignments,
      residuals,
      statistics: {
        nObservations: nObs,
        nParameters: nParams,
        degreesOfFreedom: dof,
        sumSquares,
        rmsd,
        chiSquared,
        reducedChiSquared,
        iterations: result.iterations
      },
      convergence: {
        converged: result.iterations < opts.maxIterations,
        iterations: result.iterations
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Fitting failed: ${error.message}`,
      assignments
    };
  }
}

/**
 * Perform iterative fitting with reassignment.
 * Fits, reassigns peaks with new conditions, and refits until stable.
 *
 * @param {Object} observedShifts - Object mapping nucleus -> array of observed shifts
 * @param {Array<Object>} buffers - Array of selected buffer objects
 * @param {Map<string, Object>} samplesMap - Map of sample_id to sample object
 * @param {Object} initialConditions - Initial conditions
 * @param {Object} [options] - Fitting options
 * @param {number} [maxRounds=3] - Maximum number of fit-reassign rounds
 * @returns {Object} Final fitting results
 */
export function fitWithReassignment(
  observedShifts,
  buffers,
  samplesMap,
  initialConditions,
  options = {},
  maxRounds = 3
) {
  let conditions = { ...initialConditions };
  let result = null;

  for (let round = 0; round < maxRounds; round++) {
    result = fitParameters(observedShifts, buffers, samplesMap, conditions, {
      ...options,
      initialPH: conditions.pH ?? options.initialPH ?? 7.0
    });

    if (!result.success) {
      return result;
    }

    // Check if pH changed significantly (would affect assignments)
    const pHChange = Math.abs(result.conditions.pH - conditions.pH);

    if (pHChange < 0.1) {
      // Assignments unlikely to change, stop iterating
      break;
    }

    // Update conditions for next round
    conditions = result.conditions;
  }

  return result;
}

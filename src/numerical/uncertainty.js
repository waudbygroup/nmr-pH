/**
 * Uncertainty Module
 *
 * Jacobian-based calculation of parameter uncertainties.
 */

/**
 * Calculate the Jacobian matrix numerically using central differences.
 *
 * @param {Function} residualFn - Function that takes params and returns residuals array
 * @param {Array<number>} params - Current parameter values
 * @param {number} [step=1e-6] - Step size for numerical differentiation
 * @returns {Array<Array<number>>} Jacobian matrix (nResiduals x nParams)
 */
export function calculateJacobian(residualFn, params, step = 1e-6) {
  const nParams = params.length;
  const baseResiduals = residualFn(params);
  const nResiduals = baseResiduals.length;

  const jacobian = [];

  for (let i = 0; i < nResiduals; i++) {
    jacobian.push(new Array(nParams).fill(0));
  }

  for (let j = 0; j < nParams; j++) {
    // Forward step
    const paramsPlus = [...params];
    paramsPlus[j] += step;
    const residualsPlus = residualFn(paramsPlus);

    // Backward step
    const paramsMinus = [...params];
    paramsMinus[j] -= step;
    const residualsMinus = residualFn(paramsMinus);

    // Central difference
    for (let i = 0; i < nResiduals; i++) {
      jacobian[i][j] = (residualsPlus[i] - residualsMinus[i]) / (2 * step);
    }
  }

  return jacobian;
}

/**
 * Multiply transpose of matrix A by matrix A (A^T * A).
 *
 * @param {Array<Array<number>>} A - Matrix
 * @returns {Array<Array<number>>} A^T * A
 */
function matrixTransposeProduct(A) {
  const nRows = A.length;
  const nCols = A[0].length;
  const result = [];

  for (let i = 0; i < nCols; i++) {
    result.push(new Array(nCols).fill(0));
    for (let j = 0; j < nCols; j++) {
      let sum = 0;
      for (let k = 0; k < nRows; k++) {
        sum += A[k][i] * A[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

/**
 * Invert a symmetric positive-definite matrix using Cholesky decomposition.
 *
 * @param {Array<Array<number>>} A - Symmetric positive-definite matrix
 * @returns {Array<Array<number>>} Inverse of A
 */
function invertSymmetricMatrix(A) {
  const n = A.length;

  // Cholesky decomposition: A = L * L^T
  const L = [];
  for (let i = 0; i < n; i++) {
    L.push(new Array(n).fill(0));
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) {
        sum -= L[i][k] * L[j][k];
      }

      if (i === j) {
        if (sum <= 0) {
          // Matrix is not positive definite, add regularization
          sum = 1e-10;
        }
        L[i][j] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }

  // Invert L
  const Linv = [];
  for (let i = 0; i < n; i++) {
    Linv.push(new Array(n).fill(0));
  }

  for (let i = 0; i < n; i++) {
    Linv[i][i] = 1 / L[i][i];
    for (let j = i + 1; j < n; j++) {
      let sum = 0;
      for (let k = i; k < j; k++) {
        sum -= L[j][k] * Linv[k][i];
      }
      Linv[j][i] = sum / L[j][j];
    }
  }

  // A^(-1) = (L^T)^(-1) * L^(-1) = Linv^T * Linv
  const Ainv = [];
  for (let i = 0; i < n; i++) {
    Ainv.push(new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = Math.max(i, j); k < n; k++) {
        sum += Linv[k][i] * Linv[k][j];
      }
      Ainv[i][j] = sum;
    }
  }

  return Ainv;
}

/**
 * Calculate parameter uncertainties from the Jacobian matrix.
 *
 * The covariance matrix is approximately (J^T * J)^(-1) * s^2
 * where s^2 is the reduced chi-squared (residual variance).
 *
 * @param {Array<number>} params - Fitted parameter values
 * @param {Function} residualFn - Residual function
 * @param {number} residualVariance - Estimated variance of residuals (reduced chi-squared)
 * @param {number} [step=1e-6] - Step size for Jacobian calculation
 * @returns {Array<number>} Standard errors for each parameter
 */
export function calculateParameterUncertainties(params, residualFn, residualVariance, step = 1e-6) {
  try {
    // Calculate Jacobian
    const jacobian = calculateJacobian(residualFn, params, step);

    // Calculate J^T * J
    const JTJ = matrixTransposeProduct(jacobian);

    // Invert to get covariance matrix (unscaled)
    const covarianceUnscaled = invertSymmetricMatrix(JTJ);

    // Scale by residual variance and take square root for standard errors
    const uncertainties = params.map((_, i) => {
      const variance = covarianceUnscaled[i][i] * residualVariance;
      return variance > 0 ? Math.sqrt(variance) : 0;
    });

    return uncertainties;
  } catch (error) {
    // If uncertainty calculation fails, return zeros
    console.warn('Uncertainty calculation failed:', error.message);
    return params.map(() => 0);
  }
}

/**
 * Calculate correlation matrix from covariance matrix.
 *
 * @param {Array<Array<number>>} covariance - Covariance matrix
 * @returns {Array<Array<number>>} Correlation matrix
 */
export function correlationFromCovariance(covariance) {
  const n = covariance.length;
  const correlation = [];

  const stddevs = covariance.map((row, i) => Math.sqrt(row[i]));

  for (let i = 0; i < n; i++) {
    correlation.push(new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      if (stddevs[i] > 0 && stddevs[j] > 0) {
        correlation[i][j] = covariance[i][j] / (stddevs[i] * stddevs[j]);
      } else {
        correlation[i][j] = i === j ? 1 : 0;
      }
    }
  }

  return correlation;
}

/**
 * Calculate full covariance matrix for fitted parameters.
 *
 * @param {Array<number>} params - Fitted parameter values
 * @param {Function} residualFn - Residual function
 * @param {number} residualVariance - Estimated variance of residuals
 * @param {number} [step=1e-6] - Step size for Jacobian calculation
 * @returns {Object} { covariance, correlation, uncertainties }
 */
export function calculateFullUncertainties(params, residualFn, residualVariance, step = 1e-6) {
  try {
    const jacobian = calculateJacobian(residualFn, params, step);
    const JTJ = matrixTransposeProduct(jacobian);
    const covarianceUnscaled = invertSymmetricMatrix(JTJ);

    // Scale covariance
    const covariance = covarianceUnscaled.map(row =>
      row.map(val => val * residualVariance)
    );

    const correlation = correlationFromCovariance(covariance);
    const uncertainties = covariance.map((row, i) =>
      row[i] > 0 ? Math.sqrt(row[i]) : 0
    );

    return { covariance, correlation, uncertainties };
  } catch (error) {
    console.warn('Full uncertainty calculation failed:', error.message);
    return {
      covariance: null,
      correlation: null,
      uncertainties: params.map(() => 0)
    };
  }
}

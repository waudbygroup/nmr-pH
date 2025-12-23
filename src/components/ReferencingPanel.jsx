/**
 * ReferencingPanel component.
 * Configure chemical shift referencing for each nucleus.
 */

/**
 * IUPAC Ξ ratios relative to DSS (1H at 0 ppm).
 * Used to calculate reference frequencies for other nuclei.
 */
const XI_RATIOS = {
  '1H': 100.000000,
  '13C': 25.145020,
  '15N': 10.136767,
  '19F': 94.094011,
  '31P': 40.480742
};

/**
 * Calculate reference frequency for a nucleus given 1H frequency.
 */
function calculateReferenceFrequency(nucleus, protonFrequencyMHz) {
  const xiRatio = XI_RATIOS[nucleus];
  if (!xiRatio) return null;
  return (protonFrequencyMHz * xiRatio) / 100;
}

/**
 * Single nucleus referencing configuration.
 */
function NucleusReferencing({
  nucleus,
  config,
  protonFrequency,
  onChange
}) {
  const handleModeChange = (e) => {
    onChange({
      ...config,
      mode: e.target.value,
      refineOffset: e.target.value === 'not_referenced'
    });
  };

  const handleDssShiftChange = (e) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...config,
      dssShift: isNaN(value) ? '' : value
    });
  };

  const handleRefineChange = (e) => {
    onChange({
      ...config,
      refineOffset: e.target.checked
    });
  };

  // Calculate expected frequency if proton frequency is set
  const expectedFreq = nucleus !== '1H' && protonFrequency
    ? calculateReferenceFrequency(nucleus, protonFrequency)
    : null;

  return (
    <div className="nucleus-referencing">
      <div className="nucleus-label">
        <sup>{nucleus.match(/^\d+/)?.[0]}</sup>
        {nucleus.replace(/^\d+/, '')}
      </div>

      <div className="referencing-options">
        <select
          value={config.mode}
          onChange={handleModeChange}
        >
          <option value="referenced">Referenced to DSS</option>
          <option value="not_referenced">Not referenced</option>
        </select>

        {config.mode === 'referenced' && (
          <div className="dss-input">
            <label>
              DSS shift (ppm):
              <input
                type="number"
                value={config.dssShift ?? ''}
                onChange={handleDssShiftChange}
                placeholder="0.00"
                step="0.001"
              />
            </label>
            <span className="hint">Optional: for validation</span>
          </div>
        )}

        {config.mode === 'not_referenced' && (
          <div className="unreferenced-options">
            {expectedFreq && (
              <div className="expected-freq">
                Expected: {expectedFreq.toFixed(3)} MHz
              </div>
            )}
            <label className="refine-checkbox">
              <input
                type="checkbox"
                checked={config.refineOffset}
                onChange={handleRefineChange}
              />
              Fit reference offset
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ReferencingPanel component.
 */
export function ReferencingPanel({
  nuclei,
  referenceConfigs,
  protonFrequency,
  onConfigChange,
  onProtonFrequencyChange
}) {
  if (nuclei.length === 0) {
    return null;
  }

  return (
    <div className="referencing-panel">
      <h3>Chemical Shift Referencing</h3>

      <div className="proton-frequency">
        <label>
          Spectrometer <sup>1</sup>H Frequency (MHz):
          <input
            type="number"
            value={protonFrequency ?? ''}
            onChange={(e) => onProtonFrequencyChange(parseFloat(e.target.value) || null)}
            placeholder="e.g., 600.13"
            step="0.01"
          />
        </label>
        <span className="hint">Used to calculate expected frequencies for other nuclei</span>
      </div>

      <div className="nuclei-references">
        {nuclei.map(nucleus => (
          <NucleusReferencing
            key={nucleus}
            nucleus={nucleus}
            config={referenceConfigs[nucleus] || { mode: 'referenced', refineOffset: false }}
            protonFrequency={protonFrequency}
            onChange={(config) => onConfigChange(nucleus, config)}
          />
        ))}
      </div>
    </div>
  );
}

export default ReferencingPanel;

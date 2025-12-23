import { useState } from 'react';
import { ChemicalShiftPlot } from './ChemicalShiftPlot';
import { ShiftInputArea } from './ShiftInputArea';

/**
 * NucleusTabPanel component.
 * Tabbed interface for each nucleus type with plot and input area.
 */
export function NucleusTabPanel({
  nuclei,
  buffers,
  samplesMap,
  temperature,
  ionicStrength,
  observedShifts,
  onShiftsChange,
  fittedPH = null,
  phUncertainty = null,
  assignments = null
}) {
  const [activeTab, setActiveTab] = useState(nuclei[0] || null);

  // Ensure active tab is valid
  if (activeTab && !nuclei.includes(activeTab)) {
    setActiveTab(nuclei[0] || null);
  }

  if (nuclei.length === 0) {
    return (
      <div className="nucleus-tab-panel empty">
        <p>Select buffers to view chemical shift data</p>
      </div>
    );
  }

  return (
    <div className="nucleus-tab-panel">
      <div className="tab-header">
        {nuclei.map(nucleus => (
          <button
            key={nucleus}
            className={`tab-button ${activeTab === nucleus ? 'active' : ''}`}
            onClick={() => setActiveTab(nucleus)}
            type="button"
          >
            <sup>{nucleus.match(/^\d+/)?.[0]}</sup>
            {nucleus.replace(/^\d+/, '')}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {nuclei.map(nucleus => (
          <div
            key={nucleus}
            className={`tab-pane ${activeTab === nucleus ? 'active' : ''}`}
            style={{ display: activeTab === nucleus ? 'block' : 'none' }}
          >
            <div className="nucleus-content">
              <div className="plot-section">
                <ChemicalShiftPlot
                  nucleus={nucleus}
                  buffers={buffers.filter(b =>
                    Object.keys(b.chemical_shifts).includes(nucleus)
                  )}
                  samplesMap={samplesMap}
                  temperature={temperature}
                  ionicStrength={ionicStrength}
                  observedShifts={observedShifts[nucleus] || []}
                  fittedPH={fittedPH}
                  phUncertainty={phUncertainty}
                  assignments={assignments?.[nucleus]}
                />
              </div>

              <div className="input-section">
                <ShiftInputArea
                  nucleus={nucleus}
                  value={observedShifts[nucleus] || []}
                  onChange={(shifts) => onShiftsChange(nucleus, shifts)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NucleusTabPanel;

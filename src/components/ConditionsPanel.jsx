/**
 * ConditionsPanel component.
 * Input fields for temperature and ionic strength with refinement toggles.
 */
export function ConditionsPanel({
  temperature,
  ionicStrength,
  refineTemperature,
  refineIonicStrength,
  onTemperatureChange,
  onIonicStrengthChange,
  onRefineTemperatureChange,
  onRefineIonicStrengthChange
}) {
  const handleTemperatureChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onTemperatureChange(value);
    }
  };

  const handleIonicStrengthChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onIonicStrengthChange(value);
    }
  };

  return (
    <div className="conditions-panel">
      <h3>Experimental Conditions</h3>

      <div className="condition-row">
        <div className="condition-input">
          <label htmlFor="temperature">Temperature (K)</label>
          <input
            type="number"
            id="temperature"
            value={temperature}
            onChange={handleTemperatureChange}
            min="273"
            max="373"
            step="0.1"
          />
        </div>
        <div className="condition-checkbox">
          <label>
            <input
              type="checkbox"
              checked={refineTemperature}
              onChange={(e) => onRefineTemperatureChange(e.target.checked)}
            />
            Refine during fitting
          </label>
        </div>
      </div>

      <div className="condition-row">
        <div className="condition-input">
          <label htmlFor="ionic-strength">Ionic Strength (M)</label>
          <input
            type="number"
            id="ionic-strength"
            value={ionicStrength}
            onChange={handleIonicStrengthChange}
            min="0"
            max="1"
            step="0.01"
          />
        </div>
        <div className="condition-checkbox">
          <label>
            <input
              type="checkbox"
              checked={refineIonicStrength}
              onChange={(e) => onRefineIonicStrengthChange(e.target.checked)}
            />
            Refine during fitting
          </label>
        </div>
      </div>
    </div>
  );
}

export default ConditionsPanel;

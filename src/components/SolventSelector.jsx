import { useDatabase } from './DatabaseLoader';

/**
 * Human-readable solvent names.
 */
const SOLVENT_LABELS = {
  '10pct_D2O': '10% D₂O / 90% H₂O',
  '100pct_D2O': '100% D₂O',
  'H2O': 'H₂O',
  'other': 'Other'
};

/**
 * SolventSelector component.
 * Dropdown to select solvent system.
 */
export function SolventSelector({ value, onChange }) {
  const { solvents } = useDatabase();

  return (
    <div className="solvent-selector">
      <label htmlFor="solvent-select">Solvent System</label>
      <select
        id="solvent-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select solvent...</option>
        {solvents.map(solvent => (
          <option key={solvent} value={solvent}>
            {SOLVENT_LABELS[solvent] || solvent}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SolventSelector;

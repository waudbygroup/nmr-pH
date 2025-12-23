import { useDatabase } from './DatabaseLoader';
import { getValue } from '../numerical/bufferModel';

/**
 * Nucleus display with superscript formatting.
 */
const NUCLEUS_LABELS = {
  '1H': { number: '1', element: 'H' },
  '13C': { number: '13', element: 'C' },
  '15N': { number: '15', element: 'N' },
  '19F': { number: '19', element: 'F' },
  '31P': { number: '31', element: 'P' }
};

/**
 * NucleusIcon component.
 * Displays nucleus with proper formatting.
 */
function NucleusIcon({ nucleus }) {
  const label = NUCLEUS_LABELS[nucleus];
  if (!label) return <span className="nucleus-icon">{nucleus}</span>;

  return (
    <span className="nucleus-icon">
      <sup>{label.number}</sup>{label.element}
    </span>
  );
}

/**
 * BufferTile component.
 * Clickable tile for a single buffer.
 */
function BufferTile({ buffer, selected, onToggle }) {
  // Get available nuclei
  const nuclei = Object.keys(buffer.chemical_shifts);

  // Get pKa values
  const pKaValues = buffer.pKa_parameters
    .map(p => getValue(p.pKa))
    .sort((a, b) => a - b);

  const pKaDisplay = pKaValues.length > 0
    ? `pKa ${pKaValues.map(v => v.toFixed(1)).join(', ')}`
    : '';

  return (
    <button
      className={`buffer-tile ${selected ? 'selected' : ''}`}
      onClick={() => onToggle(buffer.buffer_id)}
      type="button"
    >
      <div className="buffer-name">{buffer.buffer_name}</div>
      <div className="buffer-nuclei">
        {nuclei.map(n => (
          <NucleusIcon key={n} nucleus={n} />
        ))}
      </div>
      <div className="buffer-pka">{pKaDisplay}</div>
    </button>
  );
}

/**
 * BufferSelector component.
 * Grid of buffer tiles for selection.
 */
export function BufferSelector({ solvent, selectedBufferIds, onSelectionChange }) {
  const { getBuffersForSolvent } = useDatabase();

  const availableBuffers = getBuffersForSolvent(solvent);

  // Sort alphabetically by name
  const sortedBuffers = [...availableBuffers].sort((a, b) =>
    a.buffer_name.localeCompare(b.buffer_name)
  );

  const handleToggle = (bufferId) => {
    if (selectedBufferIds.includes(bufferId)) {
      onSelectionChange(selectedBufferIds.filter(id => id !== bufferId));
    } else {
      onSelectionChange([...selectedBufferIds, bufferId]);
    }
  };

  if (!solvent) {
    return (
      <div className="buffer-selector disabled">
        <h3>Buffer Selection</h3>
        <p className="hint">Select a solvent first</p>
      </div>
    );
  }

  if (sortedBuffers.length === 0) {
    return (
      <div className="buffer-selector empty">
        <h3>Buffer Selection</h3>
        <p className="hint">No buffers available for this solvent</p>
      </div>
    );
  }

  return (
    <div className="buffer-selector">
      <h3>Buffer Selection</h3>
      <p className="hint">Click to select buffers ({selectedBufferIds.length} selected)</p>
      <div className="buffer-grid">
        {sortedBuffers.map(buffer => (
          <BufferTile
            key={buffer.buffer_id}
            buffer={buffer}
            selected={selectedBufferIds.includes(buffer.buffer_id)}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

export default BufferSelector;

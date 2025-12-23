/**
 * AssignmentsTable component.
 * Displays peak assignments in a table format.
 */
export function AssignmentsTable({ assignments }) {
  if (!assignments) {
    return null;
  }

  // Flatten assignments into a single array
  const rows = [];
  for (const [nucleus, nucleusAssignments] of Object.entries(assignments)) {
    for (const assignment of nucleusAssignments) {
      rows.push({
        nucleus,
        ...assignment
      });
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="assignments-table">
      <h3>Peak Assignments</h3>

      <table>
        <thead>
          <tr>
            <th>Nucleus</th>
            <th>Observed (ppm)</th>
            <th>Assigned To</th>
            <th>Predicted (ppm)</th>
            <th>Residual (ppm)</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={`
                ${!row.assigned ? 'unassigned' : ''}
                ${row.confidence === 'low' ? 'low-confidence' : ''}
                ${row.alternatives?.length > 0 ? 'ambiguous' : ''}
              `}
            >
              <td>
                <sup>{row.nucleus.match(/^\d+/)?.[0]}</sup>
                {row.nucleus.replace(/^\d+/, '')}
              </td>
              <td>{row.observed_shift.toFixed(3)}</td>
              <td>
                {row.assigned ? (
                  <>
                    {row.buffer_name}
                    <br />
                    <small>{row.resonance_id}</small>
                  </>
                ) : (
                  <span className="unassigned-text">Unassigned</span>
                )}
              </td>
              <td>
                {row.assigned ? row.predicted_shift.toFixed(3) : '-'}
              </td>
              <td className={Math.abs(row.residual) > 0.1 ? 'large-residual' : ''}>
                {row.assigned ? (
                  <>
                    {row.residual >= 0 ? '+' : ''}{row.residual.toFixed(3)}
                  </>
                ) : '-'}
              </td>
              <td>
                <span className={`confidence-badge ${row.confidence}`}>
                  {row.assigned ? row.confidence : '-'}
                </span>
                {row.alternatives?.length > 0 && (
                  <span className="ambiguous-marker" title="Multiple possible matches">
                    ⚠
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="assignments-summary">
        <span className="assigned-count">
          {rows.filter(r => r.assigned).length} assigned
        </span>
        {rows.some(r => !r.assigned) && (
          <span className="unassigned-count">
            {rows.filter(r => !r.assigned).length} unassigned
          </span>
        )}
        {rows.some(r => r.confidence === 'low') && (
          <span className="low-confidence-count">
            {rows.filter(r => r.confidence === 'low').length} low confidence
          </span>
        )}
      </div>
    </div>
  );
}

export default AssignmentsTable;

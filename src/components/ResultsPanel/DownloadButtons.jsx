import { jsPDF } from 'jspdf';

/**
 * Generate JSON data for download.
 */
function generateJSON(result, conditions, buffers, observedShifts) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    input: {
      conditions,
      observedShifts,
      buffers: buffers.map(b => ({
        buffer_id: b.buffer_id,
        buffer_name: b.buffer_name
      }))
    },
    output: result.success ? {
      parameters: result.parameters,
      conditions: result.conditions,
      statistics: result.statistics,
      assignments: result.assignments
    } : {
      error: result.error
    }
  }, null, 2);
}

/**
 * Generate PDF report.
 */
function generatePDF(result, conditions, buffers, samplesMap) {
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text('NMR Buffer pH Estimation Report', 20, y);
  y += 15;

  // Timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
  y += 15;

  // Results
  if (result.success) {
    doc.setFontSize(14);
    doc.text('Fitted Parameters', 20, y);
    y += 10;

    doc.setFontSize(11);
    const params = result.parameters;

    doc.text(`pH: ${params.pH.value.toFixed(2)} ± ${params.pH.uncertainty.toFixed(2)}`, 25, y);
    y += 7;

    if (params.temperature) {
      doc.text(`Temperature: ${params.temperature.value.toFixed(1)} ± ${params.temperature.uncertainty.toFixed(1)} K`, 25, y);
      y += 7;
    } else {
      doc.text(`Temperature: ${conditions.temperature.toFixed(1)} K (fixed)`, 25, y);
      y += 7;
    }

    if (params.ionicStrength) {
      doc.text(`Ionic Strength: ${params.ionicStrength.value.toFixed(3)} ± ${params.ionicStrength.uncertainty.toFixed(3)} M`, 25, y);
      y += 7;
    } else {
      doc.text(`Ionic Strength: ${conditions.ionicStrength.toFixed(3)} M (fixed)`, 25, y);
      y += 7;
    }

    y += 10;

    // Fit statistics
    doc.setFontSize(14);
    doc.text('Fit Statistics', 20, y);
    y += 10;

    doc.setFontSize(11);
    const stats = result.statistics;
    doc.text(`RMSD: ${stats.rmsd.toFixed(4)} ppm`, 25, y);
    y += 7;
    doc.text(`Reduced chi-squared: ${stats.reducedChiSquared.toFixed(3)}`, 25, y);
    y += 7;
    doc.text(`Observations: ${stats.nObservations}`, 25, y);
    y += 7;
    doc.text(`Parameters: ${stats.nParameters}`, 25, y);
    y += 7;
    doc.text(`Degrees of freedom: ${stats.degreesOfFreedom}`, 25, y);
    y += 15;

    // Buffers used
    doc.setFontSize(14);
    doc.text('Buffers Used', 20, y);
    y += 10;

    doc.setFontSize(11);
    for (const buffer of buffers) {
      doc.text(`- ${buffer.buffer_name} (${buffer.buffer_id})`, 25, y);
      y += 7;
    }
  } else {
    doc.setFontSize(12);
    doc.text('Fitting failed:', 20, y);
    y += 10;
    doc.text(result.error, 25, y);
  }

  return doc;
}

/**
 * DownloadButtons component.
 * Buttons to download results in various formats.
 */
export function DownloadButtons({
  result,
  conditions,
  buffers,
  samplesMap,
  observedShifts
}) {
  if (!result) {
    return null;
  }

  const downloadJSON = () => {
    const json = generateJSON(result, conditions, buffers, observedShifts);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmr-ph-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = generatePDF(result, conditions, buffers, samplesMap);
    doc.save('nmr-ph-report.pdf');
  };

  const downloadCitations = () => {
    const citations = buffers.map(buffer => {
      const sample = samplesMap.get(buffer.sample_id);
      const authors = sample?.authors?.map(a => a.name).join(', ') || 'Unknown';
      const date = sample?.date_measured ? new Date(sample.date_measured).getFullYear() : 'n.d.';
      return `${authors} (${date}). ${buffer.buffer_name} buffer parameters. ${buffer.buffer_id}`;
    }).join('\n\n');

    const blob = new Blob([citations], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmr-buffer-citations.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="download-buttons">
      <h3>Download Results</h3>
      <div className="button-group">
        <button onClick={downloadPDF} type="button" className="download-button">
          PDF Report
        </button>
        <button onClick={downloadJSON} type="button" className="download-button">
          JSON Data
        </button>
        <button onClick={downloadCitations} type="button" className="download-button">
          Citations
        </button>
      </div>
    </div>
  );
}

export default DownloadButtons;

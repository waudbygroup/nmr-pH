import { useMemo, useState } from 'react';

/**
 * Format author list for citation.
 */
function formatAuthors(authors) {
  if (!authors || authors.length === 0) return 'Unknown authors';

  if (authors.length === 1) {
    return authors[0].name;
  }

  if (authors.length === 2) {
    return `${authors[0].name} and ${authors[1].name}`;
  }

  return `${authors[0].name} et al.`;
}

/**
 * Format a single buffer citation.
 */
function formatCitation(buffer, sample) {
  const authors = formatAuthors(sample?.authors);
  const date = sample?.date_measured ? new Date(sample.date_measured).getFullYear() : 'n.d.';

  return {
    buffer_id: buffer.buffer_id,
    buffer_name: buffer.buffer_name,
    authors,
    date,
    sample_id: sample?.sample_id,
    doi: sample?.doi,
    raw_data_url: sample?.raw_data_repository?.url,
    formatted: `${authors} (${date}). ${buffer.buffer_name} buffer parameters. ` +
      (sample?.doi ? `DOI: ${sample.doi}. ` : '') +
      (sample?.raw_data_repository?.url ? `Data: ${sample.raw_data_repository.url}` : '')
  };
}

/**
 * CitationsSection component.
 * Displays citations for buffers used in the analysis.
 */
export function CitationsSection({ buffers, samplesMap }) {
  const [expanded, setExpanded] = useState(false);

  const citations = useMemo(() => {
    return buffers.map(buffer => {
      const sample = samplesMap.get(buffer.sample_id);
      return formatCitation(buffer, sample);
    });
  }, [buffers, samplesMap]);

  if (citations.length === 0) {
    return null;
  }

  const copyToClipboard = () => {
    const text = citations.map(c => c.formatted).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('Citations copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="citations-section">
      <div className="citations-header">
        <h3>Buffer Citations</h3>
        <button
          className="expand-button"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <div className="citations-content">
          <p className="citation-hint">
            Please cite the following sources when using these buffer data:
          </p>

          <ul className="citation-list">
            {citations.map(citation => (
              <li key={citation.buffer_id} className="citation-item">
                <div className="citation-text">{citation.formatted}</div>
                {citation.raw_data_url && (
                  <a
                    href={citation.raw_data_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="data-link"
                  >
                    View raw data
                  </a>
                )}
              </li>
            ))}
          </ul>

          <button
            className="copy-button"
            onClick={copyToClipboard}
            type="button"
          >
            Copy all citations
          </button>
        </div>
      )}
    </div>
  );
}

export default CitationsSection;

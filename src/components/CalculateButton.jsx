/**
 * CalculateButton component.
 * Triggers fitting calculation with loading state.
 */
export function CalculateButton({
  onClick,
  loading = false,
  disabled = false,
  disabledReason = ''
}) {
  return (
    <div className="calculate-button-container">
      <button
        className={`calculate-button ${loading ? 'loading' : ''}`}
        onClick={onClick}
        disabled={disabled || loading}
        type="button"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Calculating...
          </>
        ) : (
          'Calculate pH'
        )}
      </button>
      {disabled && disabledReason && (
        <p className="disabled-reason">{disabledReason}</p>
      )}
    </div>
  );
}

export default CalculateButton;

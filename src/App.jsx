import { useState, useCallback, useMemo } from 'react';
import { DatabaseLoader, useDatabase } from './components/DatabaseLoader';
import { SolventSelector } from './components/SolventSelector';
import { ConditionsPanel } from './components/ConditionsPanel';
import { BufferSelector } from './components/BufferSelector';
import { ReferencingPanel } from './components/ReferencingPanel';
import { NucleusTabPanel } from './components/NucleusTabPanel';
import { CalculateButton } from './components/CalculateButton';
import { ResultsPanel } from './components/ResultsPanel';
import { fitWithReassignment } from './numerical/fitting';
import { validateFitResult } from './numerical/validation';
import './App.css';

/**
 * Main application content (requires DatabaseContext).
 */
function AppContent() {
  const { database, getNucleiForBuffers } = useDatabase();

  // State
  const [solvent, setSolvent] = useState('');
  const [selectedBufferIds, setSelectedBufferIds] = useState([]);
  const [temperature, setTemperature] = useState(298.15);
  const [ionicStrength, setIonicStrength] = useState(0.15);
  const [refineTemperature, setRefineTemperature] = useState(false);
  const [refineIonicStrength, setRefineIonicStrength] = useState(false);
  const [protonFrequency, setProtonFrequency] = useState(null);
  const [referenceConfigs, setReferenceConfigs] = useState({});
  const [observedShifts, setObservedShifts] = useState({});
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [validation, setValidation] = useState(null);

  // Derived state
  const selectedBuffers = useMemo(() => {
    if (!database) return [];
    return selectedBufferIds
      .map(id => database.buffersMap.get(id))
      .filter(Boolean);
  }, [database, selectedBufferIds]);

  const nuclei = useMemo(() => {
    return getNucleiForBuffers(selectedBuffers);
  }, [selectedBuffers, getNucleiForBuffers]);

  // Count total observed shifts
  const totalObservedShifts = useMemo(() => {
    return Object.values(observedShifts).reduce((sum, shifts) => sum + shifts.length, 0);
  }, [observedShifts]);

  // Check if can calculate
  const canCalculate = selectedBuffers.length > 0 && totalObservedShifts > 0;
  const calculateDisabledReason = !selectedBuffers.length
    ? 'Select at least one buffer'
    : !totalObservedShifts
      ? 'Enter chemical shifts for at least one nucleus'
      : '';

  // Handle solvent change - reset buffer selection
  const handleSolventChange = useCallback((newSolvent) => {
    setSolvent(newSolvent);
    setSelectedBufferIds([]);
    setObservedShifts({});
    setResult(null);
    setValidation(null);
  }, []);

  // Handle reference config change
  const handleReferenceConfigChange = useCallback((nucleus, config) => {
    setReferenceConfigs(prev => ({
      ...prev,
      [nucleus]: config
    }));
  }, []);

  // Handle shifts change
  const handleShiftsChange = useCallback((nucleus, shifts) => {
    setObservedShifts(prev => ({
      ...prev,
      [nucleus]: shifts
    }));
    // Clear previous results when shifts change
    setResult(null);
    setValidation(null);
  }, []);

  // Handle calculation
  const handleCalculate = useCallback(async () => {
    if (!canCalculate || !database) return;

    setCalculating(true);
    setResult(null);
    setValidation(null);

    try {
      // Build fitting options
      const refineReferences = {};
      for (const [nucleus, config] of Object.entries(referenceConfigs)) {
        if (config.mode === 'not_referenced' && config.refineOffset) {
          refineReferences[nucleus] = true;
        }
      }

      const options = {
        refineTemperature,
        refineIonicStrength,
        refineReferences,
        initialPH: 7.0
      };

      const conditions = {
        temperature,
        ionicStrength,
        referenceOffsets: {}
      };

      // Get samples for selected buffers
      const sampleIds = [...new Set(selectedBuffers.map(b => b.sample_id))];
      const samples = sampleIds
        .map(id => database.samplesMap.get(id))
        .filter(Boolean);

      // Run fitting
      const fitResult = await new Promise((resolve) => {
        // Use setTimeout to allow UI to update
        setTimeout(() => {
          const result = fitWithReassignment(
            observedShifts,
            selectedBuffers,
            database.samplesMap,
            conditions,
            options
          );
          resolve(result);
        }, 50);
      });

      setResult(fitResult);

      // Validate result
      if (fitResult.success) {
        const validationResult = validateFitResult(fitResult, conditions, samples);
        setValidation(validationResult);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setCalculating(false);
    }
  }, [
    canCalculate,
    database,
    selectedBuffers,
    observedShifts,
    temperature,
    ionicStrength,
    refineTemperature,
    refineIonicStrength,
    referenceConfigs
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>NMR Buffer pH Estimation</h1>
        <p className="subtitle">
          Estimate sample pH from buffer chemical shifts
        </p>
      </header>

      <main className="app-main">
        <section className="setup-section">
          <div className="setup-row">
            <SolventSelector value={solvent} onChange={handleSolventChange} />
            <ConditionsPanel
              temperature={temperature}
              ionicStrength={ionicStrength}
              refineTemperature={refineTemperature}
              refineIonicStrength={refineIonicStrength}
              onTemperatureChange={setTemperature}
              onIonicStrengthChange={setIonicStrength}
              onRefineTemperatureChange={setRefineTemperature}
              onRefineIonicStrengthChange={setRefineIonicStrength}
            />
          </div>

          <BufferSelector
            solvent={solvent}
            selectedBufferIds={selectedBufferIds}
            onSelectionChange={setSelectedBufferIds}
          />

          {nuclei.length > 0 && (
            <ReferencingPanel
              nuclei={nuclei}
              referenceConfigs={referenceConfigs}
              protonFrequency={protonFrequency}
              onConfigChange={handleReferenceConfigChange}
              onProtonFrequencyChange={setProtonFrequency}
            />
          )}
        </section>

        {selectedBuffers.length > 0 && (
          <section className="data-section">
            <NucleusTabPanel
              nuclei={nuclei}
              buffers={selectedBuffers}
              samplesMap={database.samplesMap}
              temperature={temperature}
              ionicStrength={ionicStrength}
              observedShifts={observedShifts}
              onShiftsChange={handleShiftsChange}
              fittedPH={result?.success ? result.parameters.pH.value : null}
              phUncertainty={result?.success ? result.parameters.pH.uncertainty : null}
              assignments={result?.success ? result.assignments : null}
            />

            <CalculateButton
              onClick={handleCalculate}
              loading={calculating}
              disabled={!canCalculate}
              disabledReason={calculateDisabledReason}
            />
          </section>
        )}

        {result && (
          <section className="results-section">
            <ResultsPanel
              result={result}
              validation={validation}
              conditions={{ temperature, ionicStrength }}
              buffers={selectedBuffers}
              samplesMap={database.samplesMap}
              observedShifts={observedShifts}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          <a href="https://github.com/waudbygroup/nmr-pH" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          {' | '}
          <a href="https://waudbygroup.org" target="_blank" rel="noopener noreferrer">
            Waudby Group
          </a>
          {' | '}
          UCL School of Pharmacy
        </p>
      </footer>
    </div>
  );
}

/**
 * Main App component with database provider.
 */
function App() {
  return (
    <DatabaseLoader>
      <AppContent />
    </DatabaseLoader>
  );
}

export default App;

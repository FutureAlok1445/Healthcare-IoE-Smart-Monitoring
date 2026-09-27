export default function PatientSelector({ patients, selectedPatientId, onSelectPatient }) {
  return (
    <div className="patient-selector-strip" role="region" aria-label="Patient Selector Strip">
      <span className="patient-selector-label">Patient:</span>
      <div className="patient-pill-group">
        {patients.map((p) => {
          const isSelected = p.id === selectedPatientId;
          return (
            <button
              key={p.id}
              type="button"
              className={`patient-pill ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectPatient(p.id)}
            >
              {p.name}
              {p.isLiveNode && <span className="live-hardware-tag">LIVE</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

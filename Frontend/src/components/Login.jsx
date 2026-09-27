import React, { useState } from 'react';
import { loginUser } from '../services/api';
import {
  IconHeartPulse,
  IconShieldCheck,
  IconStethoscope,
  IconHeartHandshake,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
  IconCheckCircle,
  IconChevronDown,
  IconChevronRight,
  IconActivity,
  IconRadio,
} from './Icons';

export default function Login({ onLogin }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [role, setRole] = useState('Doctor');
  const [identifier, setIdentifier] = useState('dr.mehta@caresense.io');
  const [password, setPassword] = useState('DoctorPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('Doctor');

  const roleDescriptions = {
    Doctor: 'Full clinical privileges: telemetry review, patient assignment, and threshold override.',
    Caregiver: 'Nurse ward duties: continuous vitals watch, emergency alert acknowledgement, and triage.',
    Admin: 'System administration: node provisioning, hardware diagnosis, and cryptographic audit logs.',
  };

  const handleRoleSelect = (r) => {
    setRole(r);
    setErrorMsg(null);
    if (r === 'Doctor') {
      setIdentifier('dr.mehta@caresense.io');
      setPassword('DoctorPass2026!');
    } else if (r === 'Caregiver') {
      setIdentifier('nurse.sarah@caresense.io');
      setPassword('NursePass2026!');
    } else {
      setIdentifier('admin@caresense.io');
      setPassword('AdminPass2026!');
    }
  };

  const handleQuickFill = (r, email, pwd) => {
    setRole(r);
    setIdentifier(email);
    setPassword(pwd);
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
      if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
        setErrorMsg('Please complete all required registration fields.');
        return;
      }
      setLoading(true);
      setErrorMsg(null);
      // Simulate access request submission for clinical RBAC approval
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg(
          'Clinical access request registered. Your credentials have been queued for Hospital Medical Board cryptographic verification.'
        );
        setAuthMode('signin');
      }, 900);
      return;
    }

    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your clinical email/username and security password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await loginUser({
        email: identifier.trim(),
        password: password,
      });
      onLogin({
        ...res.user,
        token: res.token,
      });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Authentication failed. Please verify certified hospital credentials.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation for sign up
  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const strength = calculateStrength(signupPassword);

  return (
    <div className="auth-master-container">
      <div className="auth-card-wrapper">
        {/* Left Side: Clinical Assurance & Value Panel */}
        <div className="auth-brand-panel">
          <div className="auth-brand-header">
            <div className="auth-brand-logo-mark">
              <IconHeartPulse size={28} color="#38bdf8" />
            </div>
            <div>
              <h1 className="auth-brand-title">CareSense IoE</h1>
              <p className="auth-brand-subtitle">Smart Continuous Patient Telemetry</p>
            </div>
          </div>

          <div className="auth-brand-body">
            <p className="auth-value-tagline">
              Medical-grade continuous physiological surveillance powered by distributed ESP32 wearable sensor nodes.
            </p>

            {/* Live Telemetry Pulse Animation Graphic */}
            <div className="auth-telemetry-motif" aria-hidden="true">
              <div className="motif-wave-header">
                <span className="motif-dot-live" />
                <span className="motif-node-tag">ESP32-NODE-01 LIVE TELEMETRY STREAM</span>
              </div>
              <svg className="motif-ecg-svg" viewBox="0 0 320 60" preserveAspectRatio="none">
                <path
                  className="motif-ecg-line"
                  d="M0,30 L60,30 L75,28 L85,32 L95,30 L105,8 L115,52 L125,24 L135,32 L145,30 L220,30 L235,28 L245,32 L255,30 L265,8 L275,52 L285,24 L295,32 L305,30 L320,30"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
              </svg>
              <div className="motif-metric-row">
                <span className="motif-metric">HR: <strong>74 BPM</strong></span>
                <span className="motif-metric">SpO2: <strong>99.1%</strong></span>
                <span className="motif-metric">Temp: <strong>36.8°C</strong></span>
                <span className="motif-metric">MPU-6050: <strong>1.01G Normal</strong></span>
              </div>
            </div>

            {/* Clinical Value Bullets */}
            <ul className="auth-value-points">
              <li>
                <IconActivity size={16} color="#38bdf8" />
                <span>Sub-second biometric ingestion from MAX30102 & DS18B20</span>
              </li>
              <li>
                <IconRadio size={16} color="#38bdf8" />
                <span>Instant fall impact vector detection via MPU-6050 6-Axis IMU</span>
              </li>
              <li>
                <IconShieldCheck size={16} color="#38bdf8" />
                <span>Role-based access control with tamper-evident audit logging</span>
              </li>
            </ul>
          </div>

          {/* Compliance & Trust Badges */}
          <div className="auth-compliance-footer">
            <div className="compliance-badge">
              <span className="badge-code">AES-256</span>
              <span className="badge-name">Encrypted Telemetry</span>
            </div>
            <div className="compliance-badge">
              <span className="badge-code">ISO-13485</span>
              <span className="badge-name">Medical Software Standards</span>
            </div>
            <div className="compliance-badge">
              <span className="badge-code">RBAC</span>
              <span className="badge-name">Certified Personnel</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Card */}
        <div className="auth-form-card">
          {/* Mode Switcher Tabs */}
          <div className="auth-mode-tabs" role="tablist">
            <button
              type="button"
              className={`auth-mode-tab ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
              }}
            >
              Clinical Sign In
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg(null);
              }}
            >
              Request Access / Sign Up
            </button>
          </div>

          {authMode === 'signin' ? (
            <>
              <div className="auth-card-intro">
                <h2>Clinical Portal Authentication</h2>
                <p>Select your authorized clinical role and authenticate to access central telemetry.</p>
              </div>

              {/* Segmented Role Picker with Icons */}
              <div className="clinical-role-selector" role="radiogroup" aria-label="Clinical Role Selection">
                {[
                  { id: 'Doctor', label: 'Doctor', Icon: IconStethoscope },
                  { id: 'Caregiver', label: 'Caregiver / Nurse', Icon: IconHeartHandshake },
                  { id: 'Admin', label: 'Admin', Icon: IconShieldCheck },
                ].map((item) => {
                  const RoleIcon = item.Icon;
                  const isSelected = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`role-select-card ${isSelected ? 'role-selected' : ''}`}
                      onClick={() => handleRoleSelect(item.id)}
                    >
                      <RoleIcon size={18} />
                      <span className="role-card-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="role-permissions-callout">
                <span className="role-desc-text">{roleDescriptions[role]}</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-form-body">
                {/* Identifier Field */}
                <div className="form-input-group">
                  <label htmlFor="identifier">Clinical Account / Email</label>
                  <div className="input-with-leading-icon">
                    <IconMail size={16} className="leading-icon" />
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="clinician@caresense.io"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                {/* Password Field with Eye Toggle */}
                <div className="form-input-group">
                  <div className="password-label-row">
                    <label htmlFor="password">Security Password</label>
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => alert('Password reset protocol: Please contact Hospital IT Security Operations to dispatch a temporary credential token.')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-with-leading-icon">
                    <IconLock size={16} className="leading-icon" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter clinical password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="auth-options-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember terminal identity for this shift</span>
                  </label>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="auth-error-banner" role="alert">
                    <IconAlertTriangle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="auth-success-banner" role="status">
                    <IconCheckCircle size={16} />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="btn-loading-content">
                      <span className="auth-spinner" />
                      <span>Verifying Cryptographic Credentials…</span>
                    </span>
                  ) : (
                    <span>Sign In to Clinical Command Center</span>
                  )}
                </button>
              </form>

              {/* Expandable Demo Credentials Drawer (No raw password dumps) */}
              <div className="demo-credentials-drawer">
                <button
                  type="button"
                  className="demo-drawer-toggle"
                  onClick={() => setShowDemoDrawer(!showDemoDrawer)}
                >
                  <div className="toggle-left">
                    <IconShieldCheck size={14} color="var(--brand-primary)" />
                    <span>Evaluation & Demo Access Credentials</span>
                  </div>
                  {showDemoDrawer ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </button>

                {showDemoDrawer && (
                  <div className="demo-drawer-content">
                    <p className="demo-hint-text">
                      Pre-seeded test clinician accounts with PBKDF2 hash verification. Click any row to automatically load credentials:
                    </p>
                    <div className="demo-role-grid">
                      <button
                        type="button"
                        className="demo-card-item"
                        onClick={() => handleQuickFill('Doctor', 'dr.mehta@caresense.io', 'DoctorPass2026!')}
                      >
                        <span className="demo-role-name">Doctor</span>
                        <span className="demo-email">dr.mehta@caresense.io</span>
                        <span className="demo-access-level">Full Medical Override</span>
                      </button>
                      <button
                        type="button"
                        className="demo-card-item"
                        onClick={() => handleQuickFill('Caregiver', 'nurse.sarah@caresense.io', 'NursePass2026!')}
                      >
                        <span className="demo-role-name">Caregiver / Nurse</span>
                        <span className="demo-email">nurse.sarah@caresense.io</span>
                        <span className="demo-access-level">Ward Patient Triage</span>
                      </button>
                      <button
                        type="button"
                        className="demo-card-item"
                        onClick={() => handleQuickFill('Admin', 'admin@caresense.io', 'AdminPass2026!')}
                      >
                        <span className="demo-role-name">Admin</span>
                        <span className="demo-email">admin@caresense.io</span>
                        <span className="demo-access-level">Hardware & Node Config</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Sign Up View */
            <div className="signup-flow-panel">
              <div className="auth-card-intro">
                <h2>Clinical Personnel Registration</h2>
                <p>Submit your verified hospital staff details to request telemetry node access.</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form-body">
                <div className="form-input-group">
                  <label htmlFor="signupName">Full Legal Name</label>
                  <input
                    id="signupName"
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Mehta"
                    required
                  />
                </div>

                <div className="form-input-group">
                  <label htmlFor="signupEmail">Hospital Institutional Email</label>
                  <div className="input-with-leading-icon">
                    <IconMail size={16} className="leading-icon" />
                    <input
                      id="signupEmail"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@hospital.org"
                      required
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label htmlFor="signupRole">Requested Clinical Role</label>
                  <select
                    id="signupRole"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="styled-select"
                  >
                    <option value="Doctor">Doctor (Attending Physician)</option>
                    <option value="Caregiver">Caregiver / Registered Nurse</option>
                    <option value="Admin">Clinical Biomedical Engineer / Admin</option>
                  </select>
                </div>

                <div className="form-input-group">
                  <label htmlFor="signupPassword">Password</label>
                  <div className="input-with-leading-icon">
                    <IconLock size={16} className="leading-icon" />
                    <input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create secure clinical passphrase"
                      required
                    />
                    <button
                      type="button"
                      className="password-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                  {/* Strength Meter */}
                  <div className="strength-meter-bar">
                    <div
                      className={`strength-fill strength-${strength >= 75 ? 'strong' : strength >= 50 ? 'medium' : 'weak'}`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                  <span className="strength-label">
                    {strength >= 75 ? 'Strong passphrase' : strength >= 50 ? 'Moderate strength' : 'Minimum 8 characters with letters, numbers, and symbols'}
                  </span>
                </div>

                {errorMsg && (
                  <div className="auth-error-banner" role="alert">
                    <IconAlertTriangle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Registering Request…' : 'Submit Clinical Access Request'}
                </button>
              </form>
            </div>
          )}

          {/* Footer System Status */}
          <div className="auth-card-footer">
            <div className="system-status-indicator">
              <span className="status-ping-dot" />
              <span>Telemetry Cloud Gateway: Operational (Django v5.2a1 / Port 8000)</span>
            </div>
            <span className="auth-version-text">CareSense IoE Clinical v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

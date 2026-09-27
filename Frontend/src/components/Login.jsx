import { useState } from 'react';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('Doctor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin({
        email: email || (role === 'Doctor' ? 'dr.mehta@caresense.io' : `${role.toLowerCase()}@caresense.io`),
        name: role === 'Doctor' ? 'Dr. Mehta' : (role === 'Caregiver' ? 'Nurse Sarah' : 'System Admin'),
        role: role,
      });
      setLoading(false);
    }, 300);
  };

  return (
    <div className="login-container">
      {/* Left Hero Panel (Matches Fig. 7.1) */}
      <div className="login-hero">
        <div className="login-hero-content">
          <div className="medical-cross-icon" aria-hidden="true">+</div>
          <h1 className="login-brand-title">CareSense IoE</h1>
          <p className="login-brand-subtitle">Remote Patient Monitoring</p>
          <p className="login-brand-quote">&ldquo;Continuous care, beyond hospital walls.&rdquo;</p>
        </div>
      </div>

      {/* Right Login Form (Matches Fig. 7.1) */}
      <div className="login-form-panel">
        <div className="login-card">
          <h2>Sign in to your account</h2>
          
          <div className="role-selector" role="tablist" aria-label="Select role">
            {['Doctor', 'Caregiver', 'Admin'].map((r) => (
              <button
                key={r}
                type="button"
                className={`role-tab ${role === r ? 'active' : ''}`}
                onClick={() => setRole(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email / Patient ID</label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'Doctor' ? 'dr.mehta@caresense.io' : 'user@caresense.io'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'LOGGING IN…' : 'LOG IN'}
            </button>
          </form>

          <div className="login-card-footer">
            <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            <span className="footer-meta">Role-based access · OTP for SOS override</span>
          </div>
        </div>
      </div>
    </div>
  );
}

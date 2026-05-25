import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Target, Zap, ShieldCheck, BarChart3 } from 'lucide-react';

const DEMO_CREDENTIALS = [
  { role: 'Employee', email: 'employee@atomquest.com', password: 'Employee@123', color: '#10b981' },
  { role: 'Manager', email: 'manager@atomquest.com', password: 'Manager@123', color: '#6366f1' },
  { role: 'Admin', email: 'admin@atomquest.com', password: 'Admin@123', color: '#f59e0b' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await axios.post('/api/auth/seed');
      toast.success('Demo data seeded! Use the quick login buttons below.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const quickLogin = (cred) => { setEmail(cred.email); setPassword(cred.password); };

  return (
    <div className="login-shell">
      {/* Left Panel */}
      <div className="login-hero">
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white' }}>A</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>AtomQuest</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Goal Setting & Tracking Portal</div>
            </div>
          </div>

          <h1 style={{ fontSize: 38, fontWeight: 800, color: 'white', lineHeight: 1.2, letterSpacing: '-1px', marginBottom: 16 }}>
            Drive performance.<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Track goals.</span><br />
            Win together.
          </h1>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 40 }}>
            A unified platform for goal setting, quarterly check-ins, and performance visibility across your organization.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: Target, label: 'SMART Goal Creation', desc: 'Structured goal sheets with UoM-based targets' },
              { icon: BarChart3, label: 'Real-time Tracking', desc: 'Quarterly progress with computed achievement scores' },
              { icon: ShieldCheck, label: 'Approval Workflows', desc: 'Manager review with full audit trail' },
              { icon: Zap, label: 'AI-powered Insights', desc: 'Goal quality analysis and coaching recommendations' }
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#818cf8" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-panel">
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-2)', marginTop: 6, fontSize: 14 }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div className="divider" />

          {/* Quick Login */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Demo Quick Login</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_CREDENTIALS.map(cred => (
                <button key={cred.role} onClick={() => quickLogin(cred)} className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cred.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{cred.role}</span>
                  <span style={{ color: 'var(--text-2)', fontSize: 12 }}>— {cred.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>First time? Seed demo data to get started</p>
            <button onClick={handleSeed} disabled={seeding} className="btn btn-secondary btn-sm">
              {seeding ? '⏳ Seeding...' : '🌱 Seed Demo Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { getMyGoals } from '../../services/api';


const QUARTER_WINDOWS = {
  q1: { months: [7, 8, 9], label: 'Q1 (Apr–Jun)' },
  q2: { months: [10, 11, 12], label: 'Q2 (Jul–Sep)' },
  q3: { months: [1, 2, 3], label: 'Q3 (Oct–Dec)' },
  q4: { months: [4, 5, 6], label: 'Q4 Annual' }
};

function getCurrentQuarter() {
  const month = new Date().getMonth() + 1;
  for (const [q, config] of Object.entries(QUARTER_WINDOWS)) {
    if (config.months.includes(month)) return q;
  }
  return 'q1';
}

function ScoreCircle({ score, size = 80 }) {
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#06b6d4' : score >= 50 ? '#f59e0b' : '#ef4444';
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: size / 4, fontWeight: 800, color }}>{score}%</span>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentQuarter = getCurrentQuarter();

  useEffect(() => {
    getMyGoals().then(({ data }) => setSheet(data.sheet)).finally(() => setLoading(false));
  }, []);

  const STATUS_CONFIG = {
    draft: { label: 'Draft', color: 'badge-draft', icon: '✏️' },
    submitted: { label: 'Submitted', color: 'badge-submitted', icon: '📤' },
    under_review: { label: 'Under Review', color: 'badge-submitted', icon: '👀' },
    approved: { label: 'Approved', color: 'badge-approved', icon: '✅' },
    rework_requested: { label: 'Rework Needed', color: 'badge-rework', icon: '🔄' }
  };

  const statusInfo = sheet ? (STATUS_CONFIG[sheet.status] || {}) : {};
  const currentScore = sheet?.overallScores?.[currentQuarter] || 0;
  const goalsCount = sheet?.goals?.length || 0;
  const totalWeightage = sheet?.goals?.reduce((s, g) => s + g.weightage, 0) || 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 4 }}>Here's your performance overview for {new Date().getFullYear()}</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Status Banner */}
          {sheet && (
            <div className="status-banner" style={{ background: sheet.status === 'approved' ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : sheet.status === 'rework_requested' ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}>
              <div className="status-banner-content">
                <span style={{ fontSize: 24 }}>{statusInfo.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Goal Sheet Status: {statusInfo.label}</div>
                  {sheet.status === 'rework_requested' && sheet.managerComment && (
                    <div style={{ fontSize: 13, marginTop: 4, color: '#92400e' }}>Manager feedback: "{sheet.managerComment}"</div>
                  )}
                  {sheet.status === 'approved' && (
                    <div style={{ fontSize: 13, color: '#065f46', marginTop: 4 }}>Your goals are locked and tracking is active</div>
                  )}
                </div>
              </div>
              <Link to="/employee/goals" className="btn btn-secondary btn-sm">
                View Goals <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Target size={20} color="var(--primary)" />
              </div>
              <div className="stat-value">{goalsCount}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>/8</span></div>
              <div className="stat-label">Goals Defined</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: totalWeightage === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                <CheckCircle size={20} color={totalWeightage === 100 ? 'var(--success)' : 'var(--danger)'} />
              </div>
              <div className={`stat-value ${totalWeightage === 100 ? 'text-success' : 'text-danger'}`}>{totalWeightage}%</div>
              <div className="stat-label">Total Weightage {totalWeightage !== 100 && '⚠️'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.1)' }}>
                <TrendingUp size={20} color="var(--secondary)" />
              </div>
              <div className="stat-value">{currentScore}%</div>
              <div className="stat-label">{currentQuarter.toUpperCase()} Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Clock size={20} color="var(--warning)" />
              </div>
              <div className="stat-value">{sheet?.checkins?.length || 0}</div>
              <div className="stat-label">Check-ins Done</div>
            </div>
          </div>

          {/* Quarter Scores */}
          {sheet?.status === 'approved' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>Quarterly Performance</h3>
                <span className="badge badge-primary">FY {new Date().getFullYear()}</span>
              </div>
              <div className="card-body">
                <div className="quarter-score-grid">
                  {['q1', 'q2', 'q3', 'q4'].map(q => (
                    <div key={q} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <ScoreCircle score={sheet.overallScores?.[q] || 0} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{q.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                          {sheet.checkins?.find(c => c.quarter === q) ? '✅ Checked-in' : '⏳ Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {(!sheet || ['draft', 'rework_requested'].includes(sheet?.status)) && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                  {!sheet ? 'Start Your Goal Sheet' : 'Revise and Resubmit'}
                </h3>
                <p style={{ color: 'var(--text-2)', marginBottom: 20, fontSize: 14 }}>
                  {!sheet ? 'Define up to 8 goals with clear targets and submit for manager approval.' : 'Your manager has requested changes. Review feedback and update your goals.'}
                </p>
                <Link to="/employee/goals" className="btn btn-primary btn-lg">
                  {!sheet ? 'Create Goals' : 'Update Goals'} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
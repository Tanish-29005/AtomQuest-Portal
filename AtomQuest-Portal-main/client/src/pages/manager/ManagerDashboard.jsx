import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeamGoals, getTeamCheckinStatus, getCompletionReport } from '../../services/api';
import { Users, CheckCircle, Clock, AlertTriangle, ArrowRight, TrendingUp, BarChart2 } from 'lucide-react';

const STATUS_CONFIG = {
  draft:            { label: 'Draft',            color: '#94a3b8', bg: '#f1f5f9' },
  submitted:        { label: 'Submitted',         color: '#1d4ed8', bg: '#dbeafe' },
  under_review:     { label: 'Under Review',      color: '#1d4ed8', bg: '#dbeafe' },
  approved:         { label: 'Approved',          color: '#065f46', bg: '#d1fae5' },
  rework_requested: { label: 'Needs Rework',      color: '#92400e', bg: '#fef3c7' },
};

function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={20} color={color} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 90 ? 'var(--success)' : score >= 70 ? 'var(--secondary)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${Math.min(score, 100)}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{score}%</span>
    </div>
  );
}

export default function ManagerDashboard() {
  const [sheets, setSheets] = useState([]);
  const [checkinStatus, setCheckinStatus] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTeamGoals(),
      getTeamCheckinStatus(),
      getCompletionReport(),
    ]).then(([s, c, r]) => {
      setSheets(s.data.sheets || []);
      setCheckinStatus(c.data.statuses || []);
      setReport(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const pending   = sheets.filter(s => ['submitted','under_review'].includes(s.status));
  const approved  = sheets.filter(s => s.status === 'approved');
  const rework    = sheets.filter(s => s.status === 'rework_requested');
  const total     = sheets.length;

  const currentQ  = (() => {
    const m = new Date().getMonth() + 1;
    if (m >= 7  && m <= 9)  return 'q1';
    if (m >= 10 && m <= 12) return 'q2';
    if (m >= 1  && m <= 3)  return 'q3';
    return 'q4';
  })();

  const checkinsDone = checkinStatus.filter(s => s.checkinStatus?.[currentQ]?.completed).length;
  const avgScore = approved.length
    ? Math.round(approved.reduce((acc, s) => acc + (s.overallScores?.[currentQ] || 0), 0) / approved.length)
    : 0;

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding: 80 }}><div className="spinner"/></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Manager Dashboard</h1>
        <p style={{ color:'var(--text-2)', marginTop: 4 }}>Team performance overview · {new Date().getFullYear()} cycle</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={Users}        label="Team Members"      value={total}           color="var(--primary)"   bg="rgba(99,102,241,.1)"  />
        <StatCard icon={AlertTriangle} label="Pending Approval" value={pending.length}  color="var(--warning)"   bg="rgba(245,158,11,.1)"  sub={pending.length ? 'Action needed' : 'All clear'} />
        <StatCard icon={CheckCircle}  label="Approved Goals"    value={approved.length} color="var(--success)"   bg="rgba(16,185,129,.1)"  />
        <StatCard icon={TrendingUp}   label={`${currentQ.toUpperCase()} Avg Score`} value={`${avgScore}%`} color="var(--secondary)" bg="rgba(6,182,212,.1)" />
        <StatCard icon={BarChart2}    label={`${currentQ.toUpperCase()} Check-ins`} value={`${checkinsDone}/${approved.length}`} color="var(--primary)" bg="rgba(99,102,241,.1)" />
      </div>

      <div className="manager-dashboard-grid">
        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontWeight:700, fontSize:15 }}>Pending Approvals</h3>
              <p style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>Goal sheets awaiting your review</p>
            </div>
            <Link to="/manager/team" className="btn btn-secondary btn-sm">View All <ArrowRight size={13}/></Link>
          </div>
          {pending.length === 0 ? (
            <div className="card-body" style={{ textAlign:'center', color:'var(--text-2)', padding:40 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
              <div style={{ fontWeight:600 }}>All caught up!</div>
              <div style={{ fontSize:13, marginTop:4 }}>No pending approvals</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Goals</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(s => (
                    <tr key={s._id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{s.employee?.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-2)' }}>{s.employee?.department}</div>
                      </td>
                      <td><span style={{ fontWeight:600 }}>{s.goals?.length || 0}</span> goals</td>
                      <td style={{ fontSize:12, color:'var(--text-2)' }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <Link to={`/manager/goals/${s._id}`} className="btn btn-primary btn-sm">Review</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Team Status Summary */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Goal Sheet Status</h3></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = sheets.filter(s => s.status === key).length;
                if (!count && key !== 'approved') return null;
                return (
                  <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, display:'inline-block' }}/>
                      <span style={{ fontSize:13 }}>{cfg.label}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, background:cfg.bg, color:cfg.color, padding:'2px 10px', borderRadius:100 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>{currentQ.toUpperCase()} Check-ins</h3></div>
            <div className="card-body">
              <div style={{ fontSize:32, fontWeight:800, color:'var(--primary)', marginBottom:4 }}>
                {approved.length ? Math.round((checkinsDone / approved.length) * 100) : 0}%
              </div>
              <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:10 }}>completion rate</div>
              <div className="progress-bar" style={{ height:10 }}>
                <div className="progress-fill score-excellent"
                  style={{ width: approved.length ? `${(checkinsDone / approved.length) * 100}%` : '0%' }}/>
              </div>
              <div style={{ fontSize:12, color:'var(--text-2)', marginTop:8 }}>{checkinsDone} of {approved.length} check-ins done</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Scores Table */}
      {approved.length > 0 && (
        <div className="card" style={{ marginTop:20 }}>
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Team Performance Scores</h3>
            <span className="badge badge-primary">Approved Goals Only</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th>
                  <th>Check-in</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {approved.map(s => {
                  const ci = checkinStatus.find(c => c.employee?._id === s.employee?._id);
                  return (
                    <tr key={s._id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{s.employee?.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-2)' }}>{s.employee?.employeeId}</div>
                      </td>
                      {['q1','q2','q3','q4'].map(q => (
                        <td key={q} style={{ minWidth:80 }}>
                          <ScoreBar score={s.overallScores?.[q] || 0}/>
                        </td>
                      ))}
                      <td>
                        {ci?.checkinStatus?.[currentQ]?.completed
                          ? <span className="badge badge-success">✓ Done</span>
                          : <span className="badge badge-warning">Pending</span>}
                      </td>
                      <td>
                        <Link to={`/manager/goals/${s._id}`} className="btn btn-secondary btn-sm">Open</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

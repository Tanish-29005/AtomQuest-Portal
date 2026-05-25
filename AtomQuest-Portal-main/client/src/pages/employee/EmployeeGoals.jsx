import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyGoals, saveGoals, submitGoals, updateAchievement, analyzeGoal, suggestGoals } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Sparkles, Send, Lock, ChevronDown, ChevronUp, Info, Save } from 'lucide-react';

const THRUST_AREAS = ['Revenue Growth', 'Customer Excellence', 'Operational Efficiency', 'People & Culture', 'Innovation', 'Compliance & Risk'];
const UOM_TYPES = [
  { value: 'min', label: 'Min (Higher is Better)', example: 'e.g., Revenue, NPS score' },
  { value: 'max', label: 'Max (Lower is Better)', example: 'e.g., TAT, Cost, Defects' },
  { value: 'timeline', label: 'Timeline (Date-based)', example: 'e.g., Project completion' },
  { value: 'zero', label: 'Zero-based (0 = Success)', example: 'e.g., Safety incidents' }
];
const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
const QUARTER_LABELS = { q1: 'Q1 Apr–Jun', q2: 'Q2 Jul–Sep', q3: 'Q3 Oct–Dec', q4: 'Q4 Annual' };
const STATUS_OPTIONS = ['not_started', 'on_track', 'at_risk', 'completed'];
const STATUS_COLORS = { not_started: '#94a3b8', on_track: '#10b981', at_risk: '#f59e0b', completed: '#6366f1' };

function GoalForm({ goal, index, onChange, onDelete, locked, onAnalyze }) {
  const [expanded, setExpanded] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    if (!goal.title) return toast.error('Add a goal title first');
    setAnalyzing(true);
    try {
      const { data } = await analyzeGoal(goal);
      setAnalysis(data.analysis);
    } catch { toast.error('AI analysis failed'); }
    finally { setAnalyzing(false); }
  };

  const update = (field, value) => onChange(index, { ...goal, [field]: value });

  return (
    <div className={`goal-card ${goal.isShared ? 'shared' : ''}`} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{index + 1}</div>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {goal.title || <span style={{ color: 'var(--text-3)' }}>Untitled Goal</span>}
        </div>
        {goal.isShared && <span className="badge badge-primary" style={{ fontSize: 11 }}>🔗 Shared</span>}
        <span style={{ fontWeight: 700, fontSize: 14, color: goal.weightage >= 10 ? 'var(--primary)' : 'var(--danger)' }}>{goal.weightage || 0}%</span>
        {!locked && !goal.isReadOnly && <button onClick={() => onDelete(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, borderRadius: 6 }} title="Remove goal"><Trash2 size={15} /></button>}
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Thrust Area *</label>
              <select className="form-control" value={goal.thrustArea || ''} onChange={e => update('thrustArea', e.target.value)} disabled={locked || goal.isReadOnly}>
                <option value="">Select thrust area</option>
                {THRUST_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Goal Title *</label>
              <input className="form-control" value={goal.title || ''} onChange={e => update('title', e.target.value)} placeholder="e.g., Increase quarterly revenue by 20%" disabled={locked || goal.isReadOnly} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={goal.description || ''} onChange={e => update('description', e.target.value)} placeholder="Provide context and success criteria..." rows={2} disabled={locked || goal.isReadOnly} />
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">
                UoM Type *
                <span className="ai-badge" style={{ marginLeft: 8, cursor: 'help' }} title="Unit of Measurement defines how achievement is scored">✦ Scoring</span>
              </label>
              <select className="form-control" value={goal.uomType || ''} onChange={e => update('uomType', e.target.value)} disabled={locked || goal.isReadOnly}>
                <option value="">Select UoM type</option>
                {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              {goal.uomType && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{UOM_TYPES.find(u => u.value === goal.uomType)?.example}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Target *</label>
              <input
                className="form-control"
                type={goal.uomType === 'timeline' ? 'date' : 'number'}
                value={goal.target || ''}
                onChange={e => update('target', e.target.value)}
                placeholder={goal.uomType === 'timeline' ? '' : goal.uomType === 'zero' ? '0' : 'Enter target value'}
                disabled={locked || goal.isReadOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weightage (%) * <span style={{ color: 'var(--text-3)', fontSize: 11 }}>min 10%</span></label>
              <input
                className={`form-control ${goal.weightage < 10 ? 'error' : ''}`}
                type="number" min={10} max={100}
                value={goal.weightage || ''}
                onChange={e => update('weightage', Number(e.target.value))}
                placeholder="e.g., 25"
                disabled={locked}
              />
              {goal.weightage < 10 && <div className="form-error">Minimum 10%</div>}
            </div>
          </div>

          {/* AI Analysis */}
          {!locked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleAnalyze} disabled={analyzing}>
                <Sparkles size={13} color="#818cf8" />
                {analyzing ? 'Analyzing...' : 'AI Quality Check'}
              </button>
              {analysis && (
                <div style={{ flex: 1, padding: '8px 12px', background: analysis.isWellFormed ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)', borderRadius: 8, border: `1px solid ${analysis.isWellFormed ? '#d1fae5' : '#fef3c7'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="ai-badge">✦ AI</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>SMART Score: {analysis.smartScore}/10</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>— {analysis.feedback}</span>
                  </div>
                  {analysis.suggestion && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>💡 {analysis.suggestion}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmployeeGoals() {
  const { user } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeQuarter, setActiveQuarter] = useState('q1');
  const [achievementUpdating, setAchievementUpdating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [achievementInputs, setAchievementInputs] = useState({});

  const totalWeightage = sheet?.goals?.reduce((s, g) => s + (Number(g.weightage) || 0), 0) || 0;
  const locked = sheet?.isLocked;
  const canEdit = !locked && ['draft', 'rework_requested'].includes(sheet?.status);
  const canTrack = sheet?.status === 'approved';

  useEffect(() => {
    loadSheet();
  }, []);

  const loadSheet = async () => {
    try {
      const { data } = await getMyGoals();
      setSheet(data.sheet);
    } catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  const addGoal = () => {
    if (sheet.goals.length >= 8) return toast.error('Maximum 8 goals allowed');
    const newGoal = { thrustArea: '', title: '', description: '', uomType: 'min', target: '', weightage: 20, isShared: false };
    setSheet(s => ({ ...s, goals: [...s.goals, newGoal] }));
  };

  const updateGoal = (index, updatedGoal) => {
    setSheet(s => { const goals = [...s.goals]; goals[index] = updatedGoal; return { ...s, goals }; });
  };

  const deleteGoal = (index) => {
    setSheet(s => ({ ...s, goals: s.goals.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await saveGoals({ goals: sheet.goals });
      setSheet(data.sheet);
      toast.success('Goals saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (totalWeightage !== 100) return toast.error(`Total weightage must be 100%. Currently ${totalWeightage}%`);
    if (sheet.goals.length === 0) return toast.error('Add at least one goal');
    for (const g of sheet.goals) {
      if (!g.title || !g.thrustArea || !g.uomType || !g.target) return toast.error(`Please fill all required fields for "${g.title || 'untitled goal'}"`);
      if (g.weightage < 10) return toast.error(`Goal "${g.title}" has minimum weightage of 10%`);
    }

    setSubmitting(true);
    try {
      await handleSave();
      const { data } = await submitGoals();
      setSheet(data.sheet);
      toast.success('🎉 Goals submitted for manager approval!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const handleAchievementUpdate = async (goalIndex, actual, status) => {
    setAchievementUpdating(true);
    try {
      const { data } = await updateAchievement(sheet._id, { quarter: activeQuarter, goalIndex, actual, status });
      setSheet(data.sheet);
      toast.success('Achievement updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setAchievementUpdating(false); }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const { data } = await suggestGoals({ department: user.department, designation: user.designation, thrustArea: 'Revenue Growth' });
      if (data.suggestions?.goals?.length > 0) {
        const available = 8 - sheet.goals.length;
        const toAdd = data.suggestions.goals.slice(0, available);
        setSheet(s => ({ ...s, goals: [...s.goals, ...toAdd] }));
        toast.success(`✨ Added ${toAdd.length} AI-suggested goals!`);
      }
    } catch { toast.error('AI suggestions failed'); }
    finally { setSuggesting(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
  if (!sheet) return <div className="card card-body"><p>No goal sheet found. Please contact your manager to be assigned.</p></div>;

  const STATUS_BADGES = {
    draft: <span className="badge badge-draft">✏️ Draft</span>,
    submitted: <span className="badge badge-submitted">📤 Submitted for Approval</span>,
    under_review: <span className="badge badge-submitted">👀 Under Review</span>,
    approved: <span className="badge badge-approved">✅ Approved & Locked</span>,
    rework_requested: <span className="badge badge-rework">🔄 Revision Requested</span>
  };

  return (
    <div>
      {/* Header */}
      <div className="goals-page-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>My Goal Sheet</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {STATUS_BADGES[sheet.status]}
            {locked && <><Lock size={13} color="var(--text-3)" /><span style={{ fontSize: 12, color: 'var(--text-2)' }}>Locked — contact admin to unlock</span></>}
            {sheet.managerComment && <span style={{ fontSize: 13, color: '#92400e', background: '#fef3c7', padding: '3px 10px', borderRadius: 100 }}>💬 "{sheet.managerComment}"</span>}
          </div>
        </div>

        {/* Weightage indicator */}
        <div style={{ textAlign: 'right' }}>
          <div className={`weightage-total ${totalWeightage === 100 ? 'weightage-valid' : totalWeightage > 100 ? 'weightage-invalid' : 'weightage-warning'}`}>
            {totalWeightage}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Total Weightage {totalWeightage === 100 ? '✅' : totalWeightage > 100 ? '❌ Over 100%' : '⚠️ Must equal 100%'}</div>
          <div style={{ marginTop: 6 }}>
            <div className="progress-bar" style={{ width: 160 }}>
              <div className={`progress-fill ${totalWeightage > 100 ? 'score-poor' : totalWeightage === 100 ? 'score-excellent' : 'score-average'}`}
                style={{ width: `${Math.min(totalWeightage, 100)}%` }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sheet.goals.length}/8 goals · Min 10% each</div>
        </div>
      </div>

      {/* Goal Setting Mode */}
      {!canTrack && (
        <div>
          {/* Goals List */}
          <div style={{ marginBottom: 16 }}>
            {sheet.goals.length === 0 ? (
              <div className="empty-state card">
                <div className="empty-state-icon">🎯</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No goals yet</h3>
                <p style={{ fontSize: 14, marginBottom: 20 }}>Add up to 8 goals with a total weightage of exactly 100%</p>
              </div>
            ) : (
              sheet.goals.map((goal, i) => (
                <GoalForm key={i} goal={goal} index={i} onChange={updateGoal} onDelete={deleteGoal} locked={!canEdit} />
              ))
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {sheet.goals.length < 8 && (
                <button className="btn btn-secondary" onClick={addGoal}>
                  <Plus size={15} /> Add Goal
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleSuggest} disabled={suggesting || sheet.goals.length >= 8}>
                <Sparkles size={15} color="#818cf8" />
                {suggesting ? 'Getting suggestions...' : 'AI Suggest Goals'}
              </button>
              <button className="btn btn-secondary" onClick={handleSave} disabled={saving} style={{ marginLeft: 'auto' }}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || totalWeightage !== 100}>
                <Send size={14} /> {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          )}

          {sheet.status === 'submitted' && (
            <div style={{ background: '#dbeafe', borderRadius: 'var(--radius)', padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Info size={18} color="#1d4ed8" />
              <span style={{ fontSize: 14, color: '#1d4ed8' }}>Your goal sheet has been submitted. Waiting for manager approval. You cannot edit until reviewed.</span>
            </div>
          )}
        </div>
      )}

      {/* Achievement Tracking Mode */}
      {canTrack && (
        <div>
          {/* Quarter Tabs */}
          <div className="quarter-tabs" style={{ marginBottom: 20 }}>
            {QUARTERS.map(q => {
              const hasCheckin = sheet.checkins?.some(c => c.quarter === q);
              return (
                <div key={q} className={`quarter-tab ${activeQuarter === q ? 'active' : ''} ${hasCheckin ? 'completed' : ''}`}
                  onClick={() => setActiveQuarter(q)}>
                  {QUARTER_LABELS[q]} {hasCheckin && '✓'}
                </div>
              );
            })}
          </div>

          {/* Overall Score for this quarter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)' }}>{sheet.overallScores?.[activeQuarter] || 0}%</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{activeQuarter.toUpperCase()} Weighted Score</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className={`progress-fill ${sheet.overallScores?.[activeQuarter] >= 90 ? 'score-excellent' : sheet.overallScores?.[activeQuarter] >= 70 ? 'score-good' : 'score-average'}`}
                  style={{ width: `${sheet.overallScores?.[activeQuarter] || 0}%` }} />
              </div>
            </div>
          </div>

          {/* Goals Achievement Table */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>Goal Achievement — {QUARTER_LABELS[activeQuarter]}</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Goal</th>
                    <th>UoM</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Wt%</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.goals.map((goal, i) => {
                   const qData = goal.achievements?.[activeQuarter];

                    const inputKey = `${i}-${activeQuarter}`;

                    const actual =
                      achievementInputs[inputKey]?.actual ??
                      qData?.actual ??
                      '';

                    const status =
                      achievementInputs[inputKey]?.status ??
                      qData?.status ??
                      'not_started';

                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--text-2)' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{goal.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{goal.thrustArea}</div>
                        </td>
                        <td><span className="badge badge-primary" style={{ fontSize: 11 }}>{goal.uomType}</span></td>
                        <td style={{ fontWeight: 600 }}>{goal.target}</td>
                        <td>
                          <input
                            type={goal.uomType === 'timeline' ? 'date' : 'number'}
                            value={actual}
                            onChange={e =>
                              setAchievementInputs(prev => ({
                                ...prev,
                                [inputKey]: {
                                  ...prev[inputKey],
                                  actual: e.target.value
                                }
                              }))
                            }
                            onBlur={() => handleAchievementUpdate(i, actual, status)}
                            style={{ width: 110, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                          />
                        </td>
                        <td>
                          <select value={status} onChange={e =>
                              setAchievementInputs(prev => ({
                                ...prev,
                                [inputKey]: {
                                  ...prev[inputKey],
                                  status: e.target.value
                                }
                              }))
                            }
                            onBlur={() => handleAchievementUpdate(i, actual, status)}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, color: STATUS_COLORS[status], fontWeight: 600, background: 'var(--surface)' }}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: (qData?.score || 0) >= 80 ? 'var(--success)' : (qData?.score || 0) >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                            {qData?.score?.toFixed(0) || 0}%
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{goal.weightage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manager check-in info */}
          {sheet.checkins?.filter(c => c.quarter === activeQuarter).map(checkin => (
            <div key={checkin._id} style={{ marginTop: 12, padding: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid #d1fae5', borderRadius: 'var(--radius)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--success)', marginBottom: 6 }}>✅ Check-in Completed</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>"{checkin.comment}"</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6 }}>— {new Date(checkin.completedAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
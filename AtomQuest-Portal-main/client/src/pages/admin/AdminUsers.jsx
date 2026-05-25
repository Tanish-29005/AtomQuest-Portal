import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, getManagers } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, UserCheck, Filter } from 'lucide-react';

const ROLE_BADGE = {
  employee: <span className="badge badge-draft">Employee</span>,
  manager:  <span className="badge badge-primary">Manager</span>,
  admin:    <span className="badge badge-warning">Admin</span>,
};

const DEPTS = ['Engineering','HR','Finance','Sales','Marketing','Operations','Product','Design'];

const EMPTY_FORM = {
  employeeId:'', name:'', email:'', password:'',
  role:'employee', department:'Engineering', designation:'', managerId:'',
};

function UserModal({ user, managers, onClose, onSave }) {
  const [form, setForm]     = useState(user ? { ...user, managerId: user.manager?._id||user.manager||'' } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.name || !form.email || !form.employeeId) return toast.error('Name, email, and Employee ID are required');
    if (!user && !form.password) return toast.error('Password required for new users');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontWeight:700 }}>{user ? 'Edit User' : 'Create New User'}</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text-2)' }}>×</button>
        </div>
        <div className="modal-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input className="form-control" value={form.employeeId} onChange={e=>f('employeeId',e.target.value)} placeholder="EMP005" disabled={!!user}/>
            </div>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Jane Doe"/>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="jane@company.com"/>
            </div>
            {!user && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-control" type="password" value={form.password} onChange={e=>f('password',e.target.value)} placeholder="Welcome@123"/>
              </div>
            )}
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control" value={form.role} onChange={e=>f('role',e.target.value)}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select className="form-control" value={form.department} onChange={e=>f('department',e.target.value)}>
                {DEPTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="form-control" value={form.designation} onChange={e=>f('designation',e.target.value)} placeholder="Software Engineer"/>
            </div>
          </div>
          {form.role !== 'admin' && (
            <div className="form-group">
              <label className="form-label">Reporting Manager</label>
              <select className="form-control" value={form.managerId} onChange={e=>f('managerId',e.target.value)}>
                <option value="">— Select Manager —</option>
                {managers.map(m=><option key={m._id} value={m._id}>{m.name} ({m.department})</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving}>
            {saving ? 'Saving…' : user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [managers, setManagers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'create' | user object

  useEffect(() => {
    Promise.all([getUsers(), getManagers()])
      .then(([u, m]) => { setUsers(u.data.users||[]); setManagers(m.data.managers||[]); })
      .finally(() => setLoading(false));
  }, []);

  const reload = async () => {
    const { data } = await getUsers();
    setUsers(data.users||[]);
  };

  const handleSave = async (form) => {
    if (modal && modal._id) {
      await updateUser(modal._id, { name:form.name, email:form.email, role:form.role, department:form.department, designation:form.designation, manager:form.managerId||null });
    } else {
      await createUser({ ...form, managerId: form.managerId||null });
    }
    toast.success(modal && modal._id ? 'User updated!' : 'User created!');
    await reload();
  };

  const handleToggle = async (u) => {
    await updateUser(u._id, { isActive: !u.isActive });
    toast.success(u.isActive ? 'User deactivated' : 'User reactivated');
    await reload();
  };

  const filtered = users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.employeeId?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>User Management</h1>
          <p style={{ color:'var(--text-2)', marginTop:4 }}>{users.length} users · {users.filter(u=>u.role==='manager').length} managers</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal('create')}>
          <Plus size={15}/> Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:280 }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
          <input className="form-control" style={{ paddingLeft:32 }} placeholder="Search name, email, ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['all','employee','manager','admin'].map(r=>(
            <button key={r} className={`btn btn-sm ${roleFilter===r?'btn-primary':'btn-secondary'}`} onClick={()=>setRoleFilter(r)}>
              {r.charAt(0).toUpperCase()+r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Department</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar" style={{ width:34, height:34, fontSize:12 }}>
                      {u.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{u.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-2)' }}>{u.employeeId} · {u.email}</div>
                    </div>
                  </div>
                </td>
                <td>{ROLE_BADGE[u.role]}</td>
                <td style={{ fontSize:13 }}>{u.department}</td>
                <td style={{ fontSize:13, color:'var(--text-2)' }}>{u.manager?.name || '—'}</td>
                <td>
                  <span className={`badge ${u.isActive?'badge-success':'badge-danger'}`}>
                    {u.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td style={{ fontSize:12, color:'var(--text-2)' }}>
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={()=>setModal(u)} title="Edit">
                      <Edit2 size={13}/>
                    </button>
                    <button className={`btn btn-sm ${u.isActive?'btn-danger':'btn-success'}`} onClick={()=>handleToggle(u)} title={u.isActive?'Deactivate':'Activate'}>
                      <UserCheck size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding:40 }}>
            <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
            <div style={{ fontWeight:600 }}>No users found</div>
          </div>
        )}
      </div>

      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          managers={managers}
          onClose={()=>setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

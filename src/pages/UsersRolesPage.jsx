import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Check, X, Edit, Shield, Save } from 'lucide-react';
import { apiFetch } from '../services/api';

export function UsersRolesPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleIds: [2],
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleIds: [],
    isActive: true,
  });

  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
    apiFetch('/api/v1/users/roles')
      .then(r => r.json())
      .then(d => d.success && setRoles(d.data));
  }, []);

  const fetchUsers = () => {
    apiFetch('/api/v1/users')
      .then(r => r.json())
      .then(d => d.success && setUsers(d.data));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    apiFetch('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(createFormData),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          alert('User account created successfully!');
          setShowCreateModal(false);
          setCreateFormData({ username: '', email: '', password: '', firstName: '', lastName: '', roleIds: [2] });
          fetchUsers();
        } else {
          alert(`Error: ${d.message}`);
        }
      });
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setEditFormData({
      id: u.id,
      username: u.username || '',
      email: u.email || '',
      password: '',
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      roleIds: u.roles ? u.roles.map(r => r.id) : [],
      isActive: u.is_active !== undefined ? Boolean(u.is_active) : true,
    });
    setShowEditModal(true);
  };

  const handleSaveEditUser = (e) => {
    e.preventDefault();
    setSavingEdit(true);

    apiFetch(`/api/v1/users/${editFormData.id}`, {
      method: 'PUT',
      body: JSON.stringify(editFormData),
    })
      .then(r => r.json())
      .then(d => {
        setSavingEdit(false);
        if (d.success) {
          alert('User credentials updated successfully!');
          setShowEditModal(false);
          setEditingUser(null);
          fetchUsers();
        } else {
          alert(`Error updating credentials: ${d.message}`);
        }
      })
      .catch(err => {
        setSavingEdit(false);
        alert(`Error: ${err.message}`);
      });
  };

  const toggleStatus = (userId, currentActive) => {
    apiFetch(`/api/v1/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !currentActive }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          fetchUsers();
        } else {
          alert(`Error: ${d.message}`);
        }
      });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" /> Users & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-500">Manage user credentials, edit account details, and assign system access roles.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Create User Account
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Assigned Roles</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900">{u.first_name} {u.last_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">@{u.username}</p>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700">{u.email}</td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles && u.roles.map(r => (
                        <span key={r.id} className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[10px]">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5">
                    {u.is_active ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1"><X className="w-3.5 h-3.5" /> Inactive</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Credentials
                      </button>

                      <button
                        onClick={() => toggleStatus(u.id, u.is_active)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${u.is_active ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'}`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Credentials Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditUser} className="bg-white p-6 rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" /> Edit Credentials & User Account
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={editFormData.username}
                  onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (Leave blank to keep unchanged)</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={editFormData.password}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select User Roles</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-slate-200 p-2.5 rounded bg-slate-50">
                  {roles.map(r => {
                    const isChecked = editFormData.roleIds.includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-800">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditFormData({ ...editFormData, roleIds: [...editFormData.roleIds, r.id] });
                            } else {
                              setEditFormData({ ...editFormData, roleIds: editFormData.roleIds.filter(id => id !== r.id) });
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Account Active Status</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {savingEdit ? 'Saving Changes...' : 'Save Credentials'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-2xl w-full max-w-md border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">Create User Account</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={createFormData.username}
                  onChange={e => setCreateFormData({ ...createFormData, username: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.firstName}
                    onChange={e => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.lastName}
                    onChange={e => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={createFormData.password}
                  onChange={e => setCreateFormData({ ...createFormData, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Assign Role *</label>
                <select
                  value={createFormData.roleIds[0]}
                  onChange={e => setCreateFormData({ ...createFormData, roleIds: [Number(e.target.value)] })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-bold"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.description})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                Create User
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

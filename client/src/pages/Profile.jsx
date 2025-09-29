// client/src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  Plus,
  Trash2,
  Save,
  X,
  Shield,
  Users as UsersIcon,
  Lock
} from 'lucide-react';
import API from '../../api/axios';

const Profile = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Users table
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  // Profile data (loaded from backend)
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileData, setProfileData] = useState({
    _id: user?._id || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    role: user?.role || 'Administrator',
    joinDate: user?.createdAt ? new Date(user.createdAt).toISOString().slice(0,10) : '',
    lastLogin: user?.lastLogin || '', // depends on your model
  });

  // New user form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'Staff',
    password: ''
  });

  // Change password form
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // --- Helpers: pick a current user id if prop not provided
  const currentUserId = useMemo(() => {
    if (profileData?._id) return profileData._id;
    // try to pick admin, else first user
    const admin = users.find(u => u.role === 'Administrator');
    return admin?._id || users[0]?._id || null;
  }, [profileData?._id, users]);

  // --- Load users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await API.get('/users'); // supports ?role=&status=&search=
      setUsers(res.data.users || []);
      setUsersError('');
    } catch (e) {
      console.error(e);
      setUsersError(e?.response?.data?.error || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // --- Load profile (if we have an id)
  const fetchProfile = async (id) => {
    if (!id) return;
    try {
      setProfileLoading(true);
      const res = await API.get(`/users/${id}`);
      const u = res.data.user;
      setProfileData({
        _id: u._id,
        username: u.username || '',
        email: u.email || '',
        phone: u.phone || '',
        address: u.address || '',
        role: u.role || 'Staff',
        joinDate: u.createdAt ? new Date(u.createdAt).toISOString().slice(0,10) : '',
        lastLogin: u.lastLogin || '',
      });
      setProfileError('');
    } catch (e) {
      console.error(e);
      setProfileError(e?.response?.data?.error || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Initial load: users first
  useEffect(() => {
    fetchUsers();
  }, []);

  // When users loaded, decide whose profile to show if not provided
  useEffect(() => {
    if (!user?._id && users.length > 0 && !profileData._id) {
      const id = currentUserId;
      if (id) fetchProfile(id);
    } else if (user?._id && !profileData._id) {
      fetchProfile(user._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, user]);

  // --- Save profile
  const handleSaveProfile = async () => {
    if (!currentUserId) {
      alert('No user selected to update');
      return;
    }
    try {
      // Only send editable fields (controller strips role/status for non-admin anyway)
      const payload = {
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
      };
      const res = await API.put(`/users/${currentUserId}`, payload);
      const updated = res.data.user;
      setProfileData((prev) => ({
        ...prev,
        username: updated.username,
        email: updated.email,
        phone: updated.phone || '',
        address: updated.address || '',
        role: updated.role || prev.role,
      }));
      // reflect in users table too
      setUsers((list) => list.map(u => u._id === updated._id ? updated : u));
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Failed to save profile');
    }
  };

  // --- Add user
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const res = await API.post('/users', {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
      });
      const created = res.data.user;
      setUsers((list) => [created, ...list]);
      setNewUser({ username: '', email: '', role: 'Staff', password: '' });
      setShowAddUser(false);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Failed to add user');
    }
  };

  // --- Deactivate (soft-delete)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await API.delete(`/users/${userId}`);
      // server returns updated user; simplest is to re-fetch list, or patch locally:
      setUsers((list) => list.map(u => u._id === userId ? { ...u, status: 'inactive' } : u));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Failed to deactivate user');
    }
  };

  // --- Activate
  const handleActivateUser = async (userId) => {
    try {
      const res = await API.patch(`/users/${userId}/activate`);
      const updated = res.data.user;
      setUsers((list) => list.map(u => u._id === userId ? updated : u));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Failed to activate user');
    }
  };

  // --- Change Password
  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!currentUserId) {
      setPwError('No user selected.');
      return;
    }

    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmNewPassword) {
      setPwError('Please fill in all fields.');
      return;
    }

    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    try {
      setPwLoading(true);
      await API.put('/auth/change-password', {
        userId: currentUserId,
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('Password changed successfully.');
      // Clear fields after success
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      // Close modal after a short delay so user can read the success message
      setTimeout(() => {
        setShowChangePassword(false);
        setPwSuccess('');
      }, 800);
    } catch (e) {
      console.error(e);
      setPwError(e?.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const ProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {profileLoading ? 'Loading…' : (profileData.username || '—')}
              </h3>
              <p className="text-gray-600">{profileData.role}</p>
            </div>
          </div>
          <button
            onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
            disabled={profileLoading}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              isEditing
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } ${profileLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        {profileError && (
          <div className="mb-4 text-red-600 text-sm">{profileError}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                ) : (
                  <span className="text-gray-900">{profileData.username || '—'}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                {isEditing ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                ) : (
                  <span className="text-gray-900">{profileData.email || '—'}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                ) : (
                  <span className="text-gray-900">{profileData.phone || '—'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                {isEditing ? (
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="2"
                  />
                ) : (
                  <span className="text-gray-900">{profileData.address || '—'}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {profileData.role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{profileData.joinDate || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{profileData.lastLogin || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h4>
        <div className="space-y-4">
          <button
            onClick={() => setShowChangePassword(true)}
            disabled={!currentUserId}
            className={`w-full md:w-auto px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
              currentUserId
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
            title={!currentUserId ? 'No user selected' : 'Change Password'}
          >
            <Lock className="w-4 h-4 mr-2" />
            Change Password
          </button>
        </div>
      </div>
    </div>
  );

  const UsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <p className="text-gray-600">Manage system users and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {usersError && <div className="text-red-600 text-sm">{usersError}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersLoading ? (
                <tr>
                  <td className="px-6 py-6 text-gray-500" colSpan={5}>Loading users…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-gray-500" colSpan={5}>No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{u.username}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        u.role === 'Administrator' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.status || 'inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {u.lastLogin || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => (u.status === 'inactive' ? handleActivateUser(u._id) : handleDeleteUser(u._id))}
                          className={`px-3 py-1 rounded transition-colors flex items-center ${
                            u.status === 'inactive'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {u.status === 'inactive' ? (
                            <>Activate</>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Deactivate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & User Management</h1>
        <p className="text-gray-600">Manage your profile and system users</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 mr-2 inline" />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="w-4 h-4 mr-2 inline" />
              User Management
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' ? <ProfileTab /> : <UsersTab />}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
              <button 
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter password"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button 
                onClick={() => {
                  setShowChangePassword(false);
                  setPwError('');
                  setPwSuccess('');
                  setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwError && <div className="mb-4 text-red-600 text-sm">{pwError}</div>}
            {pwSuccess && <div className="mb-4 text-green-600 text-sm">{pwSuccess}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password *</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({...pwForm, currentPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password *</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({...pwForm, newPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password *</label>
                <input
                  type="password"
                  value={pwForm.confirmNewPassword}
                  onChange={(e) => setPwForm({...pwForm, confirmNewPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPwError('');
                  setPwSuccess('');
                  setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                disabled={pwLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  pwLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } flex items-center`}
              >
                <Lock className="w-4 h-4 mr-2" />
                {pwLoading ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

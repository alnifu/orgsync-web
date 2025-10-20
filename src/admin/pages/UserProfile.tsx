import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';
import { ArrowLeft, Edit, Camera, Save, X, Shield } from 'lucide-react';
import ImageCropModal from '../components/ImageCropModal';

export default function AdminUserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    program: '',
    year_level: '',
    student_number: '',
    employee_id: '',
    position: '',
    user_type: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setUser(data);
        setEditForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          department: data.department || '',
          program: data.program || '',
          year_level: data.year_level?.toString() || '',
          student_number: data.student_number || '',
          employee_id: data.employee_id || '',
          position: data.position || '',
          user_type: data.user_type || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      let avatarUrl = user.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        // Always use the same filename for each user to ensure replacement
        const fileName = `${user.id}-avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          department: editForm.department,
          program: editForm.program,
          year_level: editForm.year_level ? parseInt(editForm.year_level) : null,
          student_number: editForm.student_number,
          employee_id: editForm.employee_id,
          position: editForm.position,
          user_type: editForm.user_type,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh user data
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setUser(updatedUser);
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.log("Save error:", err);
      console.log("Edit form data:", editForm);
      if (avatarFile) {
        console.log("Avatar file:", avatarFile.name, avatarFile.size, avatarFile.type);
      }
    } finally {
      setSaving(false); 
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    // set local state so preview updates immediately
    setAvatarFile(croppedFile);
    setShowCropModal(false);
    setCropImageSrc('');

    // If we already have the user loaded, upload immediately and replace the stored avatar
    if (!user) return;

    try {
      const fileExt = (croppedFile.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const fileName = `${user.id}-avatar.${fileExt}`;

      // Upload and replace (upsert)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL and add cache-busting query so browsers/CDN don't serve the stale image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${publicUrl}?v=${Date.now()}`;

      // Persist avatar URL to user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh user data to reflect the new avatar_url
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setUser(updatedUser);
      console.log('User updated with new avatar');

      // Clear local avatarFile because we've already uploaded and updated DB
      setAvatarFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      console.error('Avatar upload error:', err);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setCropImageSrc('');
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />

     <div className="min-h-screen bg-white rounded-lg">
      {/* Header */}
      <div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-full hover:bg-green-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h1 className="text-xl font-semibold text-gray-900">Admin - User Profile</h1>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Profile Header */}
              <div className="px-6 py-8 bg-gradient-to-r from-green-600 to-green-700">
            <div className="flex items-center">
              <div className="relative">
                {isEditing && avatarFile ? (
                  <img
                    src={URL.createObjectURL(avatarFile)}
                    alt="Preview"
                    className="h-24 w-24 rounded-full object-cover border-4 border-white"
                  />
                ) : user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="h-24 w-24 rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-300 border-4 border-white flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-600">
                      {(user.first_name ? user.first_name.charAt(0) : '?')}{(user.last_name ? user.last_name.charAt(0) : '?')}
                    </span>
                  </div>
                )}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50">
                    <Camera className="h-4 w-4 text-gray-600" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="ml-6">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="text-2xl font-bold text-white bg-transparent border-b border-white/30 focus:border-white outline-none"
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="text-2xl font-bold text-white bg-transparent border-b border-white/30 focus:border-white outline-none"
                      placeholder="Last name"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold text-white">
                    {user.first_name} {user.last_name}
                  </h2>
                )}
                <p className="text-green-100">{user.email}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {user.user_type || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        />
                      ) : (
                        user.email
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">User Type</dt>
                    <dd className="text-sm text-gray-900">
                     
                        <span className="capitalize">{user.user_type || 'Not specified'}</span>

                    </dd>
                  </div>

                  {user.user_type === 'student' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Student Number</dt>
                      <dd className="text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.student_number}
                            onChange={(e) => setEditForm(prev => ({ ...prev, student_number: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                        ) : (
                          user.student_number || 'Not provided'
                        )}
                      </dd>
                    </div>
                  )}

                  {user.user_type === 'student' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Year Level</dt>
                      <dd className="text-sm text-gray-900">
                        {isEditing ? (
                          <select
                            value={editForm.year_level}
                            onChange={(e) => setEditForm(prev => ({ ...prev, year_level: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Select year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                            <option value="5">5th Year</option>
                          </select>
                        ) : (
                          user.year_level ? `${user.year_level}th Year` : 'Not specified'
                        )}
                      </dd>
                    </div>
                  )}

                  {user.user_type === 'faculty' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                      <dd className="text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.employee_id}
                            onChange={(e) => setEditForm(prev => ({ ...prev, employee_id: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                        ) : (
                          user.employee_id || 'Not provided'
                        )}
                      </dd>
                    </div>
                  )}

                  {user.user_type === 'faculty' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Position</dt>
                      <dd className="text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.position}
                            onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                        ) : (
                          user.position || 'Not specified'
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Academic Information</h3>
                <dl className="space-y-3">
                  
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Department</dt>
                      <dd className="text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.department}
                            onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                        ) : (
                          user.department || 'Not specified'
                        )}
                      </dd>
                    </div>
                  {user.user_type === 'student' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Program</dt>
                      <dd className="text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.program}
                            onChange={(e) => setEditForm(prev => ({ ...prev, program: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                        ) : (
                          user.program || 'Not specified'
                        )}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Points</dt>
                    <dd className="text-sm text-gray-900">{user.points || 0}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setAvatarFile(null);
                    // Reset form to original values
                    setEditForm({
                      first_name: user.first_name || '',
                      last_name: user.last_name || '',
                      email: user.email || '',
                      department: user.department || '',
                      program: user.program || '',
                      year_level: user.year_level?.toString() || '',
                      student_number: user.student_number || '',
                      employee_id: user.employee_id || '',
                      position: user.position || '',
                      user_type: user.user_type || ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2 inline" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2 inline" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
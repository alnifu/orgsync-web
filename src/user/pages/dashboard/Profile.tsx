import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import type { User } from '../../../types/database.types';
import { ArrowLeft, Edit, Camera, Save, X, Coins } from 'lucide-react';
import ImageCropModal from '../../components/ImageCropModal';

// Mapping of programs to their corresponding department codes
const programToDepartmentMap: Record<string, string> = {
  // CBEAM - College of Business, Economics, Accountancy and Management
  "BS Accountancy": "CBEAM",
  "BS Accounting Information System": "CBEAM",
  "BS Legal Management": "CBEAM",
  "BS Entrepreneurship": "CBEAM",
  "BS Management Technology": "CBEAM",
  "BSBA Financial Management": "CBEAM",
  "BSBA Marketing Management": "CBEAM",
  "Certificate in Entrepreneurship": "CBEAM",

  // CEAS - College of Education, Arts and Sciences
  "Bachelor of Elementary Education": "CEAS",
  "Bachelor of Secondary Education": "CEAS",
  "AB Communication": "CEAS",
  "Bachelor of Multimedia Arts": "CEAS",
  "BS Biology": "CEAS",
  "BS Forensic Science": "CEAS",
  "BS Mathematics": "CEAS",
  "BS Psychology": "CEAS",

  // CIHTM - College of International Hospitality and Tourism Management
  "BS Hospitality Management": "CIHTM",
  "BS Tourism Management": "CIHTM",
  "Certificate in Culinary Arts": "CIHTM",

  // CITE - College of Information Technology and Engineering
  "BS Architecture": "CITE",
  "BS Computer Engineering": "CITE",
  "BS Computer Science": "CITE",
  "BS Electrical Engineering": "CITE",
  "BS Electronics Engineering": "CITE",
  "BS Entertainment and Multimedia Computing": "CITE",
  "BS Industrial Engineering": "CITE",
  "BS Information Technology": "CITE",
  "Associate in Computer Technology": "CITE",

  // CON - College of Nursing
  "BS Nursing": "CON",
};

export default function UserProfile() {
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
  const [coins, setCoins] = useState<number>(0);
  const [badges, setBadges] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [officerPositions, setOfficerPositions] = useState<any[]>([]);

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      console.log('fetchUser called');
      try {
        setLoading(true);
        console.log('Getting current user...');
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.log('Auth error:', authError);
          throw authError;
        }
        if (!authUser) {
          console.log('No authenticated user');
          throw new Error('Not authenticated');
        }
        console.log('Authenticated user id:', authUser.id);
        console.log('Fetching user profile from supabase...');
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.log('Supabase error:', error);
          throw error;
        }
        console.log('User data fetched:', data);
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

        // Fetch initial coins
        const { data: coinData, error: coinError } = await supabase
          .from("game_rooms")
          .select("coins")
          .eq("user_id", authUser.id)
          .single();

        if (coinError) {
          console.error("Error fetching coins:", coinError);
        } else {
          setCoins(coinData?.coins ?? 0);
        }

        // Fetch user badges (joined badges table)
        try {
          const { data: badgeData, error: badgeError } = await supabase
            .from('user_badges')
            .select('earned_at, badges (id, name, description, icon_url, category, required_plays)')
            .eq('user_id', authUser.id)
            .order('earned_at', { ascending: false });

          if (badgeError) {
            console.error('Error fetching user badges:', badgeError);
          } else {
            setBadges(badgeData || []);
            console.log('Badges fetched:', badgeData);
          }
        } catch (innerErr) {
          console.error('Unexpected error fetching badges:', innerErr);
        }

        // Fetch organizations the user is a member of
        const { data: orgData, error: orgError } = await supabase
          .from('org_members')
          .select(`
            joined_at,
            org_id,
            organizations (
              id,
              name,
              abbrev_name,
              department,
              org_type,
              status
            )
          `)
          .eq('user_id', authUser.id)
          .eq('is_active', true);

        if (orgError) {
          console.error("Error fetching organizations:", orgError);
        } else {
          setOrganizations(orgData || []);
        }

        // Fetch officer positions
        const { data: officerData, error: officerError } = await supabase
          .from('org_managers')
          .select(`
            position,
            manager_role,
            assigned_at,
            org_id,
            organizations (
              id,
              name,
              abbrev_name
            )
          `)
          .eq('user_id', authUser.id);

        if (officerError) {
          console.error("Error fetching officer positions:", officerError);
        } else {
          setOfficerPositions(officerData || []);
        }
      } catch (err) {
        console.log('Error in fetchUser:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Realtime subscription for coins
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel("coins-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.coins !== undefined) {
            setCoins(payload.new.coins);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      let avatarUrl = user.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
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
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    setError("Please upload a valid image file (JPG, PNG, or similar).");
    e.target.value = ""; 
    return;
  }

  // limit file size (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    setError("Image file size must be less than 5MB.");
    e.target.value = "";
    return;
  }

  // If valid, continue as before
  const reader = new FileReader();
  reader.onload = () => {
    setCropImageSrc(reader.result as string);
    setShowCropModal(true);
    setError(null); // clear old errors
  };
  reader.readAsDataURL(file);
};

  const handleCropComplete = async (croppedFile: File) => {
    // set local state so preview updates immediately
    setAvatarFile(croppedFile);
    setShowCropModal(false);
    setCropImageSrc('');

    if (!user) return;

    try {
      const fileExt = (croppedFile.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const fileName = `${user.id}-avatar.${fileExt}`;

      // Upload and replace (upsert)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
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
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    console.log('Rendering error UI - error:', error, 'user:', user);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4 text-lg font-medium">{error || 'User not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Group badges by category
  const groupedBadges = badges.reduce((acc: Record<string, any[]>, ub: any) => {
    const cat = ub.badges?.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ub);
    return acc;
  }, {});

  return (
    <>
      {/* Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />

      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Profile Header */}
<div className="relative bg-gradient-to-r from-green-600 to-green-700 px-6 py-12">
  <div className="absolute inset-0 bg-black/10"></div>

  <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
    {/* Avatar */}
    <div className="relative group flex-shrink-0">
      {isEditing && avatarFile ? (
        <img
          src={URL.createObjectURL(avatarFile)}
          alt="Preview"
          className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-2xl ring-4 ring-white/20"
        />
      ) : user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={`${user.first_name} ${user.last_name}`}
          className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-2xl ring-4 ring-white/20"
        />
      ) : (
        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-4 border-white shadow-2xl ring-4 ring-white/20 flex items-center justify-center">
          <span className="text-4xl font-bold text-gray-600">
            {(user.first_name ? user.first_name.charAt(0) : '?')}{(user.last_name ? user.last_name.charAt(0) : '?')}
          </span>
        </div>
      )}

      {isEditing && (
        <label className="absolute bottom-2 right-2 bg-white rounded-full p-3 shadow-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 hover:scale-110 border border-gray-200">
          <Camera className="h-5 w-5 text-gray-600" />
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </label>
      )}
    </div>

    {/* Name & Info */}
    <div className="text-white w-full min-w-0 flex-1 text-center sm:text-left">
      {isEditing ? (
        <div className="flex flex-col sm:flex-row sm:space-x-3 w-full min-w-0 items-center sm:items-start">
          <input
            type="text"
            value={editForm.first_name}
            onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
            className="flex-1 min-w-0 text-3xl font-bold bg-transparent border-b-2 border-white/50 focus:border-white outline-none placeholder-white/70 text-center sm:text-left"
            placeholder="First name"
          />
          <input
            type="text"
            value={editForm.last_name}
            onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
            className="flex-1 min-w-0 text-3xl font-bold bg-transparent border-b-2 border-white/50 focus:border-white outline-none placeholder-white/70 text-center sm:text-left"
            placeholder="Last name"
          />
        </div>
      ) : (
        <h2 className="text-3xl font-bold mb-2 break-words">{user.first_name} {user.last_name}</h2>
      )}

      <p className="text-green-100 text-lg mb-3">{user.email}</p>

      {/* User type + Coins row */}
      <div className="flex justify-center sm:justify-start items-center space-x-3">
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {user.user_type || 'Not specified'}
        </span>
        <div className="flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-200 backdrop-blur-sm border border-orange-400/30">
          <Coins className="w-4 h-4 mr-2 text-yellow-700" />
          <span className="text-yellow-700">{coins} Coins</span>
        </div>
      </div>
    </div>
  </div>
</div>

          {/* Profile Details */}
          <div className="px-8 py-8 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                </div>
                <dl className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                    <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Email</dt>
                    <dd className="text-sm text-gray-900 flex-1">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      ) : (
                        <span className="font-medium">{user.email}</span>
                      )}
                    </dd>
                  </div>

                  {user.user_type === 'student' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                        <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Student Number</dt>
                        <dd className="text-sm text-gray-900 flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.student_number}
                              readOnly
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                          ) : (
                            <span className="font-medium">{user.student_number || 'Not provided'}</span>
                          )}
                        </dd>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                        <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Year Level</dt>
                        <dd className="text-sm text-gray-900 flex-1">
                          {isEditing ? (
                            <select
                              value={editForm.year_level}
                              onChange={(e) => setEditForm(prev => ({ ...prev, year_level: e.target.value }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            >
                              <option value="">Select year</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                              <option value="5">5th Year</option>
                            </select>
                          ) : (
                            <span className="font-medium">{user.year_level ? `${user.year_level}th Year` : 'Not specified'}</span>
                          )}
                        </dd>
                      </div>
                    </>
                  )}

                  {user.user_type === 'faculty' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                        <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Employee ID</dt>
                        <dd className="text-sm text-gray-900 flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.employee_id}
                              readOnly
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                          ) : (
                            <span className="font-medium">{user.employee_id || 'Not provided'}</span>
                          )}
                        </dd>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                        <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Position</dt>
                        <dd className="text-sm text-gray-900 flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.position}
                              onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            />
                          ) : (
                            <span className="font-medium">{user.position || 'Not specified'}</span>
                          )}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {/* Academic Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Academic Information</h3>
                </div>
                <dl className="space-y-4">
                  {user.user_type === 'student' && (
                    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                      <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Department</dt>
                      <dd className="text-sm text-gray-900 flex-1">
                        <span className="font-medium">
                          {user.department ? (
                            user.department === "CBEAM" ? "CBEAM - College of Business, Economics, Accountancy and Management" :
                            user.department === "CEAS" ? "CEAS - College of Education, Arts and Sciences" :
                            user.department === "CIHTM" ? "CIHTM - College of International Hospitality and Tourism Management" :
                            user.department === "CITE" ? "CITE - College of Information Technology and Engineering" :
                            user.department === "CON" ? "CON - College of Nursing" :
                            user.department === "COL" ? "COL - College of Law" :
                            user.department
                          ) : 'Not specified'}
                        </span>
                      </dd>
                    </div>
                  )}

                  {user.user_type === 'faculty' && (
                    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                      <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Department</dt>
                      <dd className="text-sm text-gray-900 flex-1">
                        <span className="font-medium">
                          {user.department ? (
                            user.department === "CBEAM" ? "CBEAM - College of Business, Economics, Accountancy and Management" :
                            user.department === "CEAS" ? "CEAS - College of Education, Arts and Sciences" :
                            user.department === "CIHTM" ? "CIHTM - College of International Hospitality and Tourism Management" :
                            user.department === "CITE" ? "CITE - College of Information Technology and Engineering" :
                            user.department === "CON" ? "CON - College of Nursing" :
                            user.department === "COL" ? "COL - College of Law" :
                            user.department
                          ) : 'Not specified'}
                        </span>
                      </dd>
                    </div>
                  )}

                  {user.user_type === 'student' && (
                    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                      <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Program</dt>
                      <dd className="text-sm text-gray-900 flex-1">
                        <span className="font-medium">
                          {user.program || 'Not specified'}
                        </span>
                      </dd>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                    <dt className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0 mb-1 sm:mb-0">Member Since</dt>
                    <dd className="text-sm text-gray-900 flex-1">
                      <span className="font-medium">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Organization Information */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Membership</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Member Organizations */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h4 className="text-md font-semibold text-gray-900">Member Organizations</h4>
                  </div>

                  {organizations.length > 0 ? (
                    <div className="space-y-3">
                      {organizations.map((membership) => (
                        <div key={membership.org_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-semibold text-blue-600">
                                {membership.organizations?.abbrev_name?.charAt(0) || membership.organizations?.name?.charAt(0) || 'O'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {membership.organizations?.abbrev_name || membership.organizations?.name || 'Unknown Organization'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {membership.organizations?.department && `${membership.organizations.department} • `}
                                {membership.organizations?.org_type}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined {(membership.joined_at || membership.organizations?.created_at) ? new Date(membership.joined_at || membership.organizations?.created_at).toLocaleDateString() : 'Date not available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">Not a member of any organizations</p>
                  )}
                </div>

                {/* Officer Positions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-md font-semibold text-gray-900">Officer Positions</h4>
                  </div>

                  {officerPositions.length > 0 ? (
                    <div className="space-y-3">
                      {officerPositions.map((position, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{position.position} {position.manager_role && `(${position.manager_role})`}</div>
                              <div className="text-xs text-gray-600">
                                {position.organizations?.abbrev_name || position.organizations?.name || 'Unknown Organization'}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Since {position.assigned_at ? new Date(position.assigned_at).toLocaleDateString() : 'Date not available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">No officer positions</p>
                  )}
                </div>
              </div>
            </div>

            {/* BADGES SECTION */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>

              {badges.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <p className="text-gray-600">No badges earned yet. Play some mini games to earn badges!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Render badges grouped by category (participation / unique_quiz etc.) */}
                  {Object.keys(groupedBadges).map((category) => (
                    <div key={category} className="col-span-1">
                      <div className="mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-100">
                          {category === 'participation' ? ' Participation' :
                           category === 'unique_quiz' ? ' Explorer' :
                           category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {groupedBadges[category].map((ub: any) => (
                          <div key={ub.badges?.id || ub.badge_id} className="bg-white rounded-lg border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border border-gray-200">
                              <img
                                src={ub.badges?.icon_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ub.badges?.name || 'Badge')}&background=F0FFF4&color=2F855A&size=128`}
                                alt={ub.badges?.name || 'Badge'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-900">{ub.badges?.name}</h4>
                                <span className="text-xs text-gray-400">{ub.badges?.required_plays ? `${ub.badges.required_plays}` : ''}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{ub.badges?.description}</p>
                              <div className="text-xs text-gray-400 mt-2">Earned on {new Date(ub.earned_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="mt-8 flex justify-end space-x-4">
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
                  className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
                >
                  <Save className="h-4 w-4 mr-2" />
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

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { supabase } from '../../lib/supabase';
import { uploadFile, validateFile } from '../../lib/media';
import type { Organization } from '../../types/database.types';
import { Edit3, Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, FileText, Building } from 'lucide-react';
import toast from 'react-hot-toast';

type EditOrganizationProps = {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
};

export default function EditOrganization({
  isOpen,
  onClose,
  organization
}: EditOrganizationProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: organization.name,
    abbrev_name: organization.abbrev_name,
    email: organization.email,
    description: organization.description || '',
    department: organization.department,
    org_type: organization.org_type,
    date_established: organization.date_established.split('T')[0], // Format date for input
  });

  const [orgPicFile, setOrgPicFile] = useState<File | null>(null);
  const [bannerPicFile, setBannerPicFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation functions
  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = {};

    switch (field) {
      case 'name':
        if (!value.trim()) errors.name = 'Organization name is required';
        else if (value.length < 3) errors.name = 'Name must be at least 3 characters';
        break;
      case 'abbrev_name':
        if (!value.trim()) errors.abbrev_name = 'Abbreviation is required';
        else if (value.length < 2) errors.abbrev_name = 'Abbreviation must be at least 2 characters';
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) errors.email = 'Email is required';
        else if (!emailRegex.test(value)) errors.email = 'Please enter a valid email address';
        break;
      case 'description':
        if (value.length > 500) errors.description = 'Description must be less than 500 characters';
        break;
    }

    setValidationErrors(prev => ({ ...prev, [field]: errors[field] || '' }));
    return !errors[field];
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let orgPicUrl = organization.org_pic;
      let bannerPicUrl = organization.banner_pic;

      // Upload organization picture if selected
      if (orgPicFile) {
        const uploadResult = await uploadFile(orgPicFile, 'org-admin');
        if (uploadResult.success && uploadResult.mediaItem) {
          orgPicUrl = uploadResult.mediaItem.url;
        } else {
          throw new Error(uploadResult.error || 'Failed to upload organization picture');
        }
      }

      // Upload banner picture if selected
      if (bannerPicFile) {
        const uploadResult = await uploadFile(bannerPicFile, 'org-admin');
        if (uploadResult.success && uploadResult.mediaItem) {
          bannerPicUrl = uploadResult.mediaItem.url;
        } else {
          throw new Error(uploadResult.error || 'Failed to upload banner picture');
        }
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          ...formData,
          org_pic: orgPicUrl,
          banner_pic: bannerPicUrl
        })
        .eq('id', organization.id);

      if (error) throw error;
      onClose();
      toast.success('Organization updated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-0 border border-gray-200 bg-white shadow-xl duration-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Edit3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Edit Organization
              </DialogTitle>
              <p className="text-sm text-gray-600">Update organization details and media</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-gray-50 p-1 m-6 mb-0 rounded-lg">
              <TabsTrigger
                value="basic"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <Building className="h-4 w-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>Details</span>
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Media</span>
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <TabsContent value="basic" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter organization name"
                      required
                    />
                    {validationErrors.name && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="abbrev_name" className="block text-sm font-medium text-gray-900">
                      Abbreviation *
                    </label>
                    <input
                      type="text"
                      id="abbrev_name"
                      value={formData.abbrev_name}
                      onChange={(e) => handleFieldChange('abbrev_name', e.target.value)}
                      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.abbrev_name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., ACM, IEEE"
                      required
                    />
                    {validationErrors.abbrev_name && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.abbrev_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="organization@university.edu"
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationErrors.email}</span>
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="department" className="block text-sm font-medium text-gray-900">
                      Department *
                    </label>
                    <select
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value as Organization['department'] })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="CBEAM">CBEAM - College of Business, Economics, Accountancy and Management</option>
                      <option value="CEAS">CEAS - College of Education, Arts and Sciences</option>
                      <option value="CIHTM">CIHTM - College of International Hospitality and Tourism Management</option>
                      <option value="CITE">CITE - College of Information Technology and Engineering</option>
                      <option value="CON">CON - College of Nursing</option>
                      <option value="COL">COL - College of Law</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="org_type" className="block text-sm font-medium text-gray-900">
                      Organization Type *
                    </label>
                    <select
                      id="org_type"
                      value={formData.org_type}
                      onChange={(e) => setFormData({ ...formData, org_type: e.target.value as Organization['org_type'] })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="PROF">Professional Organization</option>
                      <option value="SPIN">Special Interest Group</option>
                      <option value="SCRO">Socio-Civic Organization</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="date_established" className="block text-sm font-medium text-gray-900">
                    Date Established *
                  </label>
                  <input
                    type="date"
                    id="date_established"
                    value={formData.date_established}
                    onChange={(e) => setFormData({ ...formData, date_established: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                      Description
                    </label>
                    <span className="text-xs text-gray-500">{formData.description.length}/500</span>
                  </div>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={4}
                    className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe your organization's mission, goals, and activities..."
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationErrors.description}</span>
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organization Picture Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5 text-gray-600" />
                      <label className="text-sm font-medium text-gray-900">Organization Logo</label>
                    </div>

                    {organization.org_pic && !orgPicFile && (
                      <div className="relative aspect-square max-w-40 mx-auto">
                        <img
                          src={organization.org_pic}
                          alt="Current organization logo"
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-white text-sm font-medium">Current Logo</span>
                        </div>
                      </div>
                    )}

                    <label htmlFor="org_pic" className="cursor-pointer block">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="mt-2">
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                              {orgPicFile ? 'Change logo' : 'Upload new logo'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        id="org_pic"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validation = validateFile(file);
                            if (!validation.valid) {
                              toast.error(validation.error || 'Invalid file');
                              return;
                            }
                            setOrgPicFile(file);
                          }
                        }}
                        className="sr-only"
                      />
                    </label>

                    {orgPicFile && (
                      <div className="space-y-2">
                        <div className="relative aspect-square max-w-40 mx-auto">
                          <img
                            src={URL.createObjectURL(orgPicFile)}
                            alt="New organization logo preview"
                            className="w-full h-full object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">{orgPicFile.name}</span>
                          <button
                            onClick={() => setOrgPicFile(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banner Picture Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5 text-gray-600" />
                      <label className="text-sm font-medium text-gray-900">Banner Image</label>
                    </div>

                    {organization.banner_pic && !bannerPicFile && (
                      <div className="relative">
                        <img
                          src={organization.banner_pic}
                          alt="Current banner"
                          className="w-full h-40 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-white text-sm font-medium">Current Banner</span>
                        </div>
                      </div>
                    )}

                    <label htmlFor="banner_pic" className="cursor-pointer block">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="mt-2">
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                              {bannerPicFile ? 'Change banner' : 'Upload new banner'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        id="banner_pic"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validation = validateFile(file);
                            if (!validation.valid) {
                              toast.error(validation.error || 'Invalid file');
                              return;
                            }
                            setBannerPicFile(file);
                          }
                        }}
                        className="sr-only"
                      />
                    </label>

                    {bannerPicFile && (
                      <div className="space-y-2">
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(bannerPicFile)}
                            alt="New banner preview"
                            className="w-full h-40 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">{bannerPicFile.name}</span>
                          <button
                            onClick={() => setBannerPicFile(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end items-center pt-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

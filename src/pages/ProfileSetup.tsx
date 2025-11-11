import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Camera, Check, ArrowRight, ArrowLeft } from "lucide-react";
import ImageCropModal from "../admin/components/ImageCropModal";
import type { User } from "../types/database.types";
import toast, { Toaster } from "react-hot-toast";

interface ProfileSetupData {
    firstName: string;
    lastName: string;
    department: string;
    // Student fields
    studentNumber?: string;
    yearLevel?: number;
    program?: string;
    // Faculty fields
    employeeId?: string;
    position?: string;
}

export default function ProfileSetup() {
    const { user: authUser } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [profileData, setProfileData] = useState<ProfileSetupData>({
        firstName: "",
        lastName: "",
        department: "",
        studentNumber: "",
        yearLevel: undefined,
        program: "",
        employeeId: "",
        position: "",
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string>("");

    const totalSteps = userProfile?.user_type === "student" ? 3 : 3; // Basic info, academic info, avatar

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

    useEffect(() => {
        if (!authUser) {
            navigate("/login");
            return;
        }

        // Fetch user profile from database
        const fetchUserProfile = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return;
            }

            setUserProfile(data);
            setProfileData({
                firstName: data.first_name || "",
                lastName: data.last_name || "",
                department: data.department || "",
                studentNumber: data.student_number || "",
                yearLevel: data.year_level ? parseInt(data.year_level) : undefined,
                program: data.program || "",
                employeeId: data.employee_id || "",
                position: data.position || "",
            });

            // If user already has completed profile, redirect to dashboard
            // For students: require first_name, last_name, department (auto-set from program, never "NONE")
            // For faculty: require first_name, last_name, department (manually selected, can be "NONE")
            const hasBasicInfo = data.first_name && data.last_name;
            const hasValidDepartment = data.department && data.department.trim() !== '' &&
                (data.user_type === 'faculty' ? true : data.department !== 'NONE');

            if (hasBasicInfo && hasValidDepartment) {
                console.log('Profile complete, redirecting to dashboard:', {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    department: data.department,
                    user_type: data.user_type
                });
                // Add a small delay to prevent rapid redirects
                setTimeout(() => navigate("/dashboard"), 100);
                return;
            } else {
                console.log('Profile incomplete:', {
                    hasBasicInfo,
                    hasValidDepartment,
                    first_name: !!data.first_name,
                    last_name: !!data.last_name,
                    department: data.department,
                    user_type: data.user_type
                });
            }
        };

        fetchUserProfile();
    }, [authUser, navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => {
            const newData = {
                ...prev,
                [name]: name === "yearLevel" ? (value ? parseInt(value) : undefined) : value
            };

            // Auto-set department when program is selected
            if (name === "program" && value) {
                const department = programToDepartmentMap[value];
                if (department) {
                    newData.department = department;
                }
            }

            return newData;
        });
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
        setAvatarFile(croppedFile);
        setShowCropModal(false);
        setCropImageSrc("");
    };

    const handleCropCancel = () => {
        setShowCropModal(false);
        setCropImageSrc("");
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = "";
        }
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return !!(profileData.firstName.trim() && profileData.lastName.trim());
            case 2:
                if (userProfile?.user_type === "student") {
                    return !!(profileData.department && profileData.studentNumber && profileData.yearLevel && profileData.program);
                } else {
                    return !!(profileData.department && profileData.employeeId && profileData.position);
                }
            case 3:
                return true; // Avatar is optional
            default:
                return false;
        }
    };

    const handleNext = () => {
  if (validateStep(currentStep) && currentStep < totalSteps) {
    // Only show confirmation when moving from Step 2 → Step 3
    if (currentStep === 2) {
      const confirmed = window.confirm(
        "Please ensure your information is correct before proceeding.\nOnce submitted, it cannot be changed."
      );
      if (!confirmed) return; // stop if user cancels
    }

    setCurrentStep(currentStep + 1);
  }
};

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        if (!authUser || !userProfile || isSubmitting) return;

        // Validate required fields
        if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
            toast.error("First name and last name are required");
            return;
        }

        if (!profileData.department || (userProfile.user_type === 'student' && profileData.department === 'NONE')) {
            toast.error("Please select a valid department");
            return;
        }

        if (userProfile.user_type === "student") {
            if (!profileData.program || !profileData.studentNumber || !profileData.yearLevel) {
                toast.error("All academic information fields are required for students");
                return;
            }
        } else {
            if (!profileData.employeeId || !profileData.position) {
                toast.error("Employee ID and position are required for faculty");
                return;
            }
        }

        try {
            setIsSubmitting(true);
            setLoading(true);

            let avatarUrl = userProfile.avatar_url;

            // Upload avatar if selected
            if (avatarFile) {
                const fileName = `${authUser.id}-avatar.jpg`;
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
            const updateData: any = {
                first_name: profileData.firstName,
                last_name: profileData.lastName,
                department: profileData.department,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            };

            if (userProfile.user_type === "student") {
                updateData.student_number = profileData.studentNumber;
                updateData.year_level = profileData.yearLevel?.toString();
                updateData.program = profileData.program;
            } else {
                updateData.employee_id = profileData.employeeId;
                updateData.position = profileData.position;
            }

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', authUser.id);

            if (updateError) throw updateError;

            // After updating user profile, check if program has an org_id
            if (userProfile.user_type === "student" && profileData.program) {
            // 1. Find the program row
            const { data: programRow, error: programError } = await supabase
                .from("programs")
                .select("org_id")
                .eq("program", profileData.program)
                .single();

            if (programError) {
                console.error("Error fetching program:", programError);
            } else if (programRow?.org_id) {
                // 2. Check if already a member
                const { data: existingMember } = await supabase
                .from("org_members")
                .select("id")
                .eq("user_id", authUser.id)
                .eq("org_id", programRow.org_id)
                .maybeSingle();

                // 3. Insert if not yet a member
                if (!existingMember) {
                const { error: insertError } = await supabase.from("org_members").insert({
                    user_id: authUser.id,
                    org_id: programRow.org_id,
                    joined_at: new Date().toISOString(),
                    is_active: true,
                });

                if (insertError) {
                    console.error("Error inserting org membership:", insertError);
                }
                }
            }
            }

            // Finally, redirect to dashboard
            console.log('Profile setup completed successfully, redirecting to dashboard');
            navigate("/dashboard");

        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to complete profile setup");
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h3>
                            <p className="text-sm text-gray-600 mb-6">Let's start with your basic details.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={profileData.firstName}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={profileData.lastName}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {userProfile?.user_type === "student" ? "Academic Information" : "Professional Information"}
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                {userProfile?.user_type === "student"
                                    ? "Tell us about your academic background."
                                    : "Tell us about your professional role."
                                }
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
                            <select
                                name="program"
                                value={profileData.program}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                required
                            >
                                <option value="">Select program</option>

                                <optgroup label="College of Business, Economics, Accountancy and Management">
                                    <option value="BS Accountancy">BS Accountancy</option>
                                    <option value="BS Accounting Information System">BS Accounting Information System</option>
                                    <option value="BS Legal Management">BS Legal Management</option>
                                    <option value="BS Entrepreneurship">BS Entrepreneurship</option>
                                    <option value="BS Management Technology">BS Management Technology</option>
                                    <option value="BSBA Financial Management">BSBA Financial Management</option>
                                    <option value="BSBA Marketing Management">BSBA Marketing Management</option>
                                    <option value="Certificate in Entrepreneurship">Certificate in Entrepreneurship</option>
                                </optgroup>

                                <optgroup label="College of Education, Arts and Sciences">
                                    <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
                                    <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                                    <option value="AB Communication">AB Communication</option>
                                    <option value="Bachelor of Multimedia Arts">Bachelor of Multimedia Arts</option>
                                    <option value="BS Biology">BS Biology</option>
                                    <option value="BS Forensic Science">BS Forensic Science</option>
                                    <option value="BS Mathematics">BS Mathematics</option>
                                    <option value="BS Psychology">BS Psychology</option>
                                </optgroup>

                                <optgroup label="College of International Hospitality and Tourism Management">
                                    <option value="BS Hospitality Management">BS Hospitality Management</option>
                                    <option value="BS Tourism Management">BS Tourism Management</option>
                                    <option value="Certificate in Culinary Arts">Certificate in Culinary Arts</option>
                                </optgroup>

                                <optgroup label="College of Information Technology and Engineering">
                                    <option value="BS Architecture">BS Architecture</option>
                                    <option value="BS Computer Engineering">BS Computer Engineering</option>
                                    <option value="BS Computer Science">BS Computer Science</option>
                                    <option value="BS Electrical Engineering">BS Electrical Engineering</option>
                                    <option value="BS Electronics Engineering">BS Electronics Engineering</option>
                                    <option value="BS Entertainment and Multimedia Computing">BS Entertainment and Multimedia Computing</option>
                                    <option value="BS Industrial Engineering">BS Industrial Engineering</option>
                                    <option value="BS Information Technology">BS Information Technology</option>
                                    <option value="Associate in Computer Technology">Associate in Computer Technology</option>
                                </optgroup>

                                <optgroup label="College of Nursing">
                                    <option value="BS Nursing">BS Nursing</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="space-y-4">
                            {userProfile?.user_type === "faculty" ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                    <select
                                        name="department"
                                        value={profileData.department}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                        required
                                    >
                                        <option value="">Select department</option>
                                        <option value="NONE">None - Not associated with a specific department</option>
                                        <option value="CBEAM">CBEAM - College of Business, Economics, Accountancy and Management</option>
                                        <option value="CEAS">CEAS - College of Education, Arts and Sciences</option>
                                        <option value="CIHTM">CIHTM - College of International Hospitality and Tourism Management</option>
                                        <option value="CITE">CITE - College of Information Technology and Engineering</option>
                                        <option value="CON">CON - College of Nursing</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                                        {profileData.department ? (
                                            profileData.department === "NONE" ? "None - Not associated with a specific department" :
                                            profileData.department === "CBEAM" ? "CBEAM - College of Business, Economics, Accountancy and Management" :
                                                profileData.department === "CEAS" ? "CEAS - College of Education, Arts and Sciences" :
                                                    profileData.department === "CIHTM" ? "CIHTM - College of International Hospitality and Tourism Management" :
                                                        profileData.department === "CITE" ? "CITE - College of Information Technology and Engineering" :
                                                            profileData.department === "CON" ? "CON - College of Nursing" :
                                                                profileData.department
                                        ) : "Not specified"}
                                    </div>
                                </div>
                            )}

                            {userProfile?.user_type === "student" ? (
                                <>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Student Number</label>
                                        <input
                                            type="number"
                                            name="studentNumber"
                                            value={profileData.studentNumber ?? ""}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                            required
                                            min={0} 
                                            step={1}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Year Level</label>
                                        <select
                                            name="yearLevel"
                                            value={profileData.yearLevel || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                            required
                                        >
                                            <option value="">Select year</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                            <option value="5">5th Year</option>
                                        </select>
                                    </div>


                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                                        <input
                                            type="text"
                                            name="employeeId"
                                            value={profileData.employeeId}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                                        <input
                                            type="text"
                                            name="position"
                                            value={profileData.position}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Professor, Lecturer"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                            required
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Picture</h3>
                            <p className="text-sm text-gray-600 mb-6">Add a profile picture to personalize your account.</p>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                                {avatarFile ? (
                                    <img
                                        src={URL.createObjectURL(avatarFile)}
                                        alt="Profile preview"
                                        className="w-32 h-32 rounded-full object-cover border-4 border-green-200"
                                    />
                                ) : userProfile?.avatar_url ? (
                                    <img
                                        src={userProfile.avatar_url}
                                        alt="Current avatar"
                                        className="w-32 h-32 rounded-full object-cover border-4 border-green-200"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-green-200 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-gray-500">
                                            {(profileData.firstName?.charAt(0) || "?")}{(profileData.lastName?.charAt(0) || "?")}
                                        </span>
                                    </div>
                                )}

                                <label className="absolute bottom-0 right-0 bg-green-600 rounded-full p-2 cursor-pointer hover:bg-green-700 transition-colors">
                                    <Camera className="w-5 h-5 text-white" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            <p className="text-sm text-gray-500 text-center">
                                Click the camera icon to upload a profile picture.<br />
                                You can crop and adjust it before saving.
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!authUser || !userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <>
            <ImageCropModal
                isOpen={showCropModal}
                imageSrc={cropImageSrc}
                onCropComplete={handleCropComplete}
                onCancel={handleCropCancel}
            />

            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">Complete Your Profile</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Step {currentStep} of {totalSteps}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-8 mb-8">
                        <div className="flex justify-between mb-2">
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${i + 1 <= currentStep
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-200 text-gray-600"
                                        }`}
                                >
                                    {i + 1 <= currentStep ? <Check className="w-4 h-4" /> : i + 1}
                                </div>
                            ))}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        {renderStepContent()}

                        <div className="mt-8 flex justify-between">
                            <button
                                onClick={handlePrevious}
                                disabled={currentStep === 1}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Previous
                            </button>

                            {currentStep < totalSteps ? (
                                <button
                                    onClick={handleNext}
                                    disabled={!validateStep(currentStep)}
                                    className="flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    disabled={loading || isSubmitting}
                                    className="flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading || isSubmitting ? "Completing..." : "Complete Setup"}
                                    <Check className="w-4 h-4 ml-2" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Toaster position="top-center" reverseOrder={false} />
        </>
    );
}
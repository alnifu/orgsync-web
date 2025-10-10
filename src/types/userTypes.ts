export type UserProfile = {
  id: string;
  email: string;
  userType: 'student' | 'faculty';
  firstName: string;
  lastName: string;
  // Student fields
  studentNumber?: string;
  yearLevel?: number;
  program?: string;
  college?: string;
  // Faculty fields
  employeeId?: string;
  department?: string;
  position?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SignupFormData = {
  email: string;
  password: string;
  userType: 'student' | 'faculty';
  firstName: string;
  lastName: string;
  // Student fields
  studentNumber?: string;
  yearLevel?: number;
  program?: string;
  college?: string;
  // Faculty fields
  employeeId?: string;
  department?: string;
  position?: string;
};

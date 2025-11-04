//types/database.types.ts

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  points: number | null;
  preferences: any | null;
  created_at: string;
  updated_at: string;
  student_number: string | null; // student
  program: string | null; // student
  year_level: number | null; // student
  employee_id: string | null; // faculty
  department: string | null; // faculty and student
  position: string | null; // faculty
  user_type: string | null; // e.g., 'student', 'faculty'
  email: string | null;
  college: string | null; // student
  officer_position?: string | null; // officer position in organization
};

export type OrgManager = {
  user_id: string;
  org_id: string;
  manager_role: string; // e.g., 'adviser', 'officer', if they have these roles, they have access to admin dashboard limited to their organization
  position: string | null; // specific position like 'president', 'secretary', etc. (null for advisers)
  assigned_at: string;
  user?: User;
  organization?: Organization;
};

export type OrgMember = {
  user_id: string;
  org_id: string;
  joined_at: string;
  is_active: boolean;
  user?: User;
  organization?: Organization;
};

export type UserRole = {
  user_id: string;
  role: string; // e.g., 'admin', 'member', it denotes whether or not they have access to admin dashboard
  granted_at: string;
  user?: User;
};

export type Organization = {
  id: string;
  org_code: string;
  name: string;
  abbrev_name: string;
  org_pic: string | null;
  banner_pic: string | null;
  email: string;
  description: string | null;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  date_established: string;
  org_type: string;
  created_at: string;
  updated_at: string;
  adviser_id: string | null;
  adviser?: User;
  media?: MediaItem[] | null;
};

export interface Posts {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  content: string;
  tags: any[] | null;
  status: string | null;
  is_pinned: boolean | null;
  created_at: string;
  updated_at: string | null;
  media?: MediaItem[] | null;
  post_type?: PostType;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  visibility?: 'public' | 'private';
  game_route?: string | null;
  post_views?: { user_id: string }[];
}

export type PostType = 'general' | 'event' | 'poll' | 'feedback';

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  filename: string;
  size?: number;
}

export interface PostLikes {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface EventRsvp {
  id: string;
  post_id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PollVote {
  id: string;
  post_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface FormResponse {
  id: string;
  post_id: string;
  user_id: string;
  responses: any;
  submitted_at: string;
}

export interface EventEvaluation {
  id: string;
  post_id: string;
  user_id: string;
  design: number;
  speakers: number;
  facilities: number;
  participation: number;
  overall: number;
  benefits: string;
  problems: string;
  comments: string;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  post_id: string;
  user_id: string;
  first_name: string;
  middle_initial: string;
  last_name: string;
  email: string;
  college: string;
  program: string;
  section: string;
  created_at: string;
}
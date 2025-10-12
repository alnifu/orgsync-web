//types/database.types.ts
export type Member = {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string;
  department: string;
  year: string;
  course: string;
  created_at: string;
  updated_at: string;
};

export type Officer = Member & {
  org_id: string;
  position: string;
  assigned_at: string;
  organization?: Organization;
};

export type Organization = {
  id: string;
  org_code: string;
  name: string;
  abbrev_name: string;
  email: string;
  description: string | null;
  department: 'CITE' | 'CBEAM' | 'COL' | 'CON' | 'CEAS' | 'OTHERS';
  status: 'active' | 'inactive' | 'pending';
  date_established: string;
  org_type: 'Prof' | 'SPIN' | 'Socio-Civic';
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  member_id: string;
  org_id: string;
  position: string;
  joined_at: string;
  // Include related data when needed
  member?: Member;
  organization?: Organization;
};


export type Adviser = Member & {
  org_id: string;
  assigned_at: string;
  organization?: Organization;
};

export interface Posts {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  content: string;
  tags: any[] | null;
  status: string | null;
  view_count: number | null;
  is_pinned: boolean | null;
  created_at: string;
  updated_at: string | null;
  media?: MediaItem[] | null;
  post_type?: PostType;
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
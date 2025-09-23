import { supabase } from './supabase';
import type { Member, Organization, OrganizationMember } from '../types/database.types';

// Members
export const getMembers = async () => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as Member[];
};

export const getMemberById = async (id: string) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Member;
};

export const createMember = async (member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('members')
    .insert([member])
    .select()
    .single();
  
  if (error) throw error;
  return data as Member;
};

// Organizations
export const getOrganizations = async () => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as Organization[];
};

export const getOrganizationById = async (id: string) => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Organization;
};

export const createOrganization = async (org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('organizations')
    .insert([org])
    .select()
    .single();
  
  if (error) throw error;
  return data as Organization;
};

// Organization Members
export const getOrganizationMembers = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      member:members(*),
      organization:organizations(*)
    `)
    .eq('org_id', orgId);
  
  if (error) throw error;
  return data as OrganizationMember[];
};

export const addMemberToOrganization = async (
  memberId: string,
  orgId: string,
  position: string = 'member'
) => {
  const { data, error } = await supabase
    .from('organization_members')
    .insert([
      {
        member_id: memberId,
        org_id: orgId,
        position
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Advisers
export const assignAdviser = async (memberId: string, orgId: string) => {
  const { error } = await supabase
    .rpc('assign_adviser', {
      member_id: memberId,
      organization_id: orgId
    });

  if (error) throw error;
};

export const removeAdviser = async (memberId: string, orgId: string) => {
  const { error } = await supabase
    .rpc('remove_adviser', {
      member_id: memberId,
      organization_id: orgId
    });

  if (error) throw error;
};

export const getOrganizationAdviser = async (orgId: string) => {
  const { data, error } = await supabase
    .from('advisers')
    .select(`
      member_id,
      org_id,
      assigned_at,
      member:members!inner(
        id,
        name,
        avatar_url,
        email,
        department,
        year,
        course,
        created_at,
        updated_at
      )
    `)
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  if (!data) return null;

  return {
    id: data.member.id,
    org_id: data.org_id,
    assigned_at: data.assigned_at,
    name: data.member.name,
    avatar_url: data.member.avatar_url,
    email: data.member.email,
    department: data.member.department,
    year: data.member.year,
    course: data.member.course,
    created_at: data.member.created_at,
    updated_at: data.member.updated_at
  };
};

// Organization Management
export const deleteOrganization = async (orgId: string, orgCode: string) => {
  const { error } = await supabase
    .rpc('delete_organization', {
      organization_id: orgId,
      org_code_input: orgCode
    });

  if (error) throw error;
};

export const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) throw error;
};
  
  if (error) throw error;
  return data as OrganizationMember;
};

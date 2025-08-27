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
  return data as OrganizationMember;
};

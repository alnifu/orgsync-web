import { supabase } from './supabase';

export interface NotificationData {
  user_id: string;
  message: string;
  read?: boolean;
  date_sent?: string;
  post_id?: string;
}

export async function sendNotificationsToOrgMembers(orgId: string, message: string, postId?: string, orgName?: string): Promise<void> {
  try {
    // Fetch all members of the organization
    const { data: members, error: membersError } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId);

    if (membersError) {
      console.error('Error fetching org members:', membersError);
      return;
    }

    if (!members || members.length === 0) {
      console.log('No members found for org:', orgId);
      return;
    }

    // Create notifications for each member
    const notifications: NotificationData[] = members.map(member => ({
      user_id: member.user_id,
      message,
      read: false,
      date_sent: new Date().toISOString(),
      post_id: postId,
    }));

    // Insert notifications
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
    } else {
      console.log(`Sent notifications to ${notifications.length} members`);
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}
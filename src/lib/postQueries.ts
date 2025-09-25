import { supabase } from './supabase';
import type { Database } from '../types/database.types';

export type Tables = Database['public']['Tables'];
export type Posts = Tables['posts']['Row'];
export type FormPosts = Tables['form_posts']['Row'];
export type PollPosts = Tables['poll_posts']['Row'];
export type EventPosts = Tables['event_posts']['Row'];

// Fetch all posts with their type-specific details
export async function fetchPosts() {
  return supabase
    .from('posts')
    .select(`
      *,
      form_posts (
        form_url,
        deadline,
        required_fields
      ),
      poll_posts (
        options,
        multiple_choice,
        end_date,
        results
      ),
      event_posts (
        start_date,
        end_date,
        location,
        max_participants,
        current_participants,
        event_participants (
          user_id
        )
      )
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
}

// Create a new post based on its type
export async function createPost(post: Partial<Posts>) {
  const { data: newPost, error: postError } = await supabase
    .from('posts')
    .insert(post)
    .select()
    .single();

  if (postError || !newPost) {
    return { data: null, error: postError };
  }

  // Handle type-specific data
  switch (post.post_type) {
    case 'Forms': {
      const formData: Partial<FormPosts> = {
        id: newPost.id,
        form_url: post.form_url,
        deadline: post.deadline,
        required_fields: post.required_fields
      };

      const { error } = await supabase
        .from('form_posts')
        .insert(formData);

      if (error) return { data: null, error };
      break;
    }

    case 'Polls': {
      const pollData: Partial<PollPosts> = {
        id: newPost.id,
        options: post.options,
        multiple_choice: post.multiple_choice,
        end_date: post.end_date
      };

      const { error } = await supabase
        .from('poll_posts')
        .insert(pollData);

      if (error) return { data: null, error };
      break;
    }

    case 'Events': {
      const eventData: Partial<EventPosts> = {
        id: newPost.id,
        start_date: post.start_date,
        end_date: post.end_date,
        location: post.location,
        max_participants: post.max_participants
      };

      const { error } = await supabase
        .from('event_posts')
        .insert(eventData);

      if (error) return { data: null, error };
      break;
    }
  }

  return { data: newPost, error: null };
}

// Update an existing post
export async function updatePost(id: string, updates: Partial<Posts>) {
  const { data: updatedPost, error: postError } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (postError || !updatedPost) {
    return { data: null, error: postError };
  }

  // Handle type-specific updates
  switch (updates.post_type) {
    case 'Forms': {
      const { error } = await supabase
        .from('form_posts')
        .update({
          form_url: updates.form_url,
          deadline: updates.deadline,
          required_fields: updates.required_fields
        })
        .eq('id', id);

      if (error) return { data: null, error };
      break;
    }

    case 'Polls': {
      const { error } = await supabase
        .from('poll_posts')
        .update({
          options: updates.options,
          multiple_choice: updates.multiple_choice,
          end_date: updates.end_date
        })
        .eq('id', id);

      if (error) return { data: null, error };
      break;
    }

    case 'Events': {
      const { error } = await supabase
        .from('event_posts')
        .update({
          start_date: updates.start_date,
          end_date: updates.end_date,
          location: updates.location,
          max_participants: updates.max_participants
        })
        .eq('id', id);

      if (error) return { data: null, error };
      break;
    }
  }

  return { data: updatedPost, error: null };
}

// Delete a post and its type-specific data
export async function deletePost(id: string) {
  // The type-specific data will be automatically deleted due to ON DELETE CASCADE
  return supabase
    .from('posts')
    .delete()
    .eq('id', id);
}

// Event-specific functions
export async function joinEvent(eventId: string, userId: string) {
  return supabase
    .from('event_participants')
    .insert({
      event_id: eventId,
      user_id: userId
    });
}

export async function leaveEvent(eventId: string, userId: string) {
  return supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
}

// Poll-specific functions
export async function submitPollResponse(pollId: string, selectedOptions: string[]) {
  const { data: poll, error: fetchError } = await supabase
    .from('poll_posts')
    .select('results')
    .eq('id', pollId)
    .single();

  if (fetchError) return { error: fetchError };

  const currentResults = poll?.results || {};
  selectedOptions.forEach(option => {
    currentResults[option] = (currentResults[option] || 0) + 1;
  });

  return supabase
    .from('poll_posts')
    .update({ results: currentResults })
    .eq('id', pollId);
}

// Form-specific functions
export async function trackFormSubmission(formId: string) {
  // You might want to track form submissions in a separate table
  // For now, we'll just increment a counter in the form_posts table
  return supabase.rpc('increment_form_submissions', { form_id: formId });
}
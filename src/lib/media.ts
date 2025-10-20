import { supabase } from './supabase';
import type { MediaItem } from '../types/database.types';

export interface UploadResult {
  success: boolean;
  mediaItem?: MediaItem;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file before upload
 * Supabase free plan limits: 50MB per file, 500MB total storage
 */
export function validateFile(file: File): ValidationResult {
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }

  if (![...allowedImageTypes, ...allowedVideoTypes].includes(file.type)) {
    return { valid: false, error: 'Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG) are allowed' };
  }

  return { valid: true };
}

/**
 * Upload a single file to Supabase storage
 */
export async function uploadFile(file: File, userId: string): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Generate unique filename with timestamp and user ID
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

    const mediaItem: MediaItem = {
      url: publicUrl,
      type: mediaType,
      filename: file.name,
      size: file.size
    };

    return { success: true, mediaItem };
  } catch (error) {
    return { success: false, error: 'Failed to upload file' };
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[], userId: string): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, userId);
    results.push(result);
  }

  return results;
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from('media')
      .remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete file' };
  }
}

/**
 * Extract file path from Supabase public URL
 */
export function getFilePathFromUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    // Supabase public URLs follow the pattern: https://[project].supabase.co/storage/v1/object/public/media/[path]
    const pathParts = url.pathname.split('/storage/v1/object/public/media/');
    if (pathParts.length === 2) {
      return pathParts[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the first image from organization's media array
 */
export function getOrganizationImage(media: MediaItem[] | null | undefined): string | null {
  if (!media || !Array.isArray(media)) {
    return null;
  }
  
  // Find the first image in the media array
  const imageItem = media.find(item => item.type === 'image');
  return imageItem ? imageItem.url : null;
}
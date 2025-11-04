import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications() {
  useEffect(() => {
    let channel: any = null;
    let swRegistration: ServiceWorkerRegistration | null = null;

    const setupRealtime = async (user: any) => {
      if (!user) {
        // Request permission even without user
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        return;
      }

      // Request permission if not already granted
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Get service worker registration for mobile notifications
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.getRegistration() || null;
        } catch (error) {
          console.warn('Service worker not available:', error);
        }
      }

      channel = supabase
        .channel('global-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              // Use service worker notification on mobile if available
              if (swRegistration && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                swRegistration.showNotification('OrgSync Notification', {
                  body: payload.new.message,
                  icon: '/vite.svg',
                  tag: 'orgsync-notification',
                  data: { post_id: payload.new.post_id }
                });
              } else {
                const notification = new Notification('OrgSync Notification', {
                  body: payload.new.message,
                  icon: '/vite.svg',
                  tag: 'orgsync-notification',
                });
                notification.onclick = () => {
                  if (payload.new.post_id) {
                    window.location.href = `/user/dashboard/posts/${payload.new.post_id}`;
                  }
                  notification.close();
                };
              }
            } catch (error) {
              console.warn('Browser notification not supported on this device:', error);
            }
          }
        })
        .subscribe();
    };

    // Initial setup
    supabase.auth.getUser().then(({ data: { user } }) => {
      setupRealtime(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      setupRealtime(session?.user);
    });

    return () => {
      subscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);
}
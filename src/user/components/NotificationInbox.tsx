import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Check } from 'lucide-react';

interface Notification {
  id: number;
  message: string;
  read: boolean;
  date_sent: string;
  post_id?: string;
}

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-gray-600">Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Fetch notifications and setup service worker
  useEffect(() => {
    fetchNotifications();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => setSwRegistration(reg || null)).catch(console.warn);
    }

    let cleanupFn: (() => void) | undefined;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('user-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      cleanupFn = () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();

    return () => {
      cleanupFn?.();
    };
  }, []);

  // Show browser notifications for unread items
  useEffect(() => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const message = `You have ${unread.length} unread notification${unread.length > 1 ? 's' : ''}`;
        if (swRegistration && 'showNotification' in swRegistration && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          swRegistration.showNotification('OrgSync Notifications', {
            body: message,
            icon: '/vite.svg',
            tag: 'orgsync-notification',
            data: { type: 'inbox' },
          });
        } else {
          new Notification('OrgSync Notifications', {
            body: message,
            icon: '/vite.svg',
            tag: 'orgsync-notification',
          });
        }
      } catch (error) {
        console.warn('Browser notification not supported:', error);
      }
    }
  }, [notifications, swRegistration]);

  async function fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('date_sent', { ascending: false });

      if (error) console.error('Error fetching notifications:', error);
      else setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) console.error('Error marking notification as read:', error);
      else setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (!unreadIds.length) return;

      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      if (error) console.error('Error marking all notifications as read:', error);
      else setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <span className="self-start sm:self-auto bg-red-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full font-medium shadow-sm">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="self-start sm:self-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors shadow-sm text-sm sm:text-base font-medium"
            >
              <Check className="h-4 w-4" />
              <span className="hidden xs:inline">Mark All as Read</span>
              <span className="xs:hidden">Mark Read</span>
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">You'll see notifications here when posts are published in your organizations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  n.read ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-sm ${n.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(n.date_sent).toLocaleString()}</p>
                    {n.post_id && (
                      <a
                        href={`/user/dashboard/posts/${n.post_id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                      >
                        View Post →
                      </a>
                    )}
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full ml-4 mt-2"></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

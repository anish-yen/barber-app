'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import WaitlistView, { type WaitlistStatus } from '@/components/waitlist/WaitlistView';

export default function WaitlistPage() {
  const [status, setStatus] = useState<WaitlistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [guestCount, setGuestCount] = useState<1 | 2>(1);
  const [vipCode, setVipCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/waitlist/status');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to fetch status');
        return;
      }

      // Map API response to WaitlistStatus type (ensuring priority_level is included if available)
      const mappedStatus: WaitlistStatus = {
        ...data,
        entry: data.entry ? {
          id: data.entry.id,
          guest_count: data.entry.guest_count,
          priority_level: data.entry.priority_level ?? 0,
        } : null,
      };
      setStatus(mappedStatus);
      setError(null);
    } catch (err) {
      setError('Failed to fetch waitlist status');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/announcements/unread-count');
      const data = await response.json();

      if (response.ok && data.unread !== undefined) {
        setUnreadCount(data.unread);
      }
    } catch (err) {
      // Silently fail - don't break the page if unread count fails
      console.error('Failed to fetch unread count:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchUnreadCount();

    // Auto refresh status every 20 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchUnreadCount();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const handleLeave = async () => {
    try {
      setError(null);
      setJoining(true); // Use joining state for leave loading
      const response = await fetch('/api/waitlist/leave', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to leave waitlist');
        return;
      }

      // Refresh status after leaving
      await fetchStatus();
    } catch (err) {
      setError('Failed to leave waitlist');
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      setError(null);

      const response = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guest_count: guestCount }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403 && data.error === 'Shop is closed') {
          // Show closure message from API
          setError(`${data.error}. ${data.todayHoursText}${data.nextOpenText ? ` • ${data.nextOpenText}` : ''}`);
        } else {
          setError(data.error || 'Failed to join waitlist');
        }
        // If already on waitlist (409 Conflict), refresh status to show current position
        if (response.status === 409 || response.status === 400) {
          await fetchStatus();
        }
        return;
      }

      // Refresh status after joining
      await fetchStatus();
      setVipCode(''); // Clear VIP code after join (not used but clean state)
    } catch (err) {
      setError('Failed to join waitlist');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-8">
        <div className="max-w-lg w-full space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-14 bg-muted rounded-xl"></div>
            <div className="h-24 bg-muted rounded-xl"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WaitlistView
      status={status}
      guestCount={guestCount}
      setGuestCount={setGuestCount}
      vipCode={vipCode}
      setVipCode={setVipCode}
      onJoin={handleJoin}
      onLeave={handleLeave}
      loading={joining}
      error={error}
      announcementCount={unreadCount}
    />
  );
}

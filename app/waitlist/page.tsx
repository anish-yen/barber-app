'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface WaitlistStatus {
  entry: {
    id: string;
    guest_count: number;
    joined_at: string;
  } | null;
  position: number | null;
  totalEntries: number;
  totalPeople: number;
  peopleAhead: number;
  estimatedWaitLowMinutes: number;
  estimatedWaitHighMinutes: number;
  isOpenNow: boolean;
  todayHoursText: string;
  nextOpenText: string;
}

export default function WaitlistPage() {
  const [status, setStatus] = useState<WaitlistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [guestCount, setGuestCount] = useState<1 | 2>(1);
  const [error, setError] = useState('');
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

      setStatus(data);
      setError('');
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
      setError('');
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
    }
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      setError('');

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
        // If already on waitlist, refresh status
        if (response.status === 400) {
          await fetchStatus();
        }
        return;
      }

      // Refresh status after joining
      await fetchStatus();
    } catch (err) {
      setError('Failed to join waitlist');
    } finally {
      setJoining(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const hasEntry = status?.entry !== null;
  const position = status?.position;
  const totalEntries = status?.totalEntries || 0;
  const totalPeople = status?.totalPeople || 0;
  const peopleAhead = status?.peopleAhead || 0;
  const estimatedWaitLow = status?.estimatedWaitLowMinutes || 0;
  const estimatedWaitHigh = status?.estimatedWaitHighMinutes || 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Waitlist</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/announcements"
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              🔔 Announcements
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Open/Closed Banner */}
        {status && (
          <div className={`mb-4 p-3 rounded ${
            status.isOpenNow
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="font-semibold">
              {status.isOpenNow ? 'Open now' : 'Closed'}
            </div>
            {!status.isOpenNow && (
              <div className="text-sm mt-1">
                {status.todayHoursText}
                {status.nextOpenText && ` • ${status.nextOpenText}`}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {hasEntry ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Your Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Position:</span>
                  <span className="font-bold text-2xl">{position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">People Ahead:</span>
                  <span className="font-semibold">{peopleAhead}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total in Queue:</span>
                  <span className="font-semibold">
                    {totalPeople} {totalPeople === 1 ? 'person' : 'people'} ({totalEntries} {totalEntries === 1 ? 'party' : 'parties'})
                  </span>
                </div>
                {peopleAhead > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Wait:</span>
                    <span className="font-semibold">
                      {estimatedWaitLow}–{estimatedWaitHigh} min
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-semibold">
                    {status?.entry?.guest_count || 1}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLeave}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
            >
              Leave Waitlist
            </button>

            <div className="text-center text-sm text-gray-600">
              Your position will update automatically as customers are served.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Join the Waitlist
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of people (including you)
                  </label>
                  <select
                    value={guestCount}
                    onChange={(e) =>
                      setGuestCount(Number(e.target.value) as 1 | 2)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 person (just me)</option>
                    <option value={2}>2 people (me + 1 friend)</option>
                  </select>
                </div>

                <button
                  onClick={handleJoin}
                  disabled={joining || (status && !status.isOpenNow)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? 'Joining...' : 'Join Waitlist'}
                </button>
              </div>
            </div>

            {totalPeople > 0 && (
              <div className="text-center text-sm text-gray-600">
                {totalPeople} {totalPeople === 1 ? 'person' : 'people'} ({totalEntries} {totalEntries === 1 ? 'party' : 'parties'}) currently
                on the waitlist
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

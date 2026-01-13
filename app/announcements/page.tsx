'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/announcements');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to fetch announcements');
        return;
      }

      setAnnouncements(data.announcements || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/announcements/mark-all-read', {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    markAllRead(); // Mark all as read on first load
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Announcements</h1>
          <Link
            href="/waitlist"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Back to Waitlist
          </Link>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {announcements.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`border rounded-lg p-6 ${
                  !announcement.read
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold">{announcement.title}</h2>
                  {!announcement.read && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      New
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mb-2 whitespace-pre-wrap">
                  {announcement.message}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(announcement.created_at)}
                </p>
              </div>
            ))}
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


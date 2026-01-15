'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface QueueEntry {
  id: string;
  customer_id: string;
  email: string;
  guest_count: number;
  joined_at: string;
}

export default function BarberDashboardPage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/waitlist/queue');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to fetch queue');
        return;
      }

      setEntries(data.entries || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleServeNext = async () => {
    try {
      setServing(true);
      setError('');

      const response = await fetch('/api/waitlist/serve-next', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError('No customers in queue');
          await fetchQueue(); // Refresh queue
          return;
        }
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to serve customer');
        return;
      }

      // Refresh queue after serving
      await fetchQueue();
    } catch (err) {
      setError('Failed to serve customer');
    } finally {
      setServing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Barber Dashboard</h1>
          <div className="flex gap-4 items-center">
            <Link
              href="/barber/schedule"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Schedule
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Queue ({entries.length} {entries.length === 1 ? 'customer' : 'customers'})
          </h2>
          <button
            onClick={handleServeNext}
            disabled={serving || entries.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {serving ? 'Serving...' : 'Serve Next'}
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No customers in the queue</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.guest_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entry.joined_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

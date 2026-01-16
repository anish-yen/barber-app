'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/barber/dashboard-header';
import { StatsRow } from '@/components/barber/stats-row';
import { QueueTable, type QueueEntry } from '@/components/barber/queue-table';

export default function BarberDashboardPage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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

  const handlePromote = async (entryId: string) => {
    try {
      setError('');
      const response = await fetch('/api/waitlist/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_id: entryId,
          priority_level: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to update priority');
        return;
      }

      // Refresh queue after promotion
      await fetchQueue();
    } catch (err) {
      setError('Failed to update priority');
    }
  };

  const handleDemote = async (entryId: string) => {
    try {
      setError('');
      const response = await fetch('/api/waitlist/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_id: entryId,
          priority_level: 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to update priority');
        return;
      }

      // Refresh queue after demotion
      await fetchQueue();
    } catch (err) {
      setError('Failed to update priority');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded-xl shadow-sm"></div>
                </div>
              ))}
            </div>
            <div className="animate-pulse">
              <div className="h-96 bg-muted rounded-xl shadow-sm"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Calculate total people from entries
  const totalPeople = entries.reduce((sum, entry) => sum + entry.guest_count, 0);
  const totalParties = entries.length;

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-900 dark:bg-red-950/50 dark:text-red-100">
            {error}
          </div>
        )}

        <StatsRow
          totalPeople={totalPeople}
          totalParties={totalParties}
          estWaitPerPersonText="~30 min"
        />

        <div className="mt-6">
          <QueueTable
            entries={entries}
            onPromote={handlePromote}
            onDemote={handleDemote}
            onServeNext={handleServeNext}
          />
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface HourRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
}

interface ClosureRow {
  date: string;
  is_closed: boolean;
  reason: string | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BarberSchedulePage() {
  const [hours, setHours] = useState<HourRow[]>([]);
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [closureDate, setClosureDate] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/barber/hours');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to fetch schedule');
        return;
      }

      setHours(data.hours || []);
      setClosures(data.closures || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const getHourForDay = (dayOfWeek: number): HourRow | undefined => {
    return hours.find((h) => h.day_of_week === dayOfWeek);
  };

  const handleSaveHour = async (dayOfWeek: number) => {
    try {
      setSaving(dayOfWeek);
      setError('');

      const hour = getHourForDay(dayOfWeek);
      const isOpen = (document.getElementById(`open-${dayOfWeek}`) as HTMLInputElement)?.checked ?? hour?.is_open ?? false;
      const startTime = (document.getElementById(`start-${dayOfWeek}`) as HTMLInputElement)?.value || '';
      const endTime = (document.getElementById(`end-${dayOfWeek}`) as HTMLInputElement)?.value || '';

      const response = await fetch('/api/barber/hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          start_time: isOpen ? startTime : null,
          end_time: isOpen ? endTime : null,
          is_open: isOpen,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to save hours');
        return;
      }

      await fetchSchedule();
    } catch (err) {
      setError('Failed to save hours');
    } finally {
      setSaving(null);
    }
  };

  const handleAddClosure = async () => {
    try {
      setError('');
      if (!closureDate) {
        setError('Please select a date');
        return;
      }

      const response = await fetch('/api/barber/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: closureDate,
          is_closed: true,
          reason: closureReason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to add closure');
        return;
      }

      setClosureDate('');
      setClosureReason('');
      await fetchSchedule();
    } catch (err) {
      setError('Failed to add closure');
    }
  };

  const handleRemoveClosure = async (date: string) => {
    try {
      setError('');
      const response = await fetch('/api/barber/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          is_closed: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to remove closure');
        return;
      }

      await fetchSchedule();
    } catch (err) {
      setError('Failed to remove closure');
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
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Schedule</h1>
          <div className="flex gap-4 items-center">
            <Link
              href="/barber/dashboard"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Dashboard
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

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Weekly Hours</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Open</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {DAY_NAMES.map((dayName, dayOfWeek) => {
                  const hour = getHourForDay(dayOfWeek);
                  const isOpen = hour?.is_open ?? false;
                  const startTime = hour?.start_time || '09:00';
                  const endTime = hour?.end_time || '17:00';

                  return (
                    <tr key={dayOfWeek}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{dayName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          id={`open-${dayOfWeek}`}
                          defaultChecked={isOpen}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          id={`start-${dayOfWeek}`}
                          defaultValue={startTime}
                          disabled={!isOpen}
                          className="px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          id={`end-${dayOfWeek}`}
                          defaultValue={endTime}
                          disabled={!isOpen}
                          className="px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleSaveHour(dayOfWeek)}
                          disabled={saving === dayOfWeek}
                          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {saving === dayOfWeek ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Closures</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={closureDate}
                  onChange={(e) => setClosureDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g., Holiday"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleAddClosure}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add Closure
              </button>
            </div>
          </div>

          {closures.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {closures.map((closure) => (
                    <tr key={closure.date}>
                      <td className="px-6 py-4 whitespace-nowrap">{closure.date}</td>
                      <td className="px-6 py-4">{closure.reason || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleRemoveClosure(closure.date)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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


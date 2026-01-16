"use client";

import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WaitlistStatus = {
  entry: null | {
    id: string;
    guest_count: number;
    priority_level?: number;
  };
  position: number | null;
  peopleAhead: number;
  totalPeople: number;
  totalEntries: number;
  estimatedWaitLowMinutes: number;
  estimatedWaitHighMinutes: number;

  isOpenNow: boolean;
  todayHoursText: string; // "Open today 9:00 AM – 6:00 PM" or "Closed today"
  nextOpenText: string; // "Opens monday at 9:00 AM" or "Closed"
};

type Props = {
  status: WaitlistStatus | null;

  guestCount: number;
  setGuestCount: (n: number) => void;

  vipCode: string;
  setVipCode: (s: string) => void;

  onJoin: () => void;
  onLeave: () => void;

  loading: boolean;
  error: string | null;

  announcementCount: number;
};

export default function WaitlistView({
  status,
  guestCount,
  setGuestCount,
  vipCode,
  setVipCode,
  onJoin,
  onLeave,
  loading,
  error,
  announcementCount,
}: Props) {
  const isOpen = Boolean(status?.isOpenNow);
  const isOnWaitlist = Boolean(status?.entry);

  const queuePosition = status?.position ?? null;
  const peopleAhead = status?.peopleAhead ?? 0;
  const totalPeople = status?.totalPeople ?? 0;
  const totalEntries = status?.totalEntries ?? 0;
  const estimatedWaitMin = status?.estimatedWaitLowMinutes ?? 0;
  const estimatedWaitMax = status?.estimatedWaitHighMinutes ?? 0;

  const todayHoursText = status?.todayHoursText ?? "";
  const nextOpenText = status?.nextOpenText ?? "";

  const showVipBadge = (status?.entry?.priority_level ?? 0) > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">Daz Barber</span>

          <div className="flex items-center gap-4">
            <a
              href="/announcements"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Announcements
              {announcementCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                  {announcementCount}
                </Badge>
              )}
            </a>

            <a
              href="/api/auth/logout"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-900 dark:bg-red-950/50 dark:text-red-100">
            {error}
          </div>
        )}

        {/* Status Banner */}
        <div
          className={`mb-6 rounded-xl p-4 ${
            isOpen
              ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="font-semibold">{isOpen ? "Open" : "Closed"}</span>
            {showVipBadge && (
              <Badge className="ml-2" variant="secondary">
                VIP
              </Badge>
            )}
          </div>

          <p
            className={`mt-1 text-sm ${
              isOpen ? "text-emerald-700 dark:text-emerald-100" : "text-red-900 dark:text-red-100"
            }`}
          >
            {todayHoursText || (isOpen ? "Open today" : "Closed today")}
            {!isOpen && nextOpenText ? ` • ${nextOpenText}` : null}
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">{isOnWaitlist ? "Your Status" : "Join the Waitlist"}</CardTitle>
            <CardDescription>
              {isOnWaitlist
                ? "Your position will update automatically as customers are served."
                : isOpen
                ? "Select your party size and optionally enter a VIP code."
                : "Waitlist is closed right now."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* If NOT on waitlist -> join UI */}
            {!isOnWaitlist ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Number of people (including you)
                  </label>

                  <Select
                    value={String(guestCount)}
                    onValueChange={(v) => setGuestCount(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 person (just me)</SelectItem>
                      <SelectItem value="2">2 people</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">VIP Code (optional)</label>
                  <Input
                    value={vipCode}
                    onChange={(e) => setVipCode(e.target.value)}
                    placeholder="Enter code"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have a VIP code, enter it exactly (case-sensitive).
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={onJoin}
                  disabled={!isOpen || loading}
                >
                  {loading ? "Joining..." : "Join Waitlist"}
                </Button>

                {!isOpen && (
                  <p className="text-sm text-muted-foreground">
                    {nextOpenText ? nextOpenText : "Please check back later."}
                  </p>
                )}
              </>
            ) : (
              /* If ON waitlist -> status UI */
              <>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/20 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Position</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {queuePosition ? `#${queuePosition}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">People Ahead</p>
                    <p className="mt-1 text-2xl font-semibold">{peopleAhead}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total in Queue</p>
                    <p className="mt-1 text-lg font-semibold">
                      {totalPeople} people ({totalEntries} parties)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Wait</p>
                    <p className="mt-1 text-lg font-semibold">
                      {estimatedWaitMin}-{estimatedWaitMax} min
                    </p>
                  </div>
                </div>

                {showVipBadge && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm">
                    <span className="font-medium">VIP enabled.</span>{" "}
                    <span className="text-muted-foreground">
                      You’ll be served ahead of normal entries.
                    </span>
                  </div>
                )}

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={onLeave}
                  disabled={loading}
                >
                  {loading ? "Leaving..." : "Leave Waitlist"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </a>
        </div>
      </main>
    </div>
  );
}

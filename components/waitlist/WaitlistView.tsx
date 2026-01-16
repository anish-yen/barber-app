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

            <button
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive shadow-sm">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Status Banner */}
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            isOpen
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`h-3 w-3 rounded-full ${
                isOpen ? "bg-emerald-500 animate-pulse shadow-sm" : "bg-red-500 shadow-sm"
              }`}
            />
            <span className="text-base font-semibold">{isOpen ? "Open" : "Closed"}</span>
            {showVipBadge && (
              <Badge 
                variant="secondary" 
                className="ml-2 bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900/50"
              >
                VIP
              </Badge>
            )}
          </div>

          <p
            className={`mt-2 text-sm leading-relaxed ${
              isOpen 
                ? "text-emerald-700 dark:text-emerald-200" 
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {todayHoursText || (isOpen ? "Open today" : "Closed today")}
            {!isOpen && nextOpenText ? ` • ${nextOpenText}` : null}
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl font-semibold">{isOnWaitlist ? "Your Status" : "Join the Waitlist"}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {isOnWaitlist
                ? "Your position will update automatically as customers are served."
                : isOpen
                ? "Select your party size and optionally enter a VIP code."
                : "Waitlist is closed right now."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
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
                    disabled={!isOpen || loading}
                  >
                    <SelectTrigger className="disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Select party size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 person (just me)</SelectItem>
                      <SelectItem value="2">2 people</SelectItem>
                    </SelectContent>
                  </Select>
                  {!isOpen && (
                    <p className="text-xs text-muted-foreground italic mt-1">
                      Party size selection is disabled when the shop is closed.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">VIP Code (optional)</label>
                  <Input
                    value={vipCode}
                    onChange={(e) => setVipCode(e.target.value)}
                    placeholder="Enter code"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={!isOpen || loading}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      If you have a VIP code, enter it exactly (case-sensitive).
                    </p>
                    {!isOpen && (
                      <p className="text-xs text-muted-foreground italic">
                        VIP code input is disabled when the shop is closed.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    className="w-full h-11 text-base font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onJoin}
                    disabled={!isOpen || loading}
                  >
                    {loading ? "Joining..." : "Join Waitlist"}
                  </Button>

                  {!isOpen && (
                    <p className="text-center text-sm text-muted-foreground leading-relaxed">
                      {nextOpenText ? nextOpenText : "Please check back later."}
                    </p>
                  )}
                  {loading && (
                    <p className="text-center text-xs text-muted-foreground italic">
                      Please wait while we add you to the waitlist...
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* If ON waitlist -> status UI */
              <>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-5 shadow-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Position</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {queuePosition ? `#${queuePosition}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">People Ahead</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{peopleAhead}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total in Queue</p>
                    <p className="mt-1.5 text-base font-semibold text-foreground">
                      {totalPeople} {totalPeople === 1 ? 'person' : 'people'} ({totalEntries} {totalEntries === 1 ? 'party' : 'parties'})
                    </p>
                  </div>
                  {peopleAhead > 0 && (
                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estimated Wait</p>
                      <p className="mt-1.5 text-base font-semibold text-foreground">
                        {estimatedWaitMin}–{estimatedWaitMax} min
                      </p>
                    </div>
                  )}
                </div>

                {showVipBadge && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                    <div className="flex items-start gap-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900/50"
                      >
                        VIP
                      </Badge>
                      <div>
                        <span className="font-semibold text-foreground">VIP Priority Enabled</span>
                        <p className="mt-0.5 text-muted-foreground">
                          You'll be served ahead of normal entries.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Button
                    variant="destructive"
                    className="w-full h-11 text-base font-semibold shadow-sm hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onLeave}
                    disabled={loading}
                  >
                    {loading ? "Leaving..." : "Leave Waitlist"}
                  </Button>
                  {loading && (
                    <p className="text-center text-xs text-muted-foreground italic">
                      Removing you from the waitlist...
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="pt-2 text-center">
          <a 
            href="/" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </a>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Scissors, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const handleSignOut = async () => {
    // Use Supabase client to sign out (matches existing app pattern)
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Barber Dashboard
          </h1>
        </div>

        <nav className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/barber/schedule">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}

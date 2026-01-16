"use client";

import { Users, UsersRound, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsRowProps {
  totalPeople: number;
  totalParties: number;
  estWaitPerPersonText?: string; // optional
}

export function StatsRow({
  totalPeople,
  totalParties,
  estWaitPerPersonText = "~8 min",
}: StatsRowProps) {
  const stats = [
    { label: "People Waiting", value: totalPeople, icon: Users },
    { label: "Total Parties", value: totalParties, icon: UsersRound },
    { label: "Est. Wait / Person", value: estWaitPerPersonText, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border bg-card shadow-sm transition-shadow hover:shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-muted p-3 text-muted-foreground shadow-sm">
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

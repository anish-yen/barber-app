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
        <Card key={stat.label} className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-secondary p-3 text-muted-foreground">
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

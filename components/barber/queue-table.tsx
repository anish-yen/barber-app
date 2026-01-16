"use client";

import { ChevronUp, ChevronDown, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface QueueEntry {
  id: string;
  email: string;
  guest_count: number;
  joined_at: string;
  priority_level: number;
  // optional if your API returns it
  position?: number;
}

interface QueueTableProps {
  entries: QueueEntry[];
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onServeNext: () => void;
}

export function QueueTable({
  entries,
  onPromote,
  onDemote,
  onServeNext,
}: QueueTableProps) {
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPosition = (entry: QueueEntry, idx: number) =>
    entry.position ?? idx + 1;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-5">
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
          Current Queue
        </CardTitle>
        <Button
          onClick={onServeNext}
          disabled={entries.length === 0}
          size="default"
          className="h-10 px-5 font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          title={entries.length === 0 ? "No customers in queue" : "Serve next customer"}
        >
          <Play className="h-4 w-4" />
          <span className="ml-2">Serve Next</span>
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 rounded-full bg-muted p-5 shadow-sm">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Queue is empty
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              No customers are currently waiting. When customers join the waitlist, they will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">
                      Position
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Customer
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Party Size
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Joined
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Priority
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {entries.map((entry, idx) => {
                    const pos = getPosition(entry, idx);
                    const isVip = entry.priority_level > 0;

                    return (
                      <TableRow 
                        key={entry.id} 
                        className="border-border transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-sm text-foreground">
                          #{pos}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {entry.email}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {entry.guest_count}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(entry.joined_at)}
                        </TableCell>
                        <TableCell>
                          {isVip ? (
                            <Badge 
                              variant="secondary"
                              className="bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900/50 font-semibold"
                            >
                              VIP
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Normal</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onPromote(entry.id)}
                              disabled={isVip}
                              className="h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isVip ? "Already VIP" : "Promote to VIP"}
                            >
                              <ChevronUp className="h-4 w-4" />
                              <span className="sr-only">Promote</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDemote(entry.id)}
                              disabled={!isVip}
                              className="h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              title={!isVip ? "Not VIP" : "Demote to normal"}
                            >
                              <ChevronDown className="h-4 w-4" />
                              <span className="sr-only">Demote</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="space-y-4 md:hidden">
              {entries.map((entry, idx) => {
                const pos = getPosition(entry, idx);
                const isVip = entry.priority_level > 0;

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base font-bold text-primary">
                          #{pos}
                        </span>
                        {isVip && (
                          <Badge 
                            variant="secondary"
                            className="bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900/50 font-semibold"
                          >
                            VIP
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onPromote(entry.id)}
                          disabled={isVip}
                          className="h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isVip ? "Already VIP" : "Promote to VIP"}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDemote(entry.id)}
                          disabled={!isVip}
                          className="h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!isVip ? "Not VIP" : "Demote to normal"}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{entry.email}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Party: {entry.guest_count}</span>
                        <span>•</span>
                        <span>Joined: {formatTime(entry.joined_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

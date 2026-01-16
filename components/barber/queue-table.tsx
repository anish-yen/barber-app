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
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Current Queue
        </CardTitle>
        <Button
          onClick={onServeNext}
          disabled={entries.length === 0}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Play className="mr-2 h-4 w-4" />
          Serve Next
        </Button>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              Queue is empty
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No customers are currently waiting
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
                      <TableRow key={entry.id} className="border-border">
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
                            <Badge className="bg-accent text-accent-foreground">
                              VIP
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onPromote(entry.id)}
                              disabled={isVip}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Promote to VIP"
                            >
                              <ChevronUp className="h-4 w-4" />
                              <span className="sr-only">Promote</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDemote(entry.id)}
                              disabled={!isVip}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Demote to normal"
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
            <div className="space-y-3 md:hidden">
              {entries.map((entry, idx) => {
                const pos = getPosition(entry, idx);
                const isVip = entry.priority_level > 0;

                return (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-primary">
                          #{pos}
                        </span>
                        {isVip && (
                          <Badge className="bg-accent text-accent-foreground">
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDemote(entry.id)}
                          disabled={!isVip}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm text-foreground">{entry.email}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

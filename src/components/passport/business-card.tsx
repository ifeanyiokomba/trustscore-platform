"use client";

// TrustScore Batch 2 (G8) — BusinessProfilesCard (directive §53).
//
// Owner-claimed business labels (RC/BN/IT registration numbers) — modeled
// now, integrated when a CAC-class verification provider exists. The honesty
// contract is the design: every profile is UNVERIFIED, nothing here feeds
// the TrustScore, and the copy says so. The raw RC number is never persisted
// (peppered fingerprint + masked hint server-side) and never comes back.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Info,
  CalendarClock,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { BusinessProfileInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PROFILES = 5;

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error?.message) return body.error.message;
  } catch {
    /* fall through */
  }
  return "Something went wrong. Please try again.";
}

export function BusinessProfilesCard() {
  const [profiles, setProfiles] = React.useState<BusinessProfileInfo[] | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [rc, setRc] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [renaming, setRenaming] = React.useState<BusinessProfileInfo | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renamingBusy, setRenamingBusy] = React.useState(false);
  const [removing, setRemoving] = React.useState<BusinessProfileInfo | null>(null);
  const [removingBusy, setRemovingBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/businesses", { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        setProfiles(body.profiles ?? []);
      } else {
        setProfiles([]);
      }
    } catch {
      setProfiles([]);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/v1/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rcNumber: rc.trim() }),
      });
      if (res.ok) {
        toast.success("Business profile claimed", {
          description: "Unverified label — it will never affect your TrustScore.",
        });
        setName("");
        setRc("");
        setShowForm(false);
        await load();
      } else {
        toast.error("Could not add business profile", {
          description: await readError(res),
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renaming) return;
    setRenamingBusy(true);
    try {
      const res = await fetch(`/api/v1/businesses/${renaming.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        toast.success("Business profile renamed");
        setRenaming(null);
        await load();
      } else {
        toast.error("Could not rename", { description: await readError(res) });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setRenamingBusy(false);
    }
  }

  async function handleRemove() {
    if (!removing) return;
    setRemovingBusy(true);
    try {
      const res = await fetch(`/api/v1/businesses/${removing.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Business profile removed");
        setRemoving(null);
        await load();
      } else {
        toast.error("Could not remove", { description: await readError(res) });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setRemovingBusy(false);
    }
  }

  const count = profiles?.length ?? 0;
  const canAdd = count < MAX_PROFILES;

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Business profiles</CardTitle>
          <CardDescription className="truncate">
            Claim the businesses you operate — RC, BN or IT number
          </CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0 border-border bg-muted text-muted-foreground">
          {profiles === null ? "…" : `${count}/${MAX_PROFILES}`}
        </Badge>
      </CardHeader>
      <CardContent>
        {profiles === null ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground" role="status">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading your business profiles…
          </div>
        ) : (
          <>
            <ul className="space-y-2" aria-label="Your business profiles">
              <AnimatePresence initial={false}>
                {profiles.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                    className="rounded-lg border border-border px-4 py-3.5"
                    data-testid={`business-profile-${p.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{p.name}</span>
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                          >
                            unverified label
                          </Badge>
                        </div>
                        <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
                          {p.rcHint}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" aria-hidden="true" />
                            claimed {timeAgo(p.createdAt)}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Rename ${p.name}`}
                          onClick={() => {
                            setRenaming(p);
                            setRenameValue(p.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only sm:hidden">Rename</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => setRemoving(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only sm:hidden">Remove</span>
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {canAdd ? (
              showForm ? (
                <motion.form
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleCreate}
                  className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                  aria-label="Claim a business profile"
                >
                  <div className="space-y-2">
                    <Label htmlFor="business-name" className="text-xs">
                      Business name
                    </Label>
                    <Input
                      id="business-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Adaeze Logistics Ltd"
                      maxLength={80}
                      required
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-rc" className="text-xs">
                      CAC registration number
                    </Label>
                    <Input
                      id="business-rc"
                      value={rc}
                      onChange={(e) => setRc(e.target.value)}
                      placeholder="e.g. RC 1234567, BN 98765 or IT 4567821"
                      maxLength={20}
                      required
                      className="min-h-11 font-mono"
                      data-testid="business-rc-input"
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Stored as a masked fingerprint only — the number itself is never kept.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={creating} className="min-h-11">
                      {creating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Claim profile
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={creating}
                      className="min-h-11"
                      onClick={() => {
                        setShowForm(false);
                        setName("");
                        setRc("");
                      }}
                    >
                      <X className="mr-2 h-4 w-4" aria-hidden="true" />
                      Cancel
                    </Button>
                  </div>
                </motion.form>
              ) : (
                <Button
                  variant="outline"
                  className="mt-3 w-full min-h-11"
                  onClick={() => setShowForm(true)}
                  data-testid="business-add-button"
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add a business profile
                </Button>
              )
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Profile limit reached ({MAX_PROFILES}). Remove one to add another.
              </p>
            )}

            <p className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Business verification isn&apos;t integrated yet — these are{" "}
                <span className="font-medium text-foreground">unverified labels you claim</span>,
                never trust signals. They don&apos;t affect your TrustScore, and nobody else
                can see them. When a CAC-class provider lands, claimed numbers get verified
                for real.
              </span>
            </p>
          </>
        )}
      </CardContent>

      {/* Rename — DSR rectification, owner-scoped */}
      <AlertDialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename this business profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the display name changes — the claimed registration number stays bound
              (and masked). This is audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-name" className="text-xs">
              New name
            </Label>
            <Input
              id="rename-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={80}
              className="mt-2 min-h-11"
              data-testid="business-rename-input"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={renamingBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={renamingBusy || !renameValue.trim()}
              onClick={(e) => {
                e.preventDefault();
                void handleRename();
              }}
            >
              {renamingBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save name
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove — destructive, always confirmed */}
      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this business profile?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} ({removing?.rcHint}) leaves your passport immediately. You can
              claim the same number again later. This is audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingBusy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={removingBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleRemove();
              }}
            >
              {removingBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

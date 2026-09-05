"use client";

// TrustScore Stage 5 — DsrCard (NDPA §36 data-subject rights, self-service).
// Export: full data download (7-day retention). Delete: password-confirmed
// cascade with a final export + redacted audit tombstone. Rectification
// routes back to consent withdrawal (the NDPA-native path in this product).

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileDown,
  Trash2,
  Scale,
  Loader2,
  CheckCircle2,
  PencilLine,
  ShieldCheck,
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
import type { DsrRequestInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function DsrCard({
  requests,
  onExportDone,
  onDeleted,
}: {
  requests: DsrRequestInfo[];
  onExportDone: () => void;
  onDeleted: () => void;
}) {
  const [exporting, setExporting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [typed, setTyped] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const createExport = React.useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/v1/passport/dsr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "EXPORT" }),
      });
      if (res.ok) {
        const body = await res.json();
        // Trigger the browser download directly.
        window.location.href = body.downloadPath;
        toast.success("Export generated", {
          description: "Your data download has started. Available for 7 days.",
        });
        onExportDone();
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Export failed", {
          description: body?.error?.message ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setExporting(false);
    }
  }, [onExportDone]);

  const confirmDelete = React.useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/v1/passport/dsr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DELETE", password }),
      });
      if (res.ok) {
        toast.success("Account deleted", {
          description:
            "Your account and identity spine were erased (NDPA §36). A final export was generated — retain it, it is no longer downloadable.",
        });
        onDeleted();
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Deletion not completed", {
          description: body?.error?.message ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setPassword("");
      setTyped("");
    }
  }, [password, onDeleted]);

  const canDelete = password.length >= 8 && typed === "DELETE";

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Scale className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Your data rights (NDPA §36)</CardTitle>
          <CardDescription className="truncate">
            Access, rectification and erasure — self-service, no email required
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export */}
        <div className="ts-rung-active rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">Download everything we hold</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Full JSON export: account, identity spine, consents, evidence, credentials, links,
                receipts, sessions, audit trail. Stored identifiers are already salted hashes —
                the raw values were never stored.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => void createExport()}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              )}
              Export
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Retention: export payloads purge after 7 days.
          </p>
        </div>

        {/* Rectify */}
        <div className="rounded-lg border border-border bg-muted/25 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <PencilLine className="h-4 w-4 text-primary" aria-hidden="true" />
            Correct your data
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Attributes come from NINAuth under your consent. To change them: withdraw the consent
            (Overview → Attributes), then re-verify — new assertions replace the old ones.
            Manual review requests open with the appeals pipeline (Stage 9).
          </p>
        </div>

        {/* Delete */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                Delete my account and identity
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Irreversible. Deletes your account, Trust Identity, identifiers, attributes,
                evidence, credentials, links and receipts (cascade). A final export is generated
                for you; only a redacted audit tombstone survives for legal basis.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>

        {/* History */}
        {requests.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Request history
            </h4>
            <ul className="mt-2 space-y-1.5">
              {requests.slice(0, 6).map((r) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {r.type === "EXPORT" ? (
                      <FileDown className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
                    )}
                    <span className="min-w-0 truncate">
                      {r.type === "EXPORT" ? "Data export" : "Account deletion"}
                      {r.status === "COMPLETED" && (
                        <CheckCircle2 className="ml-1.5 inline h-3 w-3 text-primary" aria-hidden="true" />
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(r.requestedAt)}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Rights exercised under the Nigeria Data Protection Act 2023. Automated-decision
            explanations are on your TrustScore card (NDPA §37).
          </span>
        </p>
      </CardContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete everything?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This permanently erases your account and your entire Trust Identity spine. A
                  final data export will be generated for you to keep. This action cannot be undone.
                </p>
                <div className="space-y-2 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="dsr-password" className="text-xs font-semibold">
                      Confirm your password
                    </Label>
                    <Input
                      id="dsr-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your account password"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dsr-confirm" className="text-xs font-semibold">
                      Type DELETE to confirm
                    </Label>
                    <Input
                      id="dsr-confirm"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder="DELETE"
                      className={cn(
                        typed && typed !== "DELETE" && "border-destructive/50 focus-visible:ring-destructive/40"
                      )}
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

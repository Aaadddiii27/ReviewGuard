import React, { useState } from 'react';
import { Play, Loader2, Sparkles, FileDiff, Github } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { triggerReview } from '@/services/api';
import type { Review, TriggerReviewPayload } from '@/types';

interface Preset {
  name: string;
  repo: string;
  prNumber: number;
  title: string;
  diff: string;
}

const DEMO_PRESETS: Preset[] = [
  {
    name: '🚨 SQL Injection & Auth Risk',
    repo: 'acme/billing-service',
    prNumber: 42,
    title: 'feat(auth): dynamic query execution in user login',
    diff: `diff --git a/app/auth.py b/app/auth.py
index 0000000..1111111 100644
--- a/app/auth.py
+++ b/app/auth.py
@@ -1,5 +1,9 @@
 import sqlite3

 def authenticate_user(username, password):
+    conn = sqlite3.connect("users.db")
+    cursor = conn.cursor()
+    # Raw unescaped string formatting
+    query = "SELECT * FROM accounts WHERE user = '" + username + "' AND pass = '" + password + "'"
+    return cursor.execute(query).fetchone()
`,
  },
  {
    name: '⚡ Mutable Default Argument Bug',
    repo: 'acme/cart-engine',
    prNumber: 18,
    title: 'fix(cart): add item accumulator helper',
    diff: `diff --git a/cart/accumulator.py b/cart/accumulator.py
index 0000000..1111111 100644
--- a/cart/accumulator.py
+++ b/cart/accumulator.py
@@ -1,3 +1,7 @@
 # Accumulator utility

-def add_to_session(item, active_items=None):
+def add_to_session(item, active_items=[]):
+    active_items.append(item)
+    return active_items
`,
  },
  {
    name: '✅ Clean Verified Implementation',
    repo: 'acme/algorithms-core',
    prNumber: 99,
    title: 'feat: add parameterized search query',
    diff: `diff --git a/db/lookup.py b/db/lookup.py
index 0000000..1111111 100644
--- a/db/lookup.py
+++ b/db/lookup.py
@@ -1,4 +1,8 @@
+import sqlite3
+
+def safe_find_by_id(db: sqlite3.Connection, user_id: int):
+    cursor = db.cursor()
+    cursor.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
+    return cursor.fetchone()
`,
  },
];

interface TriggerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewSuccess: (review: Review) => void;
}

export default function TriggerReviewModal({
  isOpen,
  onClose,
  onReviewSuccess,
}: TriggerReviewModalProps) {
  const [repository, setRepository] = useState('acme/payment-api');
  const [prNumber, setPrNumber] = useState<number | string>(105);
  const [prTitle, setPrTitle] = useState('feat: updated transaction flow');
  const [diffText, setDiffText] = useState(DEMO_PRESETS[0].diff);
  const [postToGithub, setPostToGithub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const loadPreset = (preset: Preset) => {
    setRepository(preset.repo);
    setPrNumber(preset.prNumber);
    setPrTitle(preset.title);
    setDiffText(preset.diff);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: TriggerReviewPayload = {
        repository,
        pr_number: prNumber ? Number(prNumber) : null,
        pr_title: prTitle,
        diff_text: diffText,
        post_comments_to_github: postToGithub,
        github_token: githubToken || undefined,
      };

      const result = await triggerReview(payload);
      setLoading(false);
      toast({
        title: 'Review Completed',
        description: `Successfully analyzed ${repository} PR #${prNumber || 'custom'}`,
      });
      onReviewSuccess(result);
      onClose();
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Review execution failed';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Review Execution Failed',
        description: message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 border-b border-slate-800 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">
                Trigger ReviewGuard Review
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Run diff-aware static and AI review with deduplication
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Demo Presets (Instant Test Scenarios)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_PRESETS.map((p, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => loadPreset(p)}
                  className="text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
                >
                  <div className="font-semibold text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{p.repo}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Meta inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Repository</label>
              <Input
                type="text"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                placeholder="owner/repository"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Pull Request Number</label>
              <Input
                type="number"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                placeholder="e.g. 42"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">PR Title / Description</label>
            <Input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
              placeholder="e.g. feat: implement auth module"
            />
          </div>

          {/* Unified Diff Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <FileDiff className="w-3.5 h-3.5 text-emerald-400" />
                Unified Git Diff
              </label>
              <span className="text-[11px] text-slate-400 font-mono">diff-aware analysis</span>
            </div>
            <Textarea
              rows={8}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-slate-300 text-xs font-mono leading-relaxed"
              placeholder="Paste unified git diff here (diff --git a/... b/...)"
            />
          </div>

          {/* GitHub Post comments switch */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Post advisory comments to GitHub PR</span>
                <span className="text-[11px] text-slate-400">Uses official GitHub review comments API (COMMENT event)</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={postToGithub}
              onChange={(e) => setPostToGithub(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
            />
          </div>

          {postToGithub && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">GitHub Personal Access Token (Optional override)</label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Diff &amp; Suppressing Duplicates...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute ReviewGuard Review
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

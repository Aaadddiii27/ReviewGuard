import React, { useState } from 'react';
import { X, Play, Loader2, Sparkles, FileDiff, Github } from 'lucide-react';
import { triggerReview } from '../services/api';

const DEMO_PRESETS = [
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
`
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
`
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
`
  }
];

export default function TriggerReviewModal({ isOpen, onClose, onReviewSuccess }) {
  const [activeTab, setActiveTab] = useState('diff'); // 'diff' or 'github'
  const [repository, setRepository] = useState('acme/payment-api');
  const [prNumber, setPrNumber] = useState(105);
  const [prTitle, setPrTitle] = useState('feat: updated transaction flow');
  const [diffText, setDiffText] = useState(DEMO_PRESETS[0].diff);
  const [postToGithub, setPostToGithub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const loadPreset = (preset) => {
    setRepository(preset.repo);
    setPrNumber(preset.prNumber);
    setPrTitle(preset.title);
    setDiffText(preset.diff);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        repository,
        pr_number: Number(prNumber) || null,
        pr_title: prTitle,
        diff_text: diffText,
        post_comments_to_github: postToGithub,
        github_token: githubToken || undefined,
      };

      const result = await triggerReview(payload);
      setLoading(false);
      onReviewSuccess(result);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Trigger ReviewGuard Review</h3>
              <p className="text-xs text-slate-400">Run diff-aware static and AI review with deduplication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Demo Presets (Instant Hackathon Test Scenarios)
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
              <input
                type="text"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="owner/repository"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Pull Request Number</label>
              <input
                type="number"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="e.g. 42"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">PR Title / Description</label>
            <input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
            <textarea
              rows={8}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500 leading-relaxed"
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
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg shadow-lg shadow-emerald-950/40 transition"
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
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

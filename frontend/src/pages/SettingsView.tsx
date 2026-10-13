import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save, Key, Cpu, Sliders, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchSettings, updateSettings } from '@/services/api';
import type { WorkspaceSettings } from '@/types';

export default function SettingsView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [aiProvider, setAiProvider] = useState<'ollama' | 'gemini' | 'mock'>('ollama');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:1.5b');
  const [geminiKey, setGeminiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [dedupThreshold, setDedupThreshold] = useState(0.78);
  const [severityThreshold, setSeverityThreshold] = useState('LOW');
  const [autoReviewEnabled, setAutoReviewEnabled] = useState(true);
  const [postCommentsToGithub, setPostCommentsToGithub] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['workspaceSettings'],
    queryFn: () => fetchSettings(),
  });

  useEffect(() => {
    if (settings) {
      if (settings.ai_provider === 'gemini' || settings.ai_provider === 'ollama' || settings.ai_provider === 'mock') {
        setAiProvider(settings.ai_provider);
      }
      if (typeof settings.deduplication_threshold === 'number') {
        setDedupThreshold(settings.deduplication_threshold);
      }
      if (settings.severity_threshold) {
        setSeverityThreshold(settings.severity_threshold);
      }
      if (typeof settings.auto_review_enabled === 'boolean') {
        setAutoReviewEnabled(settings.auto_review_enabled);
      }
      if (typeof settings.post_comments_to_github === 'boolean') {
        setPostCommentsToGithub(settings.post_comments_to_github);
      }
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<WorkspaceSettings>) => updateSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['workspaceSettings'], updated);
      toast({
        title: 'Settings Persisted',
        description: 'ReviewGuard engine configuration has been updated in the database.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not persist settings.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ai_provider: aiProvider,
      deduplication_threshold: dedupThreshold,
      severity_threshold: severityThreshold,
      auto_review_enabled: autoReviewEnabled,
      post_comments_to_github: postCommentsToGithub,
    });
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-400" />
            ReviewGuard Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tune AI inference engines, deduplication sensitivity thresholds, and GitHub integrations.
          </p>
        </div>
        {settings?.updated_at && (
          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800 self-start sm:self-auto">
            Last updated: {new Date(settings.updated_at).toLocaleTimeString()}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Engine Selection */}
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            AI Review Provider
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`p-4 rounded-xl border cursor-pointer transition ${
                aiProvider === 'ollama'
                  ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <input
                  type="radio"
                  name="provider"
                  value="ollama"
                  checked={aiProvider === 'ollama'}
                  onChange={() => setAiProvider('ollama')}
                  className="accent-emerald-500"
                />
                <span className="font-semibold text-white text-xs">Ollama Local GPU</span>
              </div>
              <p className="text-[11px] text-slate-400">
                100% offline &amp; private inference on local GPU. Zero API cost and zero latency data leaks.
              </p>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer transition ${
                aiProvider === 'gemini'
                  ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={aiProvider === 'gemini'}
                  onChange={() => setAiProvider('gemini')}
                  className="accent-emerald-500"
                />
                <span className="font-semibold text-white text-xs">Google Gemini Cloud</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gemini 2.5 Flash / 1.5 Flash cloud API for large context windows and high-capacity PRs.
              </p>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer transition ${
                aiProvider === 'mock'
                  ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <input
                  type="radio"
                  name="provider"
                  value="mock"
                  checked={aiProvider === 'mock'}
                  onChange={() => setAiProvider('mock')}
                  className="accent-emerald-500"
                />
                <span className="font-semibold text-white text-xs">Deterministic Mock</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Zero network dependency for automated CI suites, benchmarking, and unit verification.
              </p>
            </label>
          </div>

          {aiProvider === 'ollama' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ollama Model</label>
              <Input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
              />
            </div>
          )}

          {aiProvider === 'gemini' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gemini API Key</label>
              <Input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
              />
            </div>
          )}
        </Card>

        {/* Deduplication & Static Analysis */}
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Deduplication &amp; Noise Reduction Tuning
          </h3>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Similarity Clustering Threshold</span>
              <span className="font-mono text-emerald-400 font-semibold">{Math.round(dedupThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.01"
              value={dedupThreshold}
              onChange={(e) => setDedupThreshold(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Higher values require closer semantic text overlap before consolidating duplicate findings. Currently calibrated at 78% for optimal precision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Minimum Severity Alert Level</label>
              <select
                value={severityThreshold}
                onChange={(e) => setSeverityThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5"
              >
                <option value="CRITICAL">CRITICAL Only (Blockers)</option>
                <option value="HIGH">HIGH and above</option>
                <option value="MEDIUM">MEDIUM and above</option>
                <option value="LOW">LOW and above (All findings)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Automated PR Reviewing</span>
                <span className="text-[11px] text-slate-400">Trigger on webhook PR opened/sync</span>
              </div>
              <input
                type="checkbox"
                checked={autoReviewEnabled}
                onChange={(e) => setAutoReviewEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
              />
            </div>
          </div>
        </Card>

        {/* GitHub Secrets */}
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            GitHub App / Token Integration
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 mb-3">
            <div>
              <span className="text-xs font-medium text-slate-200 block">Post Advisory Comments to GitHub</span>
              <span className="text-[11px] text-slate-400">Write inline diff comments back to the active PR</span>
            </div>
            <input
              type="checkbox"
              checked={postCommentsToGithub}
              onChange={(e) => setPostCommentsToGithub(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">GitHub Personal Access Token</label>
            <Input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Required for authenticated REST API calls when posting review summaries and inline comments.
            </p>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
          >
            {mutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{mutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

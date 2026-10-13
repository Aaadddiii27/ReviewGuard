import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Key, Cpu, Sliders } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function SettingsView() {
  const [aiProvider, setAiProvider] = useState<'ollama' | 'gemini'>('ollama');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:1.5b');
  const [geminiKey, setGeminiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [threshold, setThreshold] = useState(0.78);
  const [staticAnalysis, setStaticAnalysis] = useState(true);
  const [saved, setSaved] = useState(false);

  const { toast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    toast({
      title: 'Configuration Saved',
      description: 'ReviewGuard settings have been saved successfully.',
    });
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-emerald-400" />
          ReviewGuard Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Tune AI inference engines, deduplication sensitivity thresholds, and GitHub integrations.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Engine Selection */}
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            AI Review Provider
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-xl border cursor-pointer transition ${
                aiProvider === 'ollama'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
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
                100% offline &amp; private inference on NVIDIA GeForce RTX 4050 GPU. Zero API cost.
              </p>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer transition ${
                aiProvider === 'gemini'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
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
                Gemini 2.5 Flash / 1.5 Flash cloud API for large context and high-capacity reviews.
              </p>
            </label>
          </div>

          {aiProvider === 'ollama' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ollama Model</label>
              <Input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono"
              />
            </div>
          ) : (
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
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Deduplication &amp; Noise Reduction Tuning
          </h3>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Similarity Clustering Threshold</span>
              <span className="font-mono text-emerald-400 font-semibold">{Math.round(threshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Higher values require closer semantic text overlap before consolidating duplicate findings.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-200 block">Deterministic Static Analysis Pre-pass</span>
              <span className="text-[11px] text-slate-400">Run Python AST, Bandit, and JS security scanners before AI</span>
            </div>
            <input
              type="checkbox"
              checked={staticAnalysis}
              onChange={(e) => setStaticAnalysis(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
            />
          </div>
        </Card>

        {/* GitHub Secrets */}
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            GitHub App / Token Integration
          </h3>

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
              Used for posting advisory comments back to GitHub PRs via Actions or Webhooks.
            </p>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs text-emerald-400 font-semibold animate-in fade-in">
              Configuration Saved Successfully!
            </span>
          )}
          <Button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}

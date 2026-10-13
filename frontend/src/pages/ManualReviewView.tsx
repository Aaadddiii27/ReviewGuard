import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { reviewManualSnippet, reviewUploadedFile } from '@/services/api';
import FindingCard from '@/components/FindingCard';
import HumanApprovalBanner from '@/components/HumanApprovalBanner';
import type { Review } from '@/types';
import { Code2, Upload, Play, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';

const SAMPLE_CODE = `def authenticate_user(username, password):
    # Potential vulnerability demonstration
    query = "SELECT * FROM accounts WHERE user = '" + username + "' AND pass = '" + password + "'"
    cursor.execute(query)
    return cursor.fetchone()
`;

export default function ManualReviewView() {
  const [tab, setTab] = useState<'snippet' | 'upload'>('snippet');
  const [filename, setFilename] = useState('auth.py');
  const [code, setCode] = useState(SAMPLE_CODE);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<Review | null>(null);
  const { toast } = useToast();

  const handleSnippetReview = async () => {
    if (!code.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter code to review', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const result = await reviewManualSnippet({ filename, code });
      setReviewResult(result);
      toast({ title: 'Review Completed', description: `Identified ${result.findings.length} actionable finding(s).` });
    } catch (err: any) {
      toast({ title: 'Review Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadReview = async () => {
    if (!file) {
      toast({ title: 'Validation Error', description: 'Please select a file to upload', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await reviewUploadedFile(formData);
      setReviewResult(result);
      toast({ title: 'Review Completed', description: `Identified ${result.findings.length} actionable finding(s).` });
    } catch (err: any) {
      toast({ title: 'Review Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Code2 className="w-8 h-8 text-indigo-400" />
          Manual Review Studio
        </h1>
        <p className="text-slate-400 mt-1">
          Perform immediate, diff-aware security and quality reviews on ad-hoc code snippets or uploaded source/patch files.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <Card className="bg-[#111827] border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-white">Input Source Code</CardTitle>
              <CardDescription>Choose between pasting code directly or uploading a unified diff/source file.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="bg-slate-900 border border-slate-800 mb-4">
                  <TabsTrigger value="snippet" className="gap-2">
                    <FileCode className="w-4 h-4" /> Paste Snippet
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="w-4 h-4" /> Upload File / Patch
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="snippet" className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">File Name & Path</label>
                    <Input
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="e.g. src/auth/login.py"
                      className="bg-slate-950 border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Source Code</label>
                    <Textarea
                      rows={14}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste Python, JavaScript, TypeScript, Java, or C++ code..."
                      className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-100"
                    />
                  </div>
                  <Button
                    onClick={handleSnippetReview}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {loading ? 'Analyzing with Review Engine...' : 'Run Advisory Review'}
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-slate-800 rounded-lg p-8 text-center hover:border-indigo-500/50 transition">
                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-300 font-medium">Select a source file or .diff/.patch</p>
                    <p className="text-xs text-slate-500 mt-1">Supports .py, .js, .ts, .java, .cpp, .diff, .patch (Max 2MB)</p>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="mt-4 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>
                  {file && (
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Selected: <span className="font-semibold text-white">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                  <Button
                    onClick={handleFileUploadReview}
                    disabled={loading || !file}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {loading ? 'Processing File...' : 'Analyze Uploaded File'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-6">
          {reviewResult ? (
            <div className="space-y-6">
              <HumanApprovalBanner />
              <Card className="bg-[#111827] border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">Review Assessment</CardTitle>
                    <Badge variant={reviewResult.findings.length > 0 ? 'destructive' : 'default'}>
                      {reviewResult.findings.length} Finding(s)
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-300 text-sm mt-2">
                    {reviewResult.summary.summary_text}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-rose-950/40 border border-rose-800/40 rounded p-2">
                      <div className="text-rose-400 font-bold text-lg">{reviewResult.summary.severity_distribution.CRITICAL}</div>
                      <div className="text-slate-400">Critical</div>
                    </div>
                    <div className="bg-amber-950/40 border border-amber-800/40 rounded p-2">
                      <div className="text-amber-400 font-bold text-lg">{reviewResult.summary.severity_distribution.HIGH}</div>
                      <div className="text-slate-400">High</div>
                    </div>
                    <div className="bg-blue-950/40 border border-blue-800/40 rounded p-2">
                      <div className="text-blue-400 font-bold text-lg">{reviewResult.summary.severity_distribution.MEDIUM}</div>
                      <div className="text-slate-400">Medium</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded p-2">
                      <div className="text-slate-300 font-bold text-lg">{reviewResult.summary.severity_distribution.LOW}</div>
                      <div className="text-slate-400">Low</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Detailed Findings ({reviewResult.findings.length})
                </h3>
                {reviewResult.findings.length === 0 ? (
                  <Card className="bg-[#111827] border-slate-800 p-6 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    Clean code! No actionable security, bug, or quality issues detected.
                  </Card>
                ) : (
                  reviewResult.findings.map((finding) => (
                    <FindingCard key={finding.id} finding={finding} />
                  ))
                )}
              </div>
            </div>
          ) : (
            <Card className="bg-[#111827] border-slate-800 p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">No Review Generated Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mt-2">
                Paste code or upload a diff file on the left and click "Run Advisory Review" to generate instant security findings.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

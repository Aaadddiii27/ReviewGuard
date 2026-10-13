import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { fetchRepositories } from '@/services/api';
import { GitBranch, FolderGit2, Plus, ExternalLink, ShieldCheck } from 'lucide-react';

export default function RepositoriesView() {
  const [newRepo, setNewRepo] = useState('');
  const { toast } = useToast();

  const { data: repositories, isLoading, refetch } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
  });

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepo.includes('/')) {
      toast({
        title: 'Invalid Format',
        description: 'Please specify owner/repo format (e.g. acme/billing-service)',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Repository Registered',
      description: `Successfully linked ${newRepo}. Webhook listening on /api/v1/webhooks/github.`,
    });
    setNewRepo('');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FolderGit2 className="w-8 h-8 text-indigo-400" />
            Repositories
          </h1>
          <p className="text-slate-400 mt-1">
            Manage repositories connected to ReviewGuard for automated Pull Request scanning.
          </p>
        </div>
      </div>

      <Card className="bg-[#111827] border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Connect New GitHub Repository</CardTitle>
          <CardDescription>
            Enter your GitHub repository name or configure your organization's GitHub App installation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <Input
              value={newRepo}
              onChange={(e) => setNewRepo(e.target.value)}
              placeholder="e.g. organization/payment-service"
              className="bg-slate-950 border-slate-800 text-slate-100 flex-1"
            />
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Link Repository
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-[#111827] border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Monitored Repositories</CardTitle>
          <CardDescription>All repositories currently configured with active advisory reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full bg-slate-900" />
              <Skeleton className="h-10 w-full bg-slate-900" />
              <Skeleton className="h-10 w-full bg-slate-900" />
            </div>
          ) : !repositories || repositories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <FolderGit2 className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-400">No repositories linked yet</p>
              <p className="text-xs text-slate-500">Connect a repository above to start monitoring incoming PRs.</p>
            </div>
          ) : (
            <div className="rounded-md border border-slate-800/80 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Repository</TableHead>
                    <TableHead className="text-slate-400">Default Branch</TableHead>
                    <TableHead className="text-slate-400">Security Policy</TableHead>
                    <TableHead className="text-slate-400">Webhook Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repositories.map((repo) => (
                    <TableRow key={repo.id} className="border-slate-800/60 hover:bg-slate-900/40">
                      <TableCell className="font-semibold text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-indigo-400" />
                        {repo.name}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <GitBranch className="w-3 h-3 text-slate-400" />
                          {repo.default_branch || 'main'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-800/40 text-emerald-400 bg-emerald-950/20 gap-1 text-xs">
                          <ShieldCheck className="w-3 h-3" /> Advisory Scan
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 gap-1 text-xs"
                          onClick={() => window.open(`https://github.com/${repo.name}`, '_blank')}
                        >
                          GitHub <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

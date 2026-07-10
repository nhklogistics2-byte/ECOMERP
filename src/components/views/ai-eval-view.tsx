'use client';

import { useState } from 'react';
import {
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Cpu,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { EvalResult } from '@/lib/types';

interface ModelOption {
  id: string;
  label: string;
  badge?: 'Primary' | 'Fallback' | null;
  selected?: boolean;
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'deepseek/deepseek-chat-v3.1', label: 'deepseek/deepseek-chat-v3.1', badge: 'Primary', selected: true },
  { id: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1', badge: null },
  { id: 'anthropic/claude-haiku-4.5', label: 'anthropic/claude-haiku-4.5', badge: 'Fallback', selected: true },
  { id: 'anthropic/claude-sonnet-4.5', label: 'anthropic/claude-sonnet-4.5', badge: null },
  { id: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini', badge: null },
  { id: 'openai/gpt-4o', label: 'openai/gpt-4o', badge: null },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct', badge: null },
  { id: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash', badge: null },
  { id: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro', badge: null },
  { id: 'mistralai/mistral-large', label: 'mistralai/mistral-large', badge: null },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'qwen/qwen-2.5-72b-instruct', badge: null },
  { id: 'x-ai/grok-2', label: 'x-ai/grok-2', badge: null },
];

export function AiEvalView() {
  const { addAuditEntry, addNotification } = useAppStore();
  const [subject, setSubject] = useState('PRICE AND AVAILABILITY OF 5 ITEMS FOR ATR AIRCRAFT');
  const [body, setBody] = useState(
    'Dear Sir, Please quote price and availability for the following items:\n1. P/N 474158-0001 - Cartridge Assy\n2. P/N E2187-01 - Epoxy Primer\n3. P/N 13-3100 - Adhesive Compound\n4. P/N 4130-50 - Cleaning Compound\n5. P/N MS21025-01 - Nut Plate\n\nRegards,\nTechi Champs LLC'
  );
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [customModel, setCustomModel] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<EvalResult[]>([]);

  const selectedCount = models.filter((m) => m.selected).length;

  const toggleModel = (id: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m))
    );
  };

  const addCustomModel = () => {
    const id = customModel.trim();
    if (!id) return;
    if (models.some((m) => m.id === id)) {
      toast.warning('Model already in list');
      return;
    }
    setModels((prev) => [...prev, { id, label: id, badge: null, selected: true }]);
    setCustomModel('');
    toast.success(`Added ${id}`);
  };

  const runEval = async () => {
    if (selectedCount === 0) {
      toast.warning('Select at least one model');
      return;
    }
    if (!body.trim()) {
      toast.warning('Email body is required');
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const res = await fetch('/api/ai-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          models: models.filter((m) => m.selected).map((m) => m.id),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Eval failed');
      setResults(data.results || []);
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'ai.eval_run',
        entity: 'eval',
        entityId: `eval-${Date.now()}`,
        note: `Evaluated ${selectedCount} models on 1 inquiry`,
      });
      addNotification({
        type: 'ai',
        title: 'AI Eval complete',
        message: `Ran ${selectedCount} models in parallel`,
      });
      toast.success(`Evaluated ${selectedCount} models`);
    } catch (e) {
      toast.error('Eval failed', { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const avgLatency = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length)
    : 0;
  const okCount = results.filter((r) => r.ok).length;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Sparkles className="size-6 text-emerald-600" />
          AI Model Evaluation Console
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Compare extraction quality, latency, and cost across OpenRouter models.
        </p>
      </div>

      {/* Active configuration banner */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 px-4 py-2.5 text-[13px] text-emerald-800 dark:text-emerald-300 flex items-center gap-4 flex-wrap">
        <span className="font-medium">Active configuration:</span>
        <span>
          Primary:{' '}
          <code className="font-mono text-emerald-900 dark:text-emerald-200">
            deepseek/deepseek-chat-v3.1
          </code>
        </span>
        <span>
          Fallback:{' '}
          <code className="font-mono text-emerald-900 dark:text-emerald-200">
            anthropic/claude-haiku-4.5
          </code>
        </span>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-emerald-100/80 dark:border-zinc-800">
            <CardContent className="p-3 flex items-center gap-2">
              <Cpu className="size-5 text-emerald-600" />
              <div>
                <p className="text-[10px] text-zinc-500">Models Run</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{results.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100/80 dark:border-zinc-800">
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <div>
                <p className="text-[10px] text-zinc-500">Succeeded</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{okCount}/{results.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100/80 dark:border-zinc-800">
            <CardContent className="p-3 flex items-center gap-2">
              <Clock className="size-5 text-emerald-600" />
              <div>
                <p className="text-[10px] text-zinc-500">Avg Latency</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{avgLatency}ms</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Email input */}
        <Card className="border-emerald-100/80 dark:border-zinc-800">
          <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Email Input
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Email Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 text-[13px]"
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Email Body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="text-[13px] font-mono"
                placeholder="Paste the inquiry email body here..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Models + Run */}
        <Card className="border-emerald-100/80 dark:border-zinc-800">
          <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Models to Evaluate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
              {models.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-emerald-50/50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!m.selected}
                    onChange={() => toggleModel(m.id)}
                    className="size-3.5 accent-emerald-600"
                  />
                  <span className="text-[13px] font-mono text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                    {m.label}
                  </span>
                  {m.badge && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0 h-4',
                        m.badge === 'Primary'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                      )}
                    >
                      {m.badge}
                    </Badge>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="h-9 text-[13px] font-mono"
                placeholder="Add custom OpenRouter model ID"
              />
              <Button variant="outline" size="sm" className="h-9" onClick={addCustomModel}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-zinc-500">
              {selectedCount} model{selectedCount !== 1 ? 's' : ''} selected.{' '}
              {selectedCount > 0 && 'All will run in parallel.'}
            </p>
            <Button
              onClick={runEval}
              disabled={running || selectedCount === 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2"
            >
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run Evaluation ({selectedCount} model{selectedCount !== 1 ? 's' : ''})
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {(results.length > 0 || running) && (
          <Card className="lg:col-span-2 border-emerald-100/80 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {running && results.length === 0 && (
                  <div className="md:col-span-2 text-sm text-zinc-500 flex items-center gap-2 py-4">
                    <Loader2 className="size-4 animate-spin text-emerald-500" />
                    Running evaluation across {selectedCount} models…
                  </div>
                )}
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      'border rounded-lg p-3',
                      r.ok
                        ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-red-200 bg-red-50/40 dark:bg-red-950/20'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.ok ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="size-4 text-red-600 shrink-0" />
                        )}
                        <code className="text-[12px] font-mono text-zinc-800 dark:text-zinc-200 truncate">
                          {r.model}
                        </code>
                      </div>
                      <span className="text-[11px] text-zinc-500 shrink-0">{r.latencyMs}ms</span>
                    </div>
                    {r.ok ? (
                      <div className="text-[12px] text-zinc-700 dark:text-zinc-300 mt-1 space-y-0.5">
                        <div>
                          <span className="font-medium">Category:</span> {r.category} ·{' '}
                          <span className="font-medium">Priority:</span> {r.priority}
                        </div>
                        <div className="text-zinc-500">{r.summary}</div>
                      </div>
                    ) : (
                      <div className="text-[12px] text-red-700 dark:text-red-400 mt-1">{r.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import {
  Reply,
  Send,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Mail,
  User,
  Sparkles,
  Clock,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { ReplyResult } from '@/lib/types';

type Tone = 'professional' | 'friendly' | 'concise' | 'formal';

const TONES: { key: Tone; label: string; desc: string }[] = [
  { key: 'professional', label: 'Professional', desc: 'Default business tone' },
  { key: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
  { key: 'concise', label: 'Concise', desc: 'Short and direct' },
  { key: 'formal', label: 'Formal', desc: 'Highly formal corporate' },
];

function formatRelative(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AiReplayView() {
  const { inquiries, addAuditEntry, addNotification } = useAppStore();
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>('professional');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ReplyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => inquiries.find((e) => e.id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  );

  const generate = async () => {
    if (!selected) {
      toast.warning('Select an inquiry first');
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai-replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: selected.from,
          fromName: selected.fromName,
          subject: selected.subject,
          body: selected.text,
          category: selected.category,
          priority: selected.priority,
          tone,
          language: selected.language,
        }),
      });
      const data: ReplyResult = await res.json();
      if (!data.ok) throw new Error(data.error || 'Reply generation failed');
      setResult(data);
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'ai.reply_generate',
        entity: 'inquiry',
        entityId: selected.id,
        note: `Generated ${tone} reply to ${selected.from}`,
      });
      addNotification({
        type: 'ai',
        title: 'AI Replay generated',
        message: `${tone} reply drafted for "${selected.subject.slice(0, 40)}"`,
      });
      toast.success(`Reply generated in ${data.latencyMs}ms`);
    } catch (e) {
      toast.error('Reply failed', { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const copyReply = async () => {
    if (!result?.replyBody) return;
    try {
      await navigator.clipboard.writeText(
        `Subject: ${result.replySubject}\n\n${result.replyBody}`
      );
      setCopied(true);
      toast.success('Reply copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Reply className="size-6 text-zinc-900" />
          AI Replay Generator
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Draft professional replies to inquiries using AI. Pick an inquiry, choose a tone, generate.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Left: inquiry picker */}
        <Card className="border-zinc-200 dark:border-zinc-800 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <Inbox className="size-4 text-zinc-900" />
              Pick an Inquiry
              <Badge variant="secondary" className="ml-auto">{inquiries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin max-h-[600px]">
            {inquiries.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500">
                <Inbox className="size-8 mx-auto mb-2 opacity-30" />
                No inquiries yet. Sync from the Inquiries tab.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {inquiries.map((e) => {
                  const active = selectedInquiryId === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelectedInquiryId(e.id);
                        setResult(null);
                      }}
                      className={cn(
                        'w-full text-left p-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors flex gap-2.5',
                        active && 'bg-zinc-100 dark:bg-zinc-800/70 border-l-2 border-zinc-900'
                      )}
                    >
                      <div className="size-8 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-800 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {initials(e.fromName || e.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                          {e.fromName || e.from}
                        </p>
                        <p className="text-[12px] text-zinc-600 dark:text-zinc-300 truncate">
                          {e.subject || '(no subject)'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            {e.category}
                          </Badge>
                          <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                            <Clock className="size-2.5" />
                            {formatRelative(e.receivedAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: composer */}
        <div className="space-y-4 min-w-0">
          {/* Selected inquiry context */}
          {!selected ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-500">
                <Reply className="size-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-zinc-700 dark:text-zinc-300">No inquiry selected</p>
                <p className="text-sm mt-1">Pick an inquiry from the left to draft a reply.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Inquiry context card */}
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    Original Inquiry
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-800 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {initials(selected.fromName || selected.from)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="size-3.5 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {selected.fromName || '(no name)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-3.5 text-zinc-400 shrink-0" />
                        <a
                          href={`mailto:${selected.from}`}
                          className="text-zinc-900 dark:text-zinc-200 hover:underline truncate"
                        >
                          {selected.from}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                      Subject
                    </p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {selected.subject || '(no subject)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[11px]">
                      {selected.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] capitalize">
                      {selected.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {selected.language}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                      Body
                    </p>
                    <pre className="text-[13px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-sans leading-relaxed max-h-[160px] overflow-y-auto scrollbar-thin bg-zinc-50 dark:bg-zinc-900 rounded-md p-3 border border-zinc-100 dark:border-zinc-800">
                      {selected.text || '(no text body)'}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Tone selector */}
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                    <Sparkles className="size-4 text-zinc-900" />
                    Reply Tone
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTone(t.key)}
                        className={cn(
                          'text-left border rounded-md p-2.5 transition-all',
                          tone === t.key
                            ? 'border-zinc-900 bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-zinc-900'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                        )}
                      >
                        <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                          {t.label}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Generate button */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={generate}
                  disabled={generating}
                  className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white"
                >
                  {generating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {generating ? 'Generating…' : 'Generate Reply'}
                </Button>
                {result && (
                  <Button
                    variant="outline"
                    onClick={generate}
                    disabled={generating}
                    className="gap-2"
                  >
                    <RefreshCw className="size-3.5" />
                    Regenerate
                  </Button>
                )}
              </div>

              {/* Result */}
              {result && (
                <Card className="border-zinc-300 dark:border-zinc-700">
                  <CardHeader className="py-3 px-4 border-b border-zinc-200 dark:border-zinc-700 flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Reply className="size-4" />
                      Generated Reply
                      <span className="text-[11px] text-zinc-500 font-normal">
                        · {result.latencyMs}ms · {result.tone}
                      </span>
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyReply}
                      className="h-7 gap-1.5 text-[12px]"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-zinc-900" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                        Reply Subject
                      </p>
                      <Input
                        readOnly
                        value={result.replySubject || ''}
                        className="font-mono text-[13px] bg-zinc-50 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                        Reply Body
                      </p>
                      <Textarea
                        readOnly
                        value={result.replyBody || ''}
                        rows={12}
                        className="text-[13px] leading-relaxed bg-zinc-50 dark:bg-zinc-900"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Send className="size-3" />
                      SMTP sending is not yet configured — copy the reply and send manually from your mail client.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

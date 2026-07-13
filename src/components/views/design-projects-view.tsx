'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, X, Loader2, Palette, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { DesignProject, DesignCategory, DesignProjectStatus, Priority } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  brief: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  revision: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  'on-hold': 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const CATEGORIES: DesignCategory[] = ['branding', 'web', 'print', 'packaging', 'illustration', 'ui-ux'];
const STATUSES: DesignProjectStatus[] = ['brief', 'in-progress', 'review', 'revision', 'delivered', 'on-hold'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export function DesignProjectsView() {
  const {
    designProjects,
    fetchDesignProjects,
    addDesignProject,
    updateDesignProject,
    removeDesignProject,
    addAuditEntry,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    client: '',
    category: 'branding' as DesignCategory,
    status: 'brief' as DesignProjectStatus,
    priority: 'medium' as Priority,
    assigneeName: '',
    deadline: '',
    progress: 0,
    notes: '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchDesignProjects();
      setLoading(false);
    })();
  }, [fetchDesignProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return designProjects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q) {
        const hay = `${p.title} ${p.client} ${p.assigneeName} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [designProjects, search, statusFilter]);

  const handleAdd = async () => {
    if (!newProject.title) {
      toast.warning('Project title is required');
      return;
    }
    try {
      await addDesignProject({
        ...newProject,
        assigneeId: null,
      });
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'design.project_add',
        entity: 'design_project',
        entityId: `dp-${Date.now()}`,
        note: `Added design project "${newProject.title}" for ${newProject.client || '—'}`,
      });
      toast.success(`Project "${newProject.title}" created`);
      setNewProject({
        title: '',
        client: '',
        category: 'branding',
        status: 'brief',
        priority: 'medium',
        assigneeName: '',
        deadline: '',
        progress: 0,
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      toast.error('Failed to create project', { description: (e as Error).message });
    }
  };

  const handleProgressChange = async (id: string, title: string, progress: number) => {
    try {
      const patch: Partial<DesignProject> = { progress };
      if (progress === 100) patch.status = 'delivered';
      else if (progress > 0 && progress < 100) {
        // keep current status, but bump out of brief if needed
      }
      await updateDesignProject(id, patch);
    } catch (e) {
      toast.error('Failed to update progress', { description: (e as Error).message });
    }
  };

  const handleStatusChange = async (id: string, title: string, status: DesignProjectStatus) => {
    try {
      await updateDesignProject(id, { status });
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'design.project_status',
        entity: 'design_project',
        entityId: id,
        note: `Changed "${title}" status to ${status}`,
      });
      toast.success(`"${title}" marked as ${status}`);
    } catch (e) {
      toast.error('Failed to update status', { description: (e as Error).message });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete project "${title}"?`)) return;
    try {
      await removeDesignProject(id);
      toast.success(`Project "${title}" deleted`);
    } catch (e) {
      toast.error('Failed to delete', { description: (e as Error).message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="size-6 text-purple-600" />
            Design Projects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {designProjects.length} projects
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-2 h-8 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="size-3.5" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search title, client, assignee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-700"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-purple-500" />
          <p className="text-sm text-gray-500">Loading projects…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <Palette className="size-8 mx-auto mb-2 opacity-30 text-purple-400" />
          <p className="font-medium text-gray-700">No projects found</p>
          <p className="text-xs text-gray-500 mt-1">Click “New Project” to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#e5e7eb] rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-gray-900 truncate">{p.title}</h3>
                  <p className="text-[11px] text-gray-500">
                    {p.client || 'No client'} · <span className="capitalize">{p.category.replace('-', ' ')}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  className="text-gray-300 hover:text-red-500 shrink-0"
                  title="Delete project"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                    STATUS_COLORS[p.status]
                  )}
                >
                  {p.status.replace('-', ' ')}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                    PRIORITY_COLORS[p.priority]
                  )}
                >
                  {p.priority}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-mono font-semibold text-gray-900">{p.progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={p.progress}
                  onChange={(e) => handleProgressChange(p.id, p.title, Number(e.target.value))}
                  className="w-full h-1.5 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                <span>
                  Assignee: <span className="font-medium text-gray-700">{p.assigneeName || '—'}</span>
                </span>
                {p.deadline && (
                  <span className={cn(p.deadline < new Date().toISOString().slice(0, 10) ? 'text-red-600' : '')}>
                    Due: {p.deadline}
                  </span>
                )}
              </div>

              <select
                value={p.status}
                onChange={(e) => handleStatusChange(p.id, p.title, e.target.value as DesignProjectStatus)}
                className="w-full text-[11px] rounded border border-gray-200 bg-white px-2 py-1"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">New Design Project</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Title *</label>
                <Input
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  placeholder="e.g. Logo redesign for Acme"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Client</label>
                <Input
                  value={newProject.client}
                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                  placeholder="Client name"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Assignee</label>
                <Input
                  value={newProject.assigneeName}
                  onChange={(e) => setNewProject({ ...newProject, assigneeName: e.target.value })}
                  placeholder="Designer name"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Category</label>
                <select
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value as DesignCategory })}
                  className="w-full h-8 text-[13px] rounded-md border border-[#e5e7eb] bg-white px-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c.replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Priority</label>
                <select
                  value={newProject.priority}
                  onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as Priority })}
                  className="w-full h-8 text-[13px] rounded-md border border-[#e5e7eb] bg-white px-2"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Deadline</label>
                <Input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Initial progress</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newProject.progress}
                  onChange={(e) => setNewProject({ ...newProject, progress: Number(e.target.value) })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Notes</label>
                <Input
                  value={newProject.notes}
                  onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700 text-white">
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

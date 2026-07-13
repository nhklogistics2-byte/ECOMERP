import { NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all design projects
export async function GET() {
  try {
    await ensureDbReady();
    const projects = await db.designProject.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, projects });
  } catch (e) {
    const msg = (e as Error).message || '';
    // If database is not configured (e.g., on Vercel without DATABASE_URL),
    // return an empty array so the frontend doesn't crash.
    if (
      msg.includes('URL must start with') ||
      msg.includes('no such table') ||
      msg.includes('does not exist') ||
      msg.includes('database is locked') ||
      msg.includes("Couldn't open database")
    ) {
      console.error('[design/projects GET] DB not ready, returning empty:', msg.slice(0, 120));
      return NextResponse.json({ ok: true, projects: [] });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST — create a new design project
export async function POST(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { title, client, category, status, priority, assigneeId, assigneeName, deadline, progress, notes } = body;

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Title is required' }, { status: 400 });
    }

    const project = await db.designProject.create({
      data: {
        title,
        client: client || '',
        category: category || 'branding',
        status: status || 'brief',
        priority: priority || 'medium',
        assigneeId: assigneeId || null,
        assigneeName: assigneeName || '',
        deadline: deadline || '',
        progress: typeof progress === 'number' ? progress : 0,
        notes: notes || '',
      },
    });

    return NextResponse.json({ ok: true, project });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (
      msg.includes('URL must start with') ||
      msg.includes('no such table') ||
      msg.includes('does not exist') ||
      msg.includes('database is locked') ||
      msg.includes("Couldn't open database")
    ) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured on this server. Set DATABASE_URL environment variable.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// PATCH — update a design project
export async function PATCH(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Project ID is required' }, { status: 400 });
    }

    const project = await db.designProject.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// DELETE — remove a design project
export async function DELETE(req: Request) {
  try {
    await ensureDbReady();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Project ID is required' }, { status: 400 });
    }

    await db.designProject.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

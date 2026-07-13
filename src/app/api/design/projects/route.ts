import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all design projects
export async function GET() {
  try {
    const projects = await db.designProject.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, projects });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — create a new design project
export async function POST(req: Request) {
  try {
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — update a design project
export async function PATCH(req: Request) {
  try {
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

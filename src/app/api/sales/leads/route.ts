import { NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all sales leads
export async function GET() {
  try {
    await ensureDbReady();
    const leads = await db.salesLead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, leads });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (
      msg.includes('URL must start with') ||
      msg.includes('no such table') ||
      msg.includes('does not exist') ||
      msg.includes('database is locked') ||
      msg.includes("Couldn't open database")
    ) {
      console.error('[sales/leads GET] DB not ready, returning empty:', msg.slice(0, 120));
      return NextResponse.json({ ok: true, leads: [] });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST — create a new sales lead
export async function POST(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { company, contact, email, phone, source, stage, value, probability, ownerName, ownerId, notes, expectedCloseDate } = body;

    if (!company) {
      return NextResponse.json({ ok: false, error: 'Company is required' }, { status: 400 });
    }

    const lead = await db.salesLead.create({
      data: {
        company,
        contact: contact || '',
        email: email || '',
        phone: phone || '',
        source: source || 'website',
        stage: stage || 'new',
        value: Number(value) || 0,
        probability: Number(probability) || 10,
        ownerName: ownerName || '',
        ownerId: ownerId || null,
        notes: notes || '',
        expectedCloseDate: expectedCloseDate || '',
      },
    });

    return NextResponse.json({ ok: true, lead });
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

// PATCH — update a sales lead
export async function PATCH(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Lead ID is required' }, { status: 400 });
    }

    if (patch.value !== undefined) patch.value = Number(patch.value);
    if (patch.probability !== undefined) patch.probability = Number(patch.probability);

    const lead = await db.salesLead.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({ ok: true, lead });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// DELETE — remove a sales lead
export async function DELETE(req: Request) {
  try {
    await ensureDbReady();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Lead ID is required' }, { status: 400 });
    }

    await db.salesLead.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

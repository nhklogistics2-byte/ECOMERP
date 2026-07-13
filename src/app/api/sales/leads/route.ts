import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all sales leads
export async function GET() {
  try {
    const leads = await db.salesLead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, leads });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — create a new sales lead
export async function POST(req: Request) {
  try {
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — update a sales lead
export async function PATCH(req: Request) {
  try {
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

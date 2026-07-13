import { NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all shipments
export async function GET() {
  try {
    await ensureDbReady();
    const shipments = await db.shipment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, shipments });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (
      msg.includes('URL must start with') ||
      msg.includes('no such table') ||
      msg.includes('does not exist') ||
      msg.includes('database is locked') ||
      msg.includes("Couldn't open database")
    ) {
      console.error('[ops/shipments GET] DB not ready, returning empty:', msg.slice(0, 120));
      return NextResponse.json({ ok: true, shipments: [] });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST — create a new shipment
export async function POST(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const {
      trackingNumber,
      shipmentNumber,
      origin,
      destination,
      customer,
      carrier,
      mode,
      status,
      weightKg,
      packages,
      eta,
      shippedAt,
      deliveredAt,
      notes,
    } = body;

    if (!trackingNumber) {
      return NextResponse.json({ ok: false, error: 'Tracking number is required' }, { status: 400 });
    }

    // Ensure tracking number is unique
    const existing = await db.shipment.findUnique({ where: { trackingNumber } });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Tracking number already exists' }, { status: 400 });
    }

    const shipment = await db.shipment.create({
      data: {
        trackingNumber,
        shipmentNumber: shipmentNumber || '',
        origin: origin || '',
        destination: destination || '',
        customer: customer || '',
        carrier: carrier || '',
        mode: mode || 'sea',
        status: status || 'pending',
        weightKg: Number(weightKg) || 0,
        packages: Number(packages) || 1,
        eta: eta || '',
        shippedAt: shippedAt || '',
        deliveredAt: deliveredAt || '',
        notes: notes || '',
      },
    });

    return NextResponse.json({ ok: true, shipment });
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

// PATCH — update a shipment
export async function PATCH(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Shipment ID is required' }, { status: 400 });
    }

    if (patch.weightKg !== undefined) patch.weightKg = Number(patch.weightKg);
    if (patch.packages !== undefined) patch.packages = Number(patch.packages);

    const shipment = await db.shipment.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({ ok: true, shipment });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// DELETE — remove a shipment
export async function DELETE(req: Request) {
  try {
    await ensureDbReady();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Shipment ID is required' }, { status: 400 });
    }

    await db.shipment.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

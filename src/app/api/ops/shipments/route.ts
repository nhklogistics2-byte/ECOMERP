import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all shipments
export async function GET() {
  try {
    const shipments = await db.shipment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, shipments });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — create a new shipment
export async function POST(req: Request) {
  try {
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — update a shipment
export async function PATCH(req: Request) {
  try {
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

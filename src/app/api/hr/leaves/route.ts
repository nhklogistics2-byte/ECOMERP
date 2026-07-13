import { NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isDbNotConfigured(msg: string): boolean {
  return (
    msg.includes('URL must start with') ||
    msg.includes('no such table') ||
    msg.includes('does not exist') ||
    msg.includes('database is locked') ||
    msg.includes("Couldn't open database")
  );
}

// GET — list all leave requests
export async function GET() {
  try {
    await ensureDbReady();
    const leaves = await db.leaveRequest.findMany({
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
    const formatted = leaves.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: l.employee?.name || 'Unknown',
      type: l.type,
      fromDate: l.fromDate,
      toDate: l.toDate,
      days: l.days,
      reason: l.reason,
      status: l.status,
      appliedAt: l.createdAt.toISOString(),
      reviewedBy: l.reviewedBy || '',
    }));
    return NextResponse.json({ ok: true, leaves: formatted });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (isDbNotConfigured(msg)) {
      console.error('[hr/leaves GET] DB not ready, returning empty:', msg.slice(0, 120));
      return NextResponse.json({ ok: true, leaves: [] });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST — create a leave request
export async function POST(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { employeeId, type, fromDate, toDate, days, reason } = body;

    if (!employeeId || !fromDate || !toDate) {
      return NextResponse.json({ ok: false, error: 'employeeId, fromDate, toDate are required' }, { status: 400 });
    }

    const leave = await db.leaveRequest.create({
      data: {
        employeeId,
        type: type || 'annual',
        fromDate,
        toDate,
        days: days || 1,
        reason: reason || '',
        status: 'pending',
      },
      include: { employee: true },
    });

    return NextResponse.json({
      ok: true,
      leave: {
        id: leave.id,
        employeeId: leave.employeeId,
        employeeName: leave.employee?.name || 'Unknown',
        type: leave.type,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedAt: leave.createdAt.toISOString(),
        reviewedBy: '',
      },
    });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (isDbNotConfigured(msg)) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured on this server. Set DATABASE_URL environment variable.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// PATCH — review (approve/reject) a leave request
export async function PATCH(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { id, status, reviewedBy } = body;

    if (!id || !status) {
      return NextResponse.json({ ok: false, error: 'id and status are required' }, { status: 400 });
    }

    const leave = await db.leaveRequest.update({
      where: { id },
      data: { status, reviewedBy: reviewedBy || '' },
      include: { employee: true },
    });

    // If approved, deduct leave balance
    if (status === 'approved') {
      await db.employee.update({
        where: { id: leave.employeeId },
        data: { leaveBalance: { decrement: leave.days } },
      });
    }

    return NextResponse.json({
      ok: true,
      leave: {
        id: leave.id,
        employeeId: leave.employeeId,
        employeeName: leave.employee?.name || 'Unknown',
        type: leave.type,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedAt: leave.createdAt.toISOString(),
        reviewedBy: leave.reviewedBy || '',
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

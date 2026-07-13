import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all leave requests
export async function GET() {
  try {
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — create a leave request
export async function POST(req: Request) {
  try {
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — review (approve/reject) a leave request
export async function PATCH(req: Request) {
  try {
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

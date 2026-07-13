import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list attendance (optionally filter by date)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const records = await db.attendanceRecord.findMany({
      where: { date },
      include: { employee: true },
      orderBy: { checkIn: 'asc' },
    });

    const formatted = records.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      employeeName: a.employee?.name || 'Unknown',
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      status: a.status,
      workHours: a.workHours,
    }));

    return NextResponse.json({ ok: true, attendance: formatted, date });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — check in or check out
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, action } = body; // action: "checkIn" | "checkOut"

    if (!employeeId || !action) {
      return NextResponse.json({ ok: false, error: 'employeeId and action are required' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ ok: false, error: 'Employee not found' }, { status: 404 });
    }

    if (action === 'checkIn') {
      // Try to find existing record for today
      const existing = await db.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId, date: today } },
      });

      if (existing) {
        const updated = await db.attendanceRecord.update({
          where: { id: existing.id },
          data: { checkIn: timeStr, status: isLate ? 'late' : 'present' },
        });
        return NextResponse.json({ ok: true, record: updated });
      }

      const record = await db.attendanceRecord.create({
        data: {
          employeeId,
          date: today,
          checkIn: timeStr,
          status: isLate ? 'late' : 'present',
        },
      });
      return NextResponse.json({ ok: true, record });

    } else if (action === 'checkOut') {
      const existing = await db.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId, date: today } },
      });

      if (!existing || !existing.checkIn) {
        return NextResponse.json({ ok: false, error: 'No check-in record found for today' }, { status: 400 });
      }

      // Calculate work hours
      const [inH, inM] = existing.checkIn.split(':').map(Number);
      const inMinutes = inH * 60 + inM;
      const outMinutes = now.getHours() * 60 + now.getMinutes();
      const workHours = Math.round(((outMinutes - inMinutes) / 60) * 100) / 100;

      const updated = await db.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkOut: timeStr, workHours },
      });

      return NextResponse.json({ ok: true, record: updated });
    }

    return NextResponse.json({ ok: false, error: 'Invalid action. Use "checkIn" or "checkOut"' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

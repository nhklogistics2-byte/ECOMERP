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

// GET — list all employees
export async function GET() {
  try {
    await ensureDbReady();
    const employees = await db.employee.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, employees });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (isDbNotConfigured(msg)) {
      console.error('[hr/employees GET] DB not ready, returning empty:', msg.slice(0, 120));
      return NextResponse.json({ ok: true, employees: [] });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST — create a new employee
export async function POST(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { name, email, phone, role, department, salary, leaveBalance } = body;

    if (!name || !email) {
      return NextResponse.json({ ok: false, error: 'Name and email are required' }, { status: 400 });
    }

    const employee = await db.employee.create({
      data: {
        name,
        email,
        phone: phone || '',
        role: role || '',
        department: department || '',
        salary: salary || 0,
        leaveBalance: leaveBalance ?? 20,
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
      },
    });

    return NextResponse.json({ ok: true, employee });
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

// PATCH — update an employee
export async function PATCH(req: Request) {
  try {
    await ensureDbReady();
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await db.employee.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({ ok: true, employee });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// DELETE — remove an employee
export async function DELETE(req: Request) {
  try {
    await ensureDbReady();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Employee ID is required' }, { status: 400 });
    }

    await db.employee.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

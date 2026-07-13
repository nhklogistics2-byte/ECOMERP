import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all employees
export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ok: true, employees });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — create a new employee
export async function POST(req: Request) {
  try {
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — update an employee
export async function PATCH(req: Request) {
  try {
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

/**
 * Seed script: inserts demo Design / Sales / Operations data + a few Design/Sales/Ops employees.
 *
 * Run with:  bun run scripts/seed-departments.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding departments…');

  // ── 1. Add demo employees for each new department (skip if email already exists) ──
  const employeesToCreate = [
    // Design
    { name: 'Ayesha Khan',  email: 'ayesha.khan@ecomruns.com',  phone: '+92-300-1111111', role: 'Lead Designer',         department: 'Design',     salary: 180000, leaveBalance: 18 },
    { name: 'Bilal Raza',   email: 'bilal.raza@ecomruns.com',   phone: '+92-300-2222222', role: 'UI/UX Designer',        department: 'Design',     salary: 140000, leaveBalance: 20 },
    { name: 'Hira Saleem',  email: 'hira.saleem@ecomruns.com',  phone: '+92-300-3333333', role: 'Graphic Designer',      department: 'Design',     salary: 110000, leaveBalance: 22 },
    // Sales
    { name: 'Kamran Akhtar',email: 'kamran.akhtar@ecomruns.com',phone: '+92-301-1111111', role: 'Sales Manager',         department: 'Sales',      salary: 220000, leaveBalance: 15 },
    { name: 'Sana Tariq',   email: 'sana.tariq@ecomruns.com',   phone: '+92-301-2222222', role: 'Sales Executive',       department: 'Sales',      salary: 130000, leaveBalance: 20 },
    { name: 'Faisal Iqbal', email: 'faisal.iqbal@ecomruns.com', phone: '+92-301-3333333', role: 'Account Executive',     department: 'Sales',      salary: 150000, leaveBalance: 19 },
    // Operations
    { name: 'Naveed Aslam', email: 'naveed.aslam@ecomruns.com', phone: '+92-302-1111111', role: 'Operations Manager',    department: 'Operations', salary: 200000, leaveBalance: 17 },
    { name: 'Rabia Anwar',  email: 'rabia.anwar@ecomruns.com',  phone: '+92-302-2222222', role: 'Logistics Coordinator', department: 'Operations', salary: 120000, leaveBalance: 21 },
    { name: 'Usman Ghani',  email: 'usman.ghani@ecomruns.com',  phone: '+92-302-3333333', role: 'Warehouse Supervisor',  department: 'Operations', salary: 135000, leaveBalance: 20 },
  ];

  for (const e of employeesToCreate) {
    const existing = await db.employee.findUnique({ where: { email: e.email } });
    if (!existing) {
      await db.employee.create({
        data: {
          ...e,
          status: 'active',
          joinDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
        },
      });
      console.log(`  ✓ Employee: ${e.name} (${e.department})`);
    } else {
      console.log(`  ⊙ Exists:  ${e.name} (${e.department})`);
    }
  }

  // ── 2. Design Projects ──
  const designProjects = [
    { title: 'Sea Keepers Brand Refresh', client: 'Sea Keepers',     category: 'branding',     status: 'in-progress', priority: 'high',   assigneeName: 'Ayesha Khan', deadline: '2026-08-15', progress: 65, notes: 'Logo, color palette, brand guide v2.' },
    { title: 'ECOMRUNS Website Redesign', client: 'ECOMRUNS Pvt Ltd', category: 'web',         status: 'review',      priority: 'urgent', assigneeName: 'Bilal Raza',  deadline: '2026-07-25', progress: 85, notes: 'Next.js landing pages + product catalog.' },
    { title: 'Packaging Dieline Series',  client: 'Nautical Foods',   category: 'packaging',   status: 'brief',       priority: 'medium', assigneeName: 'Hira Saleem', deadline: '2026-09-01', progress: 10, notes: '3 SKU packaging dielines awaiting client brief.' },
    { title: 'Operations Dashboard UI',   client: 'Internal',         category: 'ui-ux',       status: 'in-progress', priority: 'high',   assigneeName: 'Bilal Raza',  deadline: '2026-08-05', progress: 40, notes: 'Ops dashboard wireframes + hi-fi mockups.' },
    { title: 'Annual Report 2026',        client: 'ECOMRUNS Pvt Ltd', category: 'print',       status: 'on-hold',     priority: 'low',    assigneeName: 'Hira Saleem', deadline: '2026-12-31', progress: 5,  notes: 'On hold until Q3 financials are ready.' },
    { title: 'Sales Pitch Deck Template', client: 'Internal Sales',   category: 'illustration',status: 'delivered',   priority: 'medium', assigneeName: 'Ayesha Khan', deadline: '2026-06-30', progress: 100,notes: 'Reusable slide deck template delivered to Sales.' },
  ];
  for (const p of designProjects) {
    await db.designProject.create({ data: p });
    console.log(`  ✓ Design Project: ${p.title}`);
  }

  // ── 3. Sales Leads ──
  const salesLeads = [
    { company: 'Techichamps LLC',       contact: 'Mark Stevens',   email: 'mark@techichamps.com',   phone: '+1-555-0101', source: 'website',    stage: 'qualified',   value: 4500000,  probability: 40, ownerName: 'Kamran Akhtar', expectedCloseDate: '2026-08-20', notes: 'Inquiry about full ERP setup + 1 year support.' },
    { company: 'Nautical Foods',        contact: 'Aisha Karim',    email: 'aisha@nauticalfoods.ae', phone: '+971-50-1234567', source: 'referral', stage: 'proposal',    value: 2800000,  probability: 60, ownerName: 'Sana Tariq',    expectedCloseDate: '2026-07-30', notes: 'Packaging design + branding bundle.' },
    { company: 'Gulf Maritime Co.',     contact: 'Hassan Al-Farsi',email: 'hassan@gulfmaritime.com', phone: '+971-55-9876543', source: 'event', stage: 'negotiation', value: 12000000, probability: 80, ownerName: 'Kamran Akhtar', expectedCloseDate: '2026-07-20', notes: 'Annual logistics contract, negotiating price.' },
    { company: 'Pearl Logistics',       contact: 'Imran Sheikh',   email: 'imran@pearllogistics.pk', phone: '+92-21-1111111', source: 'email',  stage: 'contacted',   value: 1500000,  probability: 20, ownerName: 'Faisal Iqbal',  expectedCloseDate: '2026-09-15', notes: 'Cold reply, awaiting discovery call.' },
    { company: 'Oceanic Traders',       contact: 'Sara Ahmed',     email: 'sara@oceanictraders.com', phone: '+92-21-2222222', source: 'cold-call', stage: 'new',       value: 950000,   probability: 10, ownerName: 'Sana Tariq',    expectedCloseDate: '2026-10-01', notes: 'Cold-called, sent intro email.' },
    { company: 'BlueWave Shipping',     contact: 'Tony Marshall',  email: 'tony@bluewave.com',     phone: '+44-20-7946-0958', source: 'website', stage: 'won',        value: 6800000,  probability: 100, ownerName: 'Kamran Akhtar', expectedCloseDate: '2026-06-30', notes: 'Closed! Annual contract signed.' },
    { company: 'Crescent Exports',      contact: 'Bilal Ahmed',    email: 'bilal@crescentexports.pk', phone: '+92-21-3333333', source: 'referral', stage: 'lost',     value: 2200000,  probability: 0, ownerName: 'Faisal Iqbal',  expectedCloseDate: '2026-05-15', notes: 'Lost to competitor — pricing too high.' },
  ];
  for (const l of salesLeads) {
    await db.salesLead.create({ data: l });
    console.log(`  ✓ Sales Lead: ${l.company}`);
  }

  // ── 4. Shipments ──
  const shipments = [
    { trackingNumber: 'TRKSH1001AB', shipmentNumber: 'SHP-2026-001', origin: 'Karachi, PK',     destination: 'Dubai, UAE',     customer: 'Gulf Maritime Co.',  carrier: 'DHL',    mode: 'sea', status: 'in-transit',      weightKg: 1250.5, packages: 12, eta: '2026-07-25', shippedAt: '2026-07-10', notes: 'Reefer container, +2°C.' },
    { trackingNumber: 'TRKAIR2002CD', shipmentNumber: 'SHP-2026-002', origin: 'Karachi, PK',     destination: 'Frankfurt, DE',   customer: 'Techichamps LLC',    carrier: 'FedEx',  mode: 'air', status: 'customs',         weightKg: 145.2,  packages: 4,  eta: '2026-07-18', shippedAt: '2026-07-13', notes: 'Customs clearance in progress.' },
    { trackingNumber: 'TRKRD3003EF',  shipmentNumber: 'SHP-2026-003', origin: 'Lahore, PK',      destination: 'Islamabad, PK',   customer: 'Pearl Logistics',    carrier: 'TCS',    mode: 'road', status: 'out-for-delivery', weightKg: 320.0,  packages: 8,  eta: '2026-07-15', shippedAt: '2026-07-13', notes: 'Out for last-mile delivery.' },
    { trackingNumber: 'TRKSH4004GH',  shipmentNumber: 'SHP-2026-004', origin: 'Karachi, PK',     destination: 'Singapore, SG',   customer: 'BlueWave Shipping',  carrier: 'Aramex', mode: 'sea', status: 'delivered',       weightKg: 980.0,  packages: 6,  eta: '2026-07-05', shippedAt: '2026-06-20', deliveredAt: '2026-07-04', notes: 'Delivered in good condition.' },
    { trackingNumber: 'TRKRAIL5005IJ',shipmentNumber: 'SHP-2026-005', origin: 'Karachi, PK',     destination: 'Lahore, PK',      customer: 'Crescent Exports',   carrier: 'Local',  mode: 'rail', status: 'delayed',         weightKg: 4200.0, packages: 28, eta: '2026-07-12', shippedAt: '2026-07-08', notes: 'Delayed due to rail track maintenance.' },
    { trackingNumber: 'TRKAIR6006KL', shipmentNumber: 'SHP-2026-006', origin: 'Islamabad, PK',   destination: 'London, UK',      customer: 'Oceanic Traders',    carrier: 'UPS',    mode: 'air', status: 'pending',         weightKg: 75.0,   packages: 2,  eta: '2026-07-22', shippedAt: '',            notes: 'Awaiting pickup.' },
    { trackingNumber: 'TRKSH7007MN',  shipmentNumber: 'SHP-2026-007', origin: 'Karachi, PK',     destination: 'Mumbai, IN',      customer: 'Nautical Foods',     carrier: 'DHL',    mode: 'sea', status: 'picked-up',       weightKg: 850.0,  packages: 10, eta: '2026-07-30', shippedAt: '2026-07-14', notes: 'Container picked up from KICT.' },
    { trackingNumber: 'TRKRD8008OP',  shipmentNumber: 'SHP-2026-008', origin: 'Faisalabad, PK',  destination: 'Peshawar, PK',    customer: 'ECOMRUNS Pvt Ltd',   carrier: 'TCS',    mode: 'road', status: 'cancelled',       weightKg: 220.0,  packages: 5,  eta: '',           shippedAt: '',            notes: 'Cancelled by customer.' },
  ];
  for (const s of shipments) {
    await db.shipment.create({ data: s });
    console.log(`  ✓ Shipment: ${s.trackingNumber}`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('   • 9 demo employees added (3 per new department)');
  console.log('   • 6 design projects');
  console.log('   • 7 sales leads');
  console.log('   • 8 shipments');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

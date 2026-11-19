const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

const oldTarget = `      case 'COMPLETE_MEET': {
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        meet.status = 'COMPLETED';`;

const newTarget = `      case 'COMPLETE_MEET': {
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        // Time validation: meet must be completed only at or after the scheduled time (Admin override allowed)
        if (actorRole !== 'ADMIN' && meet.scheduledDate && meet.scheduledTime) {
          const meetDt = new Date(\`\${meet.scheduledDate}T\${meet.scheduledTime}:00\`);
          if (new Date().getTime() < meetDt.getTime()) {
            return NextResponse.json(
              { ok: false, error: \`Meeting scheduled time is \${meet.scheduledTime}. You can only mark it completed after the meeting time.\` },
              { status: 400 }
            );
          }
        }
        meet.status = 'COMPLETED';`;

if (code.includes(oldTarget)) {
  code = code.replace(oldTarget, newTarget);
  fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
  console.log('Successfully added server-side time verification in route.ts!');
} else {
  console.error('oldTarget not found in route.ts');
  process.exit(1);
}

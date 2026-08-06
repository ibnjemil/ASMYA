var fs = require('fs');
var content = "import { NextRequest, NextResponse } from 'next/server'\n" +
"import { db } from '@/lib/db'\n" +
"import webpush from 'web-push'\n\n" +
"export const runtime = 'nodejs'\n\n" +
"export async function POST(request: NextRequest) {\n" +
"  try {\n" +
"    const body = await request.json()\n" +
"    const { userId, title, body: notificationBody, data } = body\n\n" +
"    if (!userId || !title || !notificationBody) {\n" +
"      return NextResponse.json({ error: 'Missing required fields: userId, title, body' }, { status: 400 })\n" +
"    }\n\n" +
"    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''\n" +
"    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''\n" +
"    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@asmya.org'\n\n" +
"    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {\n" +
"      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })\n" +
"    }\n\n" +
"    const subscriptions = await db.pushSubscription.findMany({ where: { userId } })\n" +
"    if (subscriptions.length === 0) {\n" +
"      return NextResponse.json({ sent: 0, message: 'No push subscriptions found' })\n" +
"    }\n\n" +
"    let sent = 0\n" +
"    await Promise.allSettled(\n" +
"      subscriptions.map(async (sub: any) => {\n" +
"        try {\n" +
"          await webpush.sendNotification(\n" +
"            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },\n" +
"            JSON.stringify({ title, body: notificationBody, data: data || null }),\n" +
"            { vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY } }\n" +
"          )\n" +
"          sent++\n" +
"        } catch { /* expired subscription */ }\n" +
"      })\n" +
"    )\n\n" +
"    return NextResponse.json({ sent })\n" +
"  } catch (error) {\n" +
"    console.error('POST push/send error:', error)\n" +
"    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 })\n" +
"  }\n" +
"}\n";
fs.writeFileSync('src/app/api/push/send/route.ts', content, 'utf8');
console.log('DONE: push/send/route.ts fully rewritten');

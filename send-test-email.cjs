const fs = require('fs');
const path = require('path');

// Usage:
//   node send-test-email.cjs your-email@example.com [student|advisor] [th|en]
const recipient = process.argv[2];
const roleArg = (process.argv[3] || 'student').toLowerCase();
const langArg = (process.argv[4] || 'th').toLowerCase();

const isStudent = roleArg === 'student';
const isAdvisor = roleArg === 'advisor';
const isEn = langArg === 'en';

if (!recipient || !recipient.includes('@')) {
  console.log('\n❌ กรุณาระบุอีเมลปลายทางที่ต้องการให้ส่งไป เช่น:');
  console.log('   node send-test-email.cjs your-email@example.com student th');
  console.log('   node send-test-email.cjs your-email@example.com student en');
  console.log('   node send-test-email.cjs your-email@example.com advisor th');
  console.log('   node send-test-email.cjs your-email@example.com advisor en\n');
  process.exit(1);
}

// Read backend/.dev.vars
const envPath = path.join(__dirname, 'backend', '.dev.vars');
if (!fs.existsSync(envPath)) {
  console.error('❌ ไม่พบไฟล์ backend/.dev.vars');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const {
  GOOGLE_WORKSPACE_CLIENT_ID,
  GOOGLE_WORKSPACE_CLIENT_SECRET,
  GOOGLE_WORKSPACE_REFRESH_TOKEN,
  GOOGLE_WORKSPACE_SENDER,
} = env;

function encodeMimeHeader(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toMimeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  const b64 = btoa(binary);
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));
}

async function sendTest() {
  console.log(`\n🚀 กำลังส่งอีเมลทดสอบสำหรับ Role [${roleArg.toUpperCase()}] ภาษา [${langArg.toUpperCase()}] ไปยัง: ${recipient}...`);

  const displaySubject = isEn
    ? (isStudent ? 'Advising Appointment Confirmed' : 'New Advising Request Submitted')
    : (isStudent ? 'ยืนยันนัดหมายเวลาเข้าพบอาจารย์แล้ว' : '[AdvisingLog] คำร้องขอรับคำปรึกษาใหม่ — นายสมชาย ใจดี (6631503001)');

  const message = isEn
    ? (isStudent
        ? 'Your advising appointment has been confirmed for 2026-11-06 10:30 (SE Lab).'
        : 'Somchai Jaidee (6631503001) has submitted an advising request in category: Academic Performance & Study Plan | Preferred Slot: 15 Nov 2026 at 10:00 - 11:00.')
    : (isStudent
        ? 'อาจารย์ที่ปรึกษายืนยันการนัดหมายเข้าพบในวันที่ 2026-11-06 10:30 (se lab)'
        : 'นายสมชาย ใจดี (6631503001) ได้ยื่นคำร้องขอนัดหมายเข้าพบอาจารย์ที่ปรึกษา ในหมวดหมู่: ผลการเรียนและวางแผนการลงทะเบียนเรียน | วัน-เวลาที่นักศึกษาขอนัดหมาย: 15 พฤศจิกายน 2569 เวลา 10:00 - 11:00 น.');

  const targetUrl = 'https://advising-log.pages.dev/login';
  const boundary = `====_AdvisingLog_${Date.now()}====`;
  const formattedTimeTh = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const formattedTimeEn = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });

  const salutation = isEn
    ? (isStudent ? 'Dear Student,' : 'Dear Academic Advisor,')
    : (isStudent ? 'เรียน นักศึกษา,' : 'เรียน อาจารย์ที่ปรึกษาที่เคารพ,');

  const recipientRoleLabel = isEn
    ? (isStudent ? `Student (${recipient})` : `Academic Advisor (${recipient})`)
    : (isStudent ? `นักศึกษา (${recipient})` : `อาจารย์ที่ปรึกษา (${recipient})`);

  const introText = isEn
    ? (isStudent
        ? 'The Student Academic Advising System (AdvisingLog), Mae Fah Luang University, would like to notify you of an advising appointment update regarding your request:'
        : 'The Student Academic Advising System (AdvisingLog), Mae Fah Luang University, would like to notify you of an advising update regarding your advisee:')
    : (isStudent
        ? 'ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog) มหาวิทยาลัยแม่ฟ้าหลวง ขอแจ้งเตือนความคืบหน้าเกี่ยวกับการนัดหมายเข้าพบอาจารย์ที่ปรึกษา / คำร้องของท่าน ดังนี้:'
        : 'ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog) มหาวิทยาลัยแม่ฟ้าหลวง ขอแจ้งเตือนรายการใหม่ที่เกี่ยวข้องกับนักศึกษาในความดูแลของท่าน ดังนี้:');

  const buttonText = isEn
    ? (isStudent ? 'Sign in to View Appointment Details →' : 'Sign in to Review Request →')
    : (isStudent ? 'เข้าสู่ระบบเพื่อดูรายละเอียดนัดหมาย →' : 'เข้าสู่ระบบเพื่อตรวจสอบคำร้อง →');

  const formattedTime = isEn ? formattedTimeEn : formattedTimeTh;
  const boxTitle = isEn ? 'Notification Summary' : 'หัวข้อการแจ้งเตือน';
  const timeLabel = isEn ? 'Timestamp' : 'วันที่แจ้งเตือน';
  const linkHelp = isEn ? 'Or open link directly:' : 'หรือเปิดลิงก์:';

  // 1. Get access token from Google
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_WORKSPACE_CLIENT_ID,
      client_secret: GOOGLE_WORKSPACE_CLIENT_SECRET,
      refresh_token: GOOGLE_WORKSPACE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error('❌ ไม่สามารถขอ Access Token จาก Google ได้:', errText);
    return;
  }

  const tokenData = await tokenResponse.json();

  // 2. Prepare text & HTML bodies
  const textBody = isEn
    ? [
        `Subject: [AdvisingLog] ${displaySubject}`,
        `To: ${recipientRoleLabel}`,
        '',
        salutation,
        '',
        introText,
        '',
        `• Topic: ${displaySubject}`,
        `• Details: ${message}`,
        `• ${timeLabel}: ${formattedTime}`,
        '',
        'You can sign in to the AdvisingLog system at:',
        `👉 ${targetUrl}`,
        '',
        'Sincerely yours,',
        'Academic Advising & Quality Assurance System (AdvisingLog)',
        'School of Applied Digital Technology, Mae Fah Luang University',
        '--------------------------------------------------------------------------------',
        'Note: This is an automated notification in compliance with the Personal Data Protection Act (PDPA), Mae Fah Luang University. Please do not reply directly to this email.',
      ].join('\r\n')
    : [
        `เรื่อง: ${displaySubject}`,
        `ถึง: ${recipientRoleLabel}`,
        '',
        salutation,
        '',
        introText,
        '',
        `• หัวข้อ: ${displaySubject}`,
        `• รายละเอียด: ${message}`,
        `• ${timeLabel}: ${formattedTime}`,
        '',
        'ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบข้อมูลและดำเนินการได้ที่:',
        `👉 ${targetUrl}`,
        '',
        'ขอแสดงความนับถือ',
        'ระบบบริหารการให้คำปรึกษาทางวิชาการและการประกันคุณภาพการศึกษา (AdvisingLog)',
        'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง',
        '--------------------------------------------------------------------------------',
        'หมายเหตุ: อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบรักษาความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) มหาวิทยาลัยแม่ฟ้าหลวง กรุณาอย่าตอบกลับอีเมลนี้โดยตรง',
      ].join('\r\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'th'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(displaySubject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Sarabun', sans-serif; background-color: #ffffff; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner (Clean White Theme) -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 32px 24px 32px; text-align: left; border-bottom: 2px solid #0284c7;">
              <span style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 4px;">Mae Fah Luang University</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                ${isEn ? 'Student Academic Advising System (AdvisingLog)' : 'ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog)'}
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                ${isEn ? 'School of Applied Digital Technology' : 'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ • School of Applied Digital Technology'}
              </p>
            </td>
          </tr>
          
          <!-- Main Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #1e293b;">
                <strong>${escapeHtml(salutation)}</strong>
              </p>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${escapeHtml(introText)}
              </p>
              
              <table role="presentation" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                      ${escapeHtml(boxTitle)}
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 10px; line-height: 1.4;">
                      ${escapeHtml(displaySubject)}
                    </div>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 13.5px; line-height: 1.6; color: #334155;">
                      ${escapeHtml(message)}
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
                      ⏱️ ${escapeHtml(timeLabel)}: ${formattedTime}
                    </div>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 11px 26px; border-radius: 8px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);">
                      ${escapeHtml(buttonText)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                ${escapeHtml(linkHelp)} <a href="${targetUrl}" style="color: #0284c7; word-break: break-all;">${targetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #475569;">
                ${isEn ? 'Academic Advising & Quality Assurance System (AdvisingLog)' : 'ระบบบริหารการให้คำปรึกษาทางวิชาการและการประกันคุณภาพการศึกษา (AdvisingLog)'}
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                ${isEn
                  ? 'School of Applied Digital Technology, Mae Fah Luang University<br>333 Moo 1, Thasud, Mueang, Chiang Rai 57100 Thailand'
                  : 'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง<br>333 หมู่ 1 ต.ท่าสุด อ.เมือง จ.เชียงราย 57100'}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                ${isEn
                  ? '* This is an automated notification in compliance with the Personal Data Protection Act (PDPA), Mae Fah Luang University. Please do not reply directly to this email.'
                  : '* อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบรักษาความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) มหาวิทยาลัยแม่ฟ้าหลวง กรุณาอย่าตอบกลับอีเมลนี้โดยตรง'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const rawMessage = [
    `From: ${GOOGLE_WORKSPACE_SENDER}`,
    `To: ${recipient}`,
    `Subject: ${encodeMimeHeader(displaySubject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toMimeBase64(textBody),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toMimeBase64(htmlBody),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  // 3. Send via Gmail API
  const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
  });

  if (!gmailResponse.ok) {
    const errText = await gmailResponse.text();
    console.error('❌ การส่งอีเมลล้มเหลว:', gmailResponse.status, errText);
    return;
  }

  const result = await gmailResponse.json();
  console.log('✅ ส่งอีเมลสำเร็จเรียบร้อยแล้ว!');
  console.log('   Message ID:', result.id);
  console.log(`   กรุณาเปิดตรวจสอบกล่องจดหมายที่: ${recipient}\n`);
}

sendTest().catch(console.error);

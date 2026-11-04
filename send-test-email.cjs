const fs = require('fs');
const path = require('path');

// Target recipient from command line argument
const recipient = process.argv[2];

if (!recipient || !recipient.includes('@')) {
  console.log('\n❌ กรุณาระบุอีเมลปลายทางที่ต้องการให้ส่งไป เช่น:');
  console.log('   node send-test-email.cjs your-email@example.com\n');
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
  console.log(`\n🚀 กำลังส่งอีเมลทดสอบเทมเพลตทางการ (Thai + English Below) ไปยัง: ${recipient}...`);
  const subject = '[AdvisingLog] คำร้องขอรับคำปรึกษาใหม่ / New Advising Request — นายสมชาย ใจดี (6631503001)';
  const message = 'นายสมชาย ใจดี (6631503001) ได้ยื่นคำร้องขอนัดหมายเข้าพบอาจารย์ที่ปรึกษา ในหมวดหมู่: ผลการเรียนและวางแผนการลงทะเบียนเรียน | วัน-เวลาที่นักศึกษาขอนัดหมาย: 15 พฤศจิกายน 2569 เวลา 10:00 - 11:00 น.';
  const targetUrl = 'https://advising-log.pages.dev/login';
  const boundary = `====_AdvisingLog_${Date.now()}====`;
  const formattedTimeTh = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const formattedTimeEn = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });

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

  // 2. Prepare text & HTML bodies (Thai + English Below)
  const textBody = [
    `เรื่อง: ${subject}`,
    `ถึง / To: อาจารย์ที่ปรึกษา / Academic Advisor (${recipient})`,
    '',
    'เรียน อาจารย์ที่ปรึกษาที่เคารพ,',
    '',
    'ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog) มหาวิทยาลัยแม่ฟ้าหลวง ขอแจ้งเตือนรายการใหม่ ดังนี้:',
    '',
    `• รายละเอียด: ${message}`,
    `• วันที่และเวลาแจ้งเตือน: ${formattedTimeTh}`,
    '',
    'ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบข้อมูลและดำเนินการได้ที่:',
    `👉 ${targetUrl}`,
    '',
    'ขอแสดงความนับถือ',
    'ระบบบริหารการให้คำปรึกษาทางวิชาการและการประกันคุณภาพการศึกษา (AdvisingLog)',
    'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง',
    '',
    '================================================================================',
    '                              ENGLISH VERSION BELOW                             ',
    '================================================================================',
    '',
    'Dear Academic Advisor,',
    '',
    'The Student Academic Advising System (AdvisingLog), Mae Fah Luang University, would like to notify you of an advising update regarding your advisee:',
    '',
    `• Details: ${message}`,
    `• Notification Timestamp: ${formattedTimeEn}`,
    '',
    'Please sign in to the AdvisingLog system to review and manage this request:',
    `👉 ${targetUrl}`,
    '',
    'Sincerely yours,',
    'Academic Advising & Quality Assurance System (AdvisingLog)',
    'School of Applied Digital Technology, Mae Fah Luang University',
    '--------------------------------------------------------------------------------',
    'Note: This is an automated notification in compliance with the Personal Data Protection Act (PDPA), Mae Fah Luang University. Please do not reply directly to this email.',
  ].join('\r\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Sarabun', sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 32px 28px 32px; text-align: left; border-bottom: 3px solid #0284c7;">
              <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 4px;">Mae Fah Luang University</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog)</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">School of Applied Digital Technology • สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์</p>
            </td>
          </tr>
          
          <!-- Section 1: ภาษาไทย (Thai Version) -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #1e293b;">
                <strong>เรียน อาจารย์ที่ปรึกษาที่เคารพ,</strong>
              </p>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog) มหาวิทยาลัยแม่ฟ้าหลวง ขอแจ้งเตือนรายการใหม่ที่เกี่ยวข้องกับนักศึกษาในความดูแลของท่าน ดังนี้:
              </p>
              
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                      หัวข้อการแจ้งเตือน
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 10px; line-height: 1.4;">
                      ${escapeHtml(subject)}
                    </div>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 13.5px; line-height: 1.6; color: #334155;">
                      ${escapeHtml(message)}
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
                      ⏱️ วันที่แจ้งเตือน: ${formattedTimeTh}
                    </div>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 11px 26px; border-radius: 8px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);">
                      เข้าสู่ระบบเพื่อตรวจสอบคำร้อง &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                หรือเปิดลิงก์: <a href="${targetUrl}" style="color: #0284c7; word-break: break-all;">${targetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Section Divider: English Version Below -->
          <tr>
            <td style="padding: 10px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-bottom: 1.5px dashed #cbd5e1; text-align: center; height: 1px;"></td>
                  <td style="width: 1px; padding: 0 12px; white-space: nowrap; text-align: center;">
                    <span style="display: inline-block; background-color: #e2e8f0; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 12px; border-radius: 9999px;">
                      English Version Below
                    </span>
                  </td>
                  <td style="border-bottom: 1.5px dashed #cbd5e1; text-align: center; height: 1px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 2: ภาษาอังกฤษ (English Version) -->
          <tr>
            <td style="padding: 20px 32px 32px 32px;">
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #1e293b;">
                <strong>Dear Academic Advisor,</strong>
              </p>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                The Student Academic Advising System (AdvisingLog), Mae Fah Luang University, would like to notify you of an advising update regarding your advisee:
              </p>

              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                      Notification Summary
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 10px; line-height: 1.4;">
                      ${escapeHtml(subject)}
                    </div>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 13.5px; line-height: 1.6; color: #334155;">
                      ${escapeHtml(message)}
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
                      ⏱️ Timestamp: ${formattedTimeEn}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 11px 26px; border-radius: 8px; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.25);">
                      Sign in to Review Request &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                Or open URL: <a href="${targetUrl}" style="color: #0284c7; word-break: break-all;">${targetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Institutional Footer (Bilingual) -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #475569;">
                ระบบบริหารการให้คำปรึกษาทางวิชาการและการประกันคุณภาพการศึกษา (AdvisingLog)
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง<br>
                School of Applied Digital Technology, Mae Fah Luang University<br>
                333 Moo 1, Thasud, Mueang, Chiang Rai 57100 Thailand
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                * อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบรักษาความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) มหาวิทยาลัยแม่ฟ้าหลวง กรุณาอย่าตอบกลับอีเมลนี้โดยตรง<br>
                * This is an automated notification in compliance with the Personal Data Protection Act (PDPA), Mae Fah Luang University. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

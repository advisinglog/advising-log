/**
 * Script สำหรับทดสอบยิงอีเมลแจ้งเตือนคำร้องขอเข้าพบอาจารย์
 * ใช้งาน: node scripts/send_test_email.js [email_ปลายทาง]
 */
const fs = require('fs');
const path = require('path');

// ค้นหาและโหลดค่าจาก backend/.dev.vars
const envPath = path.resolve(process.cwd(), 'backend/.dev.vars');
if (!fs.existsSync(envPath)) {
  console.error('ไม่พบไฟล์ backend/.dev.vars');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

function encodeMimeHeader(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return `=?UTF-8?B?${Buffer.from(binary, 'binary').toString('base64')}?=`;
}

function toMimeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  const b64 = Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function main() {
  const recipient = process.argv[2] || env.GOOGLE_WORKSPACE_SENDER;
  const advisorName = 'ที่ปรึกษา (ทดสอบ)';
  const studentName = 'นายสมชาย ใจดี (รหัสนักศึกษา 6631503001)';
  const topic = 'ขอปรึกษาเรื่องการวางแผนลงทะเบียนเรียน และการถอนรายวิชา';
  const preferredDateTime = 'วันพุธที่ 18 พฤศจิกายน 2569 เวลา 13:30 - 14:00 น.';
  const notes = 'เนื่องจากมีวิชาบังคับก่อนที่ยังไม่ผ่าน จึงอยากขอคำแนะนำแผนการเรียนสำหรับเทอมถัดไปครับ';

  console.log(`[1/2] กำลังขอ Access Token ด้วย Permanent Refresh Token...`);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_WORKSPACE_CLIENT_ID,
      client_secret: env.GOOGLE_WORKSPACE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_WORKSPACE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Token fetch failed: ${JSON.stringify(tokenData)}`);
  }

  const subject = 'คำร้องขอรับคำปรึกษาใหม่';
  const targetUrl = 'https://advising-log.pages.dev';
  const boundary = `====_AdvisingLog_${Date.now()}====`;
  const formattedTimeTh = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  const salutation = `เรียน อาจารย์${advisorName} ที่เคารพ,`;
  const introText = 'ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog) มหาวิทยาลัยแม่ฟ้าหลวง ขอแจ้งเตือนรายการใหม่ที่เกี่ยวข้องกับนักศึกษาในความดูแลของท่าน ดังนี้:';
  const message = `• นักศึกษา: ${studentName}\n• หัวข้อคำร้อง: ${topic}\n• วัน-เวลาที่สะดวกเข้าพบ: ${preferredDateTime}\n• รายละเอียดเพิ่มเติม: ${notes}`;

  const textBody = [
    `เรื่อง: ${subject}`,
    `ถึง: อาจารย์ที่ปรึกษา (${recipient})`,
    '',
    salutation,
    '',
    introText,
    '',
    `• หัวข้อ: ${subject}`,
    `• รายละเอียด:\n${message}`,
    `• วันที่แจ้งเตือน: ${formattedTimeTh}`,
    '',
    'ท่านสามารถตรวจสอบคำร้องและเลือกเวลานัดหมายได้ที่:',
    `👉 ${targetUrl}`,
    '',
    'ขอแสดงความนับถือ',
    'ระบบบริหารการให้คำปรึกษาทางวิชาการและการประกันคุณภาพการศึกษา (AdvisingLog)',
    'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง',
    '--------------------------------------------------------------------------------',
    'หมายเหตุ: ข้อความนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ AdvisingLog กรุณาอย่าตอบกลับอีเมลนี้โดยตรง'
  ].join('\r\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Sarabun', sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 32px 24px 32px; text-align: left; border-bottom: 2px solid #0284c7;">
              <span style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 4px;">Mae Fah Luang University</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                ระบบบริหารการให้คำปรึกษาทางวิชาการ (AdvisingLog)
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ • School of Applied Digital Technology
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
              
              <table role="presentation" width="100%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; margin-bottom: 22px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                      🔔 คำร้องใหม่รอดำเนินการ
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: #0369a1; margin-bottom: 12px;">
                      ${escapeHtml(subject)}
                    </div>
                    <div style="border-top: 1px solid #e0f2fe; padding-top: 12px; font-size: 13.5px; line-height: 1.8; color: #334155;">
                      <div><strong>👤 นักศึกษา:</strong> ${escapeHtml(studentName)}</div>
                      <div><strong>📌 หัวข้อ:</strong> ${escapeHtml(topic)}</div>
                      <div><strong>🗓️ วัน-เวลาที่สะดวก:</strong> ${escapeHtml(preferredDateTime)}</div>
                      <div><strong>💬 รายละเอียด:</strong> ${escapeHtml(notes)}</div>
                    </div>
                    <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
                      ⏱️ วันที่ยื่นคำร้อง: ${formattedTimeTh}
                    </div>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);">
                      ดูรายละเอียดคำร้อง →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                หรือเปิดลิงก์: <a href="${targetUrl}" style="color: #0284c7; word-break: break-all;">${targetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #475569;">
                ระบบบริหารการให้คำปรึกษาทางวิชาการและการประกันคุณภาพการศึกษา (AdvisingLog)
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง<br>333 หมู่ 1 ต.ท่าสุด อ.เมือง จ.เชียงราย 57100
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                * ข้อความนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ AdvisingLog กรุณาอย่าตอบกลับอีเมลนี้โดยตรง
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
    `From: AdvisingLog <${env.GOOGLE_WORKSPACE_SENDER}>`,
    `To: ${recipient}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
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

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log(`[2/2] กำลังยิงอีเมลไปยัง: ${recipient}...`);
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  const sendData = await sendRes.json();
  if (!sendRes.ok) {
    throw new Error(`Send email failed: ${JSON.stringify(sendData)}`);
  }

  console.log(`\n🎉 ยิงอีเมลคำร้องสำเร็จเรียบร้อย!`);
  console.log(`- ผู้รับ: ${recipient}`);
  console.log(`- หัวข้อ: ${subject}`);
  console.log(`- Google Message ID: ${sendData.id}`);
}

main().catch(err => {
  console.error('\n❌ เกิดข้อผิดพลาด:', err.message);
  process.exit(1);
});

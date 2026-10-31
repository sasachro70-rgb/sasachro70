/* Texts for the Admin Panel (admin.html) in Swedish, English and Thai. Added to FGH.FT under "adm". */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const S = {
    sv: { adm: {
      title: 'Administration', checking: 'Kontrollerar behörighet…', notAdmin: 'Administrationen är bara för systemägaren och administratörer.', signIn: 'Logga in på lärarsidan',
      tabs: { requests: 'Förfrågningar', users: 'Användare', invites: 'Inbjudningar', classes: 'Klasser', courses: 'Kurser', log: 'Säkerhetslogg', system: 'Systemkontroll' },
      noRight: 'Ditt konto saknar behörighet för den här delen ({p}).', none: 'Inget att visa.', search: 'Sök namn eller konto-ID', all: 'Alla',
      role: { super_admin: 'Systemägare', admin: 'Administratör', teacher: 'Lärare', parent: 'Förälder', student: 'Elev', user: 'Användare' },
      status: { pending: 'Väntar', approved: 'Godkänd', rejected: 'Avvisad', suspended: 'Avstängd', deactivated: 'Avslutad' },
      requested: 'Vill bli: {r}', note: 'Meddelande', approveAs: 'Godkänn som', approve: 'Godkänn', reject: 'Avvisa', created: 'Skapad', lastSeen: 'Senast aktiv',
      changeRole: 'Ändra roll', suspend: 'Stäng av', reactivate: 'Aktivera igen', deactivate: 'Avsluta konto', perms: 'Behörigheter', savePerms: 'Spara behörigheter', you: 'du',
      ownerOnly: 'Bara systemägaren kan ändra administratörer.', askSure: 'Är du säker?', saved: 'Sparat.',
      newInvite: 'Ny inbjudan', inviteRole: 'Roll', days: 'Giltig (dagar)', inviteNote: 'Anteckning (t.ex. namn)', createInvite: 'Skapa inbjudan',
      inviteLink: 'Inbjudningslänk – visas bara nu. Skicka den till personen:', copy: 'Kopiera', copied: 'Kopierad!', revoke: 'Återkalla', used: 'Använd', revoked: 'Återkallad', expired: 'Utgången', active: 'Aktiv', expires: 'Går ut {d}',
      classes: 'Alla klasser', className: 'Klass', code: 'Kod', teacher: 'Lärare', students: 'Elever', openTeacher: 'Öppna lärarsidan', archived: 'arkiverad',
      courses: 'Publicerade kurser', version: 'Version', openContent: 'Öppna kursinnehåll', builtIn: 'Inbyggda kurser (i appen)',
      when: 'Tid', who: 'Vem', what: 'Händelse', target: 'Gäller',
      sysTitle: 'Är databasen uppdaterad?', sysHelp: 'Kontrollerar att varje databasuppdatering (migration) är körd och att lagringsplatserna finns. Kör saknade filer i Supabase → SQL Editor i nummerordning.',
      runCheck: 'Kontrollera nu', ok: 'OK', missing: 'Saknas', mig: { m1: 'Familjer, rum och spel', m2: 'Poäng, belöningar, lärande', m3: 'Konton, roller och behörigheter', m4: 'Klasser och elevinloggning', m5: 'Läxor och skyddat kursinnehåll', m6: 'Kursinnehåll för lärare', m7: 'Naturlig thailändsk molnröst' },
      ttsCheck: 'Thailändsk molnröst (Edge Function "tts")',
      bucket: 'Lagring: {b}', config: 'Supabase-adress och publik nyckel i js/online/config.js', bookContent: 'BOOK 42 i databasen', settings: 'Kontrollera även i Supabase: Authentication → Anonymous sign-ins PÅ (elevinloggning), Rate limits för anonyma inloggningar höjda för skolnätverk, Storage-buckets "submissions" och "course-media" är privata.'
    } },
    en: { adm: {
      title: 'Administration', checking: 'Checking access…', notAdmin: 'Administration is only for the System Creator and Admins.', signIn: 'Sign in on the teacher page',
      tabs: { requests: 'Requests', users: 'Users', invites: 'Invitations', classes: 'Classes', courses: 'Courses', log: 'Security log', system: 'System check' },
      noRight: 'Your account has no right for this part ({p}).', none: 'Nothing to show.', search: 'Search name or account ID', all: 'All',
      role: { super_admin: 'System Creator', admin: 'Admin', teacher: 'Teacher', parent: 'Parent', student: 'Student', user: 'User' },
      status: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended', deactivated: 'Deactivated' },
      requested: 'Asks to be: {r}', note: 'Message', approveAs: 'Approve as', approve: 'Approve', reject: 'Reject', created: 'Created', lastSeen: 'Last active',
      changeRole: 'Change role', suspend: 'Suspend', reactivate: 'Re-activate', deactivate: 'Deactivate', perms: 'Permissions', savePerms: 'Save permissions', you: 'you',
      ownerOnly: 'Only the System Creator can change Admins.', askSure: 'Are you sure?', saved: 'Saved.',
      newInvite: 'New invitation', inviteRole: 'Role', days: 'Valid (days)', inviteNote: 'Note (e.g. name)', createInvite: 'Create invitation',
      inviteLink: 'Invitation link – shown only now. Send it to the person:', copy: 'Copy', copied: 'Copied!', revoke: 'Revoke', used: 'Used', revoked: 'Revoked', expired: 'Expired', active: 'Active', expires: 'Expires {d}',
      classes: 'All classes', className: 'Class', code: 'Code', teacher: 'Teacher', students: 'Students', openTeacher: 'Open the teacher page', archived: 'archived',
      courses: 'Published courses', version: 'Version', openContent: 'Open course content', builtIn: 'Built-in courses (in the app)',
      when: 'Time', who: 'Who', what: 'Event', target: 'Concerns',
      sysTitle: 'Is the database up to date?', sysHelp: 'Checks that every database update (migration) has been run and that the storage buckets exist. Run missing files in Supabase → SQL Editor in number order.',
      runCheck: 'Check now', ok: 'OK', missing: 'Missing', mig: { m1: 'Families, rooms and games', m2: 'Points, rewards, learning', m3: 'Accounts, roles and permissions', m4: 'Classes and student login', m5: 'Homework and protected content', m6: 'Course content for teachers', m7: 'Natural Thai cloud voice' },
      ttsCheck: 'Thai cloud voice (Edge Function "tts")',
      bucket: 'Storage: {b}', config: 'Supabase address and public key in js/online/config.js', bookContent: 'BOOK 42 in the database', settings: 'Also check in Supabase: Authentication → Anonymous sign-ins ON (student login), anonymous sign-in rate limits raised for school networks, Storage buckets "submissions" and "course-media" are private.'
    } },
    th: { adm: {
      title: 'ผู้ดูแลระบบ', checking: 'กำลังตรวจสอบสิทธิ์…', notAdmin: 'ส่วนนี้สำหรับเจ้าของระบบและผู้ดูแลระบบเท่านั้น', signIn: 'เข้าสู่ระบบที่หน้าครู',
      tabs: { requests: 'คำขอ', users: 'ผู้ใช้', invites: 'คำเชิญ', classes: 'ห้องเรียน', courses: 'คอร์ส', log: 'บันทึกความปลอดภัย', system: 'ตรวจระบบ' },
      noRight: 'บัญชีของคุณไม่มีสิทธิ์ในส่วนนี้ ({p})', none: 'ไม่มีข้อมูล', search: 'ค้นหาชื่อหรือรหัสบัญชี', all: 'ทั้งหมด',
      role: { super_admin: 'เจ้าของระบบ', admin: 'ผู้ดูแลระบบ', teacher: 'ครู', parent: 'ผู้ปกครอง', student: 'นักเรียน', user: 'ผู้ใช้' },
      status: { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ', suspended: 'ระงับ', deactivated: 'ปิดบัญชี' },
      requested: 'ขอเป็น: {r}', note: 'ข้อความ', approveAs: 'อนุมัติเป็น', approve: 'อนุมัติ', reject: 'ปฏิเสธ', created: 'สร้างเมื่อ', lastSeen: 'ใช้งานล่าสุด',
      changeRole: 'เปลี่ยนบทบาท', suspend: 'ระงับ', reactivate: 'เปิดใช้อีกครั้ง', deactivate: 'ปิดบัญชี', perms: 'สิทธิ์', savePerms: 'บันทึกสิทธิ์', you: 'คุณ',
      ownerOnly: 'เฉพาะเจ้าของระบบเท่านั้นที่เปลี่ยนผู้ดูแลระบบได้', askSure: 'แน่ใจหรือไม่', saved: 'บันทึกแล้ว',
      newInvite: 'สร้างคำเชิญ', inviteRole: 'บทบาท', days: 'ใช้ได้ (วัน)', inviteNote: 'หมายเหตุ (เช่น ชื่อ)', createInvite: 'สร้างคำเชิญ',
      inviteLink: 'ลิงก์คำเชิญ – แสดงครั้งเดียว ส่งให้ผู้รับได้เลย:', copy: 'คัดลอก', copied: 'คัดลอกแล้ว!', revoke: 'ยกเลิก', used: 'ใช้แล้ว', revoked: 'ยกเลิกแล้ว', expired: 'หมดอายุ', active: 'ใช้ได้', expires: 'หมดอายุ {d}',
      classes: 'ห้องเรียนทั้งหมด', className: 'ห้อง', code: 'รหัส', teacher: 'ครู', students: 'นักเรียน', openTeacher: 'เปิดหน้าครู', archived: 'เก็บแล้ว',
      courses: 'คอร์สที่เผยแพร่', version: 'ฉบับ', openContent: 'เปิดหน้าจัดการเนื้อหา', builtIn: 'คอร์สในแอป',
      when: 'เวลา', who: 'ผู้ทำ', what: 'เหตุการณ์', target: 'เกี่ยวกับ',
      sysTitle: 'ฐานข้อมูลอัปเดตครบหรือยัง', sysHelp: 'ตรวจว่ารัน migration ครบทุกไฟล์และมีที่เก็บไฟล์ครบ ถ้าขาดไฟล์ไหนให้รันใน Supabase → SQL Editor ตามลำดับเลข',
      runCheck: 'ตรวจเดี๋ยวนี้', ok: 'เรียบร้อย', missing: 'ยังไม่มี', mig: { m1: 'ครอบครัว ห้องเกม และเกม', m2: 'คะแนน รางวัล การเรียน', m3: 'บัญชี บทบาท และสิทธิ์', m4: 'ห้องเรียนและการเข้าสู่ระบบของนักเรียน', m5: 'การบ้านและเนื้อหาที่ป้องกัน', m6: 'จัดการเนื้อหาสำหรับครู', m7: 'เสียงไทยธรรมชาติจากคลาวด์' },
      ttsCheck: 'เสียงไทยจากคลาวด์ (Edge Function "tts")',
      bucket: 'ที่เก็บไฟล์: {b}', config: 'ที่อยู่ Supabase และคีย์สาธารณะใน js/online/config.js', bookContent: 'หนังสือ BOOK 42 ในฐานข้อมูล', settings: 'ตรวจใน Supabase ด้วย: Authentication → Anonymous sign-ins เปิด (สำหรับนักเรียน), เพิ่ม Rate limit ของ anonymous sign-in สำหรับเครือข่ายโรงเรียน, Storage bucket "submissions" และ "course-media" เป็น private'
    } }
  };
  FGH.FT = FGH.FT || {};
  for (const l in S) FGH.FT[l] = Object.assign(FGH.FT[l] || {}, S[l]);
  FGH.adminTexts = S;
})(typeof window !== 'undefined' ? window : globalThis);

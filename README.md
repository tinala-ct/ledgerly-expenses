# Ledgerly — รายรับรายจ่ายที่เปิดเร็ว

เว็บแอป Next.js ที่คุยกับ Supabase โดยตรง ไม่มี Google Apps Script อยู่ในเส้นทางโหลดหน้าเว็บ จึงเปิดหน้าแรกได้ทันที และข้อมูลอยู่ใน PostgreSQL เพื่อใช้ต่อเนื่องหลายวัน/หลายปี

## เริ่มใช้งาน

1. สร้างโปรเจกต์ที่ [Supabase](https://supabase.com/dashboard) แล้วนำ SQL ใน `supabase/schema.sql` ไปรันใน **SQL Editor**
2. ใน **Authentication > Providers** เปิด Email และสร้างผู้ใช้ของคุณ (หรือเพิ่มหน้า login ในขั้นต่อไป)
3. คัดลอก `.env.example` เป็น `.env.local` แล้วกรอก Project URL และ Publishable key จาก Supabase Connect
4. ติดตั้งและรัน: `npm install` แล้ว `npm run dev`

ถ้ายังไม่ตั้งค่า Supabase แอปยังทดลองเพิ่ม/ลบรายการได้ โดยเก็บในเบราว์เซอร์เครื่องนั้นเท่านั้นและแสดงสถานะ “โหมดทดลองในเครื่อง” ชัดเจน

## PDF ไทย / English

เลือกช่วงวันที่ แล้วกด **Export PDF report** → **พิมพ์ / Save as PDF** ในหน้าต่างใหม่ เบราว์เซอร์จะฝังฟอนต์ภาษาไทย/อังกฤษที่รองรับใน PDF ได้โดยตรง

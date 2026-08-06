import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ledgerly | รายรับรายจ่าย',
  description: 'บันทึกรายจ่ายแบบรวดเร็ว พร้อมรายงาน PDF',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}

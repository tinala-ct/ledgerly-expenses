'use client';

import { useEffect, useState } from 'react';
import { Expense } from '@/lib/types';

type Report = { entries: Expense[]; total: number; range: { start: string; end: string } };
const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { const value = sessionStorage.getItem('ledgerly-report'); if (value) setReport(JSON.parse(value)); }, []);
  if (!report) return <main className="report loading-report">ไม่พบข้อมูลรายงาน กรุณากลับไปเลือกช่วงเวลาใหม่</main>;
  const fmt = (d: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d + 'T00:00:00'));
  return <main className="report"><button className="print-button" onClick={() => window.print()}>พิมพ์ / Save as PDF</button><header><div className="report-brand">L<span>ledgerly</span></div><p>PERSONAL EXPENSE REPORT</p><h1>รายงานรายจ่าย</h1><div className="report-range">{fmt(report.range.start)} — {fmt(report.range.end)}</div></header><section className="report-total"><span>ยอดรวมทั้งหมด / Total expenses</span><strong>{money.format(report.total)}</strong><small>{report.entries.length} transactions</small></section><table><thead><tr><th>วันที่ / Date</th><th>รายการ / Description</th><th>หมวดหมู่ / Category</th><th>จำนวนเงิน / Amount</th></tr></thead><tbody>{report.entries.map((x) => <tr key={x.id}><td>{fmt(x.spent_on)}</td><td><b>{x.title}</b>{x.note && <small>{x.note}</small>}</td><td>{x.category}</td><td>{money.format(Number(x.amount))}</td></tr>)}</tbody></table><footer>สร้างเมื่อ {new Date().toLocaleString('th-TH')} · Ledgerly Expense Tracker</footer></main>;
}

'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { Expense } from '@/lib/types';
import styles from './report.module.css';

type Report = { entries: Expense[]; total: number; range: { start: string; end: string } };
type Slice = { name: string; amount: number; color: string };
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
const colors = ['#5166cf', '#e77982', '#e7b85e', '#69a78b', '#9a7cc8', '#7d93a4', '#b98869', '#86b9c5'];

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { const value = sessionStorage.getItem('ledgerly-report'); if (value) setReport(JSON.parse(value)); }, []);
  const slices = useMemo<Slice[]>(() => {
    if (!report) return [];
    const totals = new Map<string, number>();
    report.entries.forEach((entry) => totals.set(entry.category, (totals.get(entry.category) || 0) + Number(entry.amount)));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount], index) => ({ name, amount, color: colors[index % colors.length] }));
  }, [report]);
  if (!report) return <main className="report loading-report">No report data found. Please return and select a date range.</main>;
  const fmt = (date: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date + 'T00:00:00'));
  const safeTotal = report.total || 1;
  let cursor = 0;
  const stops = slices.map((slice) => { const start = cursor; cursor += (slice.amount / safeTotal) * 100; return `${slice.color} ${start}% ${cursor}%`; }).join(', ');
  const pieStyle = { background: stops ? `conic-gradient(${stops})` : '#e8ebef' } as CSSProperties;

  return <main className={`report ${styles.paper}`}>
    <button className="print-button" onClick={() => window.print()}>Print / Save PDF</button>
    <header className={styles.header}><div className={styles.brand}>LEDGERLY</div><p>EXPENSE SUMMARY</p><h1>Expense Report</h1><div>{fmt(report.range.start)} - {fmt(report.range.end)}</div></header>
    <section className={styles.summary}><div><p>Total Spent</p><strong>{money.format(report.total)}</strong><span>{report.entries.length} transactions</span></div><div><p>Largest Category</p><strong className={styles.categoryTotal}>{slices[0]?.name || '-'}</strong><span>{slices[0] ? money.format(slices[0].amount) : '-'}</span></div></section>
    <section className={styles.analysis}><div className={styles.chartCard}><div className={styles.sectionLabel}>SPENDING BY CATEGORY</div><div className={styles.chartRow}><div className={styles.donut} style={pieStyle}><div><b>{money.format(report.total)}</b><span>Total</span></div></div><div className={styles.legend}>{slices.map((slice) => <div key={slice.name}><i style={{ background: slice.color }} /><span>{slice.name}</span><b>{Math.round((slice.amount / safeTotal) * 100)}%</b></div>)}</div></div></div><div className={styles.categoryList}><div className={styles.sectionLabel}>CATEGORY BREAKDOWN</div>{slices.map((slice) => <div key={slice.name}><span><i style={{ background: slice.color }} />{slice.name}</span><b>{money.format(slice.amount)}</b></div>)}</div></section>
    <section className={styles.transactions}><div className={styles.sectionLabel}>TRANSACTION LIST</div><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>{report.entries.map((entry) => <tr key={entry.id}><td>{fmt(entry.spent_on)}</td><td><b>{entry.title}</b>{entry.note && <small>{entry.note}</small>}</td><td>{entry.category}</td><td>{money.format(Number(entry.amount))}</td></tr>)}</tbody></table></section>
    <section className={styles.qrBlock}><div><p>PAYMENT QR</p><h2>Scan to transfer</h2><span>PromptPay payment QR code</span></div><img src="/payment-qr.jpg" alt="PromptPay QR code for payment" /></section>
    <footer>Generated {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())} · Ledgerly Expense Tracker</footer>
  </main>;
}

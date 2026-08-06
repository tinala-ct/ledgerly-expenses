'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { Expense } from '@/lib/types';
import styles from './report.module.css';

type Report = { entries: Expense[]; total: number; range: { start: string; end: string } };
type Slice = { name: string; amount: number; color: string };
const palette = ['#274c66', '#476d86', '#6b8fa5', '#91adbd', '#b3c7d2', '#79939c', '#9a7f84', '#b09783'];
const formatMoney = (amount: number) => `THB ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { const value = sessionStorage.getItem('ledgerly-report'); if (value) setReport(JSON.parse(value)); }, []);
  const slices = useMemo<Slice[]>(() => {
    if (!report) return [];
    const totals = new Map<string, number>();
    report.entries.forEach((entry) => totals.set(entry.category, (totals.get(entry.category) || 0) + Number(entry.amount)));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount], index) => ({ name, amount, color: palette[index % palette.length] }));
  }, [report]);
  if (!report) return <main className="report loading-report">No report data found. Please return and select a date range.</main>;
  const fmt = (date: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date + 'T00:00:00'));
  const safeTotal = report.total || 1;
  const average = report.entries.length ? report.total / report.entries.length : 0;
  const highest = report.entries.reduce<Expense | null>((current, item) => !current || Number(item.amount) > Number(current.amount) ? item : current, null);
  let cursor = 0;
  const stops = slices.map((slice) => { const start = cursor; cursor += (slice.amount / safeTotal) * 100; return `${slice.color} ${start}% ${cursor}%`; }).join(', ');
  const pieStyle = { background: stops ? `conic-gradient(${stops})` : '#e8ebef' } as CSSProperties;

  return <main className={`report ${styles.paper}`}>
    <button className="print-button" onClick={() => window.print()}>Print / Save PDF</button>
    <button className={styles.homeButton} onClick={() => { window.location.href = '/'; }}>← Back to Home</button>
    <header className={styles.header}><div className={styles.brand}>LEDGERLY</div><p>PERSONAL EXPENSE MANAGER</p><h1>Expense Report</h1><div>{fmt(report.range.start)} - {fmt(report.range.end)}</div></header>
    <section className={styles.summaryGrid} aria-label="Expense summary"><article><p>Total Expenses</p><strong>{formatMoney(report.total)}</strong></article><article><p>Transactions</p><strong>{report.entries.length}</strong></article><article><p>Average per Item</p><strong>{formatMoney(average)}</strong></article><article><p>Highest Expense</p><strong>{highest ? formatMoney(Number(highest.amount)) : '-'}</strong><span>{highest?.title || 'No transactions'}</span></article></section>
    <section className={styles.chartSection}><div><div className={styles.sectionLabel}>SPENDING BY CATEGORY</div><div className={styles.chartPanel}><div className={styles.donut} style={pieStyle}><div><b>{formatMoney(report.total)}</b><span>Total</span></div></div><div className={styles.legend}>{slices.map((slice) => <div key={slice.name}><i style={{ background: slice.color }} /><span>{slice.name}</span><b>{Math.round((slice.amount / safeTotal) * 100)}%</b></div>)}</div></div></div></section>
    <section className={`${styles.tableSection} ${styles.categorySummary}`}><div className={styles.sectionLabel}>CATEGORY SUMMARY</div><table className={styles.categoryTable}><colgroup><col className={styles.categoryNameCol}/><col className={styles.categoryAmountCol}/><col className={styles.categoryPercentCol}/></colgroup><thead><tr><th>Category</th><th>Total</th><th>%</th></tr></thead><tbody>{slices.map((slice) => <tr key={slice.name}><td><i style={{ background: slice.color }} />{slice.name}</td><td>{formatMoney(slice.amount)}</td><td>{Math.round((slice.amount / safeTotal) * 100)}%</td></tr>)}</tbody></table></section>
    <section className={`${styles.tableSection} ${styles.transactions}`}><div className={styles.sectionLabel}>DETAILED TRANSACTIONS</div><table className={styles.transactionTable}><colgroup><col className={styles.dateCol}/><col className={styles.transactionCategoryCol}/><col className={styles.methodCol}/><col className={styles.amountCol}/></colgroup><thead><tr><th>Date</th><th>Category</th><th>Method</th><th>Amount</th></tr></thead><tbody>{report.entries.map((entry) => <tr key={entry.id}><td>{fmt(entry.spent_on)}</td><td><b>{entry.category}</b><small>{entry.title}</small></td><td>Not specified</td><td>{formatMoney(Number(entry.amount))}</td></tr>)}</tbody></table></section>
    <section className={styles.qrPage}><div className={styles.qrCard}><div><p>PAYMENT QR</p><h2>Scan to transfer</h2><span>PromptPay payment</span></div><img src="/payment-qr.jpg" alt="PromptPay QR code for payment" /><div className={styles.account}><b>Account holder</b><span>Personal account</span><b>Account number</b><span>XXX-XXX-9547</span></div></div></section>
  </main>;
}

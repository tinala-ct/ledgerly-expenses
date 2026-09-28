'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from './home.module.css';
import authStyles from './auth.module.css';
import categoryManagerStyles from './category-manager.module.css';
import fundStyles from './fund.module.css';
import reportFilterStyles from './report-filter.module.css';
import { isSupabaseConfigured, setRememberMe, supabase } from '@/lib/supabase';
import { Expense, FundTopUp } from '@/lib/types';

type Category = { id: string; name: string; emoji: string; color: string };
type ReportSelection = { entryIds: string[]; categories: string[] };
const defaults: Category[] = [
  { id: 'food', name: 'อาหาร', emoji: '🍜', color: '#e96c73' }, { id: 'coffee', name: 'กาแฟ', emoji: '☕', color: '#a47558' },
  { id: 'travel', name: 'เดินทาง', emoji: '🚗', color: '#6e92d8' }, { id: 'shopping', name: 'ช้อปปิ้ง', emoji: '🛍️', color: '#ba7aca' },
  { id: 'home', name: 'บิลและบ้าน', emoji: '🏠', color: '#e3ab54' }, { id: 'health', name: 'สุขภาพ', emoji: '💊', color: '#62a98a' },
  { id: 'fun', name: 'บันเทิง', emoji: '🎬', color: '#7f82d9' }, { id: 'other', name: 'อื่น ๆ', emoji: '✨', color: '#87949b' },
];
const today = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Home() {
  const [entries, setEntries] = useState<Expense[]>([]); const [categories, setCategories] = useState<Category[]>(defaults);
  const [topUps, setTopUps] = useState<FundTopUp[]>([]); const [fundOpen, setFundOpen] = useState(false); const [fundTableAvailable, setFundTableAvailable] = useState(!isSupabaseConfigured);
  const [topUpAmount, setTopUpAmount] = useState(''); const [topUpSource, setTopUpSource] = useState(''); const [topUpDate, setTopUpDate] = useState(today()); const [topUpNote, setTopUpNote] = useState(''); const [fundSaving, setFundSaving] = useState(false);
  const [reportFilterOpen, setReportFilterOpen] = useState(false); const [reportMode, setReportMode] = useState<'summary' | 'breakdown'>('breakdown'); const [reportCategories, setReportCategories] = useState<string[]>([]);
  const [lastReportSelection, setLastReportSelection] = useState<ReportSelection | null>(null);
  const [balanceExpanded, setBalanceExpanded] = useState(false);
  const [selected, setSelected] = useState<Category>(defaults[0]); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const [spentOn, setSpentOn] = useState(today()); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(''); const [settings, setSettings] = useState(false); const [newName, setNewName] = useState(''); const [newEmoji, setNewEmoji] = useState('🌷'); const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null); const [confirmClear, setConfirmClear] = useState(false);
  const [signedIn, setSignedIn] = useState(!isSupabaseConfigured); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [remember, setRemember] = useState(true);

  const load = async () => {
    setLoading(true);
    const savedReportSelection = sessionStorage.getItem('ledgerly-last-report-selection');
    setLastReportSelection(savedReportSelection ? JSON.parse(savedReportSelection) as ReportSelection : null);
    const savedFullCategories = JSON.parse(localStorage.getItem('ledgerly-categories-v2') || '[]') as Category[];
    const savedCategories = JSON.parse(localStorage.getItem('ledgerly-categories') || '[]') as Category[];
    if (!supabase) { setEntries(JSON.parse(localStorage.getItem('ledgerly-demo') || '[]')); setTopUps(JSON.parse(localStorage.getItem('ledgerly-topups') || '[]')); if (savedFullCategories.length) setCategories(savedFullCategories); else if (savedCategories.length) setCategories([...defaults, ...savedCategories]); setLoading(false); return; }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);
    const [expenses, configured, funds] = await Promise.all([supabase.from('expenses').select('*').order('spent_on', { ascending: false }), supabase.from('expense_categories').select('*').order('created_at'), supabase.from('fund_top_ups').select('*').order('topped_up_on', { ascending: false }).order('created_at', { ascending: false })]);
    if (expenses.error) setNotice('โหลดข้อมูลไม่ได้: ' + expenses.error.message); else setEntries(expenses.data as Expense[]);
    if (funds.error) { setFundTableAvailable(false); setTopUps([]); setNotice('ระบบยอดเติมเงินยังไม่พร้อม: กรุณารันไฟล์ SQL ที่เพิ่มให้ใน Supabase'); } else { setFundTableAvailable(true); setTopUps(funds.data as FundTopUp[]); }
    if (savedFullCategories.length) setCategories(savedFullCategories);
    else if (!configured.error && configured.data?.length) setCategories([...defaults, ...configured.data as Category[], ...savedCategories]);
    else if (savedCategories.length) setCategories([...defaults, ...savedCategories]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const total = useMemo(() => entries.filter((x) => x.spent_on === today()).reduce((sum, x) => sum + Number(x.amount), 0), [entries]);
  const expenseTotal = useMemo(() => entries.reduce((sum, x) => sum + Number(x.amount), 0), [entries]);
  const topUpTotal = useMemo(() => topUps.reduce((sum, x) => sum + Number(x.amount), 0), [topUps]);
  const fundBalance = topUpTotal - expenseTotal;
  const outstanding = Math.max(expenseTotal - topUpTotal, 0);
  const availableReportCategories = useMemo(() => [...new Set(entries.map((entry) => entry.category))], [entries]);
  const iconFor = (category: string) => categories.find((x) => x.name === category) || defaults.find((x) => x.name === category) || defaults.at(-1)!;

  const save = async (event: FormEvent) => {
    event.preventDefault(); const parsedAmount = Number(amount); if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setNotice('ใส่จำนวนเงินที่มากกว่า 0'); setSaving(true); setNotice('');
    const roundedAmount = Math.round((parsedAmount + Number.EPSILON) * 100) / 100;
    const item: Expense = { id: editing?.id || crypto.randomUUID(), title: note.trim() || selected.name, amount: roundedAmount, category: selected.name, spent_on: spentOn, note: note.trim() || null };
    if (supabase) { const query = editing ? supabase.from('expenses').update({ title: item.title, amount: item.amount, category: item.category, spent_on: item.spent_on, note: item.note }).eq('id', item.id) : supabase.from('expenses').insert({ title: item.title, amount: item.amount, category: item.category, spent_on: item.spent_on, note: item.note }); const { data, error } = await query.select().single(); if (error) setNotice('บันทึกไม่สำเร็จ: ' + error.message); else setEntries((old) => editing ? old.map((x) => x.id === item.id ? data as Expense : x) : [data as Expense, ...old]); }
    else { const next = editing ? entries.map((x) => x.id === item.id ? item : x) : [item, ...entries]; localStorage.setItem('ledgerly-demo', JSON.stringify(next)); setEntries(next); }
    setAmount(''); setNote(''); setEditing(null); setSaving(false);
  };
  const edit = (item: Expense) => { setEditing(item); setAmount(String(item.amount)); setNote(item.note || (item.title === item.category ? '' : item.title)); setSpentOn(item.spent_on); setSelected(iconFor(item.category)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (id: string) => { if (!confirm('ลบรายการนี้?')) return; if (supabase) { const { error } = await supabase.from('expenses').delete().eq('id', id); if (error) return setNotice('ลบไม่สำเร็จ: ' + error.message); } const next = entries.filter((x) => x.id !== id); setEntries(next); if (!supabase) localStorage.setItem('ledgerly-demo', JSON.stringify(next)); };
  const saveTopUp = async (event: FormEvent) => { event.preventDefault(); const parsed = Number(topUpAmount); if (!Number.isFinite(parsed) || parsed <= 0) return setNotice('ใส่ยอดเติมเงินที่มากกว่า 0'); if (!topUpSource.trim()) return setNotice('กรุณาใส่ชื่อผู้เติมหรือผู้สำรองจ่าย'); if (supabase && !fundTableAvailable) return setNotice('กรุณารันไฟล์ supabase/add_fund_top_ups.sql ก่อนใช้งานยอดเติมเงิน'); setFundSaving(true); setNotice(''); const item: FundTopUp = { id: crypto.randomUUID(), amount: Math.round((parsed + Number.EPSILON) * 100) / 100, source: topUpSource.trim(), topped_up_on: topUpDate, note: topUpNote.trim() || null };
    if (supabase) { const { data, error } = await supabase.from('fund_top_ups').insert({ amount: item.amount, source: item.source, topped_up_on: item.topped_up_on, note: item.note }).select().single(); if (error) { setFundSaving(false); return setNotice('เติมเงินไม่สำเร็จ: ' + error.message); } setTopUps((old) => [data as FundTopUp, ...old]); }
    else { const next = [item, ...topUps]; localStorage.setItem('ledgerly-topups', JSON.stringify(next)); setTopUps(next); }
    setTopUpAmount(''); setTopUpSource(''); setTopUpNote(''); setTopUpDate(today()); setFundSaving(false); setFundOpen(false); setNotice('บันทึกยอดเติมเงินแล้ว');
  };
  const removeTopUp = async (id: string) => { if (!confirm('ลบยอดเติมเงินรายการนี้?')) return; if (supabase) { const { error } = await supabase.from('fund_top_ups').delete().eq('id', id); if (error) return setNotice('ลบยอดเติมเงินไม่สำเร็จ: ' + error.message); } const next = topUps.filter((x) => x.id !== id); setTopUps(next); if (!supabase) localStorage.setItem('ledgerly-topups', JSON.stringify(next)); };
  const clearAccounting = async (scope: 'report' | 'all') => {
    if (scope === 'report' && !lastReportSelection?.entryIds.length) { setConfirmClear(false); return setNotice('ยังไม่มีรายงานล่าสุด กรุณาสร้างรายงานก่อนเลือกวิธีนี้'); }
    setConfirmClear(false);
    if (supabase) {
      const client = supabase;
      if (scope === 'report') {
        const entryIds = lastReportSelection!.entryIds;
        const batches = Array.from({ length: Math.ceil(entryIds.length / 100) }, (_, index) => entryIds.slice(index * 100, (index + 1) * 100));
        const results = await Promise.all(batches.map((ids) => client.from('expenses').delete().in('id', ids)));
        const error = results.find((result) => result.error)?.error;
        if (error) { await load(); return setNotice('ล้างรายการในรายงานไม่สำเร็จ: ' + error.message); }
      } else {
        const operations = [client.from('expenses').delete().gt('amount', 0)];
        if (fundTableAvailable) operations.push(client.from('fund_top_ups').delete().gt('amount', 0));
        const results = await Promise.all(operations);
        const error = results.find((result) => result.error)?.error;
        if (error) { await load(); return setNotice('ล้างข้อมูลไม่สำเร็จครบถ้วน: ' + error.message); }
      }
    }
    if (scope === 'report') {
      const ids = new Set(lastReportSelection!.entryIds);
      const remainingEntries = entries.filter((entry) => !ids.has(entry.id));
      setEntries(remainingEntries);
      if (!supabase) localStorage.setItem('ledgerly-demo', JSON.stringify(remainingEntries));
      setNotice(`ล้าง ${ids.size} รายการจากรายงานล่าสุดแล้ว และเก็บรายการอื่นไว้`);
    } else {
      if (!supabase) { localStorage.removeItem('ledgerly-demo'); localStorage.removeItem('ledgerly-topups'); }
      setEntries([]); setTopUps([]); setNotice('ล้างข้อมูลทั้งหมดและเริ่มรอบบัญชีใหม่แล้ว');
    }
    sessionStorage.removeItem('ledgerly-last-report-selection'); setLastReportSelection(null);
  };
  const saveCategories = (next: Category[]) => { localStorage.setItem('ledgerly-categories-v2', JSON.stringify(next)); setCategories(next); };
  const addCategory = (event: FormEvent) => { event.preventDefault(); if (!newName.trim() || !newEmoji.trim()) return; const item = editingCategory ? { ...editingCategory, name: newName.trim(), emoji: newEmoji.trim() } : { id: crypto.randomUUID(), name: newName.trim(), emoji: newEmoji.trim(), color: '#7b8ec8' }; const next = editingCategory ? categories.map((x) => x.id === item.id ? item : x) : [...categories, item]; saveCategories(next); setSelected(item); setNewName(''); setNewEmoji('🌷'); setEditingCategory(null); };
  const startEditCategory = (item: Category) => { setEditingCategory(item); setNewName(item.name); setNewEmoji(item.emoji); };
  const deleteCategory = (item: Category) => { if (!confirm(`ลบหมวด “${item.name}” ?`)) return; const next = categories.filter((x) => x.id !== item.id); saveCategories(next); if (selected.id === item.id) setSelected(next[0] || defaults[0]); };
  const openReportFilter = () => { setReportCategories(availableReportCategories); setReportFilterOpen(true); };
  const toggleReportCategory = (name: string) => setReportCategories((selectedCategories) => selectedCategories.includes(name) ? selectedCategories.filter((category) => category !== name) : [...selectedCategories, name]);
  const exportReport = () => { const filteredEntries = entries.filter((entry) => reportCategories.includes(entry.category)); if (!filteredEntries.length) return setNotice('กรุณาเลือกอย่างน้อย 1 หมวดที่มีรายการใช้จ่าย'); const filteredTotal = filteredEntries.reduce((sum, entry) => sum + Number(entry.amount), 0); const start = filteredEntries.reduce((earliest, entry) => entry.spent_on < earliest ? entry.spent_on : earliest, filteredEntries[0].spent_on); const selection = { entryIds: filteredEntries.map((entry) => entry.id), categories: reportCategories }; sessionStorage.setItem('ledgerly-report', JSON.stringify({ entries: filteredEntries, topUps, total: filteredTotal, mode: reportMode, filters: { categories: reportCategories }, fund: { topUpTotal, balance: topUpTotal - filteredTotal, outstanding: Math.max(filteredTotal - topUpTotal, 0) }, range: { start, end: today() } })); sessionStorage.setItem('ledgerly-last-report-selection', JSON.stringify(selection)); setLastReportSelection(selection); setReportFilterOpen(false); window.open('/report', '_blank'); };
  const signIn = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setNotice(''); setRememberMe(remember); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) return setNotice('เข้าสู่ระบบไม่สำเร็จ: ' + error.message); setPassword(''); await load(); };

  if (isSupabaseConfigured && !signedIn) return <main className={authStyles.screen}><section className={authStyles.card}><span className={authStyles.mark}>L</span><h1>ยินดีต้อนรับ</h1><p>เข้าสู่ระบบเพื่อดูและบันทึกรายจ่ายของคุณ</p><form onSubmit={signIn}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required/><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required/><label className={authStyles.remember}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}/> จดจำฉันในอุปกรณ์นี้</label><button>เข้าสู่ระบบ</button></form>{notice && <p className={authStyles.error}>{notice}</p>}<p className={authStyles.hint}>หากเป็นอุปกรณ์สาธารณะ ให้เอาเครื่องหมาย “จดจำฉัน” ออก</p></section></main>;

  return <main className={styles.shell}><header className={styles.header}><span className={styles.logo}>L</span><div><p>วันนี้</p><h1>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}</h1></div><button className={styles.settings} onClick={() => setSettings(true)} aria-label="ตั้งค่าหมวดหมู่">⚙</button></header>
    <section className={`${styles.balance} ${!balanceExpanded ? fundStyles.balanceCollapsed : ''}`}><div className={fundStyles.balanceHeader}><div><span>{fundBalance < 0 ? 'ยอดคงค้างรอเติม' : 'ยอดเงินกลางคงเหลือ'}</span><strong>{money.format(fundBalance < 0 ? outstanding : fundBalance)}</strong></div><button type="button" className={`${fundStyles.balanceToggle} ${balanceExpanded ? fundStyles.balanceToggleOpen : ''}`} aria-label={balanceExpanded ? 'ย่อรายละเอียดเงินกลาง' : 'ดูรายละเอียดเงินกลาง'} aria-expanded={balanceExpanded} aria-controls="fund-balance-details" onClick={() => setBalanceExpanded((expanded) => !expanded)}><span>{balanceExpanded ? 'ย่อ' : 'ดูรายละเอียด'}</span><b aria-hidden="true">⌄</b></button></div>{balanceExpanded && <div id="fund-balance-details"><div className={fundStyles.summaryGrid}><div className={fundStyles.summaryItem}><span>ยอดเติมสะสม</span><strong>{money.format(topUpTotal)}</strong></div><div className={fundStyles.summaryItem}><span>รายจ่ายสะสม</span><strong>{money.format(expenseTotal)}</strong></div><div className={`${fundStyles.summaryItem} ${outstanding > 0 ? fundStyles.outstanding : ''}`}><span>ใช้ไปวันนี้</span><strong>{money.format(total)}</strong></div></div><div className={fundStyles.fundActions}><button className={fundStyles.topUpButton} onClick={() => setFundOpen(true)}>＋ เติมเงิน</button><button onClick={openReportFilter}>รายงาน PDF ↗</button><button className={`${styles.settle} ${fundStyles.settleButton}`} onClick={() => setConfirmClear(true)}>คิดบัญชีแล้ว</button></div></div>}</section>
    <section className={fundStyles.ledger}><div className={fundStyles.ledgerHeader}><h2>ประวัติเติมเงิน</h2><button onClick={() => setFundOpen(true)}>เพิ่มยอด</button></div>{topUps.length === 0 ? <p className={fundStyles.empty}>ยังไม่มียอดเติมเงิน — รายจ่ายจะนับเป็นยอดคงค้างรอเติม</p> : <div className={fundStyles.topUpList}>{topUps.slice(0, 6).map((item) => <article className={fundStyles.topUpRow} key={item.id}><div className={fundStyles.topUpMain}><strong>{item.source}</strong><small>{new Date(item.topped_up_on + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}{item.note ? ` · ${item.note}` : ''}</small></div><span className={fundStyles.topUpAmount}>+{money.format(Number(item.amount))}</span><button className={fundStyles.deleteButton} onClick={() => removeTopUp(item.id)} aria-label="ลบยอดเติมเงิน">×</button></article>)}</div>}</section>
    <form onSubmit={save} className={styles.composer}>{editing && <div className={styles.editing}>กำลังแก้ไขรายการ <button type="button" onClick={() => { setEditing(null); setAmount(''); setNote(''); }}>ยกเลิก</button></div>}<div className={styles.amountRow}><span>฿</span><input aria-label="จำนวนเงิน" inputMode="decimal" type="number" min="0.01" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"/></div><input className={styles.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตสั้น ๆ (ไม่บังคับ)"/><label className={styles.dateLabel}>วันที่รายการ<input className={styles.date} type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)}/></label><p className={styles.pickLabel}>เลือกหมวดหมู่</p><div className={styles.categoryGrid}>{categories.map((item) => <button type="button" key={item.id} className={`${styles.category} ${selected.id === item.id ? styles.active : ''}`} onClick={() => setSelected(item)}><span style={{ backgroundColor: item.color }}>{item.emoji}</span><small>{item.name}</small></button>)}<button type="button" className={styles.category} onClick={() => setSettings(true)}><span className={styles.add}>+</span><small>เพิ่ม</small></button></div><button className={styles.save} disabled={saving}>{saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : `บันทึก · ${selected.emoji}`}</button>{notice && <p className={styles.notice}>{notice}</p>}</form>
    <section className={styles.recent}><div><p>ล่าสุด</p><h2>รายการใช้จ่าย</h2></div>{loading ? <p>กำลังโหลด…</p> : entries.length === 0 ? <p className={styles.empty}>เริ่มบันทึกรายการแรกได้เลย</p> : entries.slice(0, 8).map((item) => { const icon = iconFor(item.category); return <article key={item.id}><span style={{ backgroundColor: icon.color }}>{icon.emoji}</span><div><b>{item.title}</b><small>{item.category} · {new Date(item.spent_on + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</small></div><strong>{money.format(Number(item.amount))}</strong><button className={styles.rowAction} onClick={() => edit(item)}>แก้</button><button className={styles.delete} onClick={() => remove(item.id)}>×</button></article>; })}</section>
    {reportFilterOpen && <div className={styles.overlay}><section className={`${styles.modal} ${reportFilterStyles.modal}`}><button className={styles.close} onClick={() => setReportFilterOpen(false)}>×</button><p>ตัวกรองรายงาน</p><h2>เลือกรายจ่ายที่ต้องการ</h2><div className={reportFilterStyles.modeGrid}><button type="button" className={reportMode === 'summary' ? reportFilterStyles.activeMode : ''} onClick={() => setReportMode('summary')}><b>รวมยอด</b><small>สรุปยอดและรายการที่เลือก</small></button><button type="button" className={reportMode === 'breakdown' ? reportFilterStyles.activeMode : ''} onClick={() => setReportMode('breakdown')}><b>แยกสัดส่วน</b><small>เพิ่ม Pie chart และเปอร์เซ็นต์</small></button></div><div className={reportFilterStyles.filterHeader}><b>หมวดรายจ่าย</b><button type="button" onClick={() => setReportCategories(reportCategories.length === availableReportCategories.length ? [] : availableReportCategories)}>{reportCategories.length === availableReportCategories.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}</button></div><div className={reportFilterStyles.categoryList}>{availableReportCategories.map((name) => { const icon = iconFor(name); const checked = reportCategories.includes(name); return <button type="button" key={name} className={checked ? reportFilterStyles.selectedCategory : ''} onClick={() => toggleReportCategory(name)}><span style={{ backgroundColor: icon.color }}>{icon.emoji}</span><b>{name}</b><i>{checked ? '✓' : ''}</i></button>; })}</div><div className={reportFilterStyles.selectionSummary}>เลือก {reportCategories.length} จาก {availableReportCategories.length} หมวด · {entries.filter((entry) => reportCategories.includes(entry.category)).length} รายการ</div><button className={styles.save} onClick={exportReport} disabled={!reportCategories.length}>สร้างรายงาน PDF</button></section></div>}
    {fundOpen && <div className={styles.overlay}><section className={styles.modal}><button className={styles.close} onClick={() => setFundOpen(false)}>×</button><p>เงินกลางครอบครัว</p><h2>เติมเงินเข้ากองกลาง</h2><form className={fundStyles.form} onSubmit={saveTopUp}><label>จำนวนเงิน<input type="number" min="0.01" step="0.01" inputMode="decimal" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="0.00" autoFocus required/></label><label>วันที่เติม<input type="date" value={topUpDate} onChange={(e) => setTopUpDate(e.target.value)} required/></label><label className={fundStyles.wide}>ผู้เติม / ผู้สำรองจ่าย<input value={topUpSource} onChange={(e) => setTopUpSource(e.target.value)} placeholder="เช่น แม่, พ่อ, พี่" maxLength={80} required/></label><label className={fundStyles.wide}>หมายเหตุ<input value={topUpNote} onChange={(e) => setTopUpNote(e.target.value)} placeholder="ไม่บังคับ"/></label><p className={fundStyles.hint}>เมื่อรายจ่ายมากกว่ายอดเติม ระบบจะแสดงส่วนต่างเป็น “ยอดคงค้างรอเติม” อัตโนมัติ</p><button className={styles.save} disabled={fundSaving}>{fundSaving ? 'กำลังบันทึก…' : 'บันทึกยอดเติมเงิน'}</button></form></section></div>}
    {settings && <div className={styles.overlay}><section className={styles.modal}><button className={styles.close} onClick={() => { setSettings(false); setEditingCategory(null); }}>×</button><p>ตั้งค่าหมวดหมู่</p><h2>{editingCategory ? 'แก้ไขไอคอน' : 'เพิ่มไอคอนของคุณ'}</h2><form onSubmit={addCategory}><input aria-label="ไอคอน" className={styles.emojiInput} value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={4}/><input aria-label="ชื่อหมวดหมู่" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="เช่น สัตว์เลี้ยง"/><button className={styles.save}>{editingCategory ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}</button></form>{editingCategory && <button type="button" className={categoryManagerStyles.cancel} onClick={() => { setEditingCategory(null); setNewName(''); setNewEmoji('🌷'); }}>ยกเลิกการแก้ไข</button>}<div className={categoryManagerStyles.list}>{categories.map((item) => <div className={categoryManagerStyles.item} key={item.id}><span className={categoryManagerStyles.icon} style={{ backgroundColor: item.color }}>{item.emoji}</span><b>{item.name}</b><button type="button" className={categoryManagerStyles.edit} onClick={() => startEditCategory(item)}>แก้</button><button type="button" className={categoryManagerStyles.remove} onClick={() => deleteCategory(item)}>ลบ</button></div>)}</div><small>ใส่ emoji ที่ชอบได้ เช่น 🐶 ✈️ 🎮</small></section></div>}{confirmClear && <div className={styles.overlay}><section className={`${styles.modal} ${reportFilterStyles.settlementModal}`}><button className={styles.close} onClick={() => setConfirmClear(false)}>×</button><p>ปิดรอบบัญชี</p><h2>เลือกข้อมูลที่จะล้าง</h2><div className={reportFilterStyles.settlementChoices}><button type="button" disabled={!lastReportSelection?.entryIds.length} onClick={() => clearAccounting('report')}><b>ล้างเฉพาะรายการในรายงานล่าสุด</b><span>{lastReportSelection ? `${lastReportSelection.entryIds.length} รายการ · ${lastReportSelection.categories.join(', ')}` : 'ยังไม่มีรายงานล่าสุด'}</span><small>เก็บรายจ่ายรายการอื่นและยอดเติมเงินไว้</small></button><button type="button" className={reportFilterStyles.fullDelete} onClick={() => clearAccounting('all')}><b>ล้างข้อมูลทั้งหมด</b><span>รายจ่ายทุกหมวดและยอดเติมเงินทั้งหมด</span><small>เริ่มรอบบัญชีใหม่จากศูนย์</small></button></div><small className={reportFilterStyles.warning}>ข้อมูลที่ล้างแล้วไม่สามารถกู้คืนจากหน้าเว็บได้ กรุณาสร้าง PDF ก่อนปิดรอบบัญชี</small></section></div>}
  </main>;
}

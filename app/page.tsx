'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { categories, Expense } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

function monthBounds() {
  const d = new Date();
  return { start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), end: today() };
}

export default function Home() {
  const [entries, setEntries] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(!isSupabaseConfigured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [range, setRange] = useState(monthBounds);
  const [form, setForm] = useState({ title: '', amount: '', category: categories[0], spent_on: today(), note: '' });

  const load = async () => {
    setLoading(true);
    if (!supabase) {
      const raw = localStorage.getItem('ledgerly-demo');
      setEntries(raw ? JSON.parse(raw) : []);
      setLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setSignedIn(false); setEntries([]); setLoading(false); return; }
    setSignedIn(true);
    const { data, error } = await supabase.from('expenses').select('*').order('spent_on', { ascending: false }).order('created_at', { ascending: false });
    if (error) setNotice('โหลดข้อมูลไม่ได้: ' + error.message);
    else setEntries(data as Expense[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setNotice('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setNotice('เข้าสู่ระบบไม่สำเร็จ: ' + error.message);
    setPassword(''); setNotice('เข้าสู่ระบบแล้ว'); await load();
  };

  const displayed = useMemo(() => entries.filter((item) => item.spent_on >= range.start && item.spent_on <= range.end), [entries, range]);
  const total = displayed.reduce((sum, item) => sum + Number(item.amount), 0);
  const todayTotal = entries.filter((item) => item.spent_on === today()).reduce((sum, item) => sum + Number(item.amount), 0);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !Number(form.amount)) return setNotice('กรุณากรอกรายการและจำนวนเงิน');
    setSaving(true); setNotice('');
    const item: Expense = { id: crypto.randomUUID(), title: form.title.trim(), amount: Number(form.amount), category: form.category, spent_on: form.spent_on, note: form.note.trim() || null };
    if (supabase) {
      const { data, error } = await supabase.from('expenses').insert({ title: item.title, amount: item.amount, category: item.category, spent_on: item.spent_on, note: item.note }).select().single();
      if (error) setNotice('บันทึกไม่สำเร็จ: ' + error.message);
      else { setEntries((old) => [data as Expense, ...old]); setNotice('บันทึกแล้ว'); }
    } else {
      const next = [item, ...entries]; localStorage.setItem('ledgerly-demo', JSON.stringify(next)); setEntries(next); setNotice('บันทึกในเครื่องแล้ว — เชื่อม Supabase เพื่อเก็บถาวร');
    }
    setSaving(false); setForm((old) => ({ ...old, title: '', amount: '', note: '' }));
  };

  const remove = async (id: string) => {
    if (!confirm('ลบรายการนี้?')) return;
    if (supabase) { const { error } = await supabase.from('expenses').delete().eq('id', id); if (error) return setNotice('ลบไม่สำเร็จ: ' + error.message); }
    const next = entries.filter((x) => x.id !== id); setEntries(next); if (!supabase) localStorage.setItem('ledgerly-demo', JSON.stringify(next));
  };

  const exportReport = () => {
    sessionStorage.setItem('ledgerly-report', JSON.stringify({ entries: displayed, total, range }));
    window.open('/report', '_blank', 'noopener,noreferrer');
  };

  return <main>
    <header className="topbar"><div className="brand"><span className="brand-mark">L</span><span>ledgerly</span></div><div className="status"><i />{isSupabaseConfigured ? (signedIn ? 'Cloud sync enabled' : 'กรุณาเข้าสู่ระบบ') : 'โหมดทดลองในเครื่อง'}</div></header>
    <section className="hero"><div><p className="eyebrow">PERSONAL EXPENSE TRACKER</p><h1>ทุกบาท มีที่ไป<br/><em>เห็นภาพ</em> ในไม่กี่วินาที</h1><p className="lead">บันทึกรายจ่ายอย่างรวดเร็ว สรุปเป็นรายงาน และเก็บข้อมูลของคุณอย่างปลอดภัย</p></div><div className="today-card"><span>วันนี้คุณใช้ไป</span><strong>{currency.format(todayTotal)}</strong><small>{new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}</small></div></section>
    {isSupabaseConfigured && !signedIn ? <section className="auth-box"><p className="eyebrow">YOUR PRIVATE LEDGER</p><h2>เข้าสู่ระบบเพื่อเข้าถึงข้อมูลของคุณ</h2><form onSubmit={signIn}><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"/><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"/><button className="primary">เข้าสู่ระบบ</button></form><p>สร้างผู้ใช้ครั้งแรกได้ที่ Supabase Authentication → Users</p>{notice && <p className="notice">{notice}</p>}</section> : <>
    <section className="workspace">
      <form className="entry-form" onSubmit={save}><div className="section-title"><span>01</span><h2>เพิ่มรายการใหม่</h2></div>
        <label>รายการ<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น กาแฟตอนเช้า" autoFocus /></label>
        <div className="form-grid"><label>จำนวนเงิน<input inputMode="decimal" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></label><label>หมวดหมู่<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((x) => <option key={x}>{x}</option>)}</select></label></div>
        <div className="form-grid"><label>วันที่<input type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} /></label><label>โน้ต (ไม่บังคับ)<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="รายละเอียดเพิ่มเติม" /></label></div>
        <button className="primary" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกรายจ่าย  →'}</button>{notice && <p className="notice">{notice}</p>}
      </form>
      <section className="summary"><div className="section-title"><span>02</span><h2>ภาพรวมรายจ่าย</h2></div><div className="range"><input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })}/><b>—</b><input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })}/></div><div className="total"><span>รวมในช่วงที่เลือก</span><strong>{currency.format(total)}</strong><small>{displayed.length} รายการ</small></div><button className="secondary" onClick={exportReport}>▣ &nbsp; Export PDF report</button></section>
    </section>
    <section className="history"><div className="history-head"><div><p className="eyebrow">RECENT RECORDS</p><h2>รายการล่าสุด</h2></div><span>{loading ? 'กำลังโหลด…' : `${displayed.length} รายการ`}</span></div><div className="records">{!loading && displayed.length === 0 && <p className="empty">ยังไม่มีรายจ่ายในช่วงเวลานี้</p>}{displayed.map((item) => <article className="record" key={item.id}><div className="category-dot"/><div className="record-main"><strong>{item.title}</strong><span>{item.category}{item.note ? ` · ${item.note}` : ''}</span></div><time>{dateFormat.format(new Date(item.spent_on + 'T00:00:00'))}</time><b>{currency.format(Number(item.amount))}</b><button aria-label="ลบรายการ" onClick={() => remove(item.id)}>×</button></article>)}</div></section></>}
  </main>;
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from './home.module.css';
import authStyles from './auth.module.css';
import categoryManagerStyles from './category-manager.module.css';
import { isSupabaseConfigured, setRememberMe, supabase } from '@/lib/supabase';
import { Expense } from '@/lib/types';

type Category = { id: string; name: string; emoji: string; color: string };
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
  const [selected, setSelected] = useState<Category>(defaults[0]); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const [spentOn, setSpentOn] = useState(today()); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(''); const [settings, setSettings] = useState(false); const [newName, setNewName] = useState(''); const [newEmoji, setNewEmoji] = useState('🌷'); const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null); const [confirmClear, setConfirmClear] = useState(false);
  const [signedIn, setSignedIn] = useState(!isSupabaseConfigured); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [remember, setRemember] = useState(true);

  const load = async () => {
    setLoading(true);
    const savedFullCategories = JSON.parse(localStorage.getItem('ledgerly-categories-v2') || '[]') as Category[];
    const savedCategories = JSON.parse(localStorage.getItem('ledgerly-categories') || '[]') as Category[];
    if (!supabase) { setEntries(JSON.parse(localStorage.getItem('ledgerly-demo') || '[]')); if (savedFullCategories.length) setCategories(savedFullCategories); else if (savedCategories.length) setCategories([...defaults, ...savedCategories]); setLoading(false); return; }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);
    const [expenses, configured] = await Promise.all([supabase.from('expenses').select('*').order('spent_on', { ascending: false }), supabase.from('expense_categories').select('*').order('created_at')]);
    if (expenses.error) setNotice('โหลดข้อมูลไม่ได้: ' + expenses.error.message); else setEntries(expenses.data as Expense[]);
    if (savedFullCategories.length) setCategories(savedFullCategories);
    else if (!configured.error && configured.data?.length) setCategories([...defaults, ...configured.data as Category[], ...savedCategories]);
    else if (savedCategories.length) setCategories([...defaults, ...savedCategories]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const total = useMemo(() => entries.filter((x) => x.spent_on === today()).reduce((sum, x) => sum + Number(x.amount), 0), [entries]);
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
  const clearAll = async () => { if (supabase) { const { error } = await supabase.from('expenses').delete().gt('amount', 0); if (error) return setNotice('ล้างข้อมูลไม่สำเร็จ: ' + error.message); } else localStorage.removeItem('ledgerly-demo'); setEntries([]); setConfirmClear(false); setNotice('เริ่มรอบบัญชีใหม่แล้ว'); };
  const saveCategories = (next: Category[]) => { localStorage.setItem('ledgerly-categories-v2', JSON.stringify(next)); setCategories(next); };
  const addCategory = (event: FormEvent) => { event.preventDefault(); if (!newName.trim() || !newEmoji.trim()) return; const item = editingCategory ? { ...editingCategory, name: newName.trim(), emoji: newEmoji.trim() } : { id: crypto.randomUUID(), name: newName.trim(), emoji: newEmoji.trim(), color: '#7b8ec8' }; const next = editingCategory ? categories.map((x) => x.id === item.id ? item : x) : [...categories, item]; saveCategories(next); setSelected(item); setNewName(''); setNewEmoji('🌷'); setEditingCategory(null); };
  const startEditCategory = (item: Category) => { setEditingCategory(item); setNewName(item.name); setNewEmoji(item.emoji); };
  const deleteCategory = (item: Category) => { if (!confirm(`ลบหมวด “${item.name}” ?`)) return; const next = categories.filter((x) => x.id !== item.id); saveCategories(next); if (selected.id === item.id) setSelected(next[0] || defaults[0]); };
  const exportReport = () => { const start = entries.reduce((earliest, entry) => entry.spent_on < earliest ? entry.spent_on : earliest, today()); sessionStorage.setItem('ledgerly-report', JSON.stringify({ entries, total: entries.reduce((s, x) => s + Number(x.amount), 0), range: { start, end: today() } })); window.open('/report', '_blank'); };
  const signIn = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setNotice(''); setRememberMe(remember); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) return setNotice('เข้าสู่ระบบไม่สำเร็จ: ' + error.message); setPassword(''); await load(); };

  if (isSupabaseConfigured && !signedIn) return <main className={authStyles.screen}><section className={authStyles.card}><span className={authStyles.mark}>L</span><h1>ยินดีต้อนรับ</h1><p>เข้าสู่ระบบเพื่อดูและบันทึกรายจ่ายของคุณ</p><form onSubmit={signIn}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required/><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required/><label className={authStyles.remember}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}/> จดจำฉันในอุปกรณ์นี้</label><button>เข้าสู่ระบบ</button></form>{notice && <p className={authStyles.error}>{notice}</p>}<p className={authStyles.hint}>หากเป็นอุปกรณ์สาธารณะ ให้เอาเครื่องหมาย “จดจำฉัน” ออก</p></section></main>;

  return <main className={styles.shell}><header className={styles.header}><span className={styles.logo}>L</span><div><p>วันนี้</p><h1>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}</h1></div><button className={styles.settings} onClick={() => setSettings(true)} aria-label="ตั้งค่าหมวดหมู่">⚙</button></header>
    <section className={styles.balance}><span>ใช้ไปวันนี้</span><strong>{money.format(total)}</strong><button onClick={exportReport}>รายงาน PDF ↗</button><button className={styles.settle} onClick={() => setConfirmClear(true)}>คิดบัญชีแล้ว</button></section>
    <form onSubmit={save} className={styles.composer}>{editing && <div className={styles.editing}>กำลังแก้ไขรายการ <button type="button" onClick={() => { setEditing(null); setAmount(''); setNote(''); }}>ยกเลิก</button></div>}<div className={styles.amountRow}><span>฿</span><input aria-label="จำนวนเงิน" inputMode="decimal" type="number" min="0.01" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"/></div><input className={styles.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตสั้น ๆ (ไม่บังคับ)"/><label className={styles.dateLabel}>วันที่รายการ<input className={styles.date} type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)}/></label><p className={styles.pickLabel}>เลือกหมวดหมู่</p><div className={styles.categoryGrid}>{categories.map((item) => <button type="button" key={item.id} className={`${styles.category} ${selected.id === item.id ? styles.active : ''}`} onClick={() => setSelected(item)}><span style={{ backgroundColor: item.color }}>{item.emoji}</span><small>{item.name}</small></button>)}<button type="button" className={styles.category} onClick={() => setSettings(true)}><span className={styles.add}>+</span><small>เพิ่ม</small></button></div><button className={styles.save} disabled={saving}>{saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : `บันทึก · ${selected.emoji}`}</button>{notice && <p className={styles.notice}>{notice}</p>}</form>
    <section className={styles.recent}><div><p>ล่าสุด</p><h2>รายการใช้จ่าย</h2></div>{loading ? <p>กำลังโหลด…</p> : entries.length === 0 ? <p className={styles.empty}>เริ่มบันทึกรายการแรกได้เลย</p> : entries.slice(0, 8).map((item) => { const icon = iconFor(item.category); return <article key={item.id}><span style={{ backgroundColor: icon.color }}>{icon.emoji}</span><div><b>{item.title}</b><small>{item.category} · {new Date(item.spent_on + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</small></div><strong>{money.format(Number(item.amount))}</strong><button className={styles.rowAction} onClick={() => edit(item)}>แก้</button><button className={styles.delete} onClick={() => remove(item.id)}>×</button></article>; })}</section>
    {settings && <div className={styles.overlay}><section className={styles.modal}><button className={styles.close} onClick={() => { setSettings(false); setEditingCategory(null); }}>×</button><p>ตั้งค่าหมวดหมู่</p><h2>{editingCategory ? 'แก้ไขไอคอน' : 'เพิ่มไอคอนของคุณ'}</h2><form onSubmit={addCategory}><input aria-label="ไอคอน" className={styles.emojiInput} value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={4}/><input aria-label="ชื่อหมวดหมู่" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="เช่น สัตว์เลี้ยง"/><button className={styles.save}>{editingCategory ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}</button></form>{editingCategory && <button type="button" className={categoryManagerStyles.cancel} onClick={() => { setEditingCategory(null); setNewName(''); setNewEmoji('🌷'); }}>ยกเลิกการแก้ไข</button>}<div className={categoryManagerStyles.list}>{categories.map((item) => <div className={categoryManagerStyles.item} key={item.id}><span className={categoryManagerStyles.icon} style={{ backgroundColor: item.color }}>{item.emoji}</span><b>{item.name}</b><button type="button" className={categoryManagerStyles.edit} onClick={() => startEditCategory(item)}>แก้</button><button type="button" className={categoryManagerStyles.remove} onClick={() => deleteCategory(item)}>ลบ</button></div>)}</div><small>ใส่ emoji ที่ชอบได้ เช่น 🐶 ✈️ 🎮</small></section></div>}{confirmClear && <div className={styles.overlay}><section className={styles.modal}><button className={styles.close} onClick={() => setConfirmClear(false)}>×</button><p>ปิดรอบบัญชี</p><h2>ล้างทุกรายการใช่ไหม?</h2><small>รายการในรอบนี้จะถูกลบถาวร และเริ่มนับยอดใหม่จากศูนย์</small><button className={styles.danger} onClick={clearAll}>ใช่, คิดบัญชีแล้วและล้างข้อมูล</button></section></div>}
  </main>;
}

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  spent_on: string;
  note: string | null;
  created_at?: string;
};

export type FundTopUp = {
  id: string;
  amount: number;
  source: string;
  topped_up_on: string;
  note: string | null;
  created_at?: string;
};

export const categories = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'บิลและบ้าน', 'สุขภาพ', 'บันเทิง', 'อื่น ๆ'];

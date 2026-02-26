'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  'https://kenaitcprnorjqpkntmb.supabase.co',
  'sb_publishable_HD5DLZaN-ey9FOpykFzpOQ__LEnvl9h'
);

export default function CarDetails() {
  const params = useParams();
  const id = params?.id as string; 
  const router = useRouter();

  const [car, setCar] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  
  // ✨ NEW: Expense State ✨
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>(''); 
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  
  const [partName, setPartName] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return; 
    async function checkUserAndLoadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user); 

      try {
        const { data: carData, error: carError } = await supabase.from('donor_stats').select('*').eq('donor_id', id).single();
        if (carError) throw new Error("Database Error (Car): " + carError.message);
        setCar(carData);

        const { data: partsData, error: partsError } = await supabase.from('parts').select('*').eq('donor_id', id).order('created_at', { ascending: false });
        if (partsError) throw new Error("Database Error (Parts): " + partsError.message);
        setParts(partsData || []);

        // ✨ NEW: Load Expenses ✨
        const { data: expData, error: expError } = await supabase.from('expenses').select('*').eq('donor_id', id).order('created_at', { ascending: false });
        if (expError) throw new Error("Database Error (Expenses): " + expError.message);
        setExpenses(expData || []);

      } catch (err: any) { setErrorMsg(err.message); } 
      finally { setLoading(false); }
    }
    checkUserAndLoadData();
  }, [id, router]);

  async function autoFillWithAI() {
    if (!file) return alert("Please select a photo first!");
    setIsAnalyzing(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `temp_ai_${Math.random()}.${fileExt}`;
      await supabase.storage.from('part-images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(fileName);

      const res = await fetch('/api/analyze-part', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: publicUrl })
      });
      const aiData = await res.json();
      if (aiData.error) throw new Error(aiData.error);

      setPartName(aiData.title || '');
      setAiDescription(`Condition: ${aiData.condition}\n\n${aiData.description}`);
    } catch (err: any) { alert("AI Error: " + err.message); } 
    finally { setIsAnalyzing(false); }
  }

  async function addPart() {
    if (!partName || !askPrice) return alert("Need name and price!");
    if (!user) return alert("You must be logged in!"); 
    setUploading(true);
    let imageUrl = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }
    await supabase.from('parts').insert({ user_id: user.id, donor_id: id, name: partName, asking_price: parseFloat(askPrice), status: 'inventory', image_url: imageUrl });
    window.location.reload(); 
  }

  // ✨ NEW: Add Expense Function ✨
  async function addExpense() {
    if (!expenseName || !expenseAmount) return alert("Need expense name and amount!");
    if (!user) return alert("You must be logged in!"); 
    
    await supabase.from('expenses').insert({
      user_id: user.id, donor_id: id, name: expenseName, amount: parseFloat(expenseAmount)
    });
    window.location.reload(); 
  }

  // ✨ NEW: Delete Expense Function ✨
  async function deleteExpense(expenseId: string) {
    if (!window.confirm("Delete this expense?")) return;
    await supabase.from('expenses').delete().eq('id', expenseId);
    window.location.reload();
  }

  async function markSold(partId: string, price: number) {
    await supabase.from('parts').update({ status: 'sold', sold_price: price }).eq('id', partId);
    window.location.reload();
  }
  async function deletePart(partId: string) {
    if (!window.confirm("Delete this part?")) return;
    await supabase.from('parts').delete().eq('id', partId);
    window.location.reload();
  }

  if (errorMsg) return <div className="p-10 text-red-400 font-mono">Error: {errorMsg}</div>;
  if (loading) return <div className="p-10 text-white font-mono text-center mt-20">Loading garage...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/')} className="mb-6 text-slate-400 hover:text-white">&larr; Back to Garage</button>

        {/* Header Stats */}
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 mb-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-4">{car?.car_name}</h1>
          <div className="flex flex-wrap gap-8 text-sm">
             <div className="flex flex-col"><span className="text-slate-400">Car Cost:</span><span className="text-xl font-mono">${car?.purchase_price}</span></div>
             <div className="flex flex-col"><span className="text-slate-400">Extra Expenses:</span><span className="text-xl font-mono text-orange-400">${car?.total_expenses}</span></div>
             <div className="flex flex-col"><span className="text-slate-400">Total Revenue:</span><span className="text-xl font-mono text-green-400">${car?.total_revenue}</span></div>
             <div className="flex flex-col border-l border-slate-700 pl-8"><span className="text-slate-400">Net Profit:</span><span className={`text-2xl font-bold font-mono ${car?.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${car?.net_profit}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Main Column: Add Parts (Takes up 2/3 of space) */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-slate-200">Log a New Part</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full md:w-auto text-sm text-slate-400 cursor-pointer" />
                  <button onClick={autoFillWithAI} disabled={isAnalyzing || !file} className="w-full md:w-auto bg-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-50 transition-colors">
                    {isAnalyzing ? '🧠 Thinking...' : '✨ Auto-Fill'}
                  </button>
              </div>
              <div className="flex gap-4">
                <div className="flex-1"><input placeholder="Part Name" value={partName} onChange={e => setPartName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
                <div className="w-32"><input placeholder="Price" type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
              </div>
              {aiDescription && <textarea readOnly value={aiDescription} className="w-full bg-slate-900 border border-purple-500/50 rounded-lg p-3 text-slate-300 h-24 text-sm" />}
              <button onClick={addPart} disabled={uploading} className="bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50 mt-2">
                {uploading ? 'Saving...' : 'Save Part'}
              </button>
            </div>
          </div>

          {/* Sidebar Column: Hidden Costs Tracker (Takes up 1/3 of space) */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-orange-400">Hidden Costs</h3>
            
            {/* Add Expense Form */}
            <div className="flex gap-2 mb-6">
              <input placeholder="e.g. Tow" value={expenseName} onChange={e => setExpenseName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
              <input placeholder="$" type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
              <button onClick={addExpense} className="bg-orange-600 px-3 rounded-lg font-bold hover:bg-orange-500">+</button>
            </div>

            {/* Expense List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700 group">
                  <span className="text-sm text-slate-300">{exp.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-orange-400 text-sm">${exp.amount}</span>
                    <button onClick={() => deleteExpense(exp.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-xs text-slate-500 text-center mt-4">No hidden expenses yet.</p>}
            </div>
          </div>

        </div>

        {/* Part List (Grid stays the same) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map((part) => (
            <div key={part.id} className="flex flex-col bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg relative group">
              <div className="h-48 bg-slate-900 relative flex items-center justify-center border-b border-slate-700">
                {part.image_url ? <img src={part.image_url} alt={part.name} className="object-cover w-full h-full" /> : <span className="text-slate-600 text-sm">No Image</span>}
                <button onClick={() => deletePart(part.id)} className="absolute top-3 right-3 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
              </div>
              <div className="p-5 flex justify-between items-center">
                <div><p className="font-bold text-lg text-white mb-1">{part.name}</p><p className="font-mono text-slate-300">${part.asking_price}</p></div>
                {part.status !== 'sold' ? <button onClick={() => markSold(part.id, part.asking_price)} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg">Mark Sold</button> : <span className="text-green-500 font-bold">SOLD</span>}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
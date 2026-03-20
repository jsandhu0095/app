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
  const [files, setFiles] = useState<FileList | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const [isSearchingEbay, setIsSearchingEbay] = useState(false);
  const [ebayResults, setEbayResults] = useState<any[]>([]);

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

        const { data: expData, error: expError } = await supabase.from('expenses').select('*').eq('donor_id', id).order('created_at', { ascending: false });
        if (expError) throw new Error("Database Error (Expenses): " + expError.message);
        setExpenses(expData || []);

      } catch (err: any) { setErrorMsg(err.message); } 
      finally { setLoading(false); }
    }
    checkUserAndLoadData();
  }, [id, router]);

  async function autoFillWithAI() {
    if (!files || files.length === 0) return alert("Please select a photo first!");
    setIsAnalyzing(true);
    setEbayResults([]); 
    
    try {
      const fileToAnalyze = files[0];
      const fileExt = fileToAnalyze.name.split('.').pop();
      const fileName = `temp_ai_${Math.random()}.${fileExt}`;
      await supabase.storage.from('part-images').upload(fileName, fileToAnalyze);
      const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(fileName);

      const res = await fetch('/api/analyze-part', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: publicUrl })
      });
      const aiData = await res.json();
      if (aiData.error) throw new Error(aiData.error);

      // 1. Populate the UI with the beautiful, descriptive AI data
      const newTitle = aiData.title || '';
      setPartName(newTitle);
      if (aiData.estimated_price) setAskPrice(aiData.estimated_price.toString());
      setAiDescription(`Condition: ${aiData.condition}\n\n${aiData.description}`);

      // 2. Automatically trigger eBay search using the AI's hidden optimized string!
      const optimizedSearch = aiData.ebay_search_term || newTitle;
      if (optimizedSearch) {
        await fetchEbayData(optimizedSearch);
      }

    } catch (err: any) { 
      alert("AI Error: " + err.message); 
    } finally { 
      setIsAnalyzing(false); 
    }
  }

  async function fetchEbayData(queryToSearch: string) {
    if (!queryToSearch) return;
    setIsSearchingEbay(true);
    try {
      const res = await fetch('/api/ebay-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToSearch })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEbayResults(data.items || []);
    } catch (err: any) {
      alert("eBay Error: " + err.message);
    } finally {
      setIsSearchingEbay(false);
    }
  }

  async function addPart() {
    if (!partName || !askPrice) return alert("Need name and price!");
    if (!user) return alert("You must be logged in!"); 
    setUploading(true);
    let uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }
    }
    await supabase.from('parts').insert({ user_id: user.id, donor_id: id, name: partName, asking_price: parseFloat(askPrice), status: 'inventory', image_url: uploadedUrls[0] || null, image_urls: uploadedUrls });
    window.location.reload(); 
  }

  async function addExpense() {
    if (!expenseName || !expenseAmount) return alert("Need expense name and amount!");
    if (!user) return alert("You must be logged in!"); 
    await supabase.from('expenses').insert({ user_id: user.id, donor_id: id, name: expenseName, amount: parseFloat(expenseAmount) });
    window.location.reload(); 
  }

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

  function startEditing(part: any) {
    setEditingPartId(part.id);
    setEditName(part.name);
    setEditPrice(part.asking_price.toString());
  }

  async function saveEdit(partId: string) {
    if (!editName || !editPrice) return alert("Need name and price!");
    const { error } = await supabase.from('parts').update({ name: editName, asking_price: parseFloat(editPrice) }).eq('id', partId);
    if (error) alert("Error saving part: " + error.message);
    else window.location.reload();
  }

  if (errorMsg) return <div className="p-10 text-red-400 font-mono">Error: {errorMsg}</div>;
  if (loading) return <div className="p-10 text-white font-mono text-center mt-20">Loading garage...</div>;

  const filteredParts = parts.filter(part => part.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/')} className="mb-6 text-slate-400 hover:text-white transition-colors">&larr; Back to Garage</button>

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
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-slate-200">Log a New Part</h3>
            <div className="flex flex-col gap-4">
              
              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={e => setFiles(e.target.files)} 
                    className="w-full md:w-auto text-sm text-slate-300 cursor-pointer 
                               file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 
                               file:text-sm file:font-bold file:bg-slate-700 file:text-white 
                               hover:file:bg-slate-600 file:transition-colors file:cursor-pointer" 
                  />
                  <button onClick={autoFillWithAI} disabled={isAnalyzing || !files} className="w-full md:w-auto bg-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20">
                    {isAnalyzing ? (
                      <span className="animate-pulse">🧠 Processing AI & Market...</span>
                    ) : (
                      '✨ AI Analyze & Market Match'
                    )}
                  </button>
              </div>
              {files && files.length > 0 && <p className="text-xs text-slate-400">{files.length} photo(s) selected.</p>}
              
              <div className="flex gap-4 relative">
                <div className="flex-1 relative">
                  <input placeholder="Part Name" value={partName} onChange={e => setPartName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-12 text-white outline-none focus:border-purple-500 transition-colors" />
                  <button 
                    onClick={() => fetchEbayData(partName)} 
                    disabled={isSearchingEbay || !partName || isAnalyzing}
                    title="Manual eBay Search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-400 disabled:opacity-50 transition-colors"
                  >
                    {isSearchingEbay ? '⏳' : '🔍'}
                  </button>
                </div>

                <div className="w-32 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input placeholder="Price" type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-7 text-white outline-none focus:border-green-500 transition-colors font-mono" />
                </div>
              </div>

              {ebayResults.length > 0 && (
                <div className="bg-slate-900/80 border border-blue-500/30 rounded-lg p-4 text-sm shadow-inner">
                  <h4 className="text-blue-400 font-bold mb-3 flex items-center justify-between">
                    Live eBay Market (Active)
                    <button onClick={() => setEbayResults([])} className="text-slate-500 hover:text-white transition-colors">✕</button>
                  </h4>
                  <div className="space-y-3">
                    {ebayResults.map((item: any) => (
                      <div key={item.itemId} className="flex justify-between items-center gap-4">
                        <a href={item.itemWebUrl} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white hover:underline line-clamp-1 flex-1">
                          {item.title}
                        </a>
                        <span className="text-green-400 font-mono font-bold whitespace-nowrap">
                          ${item.price.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiDescription && <textarea readOnly value={aiDescription} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 h-24 text-sm outline-none focus:border-purple-500 transition-colors" />}
              
              <button onClick={addPart} disabled={uploading} className="bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50 mt-2 shadow-lg shadow-blue-900/20 transition-all">
                {uploading ? `Saving ${files?.length || 0} Photos...` : 'Save Part to Garage'}
              </button>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-orange-400">Hidden Costs</h3>
            <div className="flex gap-2 mb-6">
              <input placeholder="e.g. Tow" value={expenseName} onChange={e => setExpenseName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
              <input placeholder="$" type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
              <button onClick={addExpense} className="bg-orange-600 px-3 rounded-lg font-bold hover:bg-orange-500">+</button>
            </div>
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

        <div className="mb-6">
          <input placeholder="🔍 Search parts by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParts.map((part) => {
            const allImages = part.image_urls && part.image_urls.length > 0 
              ? part.image_urls 
              : (part.image_url ? [part.image_url] : []);

            return (
              <div key={part.id} className="flex flex-col bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg relative group">
                <div className="h-48 bg-slate-900 relative flex overflow-x-auto snap-x snap-mandatory hide-scrollbar border-b border-slate-700">
                  {allImages.length > 0 ? (
                    allImages.map((img: string, index: number) => (
                      <img key={index} src={img} alt={`${part.name} ${index + 1}`} className="object-cover w-full h-full flex-shrink-0 snap-center" />
                    ))
                  ) : (
                    <span className="text-slate-600 text-sm m-auto">No Image</span>
                  )}
                  <button onClick={() => deletePart(part.id)} className="absolute top-3 right-3 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">Delete</button>
                  {allImages.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full z-10 pointer-events-none">
                      {allImages.length} Photos
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex justify-between items-start min-h-[96px]">
                  {editingPartId === part.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-900 border border-blue-500 rounded p-2 text-white text-sm outline-none" />
                      <div className="flex gap-2">
                        <span className="text-slate-400 pt-2">$</span>
                        <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="bg-slate-900 border border-blue-500 rounded p-2 text-white text-sm outline-none w-24" />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => saveEdit(part.id)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded">Save</button>
                        <button onClick={() => setEditingPartId(null)} className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-4 py-2 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-lg text-white mb-1 leading-tight">{part.name}</p>
                        <p className="font-mono text-slate-300">${part.asking_price}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {part.status !== 'sold' ? (
                          <>
                            <button onClick={() => markSold(part.id, part.asking_price)} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg w-full text-center shadow-lg shadow-green-900/20">Mark Sold</button>
                            <button onClick={() => startEditing(part)} className="text-blue-400 hover:text-blue-300 text-xs underline mt-1">Edit Info</button>
                          </>
                        ) : (
                          <span className="text-green-500 font-bold">SOLD</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          
          {filteredParts.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-slate-400">{searchQuery ? "No parts match your search." : "No parts logged yet."}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
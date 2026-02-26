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
      } catch (err: any) { setErrorMsg(err.message); } 
      finally { setLoading(false); }
    }
    checkUserAndLoadData();
  }, [id, router]);

  async function autoFillWithAI() {
    if (!file) return alert("Please select a photo first so Gemini can see it!");
    setIsAnalyzing(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `temp_ai_${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, file);
      
      if (uploadError) throw new Error("Failed to upload image for AI analysis");
      const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(fileName);

      const res = await fetch('/api/analyze-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl })
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

    await supabase.from('parts').insert({
      user_id: user.id, donor_id: id, name: partName, asking_price: parseFloat(askPrice), status: 'inventory', image_url: imageUrl
    });

    setPartName(''); setAskPrice(''); setFile(null); setAiDescription(''); setUploading(false);
    window.location.reload(); 
  }

  async function markSold(partId: string, price: number) {
    await supabase.from('parts').update({ status: 'sold', sold_price: price }).eq('id', partId);
    window.location.reload();
  }

  // ✨ NEW: The Oops Button for Parts ✨
  async function deletePart(partId: string) {
    const confirmed = window.confirm("Are you sure you want to delete this part? This cannot be undone.");
    if (!confirmed) return;

    const { error } = await supabase.from('parts').delete().eq('id', partId);
    
    if (error) {
      alert("Error deleting part: " + error.message);
    } else {
      window.location.reload(); // Refresh to remove the part from the screen
    }
  }

  if (errorMsg) return <div className="p-10 text-red-400 font-mono">Error: {errorMsg}</div>;
  if (loading) return <div className="p-10 text-white font-mono text-center mt-20">Loading garage...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/')} className="mb-6 text-slate-400 hover:text-white">&larr; Back to Garage</button>

        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 mb-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">{car?.car_name}</h1>
          <div className="flex gap-6 text-sm">
             <span className="text-slate-400">Cost: <span className="text-white">${car?.purchase_price}</span></span>
             <span className="text-slate-400">Profit: <span className={`${car?.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${car?.net_profit}</span></span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8 shadow-lg">
           <h3 className="text-lg font-bold mb-4 text-slate-200">Log a New Part</h3>
           <div className="flex flex-col gap-4">
             <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full md:w-auto text-sm text-slate-400 cursor-pointer" />
                <button onClick={autoFillWithAI} disabled={isAnalyzing || !file} className="w-full md:w-auto bg-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {isAnalyzing ? '🧠 Gemini is thinking...' : '✨ Auto-Fill with AI'}
                </button>
             </div>
             <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Part Name</label>
                <input placeholder="e.g. Steering Wheel" value={partName} onChange={e => setPartName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div className="w-full md:w-48">
                 <label className="text-xs text-slate-400 mb-1 block">Price ($)</label>
                <input placeholder="Price" type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
              </div>
            </div>
            {aiDescription && (
              <div className="w-full">
                <label className="text-xs text-purple-400 mb-1 block font-bold">✨ AI Generated Listing (Copy to Marketplace)</label>
                <textarea readOnly value={aiDescription} className="w-full bg-slate-900 border border-purple-500/50 rounded-lg p-3 text-slate-300 h-24 text-sm" />
              </div>
            )}
            <div className="flex justify-end mt-2">
              <button onClick={addPart} disabled={uploading} className="bg-blue-600 px-10 py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50">
                {uploading ? 'Saving...' : 'Save Part'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parts.map((part) => (
            <div key={part.id} className="flex flex-col bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg relative group">
              <div className="h-48 bg-slate-900 relative flex items-center justify-center border-b border-slate-700">
                {part.image_url ? (
                  <img src={part.image_url} alt={part.name} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-slate-600 text-sm">No Image</span>
                )}
                
                {/* ✨ NEW: Delete Part Button (Top Right of Image) ✨ */}
                <button 
                  onClick={() => deletePart(part.id)} 
                  className="absolute top-3 right-3 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Part"
                >
                  Delete
                </button>
              </div>
              
              <div className="p-5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg text-white mb-1">{part.name}</p>
                  <p className="font-mono text-slate-300">${part.asking_price}</p>
                </div>
                {part.status !== 'sold' ? (
                  <button onClick={() => markSold(part.id, part.asking_price)} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg">Mark Sold</button>
                ) : (
                  <span className="text-green-500 font-bold">SOLD</span>
                )}
              </div>
            </div>
          ))}
          {parts.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-slate-400">No parts logged yet. Use the ✨ Auto-Fill AI to log your first part!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
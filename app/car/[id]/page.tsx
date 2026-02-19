'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

// HARDCODED KEYS
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
  
  // Form State
  const [partName, setPartName] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return; 

    async function loadData() {
      try {
        const { data: carData, error: carError } = await supabase
          .from('donor_stats')
          .select('*')
          .eq('donor_id', id)
          .single();
        
        if (carError) throw new Error("Database Error (Car): " + carError.message);
        setCar(carData);

        const { data: partsData, error: partsError } = await supabase
          .from('parts')
          .select('*')
          .eq('donor_id', id)
          .order('created_at', { ascending: false });
        
        if (partsError) throw new Error("Database Error (Parts): " + partsError.message);
        setParts(partsData || []);
        
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message); 
      } finally {
        setLoading(false); 
      }
    }

    loadData();
  }, [id]);

  async function addPart() {
    if (!partName || !askPrice) return alert("Need name and price!");
    setUploading(true);
    let imageUrl = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('part-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else {
        alert("Image upload failed: " + uploadError.message);
      }
    }

    const fakeUserId = '81239150-f897-4c2c-b5f4-f26abc3844d4'; 
    await supabase.from('parts').insert({
      user_id: fakeUserId, donor_id: id, name: partName, asking_price: parseFloat(askPrice), status: 'inventory', image_url: imageUrl
    });

    setPartName(''); setAskPrice(''); setFile(null); setUploading(false);
    
    // Refresh page manually to avoid state complexities
    window.location.reload(); 
  }

  async function markSold(partId: string, price: number) {
    await supabase.from('parts').update({ status: 'sold', sold_price: price }).eq('id', partId);
    window.location.reload();
  }

  // --- UI RENDERING ---

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-10 flex flex-col items-center justify-center">
        <div className="bg-red-900/50 border border-red-500 p-8 rounded-xl max-w-xl text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">🚨 Something Broke</h2>
          <p className="font-mono text-sm text-red-200">{errorMsg}</p>
          <button onClick={() => router.push('/')} className="mt-6 bg-slate-800 px-6 py-2 rounded hover:bg-slate-700">Go Back to Garage</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-white font-mono text-center mt-20">Loading parts...</div>;

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
           <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-slate-400 mb-1 block">Part Name</label>
              <input placeholder="e.g. Steering Wheel" value={partName} onChange={e => setPartName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" />
            </div>
            <div className="w-full md:w-32">
               <label className="text-xs text-slate-400 mb-1 block">Price ($)</label>
              <input placeholder="Price" type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" />
            </div>
            <div className="w-full md:w-auto">
               <label className="text-xs text-slate-400 mb-1 block">Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-400 cursor-pointer" />
            </div>
            <button onClick={addPart} disabled={uploading} className="w-full md:w-auto bg-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-500">
              {uploading ? 'Saving...' : 'Add'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parts.map((part) => (
            <div key={part.id} className="flex flex-col bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="h-48 bg-slate-900 relative flex items-center justify-center border-b border-slate-700">
                {part.image_url ? (
                  <img src={part.image_url} alt={part.name} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-slate-600 text-sm">No Image</span>
                )}
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
        </div>

      </div>
    </div>
  );
}
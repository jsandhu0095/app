'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

// HARDCODED KEYS (Same as before)
const supabase = createClient(
  'https://kenaitcprnorjqpkntmb.supabase.co',
  'sb_publishable_HD5DLZaN-ey9FOpykFzpOQ__LEnvl9h'
);

export default function CarDetails() {
  const { id } = useParams(); // Get the ID from the URL
  const router = useRouter();
  const [car, setCar] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for New Part
  const [partName, setPartName] = useState('');
  const [askPrice, setAskPrice] = useState('');

  // 1. Fetch Data
  async function loadData() {
    // Get Car Info
    const { data: carData } = await supabase
      .from('donor_stats').select('*').eq('donor_id', id).single();
    
    setCar(carData);

    // Get Parts List
    const { data: partsData } = await supabase
      .from('parts').select('*').eq('donor_id', id).order('created_at', { ascending: false });
    
    setParts(partsData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // 2. Add New Part
  async function addPart() {
    if (!partName || !askPrice) return;

    // Use the fake user ID again
    const fakeUserId = '81239150-f897-4c2c-b5f4-f26abc3844d4'; 

    await supabase.from('parts').insert({
      user_id: fakeUserId,
      donor_id: id,
      name: partName,
      asking_price: parseFloat(askPrice),
      status: 'inventory' // Default status
    });

    setPartName('');
    setAskPrice('');
    loadData(); // Refresh instantly
  }

  // 3. Mark as SOLD
  async function markSold(partId: string, price: number) {
    await supabase.from('parts').update({
      status: 'sold',
      sold_price: price // Assume sold for asking price for now
    }).eq('id', partId);
    loadData();
  }

  if (loading) return <div className="p-10 text-white">Loading parts...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/')} className="mb-6 text-slate-400 hover:text-white">
          &larr; Back to Garage
        </button>

        {/* Car Header */}
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 mb-8">
          <h1 className="text-3xl font-bold mb-2">{car.car_name}</h1>
          <div className="flex gap-6 text-sm">
             <span className="text-slate-400">Cost: <span className="text-white">${car.purchase_price}</span></span>
             <span className="text-slate-400">Revenue: <span className="text-green-400">${car.total_revenue}</span></span>
             <span className="text-slate-400">Profit: <span className={`${car.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${car.net_profit}</span></span>
          </div>
          {/* Big Progress Bar */}
          <div className="mt-6 w-full bg-slate-900 rounded-full h-6 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-400 h-6 transition-all duration-500"
              style={{ width: `${Math.min(car.breakeven_percentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-center text-xs mt-1 text-slate-500">{car.breakeven_percentage}% Recouped</p>
        </div>

        {/* Add Part Form */}
        <div className="flex gap-4 mb-8">
          <input 
            placeholder="Part Name (e.g. Engine)" 
            value={partName} onChange={e => setPartName(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
          />
          <input 
            placeholder="List Price ($)" 
            type="number"
            value={askPrice} onChange={e => setAskPrice(e.target.value)}
            className="w-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
          />
          <button onClick={addPart} className="bg-blue-600 px-6 rounded-lg font-bold hover:bg-blue-500">
            Add
          </button>
        </div>

        {/* Parts List */}
        <div className="space-y-4">
          {parts.map((part) => (
            <div key={part.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div>
                <p className="font-bold text-lg">{part.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full uppercase ${
                  part.status === 'sold' ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {part.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                   <p className="text-slate-400 text-xs uppercase">List Price</p>
                   <p className="font-mono">${part.asking_price}</p>
                </div>
                {part.status !== 'sold' && (
                  <button 
                    onClick={() => markSold(part.id, part.asking_price)}
                    className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded"
                  >
                    Mark Sold
                  </button>
                )}
                 {part.status === 'sold' && (
                  <div className="text-right border-l border-slate-600 pl-4">
                     <p className="text-green-500 text-xs uppercase">Sold For</p>
                     <p className="font-mono text-green-400">${part.sold_price}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {parts.length === 0 && <p className="text-center text-slate-500">No parts listed yet.</p>}
        </div>

      </div>
    </div>
  );
}
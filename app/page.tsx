'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// HARDCODED KEYS
const supabase = createClient(
  'https://kenaitcprnorjqpkntmb.supabase.co',
  'sb_publishable_HD5DLZaN-ey9FOpykFzpOQ__LEnvl9h'
);

export default function GarageDashboard() {
  const router = useRouter();
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [carName, setCarName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  async function loadCars() {
    // Fetch from the donor_stats view so we get all the profit math automatically
    const { data, error } = await supabase
      .from('donor_stats')
      .select('*');

    if (error) console.error("Error loading cars:", error);
    setCars(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCars();
  }, []);

  async function addCar() {
    if (!carName || !purchasePrice) return alert("Need a Name and a Price!");
    
    const fakeUserId = '81239150-f897-4c2c-b5f4-f26abc3844d4'; 

    // Insert into the base table
    const { error } = await supabase.from('donor_cars').insert({
      user_id: fakeUserId,
      name: carName,
      purchase_price: parseFloat(purchasePrice)
    });

    if (error) {
      alert("Error adding car: " + error.message);
    } else {
      setCarName('');
      setPurchasePrice('');
      loadCars();
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-900 text-white p-10 font-mono text-center mt-20">Loading Garage...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">My Garage</h1>

        {/* Add Car Form */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-10 shadow-lg">
           <h3 className="text-lg font-bold mb-4 text-slate-200">Add a New Donor Car</h3>
           <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-slate-400 mb-1 block">Car Make & Model</label>
              <input placeholder="e.g. 2004 Porsche Cayenne" value={carName} onChange={e => setCarName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" />
            </div>
            <div className="w-full md:w-48">
               <label className="text-xs text-slate-400 mb-1 block">Purchase Price ($)</label>
              <input placeholder="Price" type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" />
            </div>
            <button onClick={addCar} className="w-full md:w-auto bg-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-500 transition-colors">
              Add Car
            </button>
          </div>
        </div>

        {/* Car List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <div 
              key={car.donor_id} 
              onClick={() => router.push(`/car/${car.donor_id}`)}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 cursor-pointer hover:border-blue-500 hover:shadow-blue-500/20 transition-all shadow-lg"
            >
              <h2 className="text-xl font-bold mb-4 text-white truncate">{car.car_name}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cost:</span>
                  <span className="font-mono text-slate-200">${car.purchase_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Revenue:</span>
                  <span className="font-mono text-green-400">${car.total_revenue}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-700 mt-2">
                  <span className="text-slate-300 font-bold">Profit:</span>
                  <span className={`font-mono font-bold text-lg ${car.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${car.net_profit}
                  </span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-5 w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-green-400 h-2.5" style={{ width: `${Math.min(car.breakeven_percentage || 0, 100)}%` }}></div>
              </div>
              <p className="text-right text-xs mt-2 text-slate-500">{car.breakeven_percentage}% Recouped</p>
            </div>
          ))}
          {cars.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-slate-400">No cars in the garage yet. Add one above!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  'https://kenaitcprnorjqpkntmb.supabase.co',
  'sb_publishable_HD5DLZaN-ey9FOpykFzpOQ__LEnvl9h'
);

export default function GarageDashboard() {
  const router = useRouter();
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        loadCars(session.user.id);
      }
    }
    checkUser();
  }, [router]);

  async function loadCars(userId: string) {
    const { data, error } = await supabase.from('donor_stats').select('*').eq('user_id', userId);
    if (error) console.error("Error loading cars:", error);
    setCars(data || []);
    setLoading(false);
  }

  async function addCar() {
    if (!year || !make || !model || !purchasePrice) return alert("Need Year, Make, Model, and Price!");
    if (!user) return alert("You must be logged in to do this!");

    const { error } = await supabase.from('donors').insert({
      user_id: user.id, year: parseInt(year), make: make, model: model, purchase_price: parseFloat(purchasePrice)
    });

    if (error) alert("Error adding car: " + error.message);
    else { setYear(''); setMake(''); setModel(''); setPurchasePrice(''); loadCars(user.id); }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="min-h-screen bg-slate-900 text-white p-10 font-mono text-center mt-20">Checking ID at the door...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Garage</h1>
          <button onClick={handleSignOut} className="text-slate-400 hover:text-red-400 text-sm font-bold border border-slate-700 px-4 py-2 rounded-lg transition-colors">Sign Out</button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-10 shadow-lg">
           <h3 className="text-lg font-bold mb-4 text-slate-200">Add a New Donor Car</h3>
           <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-24">
              <label className="text-xs text-slate-400 mb-1 block">Year</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-slate-400 mb-1 block">Make</label>
              <input value={make} onChange={e => setMake(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-slate-400 mb-1 block">Model</label>
              <input value={model} onChange={e => setModel(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" />
            </div>
            <div className="w-full md:w-32">
               <label className="text-xs text-slate-400 mb-1 block">Cost ($)</label>
              <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" />
            </div>
            <button onClick={addCar} className="w-full md:w-auto bg-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-500 transition-colors">Add Car</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <div key={car.donor_id} onClick={() => router.push(`/car/${car.donor_id}`)} className="bg-slate-800 rounded-xl border border-slate-700 p-6 cursor-pointer hover:border-blue-500 transition-all shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-white truncate">{car.car_name}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Cost:</span><span className="font-mono text-slate-200">${car.purchase_price}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Revenue:</span><span className="font-mono text-green-400">${car.total_revenue}</span></div>
                <div className="flex justify-between pt-3 border-t border-slate-700 mt-2"><span className="text-slate-300 font-bold">Profit:</span><span className={`font-mono font-bold text-lg ${car.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${car.net_profit}</span></div>
              </div>
              <div className="mt-5 w-full bg-slate-900 rounded-full h-2.5 overflow-hidden"><div className="bg-gradient-to-r from-blue-500 to-green-400 h-2.5" style={{ width: `${Math.min(car.breakeven_percentage || 0, 100)}%` }}></div></div>
              <p className="text-right text-xs mt-2 text-slate-500">{car.breakeven_percentage}% Recouped</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
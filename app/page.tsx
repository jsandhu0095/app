'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// YOUR HARDCODED KEYS (Keep these for now)
const supabase = createClient(
  'https://kenaitcprnorjqpkntmb.supabase.co',
  'sb_publishable_HD5DLZaN-ey9FOpykFzpOQ__LEnvl9h'
);

export default function Dashboard() {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');

  // 1. Fetch Cars
  async function fetchCars() {
    const { data, error } = await supabase
      .from('donor_stats')
      .select('*')
      .order('purchase_price', { ascending: false }); // Show expensive cars first

    if (error) console.error('Error fetching:', error);
    else setCars(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCars();
  }, []);

  // 2. Add New Car Function
  async function addCar() {
    if (!make || !model || !price) return alert("Please fill in the details!");

    // We need a fake user ID since we aren't logged in yet
    // This is just for testing!
    const fakeUserId = '81239150-f897-4c2c-b5f4-f26abc3844d4'; 

    const { error } = await supabase
      .from('donors')
      .insert({
        user_id: fakeUserId,
        make: make,
        model: model,
        year: parseInt(year),
        purchase_price: parseFloat(price),
        status: 'active'
      });

    if (error) {
      alert(error.message);
    } else {
      // Clear form and refresh list
      setMake('');
      setModel('');
      setYear('');
      setPrice('');
      fetchCars(); // Reload the list instantly
    }
  }

  if (loading) return <div className="p-10 text-white font-mono">Loading your garage...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-slate-700 pb-6">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 md:mb-0">
            Part-Out Pro
          </h1>
          <div className="text-sm text-slate-400">
            Total Inventory Value: <span className="text-white font-bold">${cars.reduce((sum, car) => sum + car.purchase_price, 0).toLocaleString()}</span>
          </div>
        </header>

        {/* The "Add Car" Form */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg mb-10">
          <h3 className="text-xl font-bold mb-4 text-slate-200">Add New Donor Car</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <input 
              placeholder="Year (e.g. 2018)" 
              value={year} onChange={e => setYear(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input 
              placeholder="Make (e.g. BMW)" 
              value={make} onChange={e => setMake(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input 
              placeholder="Model (e.g. M3)" 
              value={model} onChange={e => setModel(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input 
              placeholder="Cost ($)" 
              type="number"
              value={price} onChange={e => setPrice(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={addCar}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg p-3 transition-colors shadow-lg shadow-blue-900/50"
            >
              + Add Car
            </button>
          </div>
        </div>

        {/* The Car List */}
        <div className="grid gap-6">
         {/* The Car List */}
<div className="grid gap-6">
  {cars.map((car) => (
    <Link href={`/car/${car.donor_id}`} key={car.donor_id}>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group hover:border-blue-500 transition-colors cursor-pointer">
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{car.car_name}</h2>
            <p className="text-slate-400 text-sm">Purchased: <span className="text-white">${car.purchase_price}</span></p>
          </div>
          <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
            car.net_profit >= 0 ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'bg-rose-900 text-rose-300 border border-rose-700'
          }`}>
            {car.net_profit >= 0 ? 'PROFIT' : 'RECOUPING'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 flex justify-between text-xs text-slate-300 font-mono relative z-10">
          <span>RECOUPED: {car.breakeven_percentage}%</span>
          <span>SOLD: ${car.total_revenue}</span>
        </div>
        
        <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden mb-6 relative z-10">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${car.breakeven_percentage >= 100 ? 'bg-emerald-400' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(car.breakeven_percentage, 100)}%` }}
          ></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-700 pt-4 relative z-10">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Net Profit</p>
            <p className={`text-xl font-mono font-bold ${car.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${car.net_profit}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Fees Paid</p>
            <p className="text-xl font-mono text-slate-400">${car.total_fees}</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-blue-400 group-hover:text-blue-300 font-medium mt-2 inline-block">
              View Parts &rarr;
            </span>
          </div>
        </div>

      </div>
    </Link>
  ))}
</div>
        </div>
      </div>
    </div>
  );
}

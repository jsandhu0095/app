'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Using your public keys (These are safe to be public!)
const supabase = createClient(
  'https://kenaitcprnorjqpkntmb.supabase.co',
  'sb_publishable_HD5DLZaN-ey9FOpykFzpOQ__LEnvl9h'
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // SIGN UP FUNCTION
  async function handleSignUp() {
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Success! Account created. You can now log in.');
    }
    setLoading(false);
  }

  // SIGN IN FUNCTION
  async function handleSignIn() {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Logged in successfully! Heading to Garage...');
      // Send them to the main dashboard
      router.push('/');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-white">
      <div className="max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Part-Out-Pro</h1>
          <p className="text-slate-400">Log in to manage your garage.</p>
        </div>

        {message && (
          <div className={`p-3 rounded mb-4 text-sm text-center ${message.includes('Error') ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-green-900/50 text-green-400 border border-green-800'}`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@email.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" 
            />
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button 
              onClick={handleSignIn} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            <button 
              onClick={handleSignUp} 
              disabled={loading}
              className="w-full bg-transparent border border-slate-600 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Create Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
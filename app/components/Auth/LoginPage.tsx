import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    const email = prompt('Enter your email to reset your password:');
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok) {
        toast.error(data?.message || 'Failed to send reset link');
      } else {
        toast.success('Password reset link sent! Check your email.');
      }
    } catch (err: any) {
      toast.error('Network error');
    }
    setLoading(false);
  };

  return (
    <div>
      {/* ... existing code ... */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-400">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
          placeholder="Your password"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleForgotPassword}
          className="mt-1 text-xs text-green-400 hover:text-green-300"
          disabled={loading}
        >
          Forgot Password?
        </button>
      </div>
      {/* ... existing code ... */}
    </div>
  );
};

export default LoginPage; 
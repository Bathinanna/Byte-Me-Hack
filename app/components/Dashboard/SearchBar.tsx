import { useState } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  return (
    <input
      type="text"
      className="w-full px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
      placeholder="Search or start a new chat"
      value={query}
      onChange={e => setQuery(e.target.value)}
    />
  );
} 
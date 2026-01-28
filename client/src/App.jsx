import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.74 5.74a8 8 0 1 1-11.48 0l5.74-5.74z"></path>
              <path d="M9 13h6"></path>
              <path d="M12 16v3"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">AquaSense Pro</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Advanced Water Monitoring System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="glass-panel px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors">
            Admin Login
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;

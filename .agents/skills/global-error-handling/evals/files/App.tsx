import React from 'react';
import { Dashboard } from './Dashboard';
import { Settings } from './Settings';
import { GistList } from './GistList';

// BUG: No error boundaries - any component crash causes white screen of death
export function App() {
  return (
    <div className="app">
      <header>
        <h1>Gist Manager</h1>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/gists">Gists</a>
          <a href="/settings">Settings</a>
        </nav>
      </header>
      
      <main>
        <Dashboard />
        <GistList />
        <Settings />
      </main>
    </div>
  );
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <div className="admin-layout">
        <nav className="admin-nav">
          <h1>South Oak Admin</h1>
          <ul>
            <li>
              <NavLink to="/">Dashboard</NavLink>
            </li>
            <li>
              <NavLink to="/leads">Leads</NavLink>
            </li>
            <li>
              <NavLink to="/knowledge">Knowledge Base</NavLink>
            </li>
            <li>
              <NavLink to="/settings">Settings</NavLink>
            </li>
          </ul>
        </nav>
        <main className="admin-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

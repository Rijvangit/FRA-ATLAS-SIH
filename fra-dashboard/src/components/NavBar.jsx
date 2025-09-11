import React from 'react';

const Icon = ({ name, size = 16 }) => {
  switch (name) {
    case 'dashboard':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h8v8H3v-8zm10 5h8v3h-8v-3z" fill="currentColor"/></svg>);
    case 'map':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3l6 2.4L21 3v18l-6 2.4L9 21 3 23V5l6-2z" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M9 3v18M15 5.4v18" stroke="currentColor" strokeWidth="1.2"/></svg>);
    case 'alerts':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/></svg>);
    case 'ocr':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 4v6h6" stroke="currentColor" strokeWidth="1.6"/></svg>);
    case 'back':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    case 'external':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h7v7" stroke="currentColor" strokeWidth="1.8"/><path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.8"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="1.8"/></svg>);
    default:
      return null;
  }
};

export default function NavBar({ activeTab, onNavigate }) {
  const Button = ({ active, onClick, icon, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 ${
        active ? 'bg-[#1f7aec] text-white' : 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]'
      }`}
    >
      <Icon name={icon} />
      <span>{children}</span>
    </button>
  );

  return (
    <div className="nav-wrap">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button active={activeTab === 'dashboard'} onClick={() => onNavigate('dashboard')} icon="dashboard">Dashboard</Button>
        <Button active={activeTab === 'maps'} onClick={() => onNavigate('maps')} icon="map">Maps</Button>
        <Button active={activeTab === 'alerts'} onClick={() => onNavigate('alerts')} icon="alerts">Alerts</Button>
        <Button active={activeTab === 'ocr'} onClick={() => onNavigate('ocr')} icon="ocr">Document OCR</Button>
        <button onClick={() => window.location.assign('http://localhost:5173/')} className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]" title="Open SEARCH MAPS">
          <Icon name="external" /> SEARCH MAPS
        </button>
        <button onClick={() => window.location.assign('http://localhost:8000/')} className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]" title="Open Forest Alert">
          <Icon name="external" /> Forest Alert
        </button>
        <button onClick={() => window.history.back()} className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]" title="Go Back">
          <Icon name="back" /> Back
        </button>
      </div>
    </div>
  );
}




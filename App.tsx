
import React, { useState } from 'react';
import { IconActivity, IconCpu, IconGitBranch, IconBot, IconChevronDown, IconServer } from './components/Icons';
import WorkflowEditor from './components/WorkflowEditor';
import RuntimeViewer from './components/RuntimeViewer';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import { MOCK_MACHINES } from './constants';
import { Machine } from './types';

enum Tab {
  Runtime = 'runtime',
  Workflow = 'workflow',
  Diagnostics = 'diagnostics'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Runtime);
  const [selectedMachine, setSelectedMachine] = useState<Machine>(MOCK_MACHINES[0]);
  const [isMachineMenuOpen, setIsMachineMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-bold text-white text-lg">F</span>
            </div>
            <span className="ml-3 font-bold text-lg hidden md:block tracking-tight text-white">FECP Agent</span>
          </div>

          <div className="mt-6 flex flex-col space-y-2 px-2">
            <NavItem 
              icon={<IconActivity />} 
              label="Runtime Monitor" 
              active={activeTab === Tab.Runtime} 
              onClick={() => setActiveTab(Tab.Runtime)} 
            />
            <NavItem 
              icon={<IconGitBranch />} 
              label="Workflow Designer" 
              active={activeTab === Tab.Workflow} 
              onClick={() => setActiveTab(Tab.Workflow)} 
            />
            <NavItem 
              icon={<IconBot />} 
              label="AI Diagnostics" 
              active={activeTab === Tab.Diagnostics} 
              onClick={() => setActiveTab(Tab.Diagnostics)} 
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 hidden md:block">
           <div className="bg-slate-800 rounded p-3">
             <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Agent Status</div>
             <div className="flex items-center space-x-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-sm text-white">System Online</span>
             </div>
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-30 relative">
          <div className="flex items-center space-x-4">
             <h1 className="text-lg font-medium text-white mr-4">
               {activeTab === Tab.Runtime && 'Equipment Runtime'}
               {activeTab === Tab.Workflow && 'Process Flow Designer'}
               {activeTab === Tab.Diagnostics && 'AI Diagnostics & Logs'}
             </h1>
             
             {/* Machine Selector */}
             <div className="relative">
                <button 
                  onClick={() => setIsMachineMenuOpen(!isMachineMenuOpen)}
                  className="flex items-center space-x-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-all shadow-sm group"
                >
                  <IconServer className="text-blue-400 w-4 h-4" />
                  <div className="flex flex-col items-start">
                     <span className="text-[10px] text-slate-400 uppercase leading-none mb-0.5">Connected Machine</span>
                     <span className="text-sm font-semibold text-white leading-none">{selectedMachine.name}</span>
                  </div>
                  <IconChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isMachineMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMachineMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMachineMenuOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                       <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 text-xs text-slate-400 font-semibold uppercase">
                          Select Machine
                       </div>
                       <div className="max-h-64 overflow-y-auto">
                          {MOCK_MACHINES.map(machine => (
                            <button
                                key={machine.id}
                                onClick={() => {
                                  setSelectedMachine(machine);
                                  setIsMachineMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0
                                  ${selectedMachine.id === machine.id ? 'bg-blue-900/20' : ''}
                                `}
                            >
                                <div>
                                    <div className={`font-medium ${selectedMachine.id === machine.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                      {machine.name}
                                    </div>
                                    <div className="text-xs text-slate-500">{machine.model}</div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${
                                  machine.state === 'Running' ? 'bg-green-500' : 
                                  machine.state === 'Error' ? 'bg-red-500' : 'bg-slate-500'
                                }`}></div>
                            </button>
                          ))}
                       </div>
                    </div>
                  </>
                )}
             </div>
          </div>

          <div className="flex items-center space-x-4">
             <div className="hidden md:flex items-center px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                <span className="text-xs text-slate-300">Environment: PROD</span>
             </div>
             <button className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold">
                JM
             </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative p-0 bg-slate-950">
          {activeTab === Tab.Runtime && <RuntimeViewer selectedMachine={selectedMachine} />}
          {activeTab === Tab.Workflow && (
              <div className="h-full p-4">
                  <WorkflowEditor />
              </div>
          )}
          {activeTab === Tab.Diagnostics && <DiagnosticsPanel selectedMachine={selectedMachine} />}
        </div>
      </main>
    </div>
  );
};

// Helper Component for Navigation Items
const NavItem: React.FC<{ icon: React.ReactElement<any>; label: string; active: boolean; onClick: () => void }> = ({ 
  icon, label, active, onClick 
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
    </div>
    <span className="ml-3 font-medium text-sm hidden md:block">{label}</span>
  </button>
);

export default App;

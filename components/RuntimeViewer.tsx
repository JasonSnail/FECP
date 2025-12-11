
import React, { useEffect, useState } from 'react';
import { MOCK_FOUPS, MOCK_HISTORY_EVENTS, MOCK_WORKFLOW, MOCK_EPT_TASKS, MOCK_WORKFLOW_TASKS } from '../constants';
import { Foup, MachineState, Wafer, HistoryEvent, FoupState, EptState, Machine } from '../types';
import { IconCpu, IconAlertTriangle, IconHistory, IconCheckCircle, IconGitBranch, IconBarChart, IconActivity } from './Icons';

const STATE_NODE_MAPPING: Record<string, string> = {
  [FoupState.Arrived]: '1',
  [FoupState.Verifying]: '2', // Mapping Verifying to Read RFID/Decision phase
  [FoupState.Docked]: '4',
  [FoupState.Processing]: '6',
  [FoupState.Hold]: '5',
  [FoupState.Unloading]: '7',
  [FoupState.Completed]: '7'
};

interface RuntimeViewerProps {
    selectedMachine: Machine;
}

const RuntimeViewer: React.FC<RuntimeViewerProps> = ({ selectedMachine }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filter data for the selected machine
  const machineFoups = MOCK_FOUPS.filter(f => f.machineId === selectedMachine.id);
  const machineEptTasks = MOCK_EPT_TASKS.filter(t => t.machineId === selectedMachine.id);
  const machineWorkflowTasks = MOCK_WORKFLOW_TASKS.filter(t => t.machineId === selectedMachine.id);
  
  // Default to first active foup or null
  const [selectedFoup, setSelectedFoup] = useState<Foup | null>(null);

  // Reset selected Foup when machine changes
  useEffect(() => {
    if (machineFoups.length > 0) {
        setSelectedFoup(machineFoups[0]);
    } else {
        setSelectedFoup(null);
    }
  }, [selectedMachine.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter history for currently selected FOUP
  const historyEvents = selectedFoup 
    ? MOCK_HISTORY_EVENTS.filter(e => e.foupId === selectedFoup.id && e.machineId === selectedMachine.id)
    : [];
    
  const activeNodeId = selectedFoup ? STATE_NODE_MAPPING[selectedFoup.state] : null;

  return (
    <div className="grid grid-cols-12 gap-4 h-full overflow-y-auto p-4 pb-20 bg-slate-950">
      {/* Header Stats */}
      <div className="col-span-12 flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
        <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${selectedMachine.state === 'Error' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                {selectedMachine.state === 'Error' ? (
                     <IconAlertTriangle className="text-red-400 w-6 h-6" />
                ) : (
                     <IconCpu className="text-blue-400 w-6 h-6" />
                )}
            </div>
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{selectedMachine.name}</h2>
                <p className="text-sm text-slate-400">{selectedMachine.model} • <span className={selectedMachine.state === 'Running' ? 'text-green-400' : selectedMachine.state === 'Error' ? 'text-red-400' : 'text-slate-400'}>{selectedMachine.state}</span></p>
            </div>
        </div>
        <div className="text-right">
            <div className="text-2xl font-mono text-white">{currentTime.toLocaleTimeString()}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">System Time</div>
        </div>
      </div>

      {/* Main Content - Left: FOUP List, Center: Wafer Map (Expanded) */}
      
      {/* Active FOUPs */}
      <div className="col-span-12 md:col-span-3 space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Active Carriers ({machineFoups.length})
        </h3>
        
        {machineFoups.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                No active carriers
            </div>
        ) : (
            machineFoups.map(foup => (
                <div 
                    key={foup.id} 
                    onClick={() => setSelectedFoup(foup)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedFoup?.id === foup.id ? 'bg-slate-700 border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-mono font-bold text-lg text-white">{foup.id}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${foup.state === 'Processing' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                            {foup.state}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">Lot: {foup.lotId}</div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${foup.progress}%` }}></div>
                    </div>
                </div>
            ))
        )}

        {/* Mini Alert Box (Machine Specific) */}
        {selectedMachine.state === 'Error' && (
             <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg flex items-start space-x-3">
                <IconAlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0" />
                <div>
                    <h4 className="text-sm font-semibold text-red-400">Critical Error</h4>
                    <p className="text-xs text-red-300/80 mt-1">Machine reported hard down state. Check diagnostics.</p>
                </div>
            </div>
        )}
      </div>

      {/* Wafer Map - Expanded to col-span-9 */}
      <div className="col-span-12 md:col-span-9 bg-slate-800 rounded-lg border border-slate-700 p-0 overflow-hidden flex flex-col md:flex-row h-[320px]">
        {/* Left: Visual Map */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col items-center justify-center">
            {selectedFoup ? (
                <>
                    <div className="grid grid-cols-5 gap-3">
                        {selectedFoup.wafers.map((wafer) => (
                            <WaferSlot key={wafer.slot} wafer={wafer} />
                        ))}
                    </div>
                    <div className="mt-6 flex justify-center space-x-6 text-xs text-slate-400">
                        <div className="flex items-center"><span className="w-3 h-3 bg-slate-600 rounded-full mr-2"></span> Pending</div>
                        <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2 shadow-lg shadow-green-500/40"></span> Processing</div>
                        <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span> Completed</div>
                    </div>
                </>
            ) : (
                <div className="text-slate-500">No Carrier Selected</div>
            )}
        </div>
        
        {/* Right: Location Tracker */}
        <div className="w-full md:w-80 bg-slate-900/50 flex flex-col">
            <div className="p-3 border-b border-slate-700 bg-slate-900">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wafer Locations</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {selectedFoup ? (
                    <>
                        {selectedFoup.wafers.filter(w => w.status === 'Processing' || w.status === 'Completed').slice(0, 8).map(w => (
                            <div key={w.id} className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700">
                                <div className="flex items-center space-x-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">{w.slot}</span>
                                    <span className="text-xs text-slate-200">{w.id}</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-900/50">
                                    {w.location || 'FOUP'}
                                </span>
                            </div>
                        ))}
                        {/* Fill with pending summary */}
                        <div className="p-2 text-center text-xs text-slate-500 italic">
                            + {selectedFoup.wafers.filter(w => w.status === 'Pending').length} Pending Wafers
                        </div>
                    </>
                ) : (
                    <div className="p-4 text-center text-xs text-slate-500">Select a carrier to view wafers</div>
                )}
            </div>
        </div>
      </div>

      {/* Live Workflow State */}
      <div className="col-span-12 md:col-span-8 bg-slate-800 rounded-lg border border-slate-700 p-4 overflow-hidden flex flex-col relative h-[300px]">
        <div className="flex items-center justify-between mb-4 z-10">
           <div className="flex items-center space-x-2">
                <IconGitBranch className="text-blue-400 w-5 h-5" />
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Live Workflow State</h3>
           </div>
           <div className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400 font-mono">
               {MOCK_WORKFLOW.id} v{MOCK_WORKFLOW.version}
           </div>
        </div>
        <div className="flex-1 relative bg-slate-900/50 rounded border border-slate-700/50 overflow-x-auto overflow-y-hidden">
            {/* Render Workflow Graph */}
            <div style={{ minWidth: '1100px', height: '100%', position: 'relative' }}>
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                        <marker id="arrowhead-rw" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                        </marker>
                    </defs>
                    {MOCK_WORKFLOW.edges.map(edge => {
                        const source = MOCK_WORKFLOW.nodes.find(n => n.id === edge.source);
                        const target = MOCK_WORKFLOW.nodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;
                        const pathD = `M${source.x + 80} ${source.y + 20} C ${source.x + 120} ${source.y + 20}, ${target.x - 40} ${target.y + 20}, ${target.x} ${target.y + 20}`;
                        
                        return (
                            <g key={edge.id}>
                                <path 
                                    d={pathD} 
                                    stroke="#475569" 
                                    strokeWidth="2" 
                                    fill="none"
                                    markerEnd="url(#arrowhead-rw)"
                                />
                                {edge.label && (
                                    <text x={(source.x + target.x)/2 + 40} y={(source.y + target.y)/2 + 10} fill="#64748b" fontSize="10" textAnchor="middle" className="bg-slate-900">
                                        {edge.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {MOCK_WORKFLOW.nodes.map(node => {
                    const isActive = node.id === activeNodeId;
                    return (
                        <div
                            key={node.id}
                            style={{ left: node.x, top: node.y }}
                            className={`absolute w-40 h-10 flex items-center justify-center rounded border shadow-lg transition-all z-10
                                ${isActive 
                                    ? 'bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/20 text-white animate-pulse' 
                                    : 'bg-slate-800 border-slate-600 text-slate-400 opacity-80'}
                                ${node.type === 'decision' && !isActive ? 'bg-amber-900/10 border-amber-800/50' : ''}
                            `}
                        >
                            <span className="text-xs font-medium">{node.label}</span>
                            {isActive && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* History Timeline Panel */}
      <div className="col-span-12 md:col-span-4 bg-slate-800 rounded-lg border border-slate-700 p-4 h-[300px] flex flex-col">
        <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-slate-700">
            <IconHistory className="text-teal-400 w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Exec History
            </h3>
        </div>

        <div className="relative pl-4 overflow-x-auto flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Vertical Line */}
            <div className="absolute top-0 bottom-0 left-[27px] w-0.5 bg-slate-700"></div>

            <div className="space-y-6">
                {!selectedFoup ? (
                    <div className="text-slate-500 text-sm italic py-4">Select a carrier to view history.</div>
                ) : historyEvents.length === 0 ? (
                    <div className="text-slate-500 text-sm italic py-4">No execution history available.</div>
                ) : (
                    historyEvents.map((event, index) => (
                        <div key={event.id} className="relative flex items-start group">
                            {/* Dot/Icon */}
                            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center mr-4 flex-shrink-0 
                                ${event.status === 'failed' ? 'bg-red-900 border border-red-500 text-red-500' : 
                                  event.status === 'running' ? 'bg-blue-900 border border-blue-500 text-blue-400' : 
                                  'bg-slate-900 border border-slate-600 text-green-500'}`}
                            >
                                {event.status === 'completed' ? <IconCheckCircle className="w-3.5 h-3.5" /> : 
                                 event.status === 'failed' ? <IconAlertTriangle className="w-3.5 h-3.5" /> :
                                 <div className="w-2 h-2 bg-current rounded-full" />}
                            </div>

                            {/* Content Card */}
                            <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded p-2 hover:bg-slate-750 transition-colors">
                                <div className="flex flex-col gap-1 mb-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-200 text-xs">{event.label}</span>
                                        <span className="font-mono text-[10px] text-slate-500">{event.timestamp}</span>
                                    </div>
                                    <span className={`text-[10px] uppercase w-fit px-1.5 py-px rounded 
                                            ${event.type === 'state' ? 'bg-indigo-500/10 text-indigo-300' : 
                                              event.type === 'alert' ? 'bg-red-500/10 text-red-300' :
                                              'bg-slate-600/20 text-slate-400'}`}>
                                            {event.type}
                                    </span>
                                </div>
                                
                                {(event.details || event.duration) && (
                                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-400">
                                        {event.duration && (
                                            <span>⏱ {event.duration}</span>
                                        )}
                                        {event.details && (
                                            <span>ℹ️ {event.details}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Program Workflow Execution Gantt Panel */}
      <div className="col-span-12 bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center space-x-2 mb-4">
            <IconActivity className="text-cyan-400 w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Program Workflow Execution Gantt
            </h3>
        </div>
        
        {machineWorkflowTasks.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-900/50 rounded border border-slate-700 border-dashed">
                No workflow execution data available.
            </div>
        ) : (
            <div className="relative border-t border-slate-700 bg-slate-900/50 rounded overflow-hidden p-4">
                <div className="space-y-3">
                    {machineWorkflowTasks.map((task) => (
                        <div key={task.id} className="relative h-8 flex items-center">
                            {/* Label */}
                            <div className="absolute left-0 w-32 text-xs font-mono text-slate-400 truncate text-right pr-4">
                                {task.stepName}
                            </div>
                            
                            {/* Bar Container */}
                            <div className="ml-32 flex-1 relative h-full bg-slate-800/50 rounded overflow-hidden">
                                {/* Bar */}
                                <div 
                                    className={`absolute top-1 bottom-1 rounded border shadow-sm transition-all flex items-center px-2
                                        ${task.status === 'Running' ? 'bg-cyan-600 border-cyan-500 animate-pulse' : 
                                          task.status === 'Completed' ? 'bg-slate-600 border-slate-500' : 
                                          'bg-slate-700 border-slate-600'}
                                    `}
                                    style={{ 
                                        left: `${(task.startTime / 100) * 100}%`, 
                                        width: `${(task.duration / 100) * 100}%` 
                                    }}
                                >
                                    {task.status === 'Running' && (
                                        <span className="text-[10px] text-white font-bold tracking-wider">RUNNING</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="ml-32 mt-2 flex justify-between text-[10px] text-slate-500 font-mono border-t border-slate-700 pt-1">
                    <span>T+0s</span>
                    <span>T+25s</span>
                    <span>T+50s</span>
                    <span>T+75s</span>
                    <span>T+100s</span>
                </div>
            </div>
        )}
      </div>

      {/* SEMI E116 EPT Visualization Panel */}
      <div className="col-span-12 bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center space-x-2 mb-4">
            <IconBarChart className="text-purple-400 w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                SEMI E116 Equipment Performance Tracking & Wafer Flow
            </h3>
        </div>
        
        {machineEptTasks.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-900/50 rounded border border-slate-700 border-dashed">
                No EPT tracking data available for this machine.
            </div>
        ) : (
            <div className="relative border-t border-slate-700 bg-slate-900/50 rounded overflow-hidden">
                {/* Modules Labels */}
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-slate-800 border-r border-slate-700 z-10 flex flex-col pt-8">
                    {/* Unique Modules for this machine */}
                    {[...new Set(machineEptTasks.map(t => t.moduleId))].map(mod => (
                        <div key={mod} className="h-12 flex items-center justify-end px-3 text-xs text-slate-400 font-mono border-b border-slate-700/50">
                            {mod}
                        </div>
                    ))}
                </div>
                
                {/* Timeline Area */}
                <div className="ml-24 overflow-x-auto custom-scrollbar">
                    <div className="relative min-w-[800px] py-8">
                        {/* Time Grid Lines (every 10s) */}
                        {Array.from({ length: 13 }).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700/30" style={{ left: `${(i * 10) / 1.2}%` }}>
                                <span className="absolute top-2 left-1 text-[10px] text-slate-600">T+{i * 10}s</span>
                            </div>
                        ))}

                        {/* Rows */}
                        <div className="">
                            {[...new Set(machineEptTasks.map(t => t.moduleId))].map((mod) => (
                                <div key={mod} className="h-12 border-b border-slate-700/50 relative group">
                                    {/* Render Tasks */}
                                    {machineEptTasks.filter(t => t.moduleId === mod).map(task => (
                                        <div 
                                            key={task.id}
                                            className={`absolute top-2 bottom-2 rounded flex items-center justify-center text-[10px] text-white/90 shadow-sm transition-all hover:brightness-110 cursor-pointer overflow-hidden
                                                ${task.state === EptState.Busy ? 'bg-green-600 border border-green-500' : 
                                                task.state === EptState.Blocked ? 'bg-red-600/80 border border-red-500' :
                                                task.state === EptState.Idle ? 'bg-slate-700/50 border border-slate-600 border-dashed' : 'bg-slate-600'}
                                            `}
                                            style={{ 
                                                left: `${(task.startTime / 120) * 100}%`, 
                                                width: `${(task.duration / 120) * 100}%` 
                                            }}
                                            title={`${task.moduleId} - ${task.state} (${task.duration}s)`}
                                        >
                                            {task.state === EptState.Busy && (
                                                <span className="truncate px-1 font-semibold tracking-tight">{task.waferId || task.recipe || task.taskName}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const WaferSlot: React.FC<{ wafer: Wafer }> = ({ wafer }) => {
    let colorClass = "bg-slate-600";
    if (wafer.status === 'Completed') colorClass = "bg-blue-500";
    if (wafer.status === 'Processing') colorClass = "bg-green-500 animate-pulse ring-2 ring-green-400/30";
    if (wafer.status === 'Defect') colorClass = "bg-red-500";

    return (
        <div className="relative group">
            <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}>
                <span className="text-[10px] font-bold text-white/90">{wafer.slot}</span>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20">
                {wafer.id} - {wafer.status}
            </div>
        </div>
    );
}

export default RuntimeViewer;

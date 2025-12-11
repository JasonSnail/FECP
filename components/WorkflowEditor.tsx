
import React, { useState, useEffect, useRef } from 'react';
import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types';
import { MOCK_WORKFLOW, MOCK_MATERIAL_FSM } from '../constants';
import { IconGitBranch, IconLayout, IconLayers, IconCpu, IconPlus } from './Icons';

type ViewMode = 'logic' | 'fsm';

const WorkflowEditor: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('logic');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinition>(MOCK_WORKFLOW);
  const [nodes, setNodes] = useState<WorkflowNode[]>(MOCK_WORKFLOW.nodes);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Connection State
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Load correct data when view changes
  useEffect(() => {
    if (viewMode === 'logic') {
      setActiveWorkflow(MOCK_WORKFLOW);
      setNodes(MOCK_WORKFLOW.nodes);
    } else {
      setActiveWorkflow(MOCK_MATERIAL_FSM);
      setNodes(MOCK_MATERIAL_FSM.nodes);
    }
    setSelectedNode(null);
    setSelectedEdge(null);
    setConnectingNodeId(null);
    setMousePos(null);
  }, [viewMode]);

  const handleNewWorkflow = () => {
    const newId = `wf-${Date.now()}`;
    // Create default start node based on mode
    const defaultNode: WorkflowNode = viewMode === 'logic' 
        ? { id: '1', type: 'start', label: 'Start', x: 100, y: 150, status: 'pending' }
        : { id: 's1', type: 'initial', label: 'Initial', x: 100, y: 200, status: 'pending' };

    const newWorkflow: WorkflowDefinition = {
        id: newId,
        name: 'New Workflow',
        version: '0.0.1',
        category: viewMode,
        nodes: [defaultNode],
        edges: []
    };

    setActiveWorkflow(newWorkflow);
    setNodes(newWorkflow.nodes);
    setSelectedNode(null);
    setSelectedEdge(null);
    setConnectingNodeId(null);
  };

  const handleSaveRequest = () => {
      setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
      console.log(`Saving workflow ${activeWorkflow.id}...`);
      // Here you would implement the actual API call to save the workflow
      setShowSaveDialog(false);
  };

  const handleAutoLayout = () => {
    // Simple Layering Algorithm (Longest Path) for generic DAG
    const layers: Record<string, number> = {};
    const startNodes = nodes.filter(n => n.type === 'start' || n.type === 'initial');
    
    const assignLayer = (nodeId: string, layer: number) => {
        layers[nodeId] = Math.max(layers[nodeId] || 0, layer);
        // Find outgoing edges
        const outgoing = activeWorkflow.edges.filter(e => e.source === nodeId);
        outgoing.forEach(edge => {
            assignLayer(edge.target, layer + 1);
        });
    };

    startNodes.forEach(n => assignLayer(n.id, 0));

    // Group by layer
    const nodesByLayer: Record<number, string[]> = {};
    Object.entries(layers).forEach(([id, layer]) => {
        if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
        nodesByLayer[layer].push(id);
    });

    // Assign positions
    const X_SPACING = viewMode === 'logic' ? 240 : 200;
    const Y_SPACING = 120;
    const START_X = 80;
    const START_Y = 150;

    const newNodes = nodes.map(node => {
        const layer = layers[node.id] || 0;
        const indexInLayer = nodesByLayer[layer]?.indexOf(node.id) || 0;
        const layerSize = nodesByLayer[layer]?.length || 1;
        
        // Center vertically based on layer size
        const yOffset = (indexInLayer - (layerSize - 1) / 2) * Y_SPACING;

        return {
            ...node,
            x: START_X + layer * X_SPACING,
            y: START_Y + yOffset
        };
    });

    setNodes(newNodes);
  };

  // Helper to get node dimensions based on current mode styling
  const getNodeDimensions = () => {
    return viewMode === 'logic' ? { w: 176, h: 48 } : { w: 128, h: 48 }; // Updated widths for better text fit
  };

  const getSourcePoint = (node: WorkflowNode) => {
    const { w, h } = getNodeDimensions();
    return { x: node.x + w, y: node.y + h / 2 };
  };

  const getTargetPoint = (node: WorkflowNode) => {
    const { h } = getNodeDimensions();
    return { x: node.x, y: node.y + h / 2 };
  };

  // ---- Drag & Drop for New Nodes ----

  const handleDragStart = (e: React.DragEvent, item: string) => {
      // Map palette item to node type and label
      let type = 'activity';
      let label = item;
      
      if (viewMode === 'logic') {
          if (item === 'Start') { type = 'start'; }
          else if (item === 'End') { type = 'end'; }
          else if (item === 'Decision') { type = 'decision'; label = 'Check Condition?'; }
          else { type = 'activity'; }
      } else {
          if (item.includes('Initial')) { type = 'initial'; label = 'Start'; }
          else if (item.includes('Final')) { type = 'final'; label = 'End'; }
          else { type = 'state'; label = 'New State'; }
      }

      e.dataTransfer.setData('application/reactflow', JSON.stringify({ type, label }));
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
      setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (!canvasRef.current) return;

      const data = e.dataTransfer.getData('application/reactflow');
      if (!data) return;

      const { type, label } = JSON.parse(data);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const { w, h } = getNodeDimensions();

      const newNode: WorkflowNode = {
          id: `${type}-${Date.now()}`,
          type: type as any,
          label: label,
          x: x - w / 2, // Center on cursor
          y: y - h / 2,
          status: 'pending'
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      setActiveWorkflow(prev => ({
          ...prev,
          nodes: newNodes
      }));
  };


  // ---- Interaction Handlers ----

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectingNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleCanvasMouseUp = () => {
    // Cancel connection if dropped on canvas
    if (connectingNodeId) {
      setConnectingNodeId(null);
      setMousePos(null);
    }
  };

  const handleCanvasClick = () => {
      setSelectedNode(null);
      setSelectedEdge(null);
  };

  const startConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingNodeId(nodeId);
    // Initialize mouse pos to start point
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }
  };

  const completeConnection = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (connectingNodeId && connectingNodeId !== targetId) {
        // Prevent duplicate edges
        const exists = activeWorkflow.edges.some(edge => edge.source === connectingNodeId && edge.target === targetId);
        if (!exists) {
            const newEdge: WorkflowEdge = {
                id: `e-${connectingNodeId}-${targetId}-${Date.now()}`,
                source: connectingNodeId,
                target: targetId,
                label: ''
            };
            setActiveWorkflow(prev => ({
                ...prev,
                edges: [...prev.edges, newEdge]
            }));
        }
    }
    setConnectingNodeId(null);
    setMousePos(null);
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      setSelectedNode(null);
      setSelectedEdge(edgeId);
  };

  const deleteSelectedEdge = () => {
      if (selectedEdge) {
          setActiveWorkflow(prev => ({
              ...prev,
              edges: prev.edges.filter(e => e.id !== selectedEdge)
          }));
          setSelectedEdge(null);
      }
  };

  // ---- Path Generators ----

  const getEdgePath = (sx: number, sy: number, tx: number, ty: number, sourceNode?: WorkflowNode, targetNode?: WorkflowNode) => {
    const dx = tx - sx;
    const dy = ty - sy;

    // Check for collision/obstruction by other nodes in logic mode
    let yOffset = 0;
    if (viewMode === 'logic' && sourceNode && targetNode) {
        // Simple collision detection: if there is a node directly between source and target
        const hasObstruction = nodes.some(n => 
            n.id !== sourceNode.id && 
            n.id !== targetNode.id &&
            n.x > Math.min(sx, tx) && 
            n.x < Math.max(sx, tx) &&
            Math.abs(n.y - sy) < 60 // Roughly same Y level
        );
        if (hasObstruction) {
            yOffset = -80; // Route above
        }
    }

    if (viewMode === 'logic') {
        // Smart Routing for Logic View
        // If target is behind source (loop-back), route under/around
        if (dx < -20) {
            // Backward Edge (Loop) - "U" shape dipping down
            
            // Find lowest Y in the graph to route below everything
            const maxY = Math.max(...nodes.map(n => n.y), sy, ty);
            const loopDepth = 80;
            const routeY = maxY + loopDepth; // Route below the lowest node
            
            const controlOut = 50;
            const mx = (sx + tx) / 2;
            
            // Cubic Bezier with symmetric S curve for smooth return
            // Path: Start -> Curve Down/Right -> Midpoint (Bottom) -> Curve Up/Left -> End
            return `M ${sx} ${sy} 
                    C ${sx + controlOut} ${sy}, ${sx + controlOut} ${routeY}, ${mx} ${routeY} 
                    S ${tx - controlOut} ${ty}, ${tx} ${ty}`;
        } else {
            // Forward Edge with optional obstruction handling
            const controlOffset = Math.max(dx * 0.5, 60);
            if (yOffset !== 0) {
                // Route above obstruction
                return `M ${sx} ${sy} Q ${sx + controlOffset} ${sy + yOffset} ${(sx+tx)/2} ${sy + yOffset} T ${tx} ${ty}`;
            }
            return `M ${sx} ${sy} C ${sx + controlOffset} ${sy}, ${tx - controlOffset} ${ty}, ${tx} ${ty}`;
        }
    } else {
        // FSM Mode - Smoother, tighter curves suitable for state transitions
        const dist = Math.sqrt(dx*dx + dy*dy);
        const controlOffset = Math.max(dist * 0.4, 40);
        return `M ${sx} ${sy} C ${sx + controlOffset} ${sy}, ${tx - controlOffset} ${ty}, ${tx} ${ty}`;
    }
  };

  const selectedNodeObj = nodes.find(n => n.id === selectedNode);
  const selectedEdgeObj = activeWorkflow.edges.find(e => e.id === selectedEdge);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl relative">
      {/* Main Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between z-20 shadow-sm">
        
        {/* Left: View Switcher */}
        <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button 
                onClick={() => setViewMode('logic')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'logic' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
                <IconCpu className="w-4 h-4" />
                <span>Equipment Logic</span>
            </button>
            <button 
                onClick={() => setViewMode('fsm')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'fsm' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
                <IconLayers className="w-4 h-4" />
                <span>Material State</span>
            </button>
        </div>

        {/* Center: File Info */}
        <div className="flex items-center space-x-3 text-slate-200 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800">
          <IconGitBranch className={`${viewMode === 'logic' ? 'text-blue-500' : 'text-purple-500'} w-4 h-4`} />
          <span className="font-semibold text-sm tracking-tight">{activeWorkflow.name}</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">v{activeWorkflow.version}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex space-x-2">
            <button 
                onClick={handleNewWorkflow}
                className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition shadow-sm border border-slate-700"
                title="Create New Workflow"
            >
                <IconPlus className="w-3 h-3" />
                <span>New</span>
            </button>
            <button 
                onClick={handleAutoLayout}
                className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition shadow-sm border border-slate-700"
                title="Auto Layout"
            >
                <IconLayout className="w-3 h-3" />
                <span>Layout</span>
            </button>
            <button 
                onClick={handleSaveRequest}
                className={`text-xs px-4 py-1.5 rounded transition text-white shadow-lg font-medium border border-transparent ${viewMode === 'logic' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30'}`}
            >
                Save
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Palette - Dynamic based on Mode */}
        <div className="w-52 bg-slate-900 border-r border-slate-800 p-4 hidden md:block z-20">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
              {viewMode === 'logic' ? 'Logic Components' : 'State Components'}
          </h3>
          <div className="space-y-2">
            {viewMode === 'logic' ? (
                // Logic Palette
                ['Start', 'Process', 'Verify', 'Load', 'Unload', 'Decision', 'End'].map(item => (
                <div 
                    key={item} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="group bg-slate-800 p-3 rounded-md text-xs text-slate-300 cursor-grab hover:bg-slate-750 hover:text-white border border-slate-700 hover:border-blue-500/50 hover:shadow-md transition-all flex items-center"
                >
                    <span className={`w-2 h-2 rounded-sm mr-3 ${item === 'Decision' ? 'bg-amber-500' : item === 'Start' || item === 'End' ? 'bg-slate-500' : 'bg-blue-500'}`}></span>
                    {item}
                </div>
                ))
            ) : (
                // FSM Palette
                ['State', 'Initial State', 'Final State', 'Super State'].map(item => (
                <div 
                    key={item} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="group bg-slate-800 p-3 rounded-full text-xs text-slate-300 cursor-grab hover:bg-slate-750 hover:text-white border border-slate-700 hover:border-purple-500/50 hover:shadow-md transition-all flex items-center justify-center"
                >
                     <span className={`w-2 h-2 rounded-full mr-2 ${item.includes('Initial') || item.includes('Final') ? 'bg-pink-500' : 'bg-purple-500'}`}></span>
                    {item}
                </div>
                ))
            )}
          </div>
        </div>

        {/* Canvas */}
        <div 
            ref={canvasRef}
            className={`flex-1 relative bg-[#0B1120] overflow-hidden cursor-default group transition-colors duration-200 ${isDraggingOver ? 'bg-[#0f172a] shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : ''}`}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onClick={handleCanvasClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Harmonious Grid Pattern - Lighter dots on dark bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.08]" 
                style={{ 
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                    backgroundSize: '24px 24px' 
                }}>
            </div>

            <svg className="absolute inset-0 w-full h-full z-0">
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
                    </marker>
                    <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill={viewMode === 'logic' ? '#3b82f6' : '#a855f7'} />
                    </marker>
                    <marker id="arrowhead-purple" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill="#a855f7" />
                    </marker>
                    <marker id="arrowhead-ghost" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                    </marker>
                </defs>
                
                {/* Existing Edges */}
                {activeWorkflow.edges.map(edge => {
                    const source = nodes.find(n => n.id === edge.source);
                    const target = nodes.find(n => n.id === edge.target);
                    if (!source || !target) return null;

                    const start = getSourcePoint(source);
                    const end = getTargetPoint(target);
                    const pathD = getEdgePath(start.x, start.y, end.x, end.y, source, target);
                    const isSelected = selectedEdge === edge.id;

                    const strokeColor = isSelected 
                        ? (viewMode === 'logic' ? '#3b82f6' : '#a855f7') 
                        : (viewMode === 'logic' ? '#475569' : '#7e22ce');
                    
                    const markerId = isSelected ? 'arrowhead-selected' : (viewMode === 'logic' ? 'arrowhead' : 'arrowhead-purple');

                    return (
                        <g key={edge.id} onClick={(e) => handleEdgeClick(e, edge.id)} className="cursor-pointer group">
                             {/* Invisible wider path for easier hit detection */}
                            <path 
                                d={pathD} 
                                stroke="transparent" 
                                strokeWidth="20" 
                                fill="none"
                                className="pointer-events-auto"
                            />
                            {/* Visible path */}
                            <path 
                                d={pathD} 
                                stroke={strokeColor} 
                                strokeWidth={isSelected ? "3" : "2"} 
                                fill="none"
                                markerEnd={`url(#${markerId})`}
                                className="transition-all duration-300 pointer-events-none"
                            />
                            {edge.label && (
                                <g transform={`translate(${(start.x + end.x)/2}, ${(start.y + end.y)/2})`} className="pointer-events-none">
                                    <rect x="-20" y="-9" width="40" height="18" rx="4" fill="#0f172a" stroke={isSelected ? strokeColor : "#334155"} strokeWidth="1" />
                                    <text 
                                        y="3"
                                        fill={isSelected ? strokeColor : "#94a3b8"} 
                                        fontSize="10" 
                                        textAnchor="middle" 
                                        className="font-mono font-medium"
                                    >
                                        {edge.label}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Ghost Edge (Dragging) */}
                {connectingNodeId && mousePos && (() => {
                    const sourceNode = nodes.find(n => n.id === connectingNodeId);
                    if (sourceNode) {
                        const start = getSourcePoint(sourceNode);
                        const pathD = getEdgePath(start.x, start.y, mousePos.x, mousePos.y);
                        return (
                             <path 
                                d={pathD} 
                                stroke="#94a3b8" 
                                strokeWidth="1.5" 
                                strokeDasharray="4,4"
                                fill="none"
                                markerEnd="url(#arrowhead-ghost)"
                                className="opacity-70 pointer-events-none"
                            />
                        );
                    }
                    return null;
                })()}
            </svg>

            {nodes.map(node => (
                <div
                    key={node.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(null);
                        setSelectedNode(node.id);
                    }}
                    style={{ left: node.x, top: node.y }}
                    className={`absolute flex items-center justify-center shadow-lg cursor-pointer transition-all duration-200 z-10 group
                        ${selectedNode === node.id 
                            ? (viewMode === 'logic' ? 'ring-2 ring-blue-500 shadow-blue-500/20' : 'ring-2 ring-purple-500 shadow-purple-500/20') 
                            : 'hover:ring-1 hover:ring-slate-500 hover:shadow-slate-500/10'}
                        
                        /* CONDITIONAL STYLING BASED ON MODE */
                        ${viewMode === 'logic' 
                            ? `w-44 h-12 rounded bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 text-slate-200 ${node.type === 'decision' ? 'border-amber-600/50 from-slate-800 to-amber-900/10' : ''}`
                            : `w-32 h-12 rounded-full bg-slate-800 text-slate-200 border border-slate-700 ${node.type === 'initial' || node.type === 'final' ? 'border-purple-500/30 bg-purple-900/10' : ''}`
                        }
                    `}
                >
                    {/* Node Label */}
                    <div className="flex items-center space-x-2 px-3 overflow-hidden w-full justify-center">
                        {viewMode === 'logic' && (
                             <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                 node.type === 'decision' ? 'bg-amber-500' : 
                                 node.type === 'start' ? 'bg-emerald-500' :
                                 node.type === 'end' ? 'bg-slate-400' :
                                 'bg-blue-500'
                             }`}></span>
                        )}
                        <span className="text-xs font-medium truncate">{node.label}</span>
                    </div>

                    {/* Status Badge - Refined */}
                    {node.status && node.status !== 'pending' && (
                        <div className="absolute -top-1.5 -right-1.5 z-30 flex h-3 w-3">
                             {node.status === 'active' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                             )}
                             <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-slate-950 ${
                                 node.status === 'completed' ? 'bg-emerald-500' :
                                 node.status === 'active' ? 'bg-blue-500' :
                                 node.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'
                             }`}></span>
                        </div>
                    )}

                    {/* Input Handle (Left) - Only visible on hover/connect */}
                    <div 
                        onMouseUp={(e) => completeConnection(e, node.id)}
                        className={`absolute -left-2 w-4 h-4 rounded-full border-2 border-slate-600 transition-all z-20 flex items-center justify-center
                            ${viewMode === 'logic' ? 'bg-slate-800' : 'bg-slate-800'}
                            group-hover:border-emerald-500 group-hover:scale-110
                            ${connectingNodeId && connectingNodeId !== node.id ? 'ring-2 ring-emerald-500/30 bg-emerald-900/20 border-emerald-500 scale-110' : 'opacity-0 group-hover:opacity-100'}
                        `}
                    >
                        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    </div>

                    {/* Output Handle (Right) */}
                    <div 
                        onMouseDown={(e) => startConnection(e, node.id)}
                        className={`absolute -right-2 w-4 h-4 rounded-full border-2 border-slate-600 cursor-crosshair transition-all z-20 flex items-center justify-center
                            ${viewMode === 'logic' ? 'bg-slate-800' : 'bg-slate-800'}
                            group-hover:border-blue-500 group-hover:scale-110
                            ${connectingNodeId === node.id ? 'bg-blue-500 border-white' : 'opacity-0 group-hover:opacity-100'}
                        `}
                    >
                        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Properties Panel (Dynamic Content) */}
        {(selectedNodeObj || selectedEdgeObj) && (
            <div 
                className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-xl"
                onMouseLeave={() => { setSelectedNode(null); setSelectedEdge(null); }}
            >
                <div className="p-4 border-b border-slate-800 bg-slate-900">
                    <h4 className="text-sm font-semibold text-white tracking-wide">Configuration</h4>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${viewMode === 'logic' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                        {selectedNodeObj ? selectedNodeObj.type.toUpperCase() : 'CONNECTION'}
                    </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    
                    {/* NODE PROPERTIES */}
                    {selectedNodeObj && (
                        <>
                            <div className="space-y-4">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                    Identity
                                </h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Node ID</label>
                                        <input disabled value={selectedNodeObj.id} className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-500 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Label</label>
                                        <input 
                                            value={selectedNodeObj.label} 
                                            onChange={(e) => setNodes(nodes.map(n => n.id === selectedNodeObj.id ? { ...n, label: e.target.value } : n))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Description</label>
                                        <textarea 
                                            rows={2}
                                            placeholder="Enter node description..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logic Specific Properties */}
                            {viewMode === 'logic' && (
                                <div className="space-y-4 pt-4 border-t border-slate-800/50">
                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Implementation</h5>
                                    {(selectedNodeObj.type === 'activity' || selectedNodeObj.type === 'start') && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">C# Plugin / Method</label>
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none appearance-none">
                                                    <option>FoupService.Load</option>
                                                    <option>ProcessService.ExecuteRecipe</option>
                                                    <option>RfidService.Scan</option>
                                                    <option>MappingService.Verify</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Timeout (s)</label>
                                                    <input type="number" defaultValue={60} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Retries</label>
                                                    <input type="number" defaultValue={0} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Parameters (JSON)</label>
                                                <textarea 
                                                    rows={3}
                                                    defaultValue='{ "speed": 100, "force": true }'
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 font-mono focus:border-blue-500 outline-none resize-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {selectedNodeObj.type === 'decision' && (
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Condition (C# Expression)</label>
                                            <input defaultValue="Context.SlotMap.IsValid" className="w-full bg-slate-950 border border-amber-900/30 rounded px-3 py-2 text-xs text-amber-400 font-mono" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* FSM Specific Properties */}
                            {viewMode === 'fsm' && (
                                <div className="space-y-4 pt-4 border-t border-slate-800/50">
                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State Logic</h5>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">SEMI Standard</label>
                                            <select className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:border-purple-500 outline-none">
                                                <option>E87 - Carrier Management</option>
                                                <option>E90 - Substrate Tracking</option>
                                                <option>Custom</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Entry Action</label>
                                            <input placeholder="e.g. NotifyHost()" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Exit Action</label>
                                            <input placeholder="e.g. ClearCache()" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 font-mono" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* EDGE PROPERTIES */}
                    {selectedEdgeObj && (
                         <div className="space-y-4">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                Connection Details
                            </h5>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Edge ID</label>
                                    <input disabled value={selectedEdgeObj.id} className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-500 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Source &rarr; Target</label>
                                    <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 p-2 rounded font-mono">
                                        <span className="text-blue-400">{selectedEdgeObj.source}</span>
                                        <span>&rarr;</span>
                                        <span className="text-blue-400">{selectedEdgeObj.target}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Label / Condition</label>
                                    <input 
                                        value={selectedEdgeObj.label || ''} 
                                        onChange={(e) => setActiveWorkflow(prev => ({
                                            ...prev,
                                            edges: prev.edges.map(ed => ed.id === selectedEdgeObj.id ? { ...ed, label: e.target.value } : ed)
                                        }))}
                                        placeholder="e.g. Success, Timeout, Yes"
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" 
                                    />
                                </div>
                                 {/* Edge Routing Style */}
                                 <div>
                                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-semibold">Routing Style</label>
                                    <select 
                                        value={selectedEdgeObj.style || 'bezier'}
                                        onChange={(e) => setActiveWorkflow(prev => ({
                                            ...prev,
                                            edges: prev.edges.map(ed => ed.id === selectedEdgeObj.id ? { ...ed, style: e.target.value as any } : ed)
                                        }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none"
                                    >
                                        <option value="bezier">Bezier Curve (Standard)</option>
                                        <option value="step">Stepped / Manhattan</option>
                                        <option value="straight">Straight Line</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-slate-800/50">
                                <button 
                                    onClick={deleteSelectedEdge}
                                    className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded text-xs font-semibold transition-colors"
                                >
                                    Delete Connection
                                </button>
                            </div>
                         </div>
                    )}

                </div>
            </div>
        )}
      </div>

      {/* Save Confirmation Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-96 max-w-[90%] transform scale-100 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                    <span>Save Changes?</span>
                </h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    Are you sure you want to save the current configuration to 
                    <span className="font-mono text-slate-300 mx-1 bg-slate-800 px-1 rounded">{activeWorkflow.name}</span>? 
                    This will overwrite the existing version.
                </p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setShowSaveDialog(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition border border-slate-700 hover:border-slate-600"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmSave}
                        className={`px-4 py-2 text-xs font-medium text-white rounded shadow-lg transition transform hover:scale-105 ${
                            viewMode === 'logic' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30'
                        }`}
                    >
                        Confirm Save
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowEditor;

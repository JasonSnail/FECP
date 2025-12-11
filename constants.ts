
import { WorkflowDefinition, Foup, FoupState, MachineState, DiagnosticLog, MetricPoint, HistoryEvent, EptState, EptTask, Machine, WorkflowExecutionTask } from './types';

// Mock Machines
export const MOCK_MACHINES: Machine[] = [
  { id: 'm1', name: 'TEL_LITHIUS_01', model: 'Track Lithography', type: 'Track', state: MachineState.Running, health: 98 },
  { id: 'm2', name: 'AMAT_CENTURA_02', model: 'Etch Centura', type: 'Etch', state: MachineState.Running, health: 92 },
  { id: 'm3', name: 'KLA_ARCHER_05', model: 'Metrology Archer', type: 'Metrology', state: MachineState.Error, health: 45 },
];

// Mock Workflow for Equipment Logic (Implementation)
export const MOCK_WORKFLOW: WorkflowDefinition = {
  id: 'wf-tel-track-v3',
  name: 'TEL Track Main Process',
  version: '3.2.1',
  category: 'logic',
  nodes: [
    { id: '1', type: 'start', label: 'Carrier Arrived', x: 50, y: 150, status: 'completed' },
    { id: '2', type: 'activity', label: 'Read RFID', x: 250, y: 150, status: 'completed' },
    { id: '3', type: 'decision', label: 'SlotMap OK?', x: 450, y: 150, status: 'completed' },
    { id: '4', type: 'activity', label: 'Load FOUP', x: 650, y: 50, status: 'active' },
    { id: '5', type: 'activity', label: 'Hold Carrier', x: 650, y: 250, status: 'pending' },
    { id: '6', type: 'activity', label: 'Process Wafers', x: 850, y: 50, status: 'pending' },
    { id: '7', type: 'end', label: 'Unload', x: 1050, y: 150, status: 'pending' }
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4', label: 'Yes' },
    { id: 'e3-5', source: '3', target: '5', label: 'No' },
    { id: 'e4-6', source: '4', target: '6' },
    { id: 'e6-7', source: '6', target: '7' },
    { id: 'e5-7', source: '5', target: '7' }
  ]
};

// Mock Material State Machine (Lifecycle)
export const MOCK_MATERIAL_FSM: WorkflowDefinition = {
  id: 'fsm-foup-standard',
  name: 'Standard FOUP Lifecycle',
  version: '1.0.0',
  category: 'fsm',
  nodes: [
    { id: 's1', type: 'initial', label: 'Arrived', x: 50, y: 200, status: 'completed' },
    { id: 's2', type: 'state', label: 'Docked', x: 250, y: 200, status: 'completed' },
    { id: 's3', type: 'state', label: 'Verifying', x: 450, y: 200, status: 'active' },
    { id: 's4', type: 'state', label: 'Processing', x: 650, y: 100, status: 'pending' },
    { id: 's5', type: 'state', label: 'Hold', x: 650, y: 300, status: 'pending' },
    { id: 's6', type: 'state', label: 'Cooling', x: 850, y: 100, status: 'pending' },
    { id: 's7', type: 'final', label: 'Completed', x: 1050, y: 200, status: 'pending' }
  ],
  edges: [
    { id: 't1', source: 's1', target: 's2', label: 'Dock_Complete' },
    { id: 't2', source: 's2', target: 's3', label: 'ID_Read' },
    { id: 't3', source: 's3', target: 's4', label: 'Verify_OK' },
    { id: 't4', source: 's3', target: 's5', label: 'Verify_Fail' },
    { id: 't5', source: 's4', target: 's6', label: 'Process_End' },
    { id: 't6', source: 's6', target: 's7', label: 'Cool_Done' },
    { id: 't7', source: 's5', target: 's7', label: 'Manual_Release' }
  ]
};

// Mock Active FOUPs
export const MOCK_FOUPS: Foup[] = [
  // Machine 1
  {
    id: 'F12345',
    machineId: 'm1',
    lotId: 'LOT-2023-A01',
    state: FoupState.Processing,
    progress: 45,
    workflowVersion: '3.2.1',
    startTime: '10:00:00',
    wafers: Array.from({ length: 25 }, (_, i) => ({
      slot: i + 1,
      id: `W-${i+100}`,
      status: i < 10 ? 'Completed' : i === 10 ? 'Processing' : 'Pending',
      location: i < 10 ? 'FOUP' : i === 10 ? 'PM1' : 'FOUP'
    }))
  },
  {
    id: 'F12346',
    machineId: 'm1',
    lotId: 'LOT-2023-B05',
    state: FoupState.Arrived,
    progress: 0,
    workflowVersion: '3.2.2',
    startTime: '10:25:00',
    wafers: Array.from({ length: 25 }, (_, i) => ({
      slot: i + 1,
      id: `W-${i+200}`,
      status: 'Pending',
      location: 'FOUP'
    }))
  },
  // Machine 2
  {
    id: 'F99881',
    machineId: 'm2',
    lotId: 'LOT-ETCH-X99',
    state: FoupState.Docked,
    progress: 10,
    workflowVersion: '1.5.0',
    startTime: '09:45:00',
    wafers: Array.from({ length: 25 }, (_, i) => ({
      slot: i + 1,
      id: `WE-${i+500}`,
      status: 'Pending',
      location: 'FOUP'
    }))
  }
];

// Mock Logs
export const MOCK_LOGS: DiagnosticLog[] = [
  // Machine 1 Logs
  { id: '1', machineId: 'm1', timestamp: '10:30:05', level: 'INFO', source: 'EquipmentWorkflow', message: 'Activity [Load FOUP] started.', code: 'CEID_3303' },
  { id: '2', machineId: 'm1', timestamp: '10:30:02', level: 'INFO', source: 'APCService', message: 'Recipe parameters adjusted for chamber A.', code: 'APC_OK' },
  { id: '3', machineId: 'm1', timestamp: '10:29:45', level: 'WARN', source: 'FDCService', message: 'Chamber pressure drift detected (+0.5%).', code: 'FDC_WARN_01' },
  { id: '4', machineId: 'm1', timestamp: '10:28:00', level: 'INFO', source: 'SlotMapService', message: 'Slot map verification passed for F12345.', code: 'MAP_OK' },
  { id: '5', machineId: 'm1', timestamp: '10:27:55', level: 'ERROR', source: 'Mapping', message: 'Unexpected object detected in Slot 26.', code: 'ERR_MAP_05' },
  // Machine 2 Logs
  { id: '6', machineId: 'm2', timestamp: '10:31:00', level: 'INFO', source: 'GasPanel', message: 'Flow rate stable.', code: 'GAS_OK' },
  // Machine 3 Logs
  { id: '7', machineId: 'm3', timestamp: '10:00:00', level: 'ERROR', source: 'Aligner', message: 'Vacuum lost.', code: 'ALN_ERR_02' },
];

// Mock History Events for Timeline
export const MOCK_HISTORY_EVENTS: HistoryEvent[] = [
  // Events for F12345 (Machine 1)
  { id: 'h1', machineId: 'm1', foupId: 'F12345', timestamp: '10:00:00', type: 'state', label: 'Arrived', status: 'completed' },
  { id: 'h2', machineId: 'm1', foupId: 'F12345', timestamp: '10:00:05', type: 'activity', label: 'Read RFID', duration: '2s', status: 'completed', details: 'Tag ID: 88372-A' },
  { id: 'h3', machineId: 'm1', foupId: 'F12345', timestamp: '10:00:10', type: 'state', label: 'Docked', status: 'completed' },
  { id: 'h4', machineId: 'm1', foupId: 'F12345', timestamp: '10:00:15', type: 'activity', label: 'SlotMap Verification', duration: '5s', status: 'completed', details: '25/25 Slots Valid' },
  { id: 'h5', machineId: 'm1', foupId: 'F12345', timestamp: '10:00:25', type: 'state', label: 'Verifying', status: 'completed' },
  { id: 'h6', machineId: 'm1', foupId: 'F12345', timestamp: '10:00:40', type: 'activity', label: 'Load FOUP', duration: '15s', status: 'completed' },
  { id: 'h7', machineId: 'm1', foupId: 'F12345', timestamp: '10:01:00', type: 'state', label: 'Processing', status: 'running' },
  { id: 'h8', machineId: 'm1', foupId: 'F12345', timestamp: '10:01:05', type: 'activity', label: 'Chamber A Process', duration: 'In Progress', status: 'running', details: 'Recipe: POLY_ETCH_V2' },

  // Events for F12346 (Machine 1)
  { id: 'h9', machineId: 'm1', foupId: 'F12346', timestamp: '10:25:00', type: 'state', label: 'Arrived', status: 'completed' },
  { id: 'h10', machineId: 'm1', foupId: 'F12346', timestamp: '10:25:05', type: 'activity', label: 'Read RFID', duration: '3s', status: 'completed' },
  { id: 'h11', machineId: 'm1', foupId: 'F12346', timestamp: '10:25:10', type: 'alert', label: 'Carrier ID Mismatch', status: 'failed', details: 'Expected LOT-2023-B04, Got B05' },

  // Events for F99881 (Machine 2)
  { id: 'h12', machineId: 'm2', foupId: 'F99881', timestamp: '09:45:00', type: 'state', label: 'Arrived', status: 'completed' }
];

export const MOCK_EPT_TASKS: EptTask[] = [
  // Machine 1 Tasks
  { id: 't1', machineId: 'm1', moduleId: 'PM1', waferId: 'W-109', recipe: 'Etch_Poly', state: EptState.Busy, startTime: 0, duration: 45 },
  { id: 't2', machineId: 'm1', moduleId: 'PM1', state: EptState.Idle, startTime: 45, duration: 10 },
  { id: 't3', machineId: 'm1', moduleId: 'PM1', waferId: 'W-110', recipe: 'Etch_Poly', state: EptState.Busy, startTime: 55, duration: 65 },
  { id: 't10', machineId: 'm1', moduleId: 'PM2', waferId: 'W-108', recipe: 'Etch_Poly', state: EptState.Busy, startTime: 0, duration: 30 },
  { id: 't11', machineId: 'm1', moduleId: 'PM2', state: EptState.Idle, startTime: 30, duration: 20 },
  { id: 't12', machineId: 'm1', moduleId: 'PM2', waferId: 'W-109', recipe: 'Etch_Poly', state: EptState.Busy, startTime: 50, duration: 60 },
  { id: 't4', machineId: 'm1', moduleId: 'Aligner', waferId: 'W-110', state: EptState.Busy, startTime: 10, duration: 5 },
  { id: 't5', machineId: 'm1', moduleId: 'Aligner', state: EptState.Idle, startTime: 15, duration: 20 },
  { id: 't6', machineId: 'm1', moduleId: 'Aligner', waferId: 'W-111', state: EptState.Busy, startTime: 35, duration: 5 },
  { id: 't13', machineId: 'm1', moduleId: 'Aligner', state: EptState.Idle, startTime: 40, duration: 80 },
  { id: 't7', machineId: 'm1', moduleId: 'Robot', waferId: 'W-110', taskName: 'Transfer', state: EptState.Busy, startTime: 5, duration: 5 }, 
  { id: 't8', machineId: 'm1', moduleId: 'Robot', waferId: 'W-110', taskName: 'Transfer', state: EptState.Busy, startTime: 15, duration: 5 },
  { id: 't9', machineId: 'm1', moduleId: 'Robot', state: EptState.Idle, startTime: 20, duration: 10 },
  { id: 't14', machineId: 'm1', moduleId: 'Robot', waferId: 'W-111', taskName: 'Transfer', state: EptState.Busy, startTime: 30, duration: 5 },
  { id: 't15', machineId: 'm1', moduleId: 'Robot', state: EptState.Idle, startTime: 35, duration: 85 },
  { id: 't20', machineId: 'm1', moduleId: 'LP1', state: EptState.Busy, startTime: 0, duration: 120, taskName: 'F12345 Docked' },

  // Machine 2 Tasks (Just one example)
  { id: 't99', machineId: 'm2', moduleId: 'PM_Etch_1', waferId: 'WE-501', recipe: 'Deep_Trench', state: EptState.Busy, startTime: 0, duration: 100 }
];

export const MOCK_WORKFLOW_TASKS: WorkflowExecutionTask[] = [
    { id: 'wt1', machineId: 'm1', stepName: 'Carrier Arrived', status: 'Completed', startTime: 0, duration: 2 },
    { id: 'wt2', machineId: 'm1', stepName: 'Read RFID', status: 'Completed', startTime: 2, duration: 5 },
    { id: 'wt3', machineId: 'm1', stepName: 'SlotMap Check', status: 'Completed', startTime: 7, duration: 3 },
    { id: 'wt4', machineId: 'm1', stepName: 'Load FOUP', status: 'Completed', startTime: 10, duration: 15 },
    { id: 'wt5', machineId: 'm1', stepName: 'Process Wafers', status: 'Running', startTime: 25, duration: 60 },
    { id: 'wt6', machineId: 'm1', stepName: 'Unload', status: 'Pending', startTime: 85, duration: 20 },
];

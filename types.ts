
export enum MachineState {
  Idle = 'Idle',
  Running = 'Running',
  Error = 'Error',
  Maintenance = 'Maintenance'
}

export interface Machine {
  id: string;
  name: string;
  model: string;
  type: string;
  state: MachineState;
  health: number; // 0-100
}

export enum FoupState {
  Arrived = 'Arrived',
  Docked = 'Docked',
  Verifying = 'Verifying',
  Processing = 'Processing',
  Cooling = 'Cooling',
  Unloading = 'Unloading',
  Completed = 'Completed',
  Hold = 'Hold'
}

export enum EptState {
  Idle = 'Idle',
  Busy = 'Busy',
  Blocked = 'Blocked',
  Down = 'Down'
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'activity' | 'decision' | 'end' | 'state' | 'initial' | 'final';
  label: string;
  x: number;
  y: number;
  status?: 'pending' | 'active' | 'completed' | 'error';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: 'bezier' | 'step' | 'straight';
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  category: 'logic' | 'fsm'; // logic = Equipment Workflow, fsm = Material State Machine
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Wafer {
  slot: number;
  id: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Defect';
  location?: string; // e.g., 'PM1', 'Aligner', 'FOUP'
}

export interface Foup {
  id: string;
  machineId: string; // Linked machine
  lotId: string;
  state: FoupState;
  progress: number; // 0-100
  wafers: Wafer[];
  workflowVersion: string;
  startTime: string;
}

export interface MetricPoint {
  time: string;
  value: number;
  limit?: number;
}

export interface DiagnosticLog {
  id: string;
  machineId: string; // Linked machine
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  source: string;
  message: string;
  code?: string; // CEID or Error Code
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

export interface HistoryEvent {
  id: string;
  machineId: string; // Linked machine
  foupId: string;
  timestamp: string;
  type: 'state' | 'activity' | 'alert';
  label: string;
  duration?: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  details?: string;
}

export interface EptTask {
  id: string;
  machineId: string; // Linked machine
  moduleId: string;
  waferId?: string;
  taskName?: string;
  recipe?: string;
  state: EptState;
  startTime: number; // relative seconds from start of view window
  duration: number; // seconds
}

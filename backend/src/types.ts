export type DependencyKind = 'npm' | 'pypi';

export interface DependencyUpdate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  kind: DependencyKind;
  manifestPath: string;
}

export interface IncidentRecord {
  id: string;
  dependency: DependencyUpdate;
  stacktrace: string;
  file?: string;
  line?: number;
  api?: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  createdAt: string;
  status: 'DETECTED' | 'ANALYZING' | 'PATCHING' | 'VALIDATING' | 'FIXED' | 'FAILED';
}

export interface RepairPlan {
  incidentId: string;
  summary: string;
  confidence: number;
  rationale: string;
  patchset: FilePatch[];
}

export interface FilePatch {
  path: string;
  instructions: string;
  patch: string;
}

export interface ValidationResult {
  incidentId: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  newErrors?: string;
}

export interface RewardSignal {
  incidentId: string;
  attempt: number;
  reward: number;
}


export type PmPeriodStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type PmExecutionStatus = 'PENDING' | 'COMPLETED';
export type PmExecutionResult = 'OK' | 'NOT_OK';
export type PmChecklistResult = 'OK' | 'NOT_OK' | 'NA';

export interface PmPeriodListItem {
  id: string;
  periodNumber: number;
  plannedDate: string;
  remarks: string | null;
  totalEquipment: number;
  completedEquipment: number;
  status: PmPeriodStatus;
  createdAt: string;
}

export interface PmChecklistResultItem {
  id: string;
  activityTypeName: string;
  description: string | null;
  result: PmChecklistResult;
  notes: string | null;
  sortOrder: number;
}

export interface PmPeriodExecutionEquipmentRef {
  id: string;
  tagNumber: string;
  service: string;
}

export interface PmPeriodExecutionItem {
  id: string;
  equipment: PmPeriodExecutionEquipmentRef;
  executionDate: string | null;
  result: PmExecutionResult | null;
  findings: string | null;
  actionTaken: string | null;
  vendorPersonnel: string | null;
  remarks: string | null;
  status: PmExecutionStatus;
  checklistResults: PmChecklistResultItem[];
}

export interface PmPeriodDetail {
  id: string;
  periodNumber: number;
  plannedDate: string;
  remarks: string | null;
  status: PmPeriodStatus;
  executions: PmPeriodExecutionItem[];
  createdAt: string;
}

export interface CreatePmPeriodPayload {
  plannedDate: string;
  remarks?: string;
}

export interface UpdatePmPeriodExecutionPayload {
  executionDate?: string;
  result?: PmExecutionResult;
  findings?: string;
  actionTaken?: string;
  vendorPersonnel?: string;
  remarks?: string;
  status?: PmExecutionStatus;
  checklistResults?: { id: string; result: PmChecklistResult; notes?: string }[];
}

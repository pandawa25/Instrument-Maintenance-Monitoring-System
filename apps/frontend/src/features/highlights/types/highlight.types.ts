// Cermin dari HighlightItem di backend (HighlightsService) — gabungan 3 sumber
// (Corrective Maintenance, PM Period Execution, Work Order) yang ditandai highlight.
export type HighlightType = 'CORRECTIVE_MAINTENANCE' | 'PM_EXECUTION' | 'WORK_ORDER';

export interface HighlightItem {
  id: string;
  type: HighlightType;
  linkTo: string;
  title: string;
  date: string | null;
  status: string;
  equipmentTag: string | null;
  equipmentService: string | null;
}

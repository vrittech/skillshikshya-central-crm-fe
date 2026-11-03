export interface LeadFilterState {
  search: string;
  status: string;
  source: string;
  type: string;
  course: string;
  assignedTo: string;
  priority: string;
  overdueOnly: boolean;
  unassignedOnly: boolean;
  createdDate: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: LeadFilterState = {
  search: "",
  status: "all",
  source: "all",
  type: "all",
  course: "all",
  assignedTo: "all",
  priority: "all",
  overdueOnly: false,
  unassignedOnly: false,
  createdDate: "",
  dateFrom: "",
  dateTo: "",
};

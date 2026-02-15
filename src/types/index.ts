import type {
  Company,
  Contact,
  Ticket,
  TimeEntry,
  Asset,
  User,
  TicketStatus,
  Priority,
  TicketCategory,
  AssetType,
  AssetStatus,
} from "@/generated/prisma/client";

// Re-export Prisma types
export type {
  Company,
  Contact,
  Ticket,
  TimeEntry,
  Asset,
  User,
  TicketStatus,
  Priority,
  TicketCategory,
  AssetType,
  AssetStatus,
};

// Extended types with relations
export type CompanyWithRelations = Company & {
  contacts?: Contact[];
  tickets?: Ticket[];
  timeEntries?: TimeEntry[];
  assets?: Asset[];
  _count?: {
    tickets: number;
    timeEntries: number;
    assets: number;
    contacts: number;
  };
};

export type TicketWithRelations = Ticket & {
  company: Company;
  contact?: Contact | null;
  assignedTo?: User | null;
  createdBy: User;
  timeEntries?: TimeEntry[];
};

export type TimeEntryWithRelations = TimeEntry & {
  company: Company;
  ticket?: Ticket | null;
  user: User;
};

export type ContactWithCompany = Contact & {
  company: Company;
};

// Dashboard types
export interface DashboardStats {
  openTickets: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  pendingTasks: number;
}

export interface HoursBreakdown {
  companyName: string;
  companyShortName: string;
  hours: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

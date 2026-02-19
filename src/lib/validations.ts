import { z } from "zod/v4";

// Company schemas
export const companyCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  website: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const companyUpdateSchema = companyCreateSchema.partial();

// Contact schemas
export const contactCreateSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  name: z.string().min(1, "Name is required"),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  function: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const contactUpdateSchema = contactCreateSchema.partial();

// Ticket schemas
export const ticketCreateSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  contactId: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED", "BILLABLE"])
    .default("OPEN"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  category: z
    .enum(["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"])
    .optional(),
  assignedToId: z.string().optional(),
  // IT Snippet fields
  tasksPerformed: z.string().optional(),
  pcName: z.string().optional(),
  serialNumber: z.string().optional(),
  officeLicense: z.string().optional(),
  pendingTasks: z.string().optional(),
  equipmentTaken: z.string().optional(),
});

export const ticketUpdateSchema = ticketCreateSchema.partial();

// TimeEntry schemas
export const timeEntryCreateSchema = z.object({
  ticketId: z.string().nullable().optional(),
  companyId: z.string().min(1, "Company is required"),
  date: z.coerce.date(),
  hours: z.coerce
    .number()
    .positive("Hours must be positive")
    .max(24, "Cannot exceed 24 hours"),
  description: z.string().optional(),
  billable: z.boolean().default(true),
});

export const timeEntryUpdateSchema = timeEntryCreateSchema.partial();

// Auth schemas
export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// User schemas
export const userCreateSchema = z.object({
  email: z.email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const userUpdateSchema = z.object({
  email: z.email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string().min(1, "Please confirm the password"),
});

// Template schemas
export const templateCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  category: z
    .enum(["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"])
    .optional(),
  tasksPerformed: z.string().optional(),
  pcName: z.string().optional(),
  serialNumber: z.string().optional(),
  officeLicense: z.string().optional(),
  pendingTasks: z.string().optional(),
  equipmentTaken: z.string().optional(),
});
export const templateUpdateSchema = templateCreateSchema.partial();
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

// Type exports
export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
export type TimeEntryUpdateInput = z.infer<typeof timeEntryUpdateSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// KB Article schemas
export const kbArticleCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  categoryId: z.string().optional(),
  companyId: z.string().optional(),
  isPublished: z.boolean().default(false),
});
export const kbArticleUpdateSchema = kbArticleCreateSchema.partial();
export const kbCategoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});
export const kbCategoryUpdateSchema = kbCategoryCreateSchema.partial();
export type KbArticleCreateInput = z.infer<typeof kbArticleCreateSchema>;
export type KbArticleUpdateInput = z.infer<typeof kbArticleUpdateSchema>;
export type KbCategoryCreateInput = z.infer<typeof kbCategoryCreateSchema>;
export type KbCategoryUpdateInput = z.infer<typeof kbCategoryUpdateSchema>;

// Custom Field Definition schemas
export const customFieldDefinitionCreateSchema = z.object({
  entityType: z.enum(["TICKET", "COMPANY", "CONTACT", "ASSET"]),
  name: z.string().min(1, "Name is required"),
  label: z.string().min(1, "Label is required"),
  fieldType: z.enum([
    "TEXT",
    "NUMBER",
    "DATE",
    "SELECT",
    "CHECKBOX",
    "TEXTAREA",
  ]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export const customFieldDefinitionUpdateSchema =
  customFieldDefinitionCreateSchema.partial();

export type CustomFieldDefinitionCreateInput = z.infer<
  typeof customFieldDefinitionCreateSchema
>;
export type CustomFieldDefinitionUpdateInput = z.infer<
  typeof customFieldDefinitionUpdateSchema
>;

// Custom Field Value schemas
export const customFieldValueSaveSchema = z.object({
  values: z.array(
    z.object({
      fieldDefinitionId: z.string().min(1),
      value: z.string().nullable(),
    }),
  ),
});

export type CustomFieldValueSaveInput = z.infer<
  typeof customFieldValueSaveSchema
>;

// SLA Policy schemas
export const slaPolicyCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  responseTimeHours: z.coerce.number().int().positive("Must be positive"),
  resolveTimeHours: z.coerce.number().int().positive("Must be positive"),
});
export const slaPolicyUpdateSchema = slaPolicyCreateSchema.partial();
export type SlaPolicyCreateInput = z.infer<typeof slaPolicyCreateSchema>;
export type SlaPolicyUpdateInput = z.infer<typeof slaPolicyUpdateSchema>;

// Recurring Ticket schemas
export const recurringTicketCreateSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  category: z
    .enum(["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"])
    .optional(),
  frequency: z.enum([
    "DAILY",
    "WEEKLY",
    "BIWEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "YEARLY",
  ]),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  nextRunAt: z.coerce.date(),
  isActive: z.boolean().default(true),
});

export const recurringTicketUpdateSchema =
  recurringTicketCreateSchema.partial();

export type RecurringTicketCreateInput = z.infer<
  typeof recurringTicketCreateSchema
>;
export type RecurringTicketUpdateInput = z.infer<
  typeof recurringTicketUpdateSchema
>;

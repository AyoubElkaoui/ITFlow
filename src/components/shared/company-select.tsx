"use client";

import { useTranslations } from "next-intl";
import { useCompanies } from "@/hooks/use-companies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
}

export function CompanySelect({
  value,
  onValueChange,
  placeholder,
  allowAll = false,
}: CompanySelectProps) {
  const tc = useTranslations("common");
  const { data: companies } = useCompanies(undefined, true);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || tc("selectCompany")} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{tc("allCompanies")}</SelectItem>}
        {(
          (companies as { id: string; shortName: string; name: string }[]) || []
        ).map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <span className="font-medium">{company.shortName}</span>
            <span className="text-muted-foreground ml-2">{company.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

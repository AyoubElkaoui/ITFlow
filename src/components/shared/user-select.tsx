"use client";

import { useTranslations } from "next-intl";
import { useUsers } from "@/hooks/use-users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
}

export function UserSelect({
  value,
  onValueChange,
  placeholder,
  allowAll = false,
}: UserSelectProps) {
  const tc = useTranslations("common");
  const { data: users } = useUsers();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || tc("selectEmployee")} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{tc("allEmployees")}</SelectItem>}
        {(
          (users as { id: string; name: string; email: string }[]) || []
        ).map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <span className="font-medium">{user.name}</span>
            <span className="text-muted-foreground ml-2">{user.email}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

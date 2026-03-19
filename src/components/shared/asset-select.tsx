"use client";

import { useTranslations } from "next-intl";
import { useAssets } from "@/hooks/use-assets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssetSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
}

export function AssetSelect({
  value,
  onValueChange,
  placeholder,
  allowAll = false,
}: AssetSelectProps) {
  const t = useTranslations("assets");
  const { data: assets } = useAssets({});

  const assetList = (
    (assets as { id: string; name: string | null; assetTag: string | null }[]) || []
  );

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || t("searchPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">-</SelectItem>}
        {assetList.map((asset) => (
          <SelectItem key={asset.id} value={asset.id}>
            <span className="font-medium">
              {asset.name || asset.assetTag || t("unnamed")}
            </span>
            {asset.assetTag && asset.name && (
              <span className="text-muted-foreground ml-2">
                {asset.assetTag}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

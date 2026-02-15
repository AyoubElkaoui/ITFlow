"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useCompanies } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Building2 } from "lucide-react";
import { CreateCompanyDialog } from "@/components/companies/create-company-dialog";

export default function CompaniesPage() {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data: companies, isLoading } = useCompanies(search, undefined);

  const companyList = (companies || []) as {
    id: string;
    name: string;
    shortName: string;
    contactPerson: string | null;
    hourlyRate: string | null;
    isActive: boolean;
    _count: { tickets: number; timeEntries: number; contacts: number };
  }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addCompany")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : companyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noCompanies")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? t("adjustSearch") : t("addFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("contact")}</TableHead>
                  <TableHead className="text-center">{t("tickets")}</TableHead>
                  <TableHead className="text-center">{t("hours")}</TableHead>
                  <TableHead className="text-right">{t("rate")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyList.map((company) => (
                  <TableRow key={company.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/companies/${company.id}`} className="block">
                        <div className="font-medium">{company.shortName}</div>
                        <div className="text-sm text-muted-foreground">
                          {company.name}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {company.contactPerson || "\u2014"}
                    </TableCell>
                    <TableCell className="text-center">
                      {company._count.tickets}
                    </TableCell>
                    <TableCell className="text-center">
                      {company._count.timeEntries}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {company.hourlyRate
                        ? `\u20AC${Number(company.hourlyRate).toFixed(0)}/h`
                        : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={company.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {company.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateCompanyDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}

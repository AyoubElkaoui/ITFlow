"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DayCloseView } from "@/components/dagafsluiting/day-close-view";
import { UrenOverzichtView } from "@/components/dagafsluiting/uren-overzicht-view";

function DagafsluitingInner() {
  const t = useTranslations("dagafsluiting");
  const params = useSearchParams();
  const initialTab = params.get("tab") === "overzicht" ? "overzicht" : "afsluiten";

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <CalendarCheck className="h-6 w-6" />
        {t("title")}
      </h1>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="afsluiten">{t("tabClose")}</TabsTrigger>
          <TabsTrigger value="overzicht">{t("tabOverview")}</TabsTrigger>
        </TabsList>
        <TabsContent value="afsluiten" className="mt-4">
          <DayCloseView />
        </TabsContent>
        <TabsContent value="overzicht" className="mt-4">
          <UrenOverzichtView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DagafsluitingPage() {
  return (
    <Suspense fallback={null}>
      <DagafsluitingInner />
    </Suspense>
  );
}

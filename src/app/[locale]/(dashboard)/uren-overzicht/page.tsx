import { redirect } from "next/navigation";

// Uren-overzicht is gebundeld als tab in Dagafsluiting; oude route stuurt door.
export default async function UrenOverzichtRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dagafsluiting?tab=overzicht`);
}

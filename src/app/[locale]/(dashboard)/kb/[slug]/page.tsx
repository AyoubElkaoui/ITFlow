"use client";

import { useTranslations } from "next-intl";

import { use } from "react";
import { useDeleteArticle } from "@/hooks/use-kb";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  CalendarDays,
  FolderOpen,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface KbArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  category: { id: string; name: string; slug: string } | null;
}

export default function KbArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const t = useTranslations("kb");
  const tc = useTranslations("common");

  const deleteArticle = useDeleteArticle();

  // Fetch article by slug via query param
  const { data: slugArticles, isLoading: slugLoading } = useSlugLookup(slug);

  const articleList = (slugArticles || []) as KbArticle[];
  const article = articleList[0] || null;
  const loading = slugLoading;

  async function handleDelete() {
    if (!article) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${article.title}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteArticle.mutateAsync(article.id);
      toast.success("Article deleted");
      router.push("/kb");
    } catch {
      toast.error("Failed to delete article");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">{t("notFound")}</h2>
        <Link
          href="/kb"
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/kb">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{article.title}</h1>
            <Badge variant={article.isPublished ? "default" : "secondary"}>
              {article.isPublished ? t("published") : t("draft")}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/kb/new?edit=${article.id}`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          {article.author.name}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />
          {format(new Date(article.updatedAt), "dd MMM yyyy, HH:mm")}
        </span>
        {article.category && (
          <span className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            {article.category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="sr-only">
          <span>Article Content</span>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {article.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small hook to look up an article by slug via the articles list endpoint
// ---------------------------------------------------------------------------

import { useQuery } from "@tanstack/react-query";

function useSlugLookup(slug: string) {
  return useQuery({
    queryKey: ["kb-articles", { slug }],
    queryFn: async () => {
      const res = await fetch(
        `/api/kb/articles?slug=${encodeURIComponent(slug)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Request failed");
      }
      return res.json();
    },
    enabled: !!slug,
  });
}

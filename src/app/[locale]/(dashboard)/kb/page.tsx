"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  useKbArticles,
  useKbCategories,
  useCreateCategory,
} from "@/hooks/use-kb";
import { ArticleCard } from "@/components/kb/article-card";
import { CategorySidebar } from "@/components/kb/category-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

interface KbArticle {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
  author: { id: string; name: string };
  category: { id: string; name: string; slug: string } | null;
}

interface KbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count: { articles: number };
}

export default function KnowledgeBasePage() {
  const t = useTranslations("kb");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: articlesResponse, isLoading: articlesLoading } = useKbArticles({
    search: search || undefined,
    categoryId: selectedCategoryId || undefined,
    page,
    pageSize,
  });

  const { data: categories, isLoading: categoriesLoading } = useKbCategories();
  const createCategory = useCreateCategory();

  const articlesData = articlesResponse as
    | { data: KbArticle[]; total: number; page: number; pageSize: number }
    | undefined;
  const articleList = articlesData?.data || [];
  const totalArticles = articlesData?.total || 0;
  const totalPages = Math.ceil(totalArticles / pageSize);
  const categoryList = (categories || []) as KbCategory[];

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        sortOrder: 0,
      });
      toast.success("Category created");
      setNewCategoryName("");
      setShowCreateCategory(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create category",
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/kb/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Categories
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowCreateCategory(true)}
              title="New Category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {categoriesLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <CategorySidebar
              categories={categoryList}
              selectedCategoryId={selectedCategoryId}
              onSelect={(id) => {
                setSelectedCategoryId(id);
                setPage(1);
              }}
            />
          )}
        </div>

        {/* Main Content */}
        <div>
          {articlesLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : articleList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noArticles")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search
                  ? t("adjustSearch")
                  : t("createFirst")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {articleList.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, totalArticles)} of{" "}
                    {totalArticles} articles
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newCategory")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{t("categoryName")}</Label>
              <Input
                id="category-name"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateCategory(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? tc("creating") : tc("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

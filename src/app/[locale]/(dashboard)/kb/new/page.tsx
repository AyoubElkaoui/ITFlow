"use client";

import { useTranslations } from "next-intl";

import { Suspense, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  kbArticleCreateSchema,
  type KbArticleCreateInput,
} from "@/lib/validations";
import {
  useKbArticle,
  useKbCategories,
  useCreateArticle,
  useUpdateArticle,
} from "@/hooks/use-kb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface KbCategory {
  id: string;
  name: string;
  slug: string;
  _count: { articles: number };
}

interface KbArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  categoryId: string | null;
  companyId: string | null;
  isPublished: boolean;
}

export default function NewKbArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <NewKbArticleContent />
    </Suspense>
  );
}

function NewKbArticleContent() {
  const router = useRouter();
  const t = useTranslations("kb");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || "";

  const isEditing = !!editId;
  const { data: existingArticle, isLoading: articleLoading } =
    useKbArticle(editId);
  const { data: categories } = useKbCategories();
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle(editId);

  const categoryList = (categories || []) as KbCategory[];
  const article = existingArticle as KbArticle | undefined;

  const form = useForm<KbArticleCreateInput>({
    resolver: typedResolver(kbArticleCreateSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: undefined,
      companyId: undefined,
      isPublished: false,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditing && article) {
      reset({
        title: article.title,
        content: article.content,
        categoryId: article.categoryId || undefined,
        companyId: article.companyId || undefined,
        isPublished: article.isPublished,
      });
    }
  }, [isEditing, article, reset]);

  const contentValue = watch("content") || "";

  async function onSubmit(data: KbArticleCreateInput) {
    try {
      if (isEditing) {
        await updateArticle.mutateAsync(data);
        toast.success("Article updated");
      } else {
        await createArticle.mutateAsync(data);
        toast.success("Article created");
      }
      router.push("/kb");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save article",
      );
    }
  }

  if (isEditing && articleLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/kb">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {isEditing ? t("editArticle") : t("newArticle")}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title & Category */}
        <Card>
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Article title"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={watch("categoryId") || "none"}
                  onValueChange={(value) =>
                    setValue("categoryId", value === "none" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categoryList.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end space-x-2 pb-1">
                <Checkbox
                  id="isPublished"
                  checked={watch("isPublished")}
                  onCheckedChange={(checked) =>
                    setValue("isPublished", checked === true)
                  }
                />
                <Label htmlFor="isPublished" className="cursor-pointer">
                  Publish this article
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content & Preview */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("content")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write your article in markdown..."
                rows={20}
                className="font-mono text-sm resize-y"
                {...register("content")}
              />
              {errors.content && (
                <p className="text-sm text-destructive mt-1">
                  {errors.content.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("preview")}</CardTitle>
            </CardHeader>
            <CardContent>
              {contentValue ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {contentValue}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("startTyping")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/kb">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? tc("saving")
              : isEditing
                ? tc("saveChanges")
                : t("newArticle")}
          </Button>
        </div>
      </form>
    </div>
  );
}

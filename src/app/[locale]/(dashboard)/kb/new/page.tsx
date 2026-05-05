"use client";

import { useTranslations } from "next-intl";

import { Suspense, useEffect, useState } from "react";
import { marked } from "marked";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/kb/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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

  // editorInitialContent: null = editor nog niet klaar, string = klaar om te tonen
  // Bij nieuw artikel: direct "", bij bewerken: wachten op artikel data
  const [editorInitialContent, setEditorInitialContent] = useState<string | null>(
    isEditing ? null : ""
  );

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

  // Pre-fill form when editing — convert markdown→HTML zodat editor altijd HTML krijgt
  useEffect(() => {
    if (isEditing && article) {
      const isHtml = /<[a-z][^>]*>/i.test(article.content);
      const html = isHtml ? article.content : (marked(article.content) as string);
      reset({
        title: article.title,
        content: html,
        categoryId: article.categoryId || undefined,
        companyId: article.companyId || undefined,
        isPublished: article.isPublished,
      });
      // Zet NADAT reset() is aangeroepen zodat editor met juiste content monteert
      setEditorInitialContent(html);
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

        {/* Content Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("content")}</CardTitle>
          </CardHeader>
          <CardContent>
            {editorInitialContent !== null && (
              <RichTextEditor
                key={isEditing ? `edit-${article?.id}` : "new"}
                value={editorInitialContent}
                onChange={(val) => setValue("content", val, { shouldValidate: true })}
              />
            )}
            {editorInitialContent === null && (
              <div className="h-[400px] rounded-md border border-input bg-muted/30 animate-pulse" />
            )}
            {errors.content && (
              <p className="text-sm text-destructive mt-1">
                {errors.content.message}
              </p>
            )}
          </CardContent>
        </Card>

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

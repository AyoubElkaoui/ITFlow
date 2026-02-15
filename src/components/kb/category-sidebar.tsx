"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count: { articles: number };
}

interface CategorySidebarProps {
  categories: CategoryWithCount[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelect,
}: CategorySidebarProps) {
  const totalArticles = categories.reduce(
    (sum, cat) => sum + cat._count.articles,
    0,
  );

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between text-sm font-medium h-9 px-3",
          selectedCategoryId === null &&
            "bg-accent text-accent-foreground",
        )}
        onClick={() => onSelect(null)}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          All Articles
        </span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {totalArticles}
        </Badge>
      </Button>

      {categories.map((category) => (
        <Button
          key={category.id}
          variant="ghost"
          className={cn(
            "w-full justify-between text-sm h-9 px-3",
            selectedCategoryId === category.id &&
              "bg-accent text-accent-foreground",
          )}
          onClick={() => onSelect(category.id)}
        >
          <span className="truncate">{category.name}</span>
          <Badge variant="secondary" className="text-xs ml-auto shrink-0">
            {category._count.articles}
          </Badge>
        </Button>
      ))}
    </div>
  );
}

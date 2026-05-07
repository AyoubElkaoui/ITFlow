"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trash2 } from "lucide-react";
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
  onDelete?: (categoryId: string, name: string) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelect,
  onDelete,
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
          selectedCategoryId === null && "bg-accent text-accent-foreground",
        )}
        onClick={() => onSelect(null)}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Alle artikelen
        </span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {totalArticles}
        </Badge>
      </Button>

      {categories.map((category) => (
        <div key={category.id} className="group flex items-center gap-1">
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-between text-sm h-9 px-3 min-w-0",
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
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category.id, category.name);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

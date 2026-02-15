"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    updatedAt: string;
    author: { id: string; name: string };
    category: { id: string; name: string; slug: string } | null;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link href={`/kb/${article.slug}`}>
      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2">
              {article.title}
            </h3>
            <Badge
              variant={article.isPublished ? "default" : "secondary"}
              className="shrink-0 text-xs"
            >
              {article.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {article.category && (
              <Badge variant="outline" className="text-xs">
                {article.category.name}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author.name}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(new Date(article.updatedAt), "dd MMM yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

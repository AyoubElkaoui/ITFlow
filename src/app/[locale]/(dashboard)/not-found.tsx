import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Page not found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { getCategoryColor } from "@/lib/formatters";
import type { CategoryRef } from "@/types";

interface CategoryBadgeProps {
  category: CategoryRef | null;
  onClick?: () => void;
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps) {
  if (!category) {
    return (
      <Badge
        variant="outline"
        className="cursor-pointer text-muted-foreground border-dashed"
        onClick={onClick}
      >
        Uncategorized
      </Badge>
    );
  }

  return (
    <Badge
      className={`cursor-pointer ${getCategoryColor(category.color)}`}
      variant="secondary"
      onClick={onClick}
    >
      {category.name}
    </Badge>
  );
}

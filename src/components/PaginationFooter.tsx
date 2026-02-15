import { Button } from "@/components/ui/button";

type PaginationFooterProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  label: string;
  onPageChange: (page: number) => void;
};

const pluralize = (count: number, label: string) => {
  return count === 1 ? label : `${label}s`;
};

const PaginationFooter = ({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  label,
  onPageChange,
}: PaginationFooterProps) => {
  if (totalItems <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} {pluralize(totalItems, label)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-xs font-semibold text-muted-foreground">
          Page {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default PaginationFooter;


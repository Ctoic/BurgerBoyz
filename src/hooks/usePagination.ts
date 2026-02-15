import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

export const usePagination = <T>(
  items: T[],
  options?: {
    pageSize?: number;
    resetDeps?: readonly unknown[];
  },
) => {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const resetDeps = options?.resetDeps ?? [];
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, ...resetDeps]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const startItem = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, items.length);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems: items.length,
    startItem,
    endItem,
    paginatedItems,
  };
};


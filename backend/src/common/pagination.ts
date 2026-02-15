export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export const resolvePage = (page?: number) => {
  return page && page > 0 ? page : 1;
};

export const resolvePageSize = (pageSize?: number, fallback = 10) => {
  return pageSize && pageSize > 0 ? pageSize : fallback;
};

export const buildPaginatedResponse = <T>(
  items: T[],
  totalItems: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
};


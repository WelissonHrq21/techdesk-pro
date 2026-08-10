type PaginationParams = {
  page: number;
  limit: number;
};

type PaginationMetaParams = PaginationParams & {
  total: number;
};

function getPagination({ page, limit }: PaginationParams) {
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function getPaginationMeta({
  page,
  limit,
  total,
}: PaginationMetaParams) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export { getPagination, getPaginationMeta };
export type { PaginationParams };

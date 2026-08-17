import { Prisma } from "@prisma/client";

export function isUniqueConstraintError(
  error: unknown,
  field: string
) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  return (
    (Array.isArray(target) && target.includes(field)) ||
    target === field
  );
}

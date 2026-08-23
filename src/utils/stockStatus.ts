type StockStatus = "OK" | "LOW_STOCK" | "OUT_OF_STOCK";

const stockStatusValues = [
  "OK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
] as const satisfies readonly StockStatus[];

type StockStatusSource = {
  stock: number;
  minimumStock: number;
};

function getStockStatus(part: StockStatusSource): StockStatus {
  if (part.stock === 0) {
    return "OUT_OF_STOCK";
  }

  if (part.minimumStock > 0 && part.stock <= part.minimumStock) {
    return "LOW_STOCK";
  }

  return "OK";
}

function serializePart<T extends StockStatusSource>(part: T) {
  return {
    ...part,
    stockStatus: getStockStatus(part),
  };
}

export { getStockStatus, serializePart, stockStatusValues };
export type { StockStatus };

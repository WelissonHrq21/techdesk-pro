const repeatedDigitsPattern = /^(\d)\1+$/;

export function normalizeCustomerDocument(document?: string | null) {
  if (document === null) {
    return null;
  }

  if (document === undefined) {
    return undefined;
  }

  const normalized = document.replace(/\D/g, "");

  return normalized || null;
}

export function isValidCpf(document: string) {
  if (!/^\d{11}$/.test(document) || repeatedDigitsPattern.test(document)) {
    return false;
  }

  const digits = document.split("").map(Number);

  return (
    digits[9] === calculateVerifier(digits.slice(0, 9), 10) &&
    digits[10] === calculateVerifier(digits.slice(0, 10), 11)
  );
}

export function isValidNumericCnpj(document: string) {
  if (!/^\d{14}$/.test(document) || repeatedDigitsPattern.test(document)) {
    return false;
  }

  const digits = document.split("").map(Number);

  return (
    digits[12] === calculateVerifier(digits.slice(0, 12), 5) &&
    digits[13] === calculateVerifier(digits.slice(0, 13), 6)
  );
}

export function isValidCustomerDocument(document?: string | null) {
  const normalized = normalizeCustomerDocument(document);

  if (!normalized) {
    return true;
  }

  return isValidCpf(normalized) || isValidNumericCnpj(normalized);
}

export function formatCustomerDocument(document?: string | null) {
  const normalized = normalizeCustomerDocument(document);

  if (!normalized) {
    return "-";
  }

  if (normalized.length === 11) {
    return normalized.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (normalized.length === 14) {
    return normalized.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return normalized;
}

export function formatCustomerDocumentInput(value?: string | null) {
  const normalized = normalizeCustomerDocument(value) ?? "";

  if (normalized.length <= 11) {
    return normalized
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  }

  return normalized
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function calculateVerifier(digits: number[], initialWeight: number) {
  let weight = initialWeight;
  const sum = digits.reduce((total, digit) => {
    const nextTotal = total + digit * weight;
    weight -= 1;

    if (weight < 2) {
      weight = 9;
    }

    return nextTotal;
  }, 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

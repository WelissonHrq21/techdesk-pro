const repeatedDigitsPattern = /^(\d)\1+$/;
const repeatedCnpjBasePattern = /^([A-Z0-9])\1{11}/;

export function normalizeCustomerDocument(document?: string | null) {
  if (document === null) {
    return null;
  }

  if (document === undefined) {
    return undefined;
  }

  const normalized = document
    .trim()
    .toUpperCase()
    .replace(/[\s./-]/g, "");

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

export function isValidCnpj(document: string) {
  if (
    !/^[A-Z0-9]{12}\d{2}$/.test(document) ||
    repeatedCnpjBasePattern.test(document)
  ) {
    return false;
  }

  const values = document.split("").map(getCnpjCharacterValue);
  const firstVerifier = calculateVerifier(values.slice(0, 12), 5);
  const secondVerifier = calculateVerifier(
    [...values.slice(0, 12), firstVerifier],
    6
  );

  return (
    Number(document[12]) === firstVerifier &&
    Number(document[13]) === secondVerifier
  );
}

export function isValidCustomerDocument(document?: string | null) {
  const normalized = normalizeCustomerDocument(document);

  if (!normalized) {
    return true;
  }

  return isValidCpf(normalized) || isValidCnpj(normalized);
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
      /([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return normalized;
}

export function formatCustomerDocumentInput(value?: string | null) {
  const normalized = normalizeCustomerDocument(value) ?? "";

  if (normalized.length <= 11 && /^\d*$/.test(normalized)) {
    return normalized
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  }

  return formatCnpjInput(normalized);
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

function getCnpjCharacterValue(character: string) {
  return character.charCodeAt(0) - 48;
}

function formatCnpjInput(document: string) {
  const normalized = document.slice(0, 14);
  const parts = [
    normalized.slice(0, 2),
    normalized.slice(2, 5),
    normalized.slice(5, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 14),
  ].filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  const [first, second, third, fourth, fifth] = parts;
  let formatted = `${first}.${second}`;

  if (third) {
    formatted += `.${third}`;
  }

  if (fourth) {
    formatted += `/${fourth}`;
  }

  if (fifth) {
    formatted += `-${fifth}`;
  }

  return formatted;
}

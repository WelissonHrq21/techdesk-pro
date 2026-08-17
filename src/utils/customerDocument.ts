const repeatedDigitsPattern = /^(\d)\1+$/;
const repeatedCnpjBasePattern = /^([A-Z0-9])\1{11}/;

export function normalizeCustomerDocument(
  document: string | null | undefined
) {
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
  const firstVerifier = calculateVerifier(digits.slice(0, 9), 10);
  const secondVerifier = calculateVerifier(digits.slice(0, 10), 11);

  return digits[9] === firstVerifier && digits[10] === secondVerifier;
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

export function isValidCustomerDocument(document: string) {
  return isValidCpf(document) || isValidCnpj(document);
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

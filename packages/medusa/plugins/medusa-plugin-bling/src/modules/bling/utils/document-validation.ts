// Document validation utilities

export function sanitizeDocument(document: string): string {
  if (!document) return "";
  return document.replaceAll(/\D/g, "");
}

export function isValidCPF(cpf: string): boolean {
  const sanitized = sanitizeDocument(cpf);
  if (sanitized.length !== 11) return false;
  if (/^(\d)\1+$/.test(sanitized)) return false;

  let sum = 0;
  let remainder;

  for (let index = 1; index <= 9; index++) {
    sum += Number.parseInt(sanitized.slice(index - 1, index)) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number.parseInt(sanitized.slice(9, 10))) return false;

  sum = 0;
  for (let index = 1; index <= 10; index++) {
    sum += Number.parseInt(sanitized.slice(index - 1, index)) * (12 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number.parseInt(sanitized.slice(10, 11))) return false;

  return true;
}

export function isValidCNPJ(cnpj: string): boolean {
  const sanitized = sanitizeDocument(cnpj);
  if (sanitized.length !== 14) return false;
  if (/^(\d)\1+$/.test(sanitized)) return false;

  let size = sanitized.length - 2;
  let numbers = sanitized.slice(0, size);
  const digits = sanitized.slice(size);
  let sum = 0;
  let pos = size - 7;

  for (let index = size; index >= 1; index--) {
    sum += Number.parseInt(numbers.charAt(size - index)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number.parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = sanitized.slice(0, size);
  sum = 0;
  pos = size - 7;

  for (let index = size; index >= 1; index--) {
    sum += Number.parseInt(numbers.charAt(size - index)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number.parseInt(digits.charAt(1))) return false;

  return true;
}

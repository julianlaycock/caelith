function isDisallowedControlCharacter(code: number): boolean {
  return code === 0x7f || (code >= 0x00 && code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d);
}

export function replaceDisallowedControlChars(input: string, replacement = ' '): string {
  let hasDisallowed = false;
  for (let index = 0; index < input.length; index += 1) {
    if (isDisallowedControlCharacter(input.charCodeAt(index))) {
      hasDisallowed = true;
      break;
    }
  }

  if (!hasDisallowed) {
    return input;
  }

  const sanitized: string[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    sanitized.push(isDisallowedControlCharacter(code) ? replacement : input.charAt(index));
  }
  return sanitized.join('');
}

export function sanitizeEmbeddingText(input: string): string {
  return replaceDisallowedControlChars(input).trim();
}

export function sanitizePromptInput(input: string): string {
  return replaceDisallowedControlChars(input).replace(/\s+/g, ' ').trim();
}

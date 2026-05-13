export const toAscii = (text: string): string =>
  text
    .replaceAll(/[\u2018\u2019]/gu, "'")
    .replaceAll(/[\u201C\u201D]/gu, '"')
    .replaceAll(/[\u2013\u2014]/gu, "-")
    .replaceAll("\u2026", "...")
    .replaceAll(/[^\u0020-\u007F]/gu, "");

export const toAscii = (text: string): string =>
  text
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    .replaceAll(/[\u2013\u2014]/g, "-")
    .replaceAll("\u2026", "...")
    .replaceAll(/[^\u0020-\u007F]/g, "");

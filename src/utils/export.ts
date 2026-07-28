export function downloadText(filename: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, string | number | boolean>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value).split('"').join('""')}"`;
  return `\uFEFF${headers.map(escape).join(',')}\n${rows
    .map((row) => headers.map((header) => escape(row[header])).join(','))
    .join('\n')}`;
}

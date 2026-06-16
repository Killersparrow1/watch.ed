export function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) return trimmed

  const dmyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  if (dmyMatch) {
    const [, first, second, year] = dmyMatch
    return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`
  }

  const yearOnlyMatch = trimmed.match(/^\d{4}$/)
  if (yearOnlyMatch) return trimmed

  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const textMatch = trimmed.match(/^([a-zA-Z]+)\s+(\d{4})$/)
  if (textMatch) {
    const month = monthNames[textMatch[1].toLowerCase().slice(0, 3)]
    if (month) return `${textMatch[2]}-${month}`
  }

  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  return trimmed
}

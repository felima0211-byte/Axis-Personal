export function tzOffset(tz: string, d: Date): string {
  const v = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')!
    .value.replace('GMT', '')
  return v === '' ? '+00:00' : v
}

export const localYmd = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const startOfDay = (ymd: string, tz: string) =>
  new Date(`${ymd}T00:00:00${tzOffset(tz, new Date(`${ymd}T12:00:00Z`))}`)

export const endOfDay = (ymd: string, tz: string) =>
  new Date(startOfDay(addDays(ymd, 1), tz).getTime() - 1)

export function nowInTz(tz: string, d = new Date()): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
  return `${localYmd(d, tz)}T${time}${tzOffset(tz, d)}`
}

export function mondayOf(ymd: string): string {
  const dow = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(ymd, -dow)
}

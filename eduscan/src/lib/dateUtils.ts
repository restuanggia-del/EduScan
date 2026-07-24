const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

export function formatLocalDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getTodayLocal(): string {
    return formatLocalDate(new Date());
}

export function getHariLocal(date: Date = new Date()): string {
    return HARI_MAP[date.getDay()];
}

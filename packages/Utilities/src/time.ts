export function msToReadable(ms: number) {

    if (ms == 0) {
        return '0ms'
    }

    const milliseconds = Math.floor((ms % 1000) / 100);
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0) result += `${seconds}s`;
    if (milliseconds > 0) result += `${result.length > 0 ? '.' : ''}${milliseconds}ms`;
    return result.trim();
}

export function timeAgo(timestamp: Date, locale = 'en') {
    let value;
    const diff = (new Date().getTime() - timestamp.getTime()) / 1000;
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (years > 0) {
        value = rtf.format(0 - years, 'year');
    } else if (months > 0) {
        value = rtf.format(0 - months, 'month');
    } else if (days > 0) {
        value = rtf.format(0 - days, 'day');
    } else if (hours > 0) {
        value = rtf.format(0 - hours, 'hour');
    } else if (minutes > 0) {
        value = rtf.format(0 - minutes, 'minute');
    } else {
        value = rtf.format(parseInt(String(0 - diff)), 'second');
    }
    return value;
}
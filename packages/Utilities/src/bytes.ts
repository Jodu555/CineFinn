export function formatBytes(bytes: number, decimals: number = 2, iec: boolean = false) {
    const { value, unit } = bytesToUnit(bytes, iec);
    return `${value.toFixed(decimals)} ${unit}`;
}

export function bytesToUnit(bytes: number, iec: boolean = false): { value: number; unit: string } {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const iecUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

    const devider = iec ? 1024 : 1000;
    const unitArr = iec ? iecUnits : units;

    let unitIndex = 0;
    let value = bytes;
    while (value >= devider && unitIndex < unitArr.length - 1) {
        value /= devider;
        unitIndex++;
    }
    return {
        value,
        unit: unitArr[unitIndex],
    };
}
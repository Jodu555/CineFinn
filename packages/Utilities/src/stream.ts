import { Transform } from "stream";

export class ThrottleStream extends Transform {
    private bytesPerSecond: number;
    private startTime = Date.now();
    private bytesWritten = 0;

    constructor(bytesPerSecond: number) {
        super();
        this.bytesPerSecond = bytesPerSecond;
    }

    _transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ) {
        this.bytesWritten += chunk.length;

        const elapsed = (Date.now() - this.startTime) / 1000;
        const expectedTime = this.bytesWritten / this.bytesPerSecond;
        const delay = Math.max(0, (expectedTime - elapsed) * 1000);

        if (delay > 10) {
            setTimeout(() => {
                this.push(chunk);
                callback();
            }, delay);
        } else {
            this.push(chunk);
            callback();
        }
    }
}
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ffprobe from 'ffprobe';
import { Series } from './classes/series';
dotenv.config();

const ratioMap = {};

async function run() {
    const series: Series[] = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
    // const serie = series.find(x => x.title.includes('Irregular'));
    for (const serie of series) {
        for (const season of serie.seasons) {
            for (const ep of season) {
                const stats = await ffprobe(ep.filePath, { path: 'C:\\ffmpeg\\bin\\ffprobe.exe' });
                const vidStream = stats.streams.find(x => x.codec_type == 'video');

                const { duration, avg_frame_rate, width, height } = vidStream

                const key = `${width}x${height}`;
                const videoStats = {
                    path: ep.filePath,
                    key,
                    duration,
                    fps: avg_frame_rate,
                    width,
                    height
                }


                if (ratioMap[videoStats.key]) {
                    ratioMap[videoStats.key] += 1;
                } else {
                    ratioMap[videoStats.key] = 1;
                }
            }
        }
    }



    console.log(ratioMap);


}


run();
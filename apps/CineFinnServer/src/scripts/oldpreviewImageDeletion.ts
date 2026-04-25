import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const imageFolder = process.env.IMAGE_PATH;
    if (!imageFolder) {
        console.log('IMAGE_PATH not set');
        process.exit(1);
    }
    const seriesFolders = fs.readdirSync(imageFolder);

    const DANGER_DELETE = process.argv.includes('--danger-delete');
    const REVERSE_MODE = process.argv.includes('--reverse');

    if (DANGER_DELETE) {
        console.log('-'.repeat(20));
        console.log('DANGER DELETE MODE');
        console.log('DANGER DELETE MODE');
        console.log('DANGER DELETE MODE');
        console.log('-'.repeat(20));

        console.log('Cause of the danger mode, we wait 10 seoncds...');
        console.log('Think very carefully if you want to delete this!');
        await wait(1000 * 10);

        console.log('DANGER DELETE MODE');
        console.log('DANGER DELETE MODE');
        console.log('DANGER DELETE MODE');
        console.log('DANGER DELETE MODE');
        console.log('-'.repeat(20));
        console.log('Waiting another 10 seconds!');
        console.log('Waiting another 10 seconds!');
        console.log('Waiting another 10 seconds!');
        await wait(1000 * 10);
    }

    const missingList = [];
    const toDelete = [];
    let i = 0;
    for (const seriesFolder of seriesFolders) {
        i % 50 == 0 && console.log('Processing...', ++i, '/', seriesFolders.length);

        const previewFolderPath = path.join(imageFolder, seriesFolder, 'previewImages');
        if (!fs.existsSync(previewFolderPath)) {
            console.log('Missing', previewFolderPath);
            missingList.push(previewFolderPath);
            continue;
        }
        const previewFolders = fs.readdirSync(previewFolderPath);
        for (const previewFolder of previewFolders) {
            if (previewFolder.startsWith('EP-') || previewFolder.startsWith('MO-')) {
                if (REVERSE_MODE) {
                    toDelete.push(path.join(previewFolderPath, previewFolder));
                } else {
                    continue;
                }
            } else {
                if (REVERSE_MODE) {
                    continue;
                } else {
                    toDelete.push(path.join(previewFolderPath, previewFolder));
                }
            }
        }
    }
    console.log('missingList', missingList);
    console.log('toDelete count', toDelete.length);
    console.log('toDelete peak', toDelete.splice(-10));




    if (DANGER_DELETE) {

        console.log('Since you are in DANGER MODE. We wait an additional 60 seconds before DELETING');
        console.log('Since you are in DANGER MODE. We wait an additional 60 seconds before DELETING');
        console.log('Since you are in DANGER MODE. We wait an additional 60 seconds before DELETING');
        console.log('Since you are in DANGER MODE. We wait an additional 60 seconds before DELETING');

        await wait(1000 * 60);

        let i = 0;
        for (const toDeletePath of toDelete) {
            console.log('Deleting', ++i, '/', toDelete.length, toDeletePath);
            fs.rmSync(toDeletePath, { recursive: true });
        }
    }



}

main().catch(console.error).finally(() => {
    process.exit(0);
});
const axios = require('axios');

async function downloadImage(url, imagePath) {
	try {
		const response = await axios({
			url,
			responseType: 'stream',
		});

		return new Promise((resolve, reject) => {
			response.data
				.pipe(fs.createWriteStream(imagePath))
				.on('finish', () => resolve())
				.on('error', (e) => reject(e));
		});
	} catch (error) {
		console.error(url, imagePath);
		return null;
	}
}

module.exports = {
	downloadImage,
};

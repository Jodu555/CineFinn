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

function similar(a, b) {
	var equivalency = 0;
	var minLength = a.length > b.length ? b.length : a.length;
	var maxLength = a.length < b.length ? b.length : a.length;
	for (var i = 0; i < minLength; i++) {
		if (a[i] == b[i]) {
			equivalency++;
		}
	}
	var weight = equivalency / maxLength;
	return weight * 100;
}

module.exports = {
	downloadImage,
	similar,
};

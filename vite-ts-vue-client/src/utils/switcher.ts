function multiDimSwitcher(dimArr: [[]], arrptr: number, idxptr: number, velocity: number) {
	const debug = false;
	idxptr += velocity;

	const narr = dimArr[arrptr];

	if (idxptr >= narr.length) {
		//Switch to next arr or back to start
		debug && console.log('next', dimArr[arrptr + 1]);
		if (!dimArr[arrptr + 1]) {
			if (dimArr.length > 1) {
				arrptr = 0;
			}
			idxptr = 0;
		} else {
			debug && console.log('CAME next');
			arrptr += 1;
			idxptr = 0;
		}
	}

	if (idxptr < 0) {
		//Switch to prev arr or back to end
		debug && console.log('prev');
		if (!dimArr[arrptr - 1]) {
			if (dimArr.length > 1) {
				debug && console.log('CAME O prev', dimArr.length, arrptr);
				arrptr = dimArr.length - 1;
			}
			idxptr = dimArr[arrptr].length - 1;
		} else {
			debug && console.log('CAME prev');
			arrptr -= 1;
			idxptr = dimArr[arrptr].length - 1;
		}
	}

	return {
		arrptr,
		idxptr,
		value: dimArr[arrptr][idxptr],
	};
}

function singleDimSwitcher(arr: [], curr: number, velocity: number) {
	curr = curr + velocity;

	if (curr >= arr.length) curr = 0;
	if (curr < 0) curr = arr.length - 1;

	return { value: arr[curr], idxptr: curr };
}

function deepswitchTo(vel: number, vueInstance: any) {
	if (vueInstance.currentSeason == -1) {
		if (vueInstance.currentMovie == -1) {
			console.log('Error');
			const title = `No entry point for '${vel == 1 ? 'Next' : 'Previous'}'`;
			vueInstance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 1500,
				icon: 'error',
				title,
				timerProgressBar: true,
			});
			return;
		}
		//Switch in Movies
		const { idxptr, value } = singleDimSwitcher(vueInstance.currentSeries.movies, vueInstance.currentMovie - 1, vel);
		// console.log(idxptr, value);
		vueInstance.handleVideoChange(-1, -1, idxptr + 1);
		return;
	} else {
		//Switch in Episodes
		const seasonIdx = vueInstance.currentSeries.seasons.findIndex((x: any) => x[0].season == vueInstance.entityObject.season);
		const episodeIdx = vueInstance.currentSeries.seasons[seasonIdx].findIndex((x: any) => x.episode == vueInstance.entityObject.episode);

		// console.log({ dimArr: vueInstance.currentSeries.seasons, seasonIdx, episodeIdx });

		const { arrptr, idxptr, value } = multiDimSwitcher(vueInstance.currentSeries.seasons, seasonIdx, episodeIdx, vel);
		console.log(arrptr, idxptr, value);

		const entity = vueInstance.currentSeries.seasons[arrptr][idxptr];

		vueInstance.handleVideoChange(entity.season, entity.episode);
		return;
	}
}

export { multiDimSwitcher, singleDimSwitcher, deepswitchTo };

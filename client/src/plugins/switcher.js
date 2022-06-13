function multiDimSwitcher(dimArr, arrptr, idxptr, velocity) {
    const debug = true;
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
                debug && console.log('CAME O prev');
                arrptr = dimArr.length - 2;
            }
            idxptr = narr.length - 1;
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
};

function singleDimSwitcher(arr, curr, velocity) {
    curr = curr + velocity;

    if (curr >= arr.length) curr = 0;
    if (curr < 0) curr = arr.length - 1;

    return { value: arr[curr], idxptr: curr };
};


export {
    multiDimSwitcher,
    singleDimSwitcher
}


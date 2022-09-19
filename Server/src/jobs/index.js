
const options = {};
let waitFor = null;
process.argv.forEach(args => {
    if (args.startsWith('--')) {
        waitFor = args.split('--')[1];
        return;
    }

    if (args.startsWith('-')) {
        options[args.split('-')[1]] = true;
        return;
    }

    if (waitFor != null) {
        options[waitFor] = args;
        waitFor = null;
    }
});

//Info: if there are -- then a value is expected if there is only one it is a bool value

require(`./job_${options.name}.js`).run(options);





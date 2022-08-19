const { Database } = require('@jodu555/mysqlapi');
const database = Database.getDatabase();
const express = require('express');
const router = express.Router();


router.get('/info', (req, res, next) => {
    console.log(req.query.series);
    '879|se-ep'
    res.json([
        '781|1.0',
        '781|1.1',
        '781|1.2',
        '781|1.3',
        '781|1.5',
        '781|1.6',
        '781|1.9',
    ])
});

module.exports = { router }
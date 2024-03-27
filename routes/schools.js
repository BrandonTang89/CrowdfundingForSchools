var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const { verifyUser,
    isContributorFor,
    isContributorAt,
    schoolQuery,
    getProjectData } = require('../authFunctions.js');

router.get('/', function (req, res) {
    res.render('schools');
});

router.post('/', function (req, res) {
    console.log(req.body);
    const searchQuery = req.body.searchQuery;

    // Query the database
    pool.query('SELECT * FROM schools WHERE school ILIKE $1', ['%' + searchQuery + '%'], (error, results) => {
        if (error) {
            throw error;
        }
        // console.log(results.rows);    
        res.send({ schools: results.rows });
    });

});

router.get('/view/:schoolname', function (req, res) {
    const schoolname = req.params.schoolname;
    pool.query('SELECT * FROM schools WHERE school = $1', [schoolname], (error, results) => {
        if (error) {
            throw error;
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
            res.render('schoolView', { school: results.rows[0] });
        }
        else {
            res.status(404).send('School not found');
        }
    });
});

router.post('/view/:schoolname', async function (req, res) {
    const firebtoken = req.body.firebtoken;
    const schoolname = req.params.schoolname;

    const verif = await isContributorAt(firebtoken, schoolname);
    if (verif.iscontributor) res.send({ msg: 'Success' });
    else {
        res.status(401).send(verif);
    }
});

module.exports = router;
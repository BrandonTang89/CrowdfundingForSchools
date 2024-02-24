var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const { verifyUser } = require('../authFunctions.js');

router.get('/', function(req, res) {
    res.render('projects', { title: 'Numberfit Crowd-Funding Website' });
});

router.post('/', function(req, res){
    console.log(req.body);
    const searchQuery = req.body.searchQuery;

    // Query the database
    pool.query('SELECT * FROM projects WHERE title ILIKE $1', ['%' + searchQuery + '%'], (error, results) => {
        if (error) {
            throw error;
        }
        console.log(results.rows);    
        res.send({ projects: results.rows });
    });

});

router.get('/propose', function(req, res) {
    if (req.query.firebtoken == undefined) {
        res.status(401).send('Please log in to propose a project');
        return;
    }

    // To Do: Check that the user is a teacher/admin, if so redirect
    res.redirect('/projects/create?firebtoken=' + req.query.firebtoken);
});

router.get('/create', async function(req, res) {
    
    const firebtoken = req.query.firebtoken;
    console.log(firebtoken);

    const user = await verifyUser(firebtoken);
    if (user.status == 401) {
        res.status(401).send('Please log in to create a project');
        return;
    }

    console.log(user);

    // To Do: Check that the user is a teacher/admin
    res.render('createProject');
});

router.get('/view/:id', function(req, res) {
    const projectid = req.params.id;

    pool.query('SELECT * FROM projects WHERE projectid = $1', [projectid], (error, results) => {
        if (error) {
            throw error;
        }
        console.log(results.rows);
        
        if (results.rows.length > 0) {
            res.render('projectview', { project: results.rows[0] });
        }
        else {
            res.status(404).send('Project not found');
        }
    });
});


module.exports = router;
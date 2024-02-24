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
        // console.log(results.rows);    
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
    pool.query("SELECT * FROM roles WHERE userid = $1", [user.UserId], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length == 0) {
            res.status(401).send({msg: 'You are not a teacher at any school'});
        }
        else{
            const schools = results.rows.map(row => row.school);
            res.render('createProject', { schools: schools });
        }
    });
});


router.post('/create', async function(req, res) {
    const firebtoken = req.body.firebtoken;
    const user = await verifyUser(firebtoken);
    if (user.status == 401) {
        res.status(401).send({msg: 'Please log in to create a project'});
        return;
    }

    const userId = user.UserId;
    const title = req.body.title;
    const school = req.body.school;
    const description = req.body.description;
    const goalMoney = req.body.goalMoney;
    const status = 'open';

    // Check the Contributor is a teacher at the school
    try {
        await new Promise((resolve, reject) => {
            pool.query("SELECT * FROM roles WHERE userid = $1 AND school = $2", [userId, school], (error, results) => {
                if (error) {
                    reject(error);
                }
                if (results.rows.length == 0) {
                    res.status(401).send({msg: 'You are not a teacher at this school'});
                    console.log('User is not a teacher at this school');
                }
                resolve();
            });
        });
    } catch (error) {
        throw error;
    }

    if (res.headersSent) return; // Rejected, return

    // Add the project to the database
    pool.query('INSERT INTO projects (title, school, description, goalMoney, proposer, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING projectid', [title, school, description, goalMoney, userId, status], (error, results) => {
        if (error) {
            throw error;
        }
        const projectId = results.rows[0].projectid;
        console.log('New project ID:', projectId);
        res.send({ projectId: projectId });
    });
});


router.get('/view/:projectId', function(req, res) {
    const projectid = req.params.projectId;

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
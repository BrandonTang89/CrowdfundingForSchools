var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const { verifyUser } = require('../authFunctions.js');

/** Determines whether the user is valid contributor at the school
 * @param {String} firebtoken 
 * @param {String} school
 * @returns {iscontributor: Boolean, msg: String}
 */
async function isContributorAt(firebtoken, school){
    // A contributor is a teacher/admin for a certain school
    const user = await verifyUser(firebtoken);
    if (user.status == 401) {
        return {iscontributor: false, msg: "Not logged in"};
    }

    const userid = user.userid;

    try {
        const isContributorPromise = new Promise((resolve, reject) => {
            pool.query("SELECT * FROM roles WHERE userid = $1 AND school = $2", [userid, school], (error, results) => {
                if (error) {
                    reject({iscontributor: false, msg: "Query error (bad)"});
                }
                if (results.rows.length == 0) {
                    reject({ iscontributor: false, msg: "Not a teacher at this school" });
                } else {
                    resolve({ iscontributor: true, msg: "Success" });
                }
            });
        });

        const isContributor = await isContributorPromise;
        return isContributor;
    } catch (error) {
        console.log(error);
        return error
    }
}

/** Determines whether the user is a valid contributor of a certain project.
 * @param {String} firebtoken 
 * @param {String} projectid 
 * @returns {iscontributor: Boolean, msg: String, school: String}
 * 
 * Returns whether the user is a valid contributor, if so, what school.
 */
async function isContributorFor(firebtoken, projectid){
    try {
        const isContributorPromise = new Promise((resolve, reject) => {
            pool.query("SELECT * FROM projects WHERE projectid = $1", [projectid], (error, results) => {
                if (error) {
                    reject({iscontributor: false, msg: "Query error (bad)"});
                }
                if (results.rows.length == 0) {
                    reject({iscontributor: false, msg: "Project doesn't exist" });
                } else {
                    resolve({iscontributor: true, project: results.rows[0]});
                }
            });
        });

        const promiseRes = await isContributorPromise;
        if (!promiseRes.iscontributor) return promiseRes;

        var verif = await isContributorAt(firebtoken, promiseRes.project.school);
        verif.project = promiseRes.project;
        return verif;
    } catch (error) {
        console.log(error);
        return error
    }
}

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

    // To Do: Check that the user is a contributor, if so redirect
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

    console.log("User adding project: ", user);
    pool.query("SELECT * FROM roles WHERE userid = $1", [user.userid], (error, results) => {
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

    const userid = user.userid;
    const title = req.body.title;
    const school = req.body.school;
    const description = req.body.description;
    const goalMoney = req.body.goalMoney;
    const status = 'open';

    // To Do: Validate the input
    // Check the Contributor is a teacher at the school
    const verif = await isContributorAt(firebtoken, school);
    if (!verif.iscontributor) {
        res.status(401).send({msg: verif.msg});
        return;
    }

    // Add the project to the database
    pool.query('INSERT INTO projects (title, school, description, goalMoney, proposer, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING projectid', [title, school, description, goalMoney, userid, status], (error, results) => {
        if (error) {
            throw error;
        }
        const projectid = results.rows[0].projectid;
        console.log('New project ID:', projectid);
        res.send({ projectid: projectid });
    });
});


router.get('/view/:projectid', function(req, res) {
    const projectid = req.params.projectid;
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

router.post('/view/:projectid', async function(req, res) {
    const firebtoken = req.body.firebtoken;
    const projectid = req.params.projectid;
    
    const verif = await isContributorFor(firebtoken, projectid);
    if (verif.iscontributor) res.send({msg: 'Success'});
    else {
        res.status(401).send(verif);
    }
});

router.get('/edit/:projectid', async function(req, res) {
    const projectid = req.params.projectid;
    const firebtoken = req.query.firebtoken;

    const verif = await isContributorFor(firebtoken, projectid);
    if (!verif.iscontributor) {
        res.status(401).send(verif);
        return;
    }

    res.render('editProject', { project: verif.project });
});

router.post('/edit/:projectid', async function(req, res) {
    const firebtoken = req.body.firebtoken;
    const projectid = req.params.projectid
    const title = req.body.title;
    const description = req.body.description;
    const goalMoney = req.body.goalMoney;
    const status = req.body.status;

    // Check the Contributor is a teacher at the school
    const verif = await isContributorFor(firebtoken, projectid)
    if (!verif.iscontributor){
        res.status(401).send(verif)
        return;
    }
    const school = verif.project.school;

    // Update the project in the database
    pool.query('UPDATE projects SET title = $1, school = $2, description = $3, goalMoney = $4, status = $5 WHERE projectid = $6', [title, school, description, goalMoney, status, projectid], (error, results) => {
        if (error) {
            throw error;
        }
        res.send({msg: "success", projectid: projectid});
    });
});

router.post('/delete/:projectid', async function(req, res) {
    const firebtoken = req.body.firebtoken;
    const projectid = req.params.projectid;

    // Check the Contributor is a teacher at the school
    const verif = await isContributorFor(firebtoken, projectid)
    if (!verif.iscontributor){
        res.status(401).send(verif)
        return;
    }

    // Delete the project from the database
    pool.query('DELETE FROM projects WHERE projectid = $1', [projectid], (error, results) => {
        if (error) {
            throw error;
        }
        res.send({msg: "success"});
    });
});



module.exports = router;
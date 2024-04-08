var express = require('express');
var router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_KEY);
const pool = require('../db.js');
const { verifyUser,
    isContributorFor,
    isContributorAt,
    schoolQuery,
    getProjectData } = require('../authFunctions.js');

router.get('/', function (req, res) {
    res.render('projects');
});

router.post('/', function (req, res) {
    console.log(req.body);
    const searchQuery = req.body.searchQuery;
    var schoolQueryPart = "";
    if (req.body.school != 'any') {
        schoolQueryPart = " AND school = '" + req.body.school.replace("'", "''") + "'";
    }
    var statusQueryPart = "";
    if (req.body.status != 'any') {
        statusQueryPart = " AND status = '" + req.body.status + "'"
    }
    var queryText = "SELECT * FROM projects WHERE title ILIKE $1" + schoolQueryPart + statusQueryPart
    // Query the database
    pool.query(queryText, ['%' + searchQuery + '%'], (error, results) => {
        if (error) {
            throw error;
        }
        // console.log(results.rows);  
        res.send({ projects: results.rows });
    });

});

router.get('/propose', function (req, res) {
    if (req.query.firebtoken == undefined) {
        res.status(401).send('Please log in to propose a project');
        return;
    }

    // To Do: Check that the user is a contributor, if so redirect
    res.redirect('/projects/create?firebtoken=' + req.query.firebtoken);
});

router.get('/create', async function (req, res) {
    const firebtoken = req.query.firebtoken;
    console.log(firebtoken);

    const user = await verifyUser(firebtoken);
    if (user.status == 401) {
        res.status(401).send('Please log in to create a project');
            return;
    }

    console.log("User loading project creation form: ", user);
    pool.query("SELECT * FROM roles WHERE userid = $1", [user.userid], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length == 0) {
            res.status(401).send({ msg: 'You are not a teacher at any school' });
        }
        else {
            const schools = results.rows.map(row => row.school);
            res.render('createProject', { schools: schools });
        }
    });
});


router.post('/create', async function (req, res) {
    const firebtoken = req.body.firebtoken;
    const user = await verifyUser(firebtoken);
    if (user.status == 401) {
        res.status(401).send({ msg: 'Please log in to create a project' });
        return;
    }

    console.log("User creating project: ", user, req.body)
    const userid = user.userid;
    const title = req.body.title;
    const school = req.body.school;
    const description = req.body.description;
    var goalmoney = req.body.goalmoney;
    if (goalmoney == '') goalmoney = 0;
    const status = 'open';

    // To Do: Validate the input
    // Check the Contributor is a teacher at the school
    const verif = await isContributorAt(firebtoken, school);
    if (!verif.iscontributor) {
        res.status(401).send({ msg: verif.msg });
        return;
    }

    // Check if the school is ready to receive donations
    const schoolData = await schoolQuery(school);
    if (schoolData.onboarded !== true) {
        res.status(501).send({ msg: 'School not yet onboarded' });
        return;
    }

    // Add the project to the database
    const insertPromise = new Promise((resolve, reject) => {
        pool.query('INSERT INTO projects (title, school, description, goalmoney, proposer, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING projectid', [title, school, description, goalmoney, userid, status], (error, results) => {
            if (error) {
                reject(error);
            }
            const projectid = results.rows[0].projectid;
            console.log('New project ID:', projectid);
            resolve({ projectid: projectid });
        });
    });

    var projectid = -1;
    try {
        projectid = await insertPromise;
        projectid = projectid.projectid;
    } catch (error) {
        console.log('Error inserting project:', error);
        res.status(500).send({ msg: 'Error inserting project' });
        return;
    }

    // Create the project as a product in Stripe
    const product = await stripe.products.create({
        name: title,
    },
        { stripeAccount: schoolData.data.stripeid });

    // Create the price for the product
    const price = await stripe.prices.create({
        currency: 'gbp',
        custom_unit_amount: {
            enabled: true,
        },
        product: product.id,
    },
        { stripeAccount: schoolData.data.stripeid });

    // Update the project with the product id
    const updatePromise = new Promise((resolve, reject) => {
        pool.query('UPDATE projects SET stripeproductid = $1, stripepriceid = $2 WHERE projectid = $3', [product.id, price.id, projectid], (error, results) => {
            if (error) {
                reject(error);
            }
            resolve({ msg: "success" });
        });
    });

    try {
        await updatePromise;
        console.log('Project product created:', projectid);

    }
    catch (error) {
        console.log('Error updating project:', error);
        res.status(500).send({ msg: 'Error updating project' });
        return;
    }


    res.send({ msg: "success", projectid: projectid });
});


router.get('/view/:projectid', function (req, res) {
    const projectid = req.params.projectid;
    pool.query('SELECT * FROM projects WHERE projectid = $1', [projectid], (error, results) => {
        if (error) {
            throw error;
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
            res.render('projectView', { project: results.rows[0] });
        }
        else {
            res.status(404).send('Project not found');
        }
    });
});

router.post('/view/:projectid', async function (req, res) {
    const firebtoken = req.body.firebtoken;
    const projectid = req.params.projectid;

    const verif = await isContributorFor(firebtoken, projectid);
    if (verif.iscontributor) res.send({ msg: 'Success' });
    else {
        res.status(401).send(verif);
    }
});

router.get('/edit/:projectid', async function (req, res) {
    const projectid = req.params.projectid;
    const firebtoken = req.query.firebtoken;

    const verif = await isContributorFor(firebtoken, projectid);
    if (!verif.iscontributor) {
        res.status(401).send(verif);
        return;
    }

    res.render('editProject', { project: verif.project });
});

router.post('/edit/:projectid', async function (req, res) {
    const firebtoken = req.body.firebtoken;
    const projectid = req.params.projectid
    const title = req.body.title;
    const description = req.body.description;
    const goalmoney = req.body.goalmoney;
    const status = req.body.status;

    // Check the Contributor is a teacher at the school
    const verif = await isContributorFor(firebtoken, projectid)
    if (!verif.iscontributor) {
        res.status(401).send(verif)
        return;
    }
    const school = verif.project.school;

    // Archive the product and price if the status is not open
    // Unarchive if the status is open
    const schoolData = await schoolQuery(school);
    const schoolstripeid = schoolData.data.stripeid;

    const stripeproductid = verif.project.stripeproductid;
    const stripepriceid = verif.project.stripepriceid;
    if (status != 'open'){
        // We need to archive prices and products
        const product = await stripe.products.update(stripeproductid, 
            { active: false }, 
            { stripeAccount: schoolstripeid });
        const price = await stripe.prices.update(stripepriceid, 
            { active: false },
            { stripeAccount: schoolstripeid });
    }
    else {
        const product = await stripe.products.update(stripeproductid,
            { active: true },
            { stripeAccount: schoolstripeid });
        const price = await stripe.prices.update(stripepriceid,
            { active: true },
            { stripeAccount: schoolstripeid });
    }

    // Update the project in the database
    pool.query('UPDATE projects SET title = $1, school = $2, description = $3, goalmoney = $4, status = $5 WHERE projectid = $6', [title, school, description, goalmoney, status, projectid], (error, results) => {
        if (error) {
            throw error;
        }
        res.send({ msg: "success", projectid: projectid });
    });
});

router.post('/delete/:projectid', async function (req, res) {
    const firebtoken = req.body.firebtoken;
    const projectid = req.params.projectid;

    // Check the Contributor is a teacher at the school
    const verif = await isContributorFor(firebtoken, projectid)
    if (!verif.iscontributor) {
        res.status(401).send(verif)
        return;
    }

    const school = verif.project.school;
    const schoolData = await schoolQuery(school);
    const schoolstripeid = schoolData.data.stripeid;

    const stripeproductid = verif.project.stripeproductid;
    const stripepriceid = verif.project.stripepriceid;

    // We need to archive prices and products
    const product = await stripe.products.update(stripeproductid, 
        { active: false }, 
        { stripeAccount: schoolstripeid });
    const price = await stripe.prices.update(stripepriceid, 
        { active: false },
        { stripeAccount: schoolstripeid });

    // Delete the project from the database
    pool.query('DELETE FROM projects WHERE projectid = $1', [projectid], (error, results) => {
        if (error) {
            throw error;
        }
        res.send({ msg: "success" });
    });
});


// Returns a link to donate
router.post('/donate/:projectid', async function (req, res) {
    var project = await getProjectData(req.params.projectid);
    if (project.msg != "Success") {
        res.status(404).send(project.msg);
        return;
    }

    const userid = req.body.userid; // might be undefined
    project = project.project;
    const school = project.school;
    const schoolData = await schoolQuery(school);
    const schoolstripeid = schoolData.data.stripeid;

    // Check that the product/price has not been archived (and that the school stripeid exists)
    if (schoolstripeid != null) {
        console.log(schoolstripeid);
        console.log(schoolstripeid==null);

        const product = await stripe.products.retrieve(project.stripeproductid, { stripeAccount: schoolstripeid });
        const price = await stripe.prices.retrieve(project.stripepriceid, { stripeAccount: schoolstripeid });

        if (product.active == false || price.active == false ) {
            res.status(401).send({ msg: "Product or price has been archived" });
            return;
        }
        if (project.status != 'open') {
            res.status(401).send({ msg: "Project is not open" });
            return;
        }
    
        console.log("PRICE ID: " + project.stripepriceid)
        const session = await stripe.checkout.sessions.create(
            {
                mode: 'payment',
                line_items: [
                    {
                        price: project.stripepriceid,
                        quantity: 1,
                    },
                ],
                success_url: `${process.env.DOMAIN}/projects/success?projectid=${project.projectid}`,
                cancel_url: `${process.env.DOMAIN}/projects/view/${project.projectid}`,
                payment_intent_data: {
                    application_fee_amount: 100,
                },
    
                client_reference_id: JSON.stringify({ projectid: project.projectid, userid: userid}),
            },
            {
                stripeAccount: schoolstripeid,
            }
        );
    
        res.send({ msg: "success", link: session.url });

    } else {
        res.status(400).send({ msg: "No school Stripe ID"})
    }

    

});

router.get('/success', async function (req, res) {
    const projectid = req.query.projectid;
    const projectdata = await getProjectData(projectid);

    if (projectdata.msg != "Success") {
        res.status(404).send(projectdata.msg);
        return;
    }

    res.render('donationSuccess', { project: projectdata.project });
});

module.exports = router;
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

router.post('/', async function (req, res) {
    try {
        console.log(req.body);
        const searchQuery = req.body.searchQuery;

        args = ['%' + searchQuery + '%'];

        var query = "SELECT * FROM projects WHERE title ILIKE $1 ";

        if (req.body.school != 'any') {
            args.push(req.body.school);
            query += `AND school = $${args.length} `;
        }

        if (req.body.status != 'any') {
            args.push(req.body.status);
            query += `AND status = $${args.length} `;
        }

        console.log(query);
        console.log(args);

        // Query the database
        const results = await pool.query(query, args);

        res.send({ projects: results.rows });
    } catch(e) {
        console.log(e);
        res.status(401).send(e);
    }
});

router.get('/propose', function (req, res) {
    if (res.locals.user === undefined) {
        res.redirect('/login');
        return;
    }

    //TODO
});

router.get('/create', async function (req, res, next) {
    //login required
    const user = res.locals.user;
    if (user === undefined) {
        next("You are not logged in.");
        return;
    }

    try {
        const user = res.locals.user;
        console.log("User loading project creation form: ", user);
        const results = await pool.query("SELECT * FROM roles WHERE userid = $1", [user.userid]);
            
        if (results.rows.length == 0) {
            next({ message: 'You are not a teacher at any school' });
        }

        const schools = results.rows.map(row => row.school);
        res.render('createProject', { schools, });
    } catch (e) {
        next(e);
    }
});


router.post('/create', async function (req, res, next) {
    try {
        const user = res.locals.user
        //login required.
        if (user === undefined) {
            res.status(401).send("You are not logged in.");
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
        const verif = await isContributorAt(res.locals.user, school);
        if (!verif.iscontributor) {
            throw new Error("You are not a contributor at this school.");
        }

        // Check if the school is ready to receive donations
        const schoolData = await schoolQuery(school);
        if (!schoolData.onboarded) {
            throw new Error("School not yet onboarded");
        }

        // Add the project to the database
        var projectid = -1;
        projectid = await pool.query('INSERT INTO projects (title, school, description, goalmoney, proposer, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING projectid');
        projectid = projectid;

        // Create the project as a product in Stripe
        const product = await stripe.products.create(
            { name: title },
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
        await pool.query('UPDATE projects SET stripeproductid = $1, stripepriceid = $2 WHERE projectid = $3', [product.id, price.id, projectid]);
        console.log('Project product created:', projectid);

        res.send({ msg: "success", projectid: projectid });
    } catch(err) {
        res.status(401).send("" + err);
    }
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
    try {
        //login required.
        if (res.locals.user === undefined) {
            res.redirect('/login');
            return;
        }
                
        const projectid = req.params.projectid;

        const verif = await isContributorFor(res.locals.user, projectid);
        if (!verif.iscontributor) {
            throw new Error("You are not a contributor to this project.")
        }
        
        res.send({ msg: 'Success' });
    } catch(e) {
        res.status(401).send(e);
    }
});

router.get('/edit/:projectid', async function (req, res) {
    try {
        //login required.
        if (res.locals.user === undefined) {
            res.redirect('/login');
            return;
        }

        const projectid = req.params.projectid;

        const verif = await isContributorFor(res.locals.user, projectid);
        if (!verif.iscontributor) {
            throw new Error("You are not a contributor to this project.");
        }

        res.render('editProject', { project: verif.project });
    } catch(err) {
        res.status(401).send(err);
    }
});

router.post('/edit/:projectid', async function (req, res) {
    try {
        //login required.
        if (res.locals.user === undefined) {
            res.redirect('/login');
            return;
        }

        const projectid = req.params.projectid
        const title = req.body.title;
        const description = req.body.description;
        const goalmoney = req.body.goalmoney;
        const status = req.body.status;

        // Check the Contributor is a teacher at the school
        const verif = await isContributorFor(res.locals.usser, projectid)
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
        await pool.query('UPDATE projects SET title = $1, school = $2, description = $3, goalmoney = $4, status = $5 WHERE projectid = $6', [title, school, description, goalmoney, status, projectid]);
        res.send({ msg: "success", projectid: projectid });
    } catch(err) {
        res.status(401).send(err);
    }
});

router.post('/delete/:projectid', async function (req, res) {
    try {
        const projectid = req.params.projectid;

        //if not logged in, or logged in but not allowed to contribute
        if (res.locals.user === undefined
            || !isContributorFor(res.locals.user, projectid).iscontributor) {
            res.status(401);
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
        await pool.query('DELETE FROM projects WHERE projectid = $1', [projectid]);

        res.send({ msg: "success" });
    } catch(err) {
        res.status(401).send(err);
    }
});


// Returns a link to donate
router.post('/donate/:projectid', async function (req, res) {
    try {
        var project = await getProjectData(req.params.projectid);

        const userid = req.locals.user.userid; // might be undefined
        project = project.project;
        const school = project.school;
        const schoolData = await schoolQuery(school);
        const schoolstripeid = schoolData.data.stripeid;

        // Check that the product/price has not been archived (and that the school stripeid exists)
        if (schoolstripeid == null) {
            throw new Error("No school Stripe ID.");
        }
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
    } catch(err) {
        res.status(401).send(err);
    }
});

router.get('/success', async function (req, res) {
    try {
        const projectid = req.query.projectid;
        const projectdata = await getProjectData(projectid);
       
        res.render('donationSuccess', { project });
    } catch(e) {
        next(e);
    }
});

module.exports = router;
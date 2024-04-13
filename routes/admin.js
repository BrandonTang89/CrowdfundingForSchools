var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const { verifyUser, isContributorFor, isContributorAt, schoolQuery } = require('../authFunctions.js');
const stripe = require('stripe')(process.env.STRIPE_KEY);

// Routes here are for the admin portal for school administrators to manage the school's profile

async function generateStripeConnectedAccount(school, userid) {
    const account = await stripe.accounts.create({
        type: 'standard',
    });

    // Add the account to the database
    const addAccountPromise = new Promise((resolve, reject) => {
        pool.query("INSERT INTO schools (school, stripeid) VALUES ($1, $2)", [school, account.id], (error, results) => {
            if (error) {
                reject(error);
            }
            resolve(results);
        }); 
    });

    const addRolePromise = new Promise((resolve, reject) => {
        pool.query("INSERT INTO roles (userid, school, role) VALUES ($1, $2, $3)", [userid, school, 'admin'], (error, results) => {
            if (error) {
                reject(error);
            }
            resolve(results);
        });
    })


    addRolePromise.then(addAccountPromise).catch((err) => {
        console.log("Error adding school");
        console.log(err);
    })
}

//This checks the admin priveleges of the user
//Then if they have priveleges, and if they haven't onboarded - it send them to onboarding
//If they have - it send to admin page
//However, it is also used to create a school - if the school passed doesn't exist yet
router.get('/', async function (req, res) {
    const school = req.query.school;
    const firebtoken = req.query.firebtoken;

    const user = await verifyUser(firebtoken);
    if (user.msg != "Success") {
        res.status(401).send("Not logged in");
        return;
    }
    const userid = user.userid;

    var schoolData = await schoolQuery(school);
    console.log(schoolData);

    var account = null;
    if (schoolData.onboarded == 'notCreated') {
        console.log("creating");
        // Create the account
        account = await generateStripeConnectedAccount(school, userid);
        schoolData.onboarded = false;
        schoolData = await schoolQuery(school);
        console.log(schoolData);
    }

    const verif = await isContributorAt(firebtoken, school);
    //Error 403 is specifically that the user is not a contributor or admin
    if (!verif.iscontributor) {
        res.status(403).send(verif);
        return;
    }
    if (verif.role != 'admin') {
        console.log(verif);
        res.status(403).send({msg: 'You are not an admin at this school'});
        return;
    }

    if (schoolData.onboarded == false) {
        // Check the account status
        if (account == null) account = await stripe.accounts.retrieve(schoolData.data.stripeid);

        if (account.details_submitted == false) {
            console.log('School not yet onboarded, creating account link');
            const accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: `${process.env.DOMAIN}/admin/?school=${encodeURIComponent(school)}&firebtoken=${firebtoken}`,
                return_url: `${process.env.DOMAIN}/myschools`,
                type: 'account_onboarding',
            });

            console.log(accountLink);
            //res.redirect(accountLink.url);
            res.status(200).send({onboardinglink: accountLink.url});
            return;
        }
        else {
            // Update the database
            console.log("School onboarded, updating database");
            const updatePromise = new Promise((resolve, reject) => {
                pool.query("UPDATE schools SET onboarded = true WHERE school = $1 RETURNING *", [school], (error, results) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(results[0]); // return the one row that has been updated
                });
            });
            try {
                schoolData = await updatePromise;
            }
            catch (error) {
                console.log('Error updating database');
                console.log(error);
                res.status(400).send({msg: 'Error updating database'});
            }
        }
    }
    console.log("redirecting");
    //Note: ideally here we should render the manageSchool page with locals
    //This wasn't working and after a long time debugging I have no idea why
    //So I used a workaround by sending the data back to mySchools.ejs, and rendering from there, with the data stored in localstorage
    res.status(200).send({schooldata: schoolData});
    /*try {
        res.render('manageSchool', {school: "hi", onboarded: true});
    } catch (err) {
        console.log(err);
    }
    console.log("redirected");*/
});

//Adds a role
//req.body is {firebtoken, school, role}
router.post('/add', async function (req, res) {
    var verif = await verifyUser(req.body.firebtoken);
    if (verif.userid) {
        const userid = verif.userid
        const addRolePromise = new Promise((resolve, reject) => {
            pool.query("INSERT INTO roles (userid, school, role) VALUES ($1, $2, $3)", [userid, req.body.school, req.body.role], (error, results) => {
                if (error) {
                    reject(error);
                }
                resolve(results);
            });
        })
        addRolePromise.catch((err) => {
            console.log("Error adding role");
            console.log(err);
            res.status(401).send({msg: 'Error adding role'})
        })
        res.status(200).send({msg: 'Role added'});
    } else {
        res.status(401).send({msg: verif.msg})
    }
    
});

//Removes a role
//req.body is {firebtoken, school, role}
router.post('/remove', async function (req, res) {
    var verif = await verifyUser(req.body.firebtoken);
    if (verif.userid) {
        const userid = verif.userid
        const removeRolePromise = new Promise((resolve, reject) => {
            pool.query("DELETE FROM roles WHERE userid = $1 AND school = $2 AND role = $3", [userid, req.body.school, req.body.role], (error, results) => {
                if (error) {
                    reject(error);
                }
                resolve(results);
            });
        })
        removeRolePromise.catch((err) => {
            console.log("Error deleting role");
            console.log(err);
            res.status(401).send({msg: 'Error deleting role'})
        })
        res.status(200).send({msg: 'Role deleted'});
    } else {
        res.status(401).send({msg: verif.msg})
    }
    
});

//Checks if a role exists
//req.body is {firebtoken, school, role}
router.post('/isrole', async function (req, res) {
    var verif = await verifyUser(req.body.firebtoken);
    if (verif.userid) {
        const userid = verif.userid;
        var queryText = "SELECT * FROM roles WHERE userid = $1 AND school = $2 AND role = $3";
        const isRolePromise = new Promise((resolve, reject) => {
            pool.query(queryText, [userid, req.body.school, req.body.role], (error, results) => {
                if (error) {
                    reject(error);
                }
                resolve(results);
            });
        })
        isRolePromise.then((value) => {
            if (value.rows.length) {
                res.status(200).send({isrole: true, msg: "Got role status"});
            } else {
                res.status(200).send({isrole: false, msg: "Got role status"});
            }
        }).catch((err) => {
            console.log(err);
            res.status(401).send({msg: "Error retrieving from database"})
        });
    } else {
        res.status(401).send({msg: verif.msg})
    }
});

//Lists the schools in which the given user has the given role
//req.body is {firebtoken, role}
//returns {rows}. For each row in rows, row.school is the school name.
router.post('/schoolswhere', async function (req, res) {
    var verif = await verifyUser(req.body.firebtoken);
    if (verif.userid) {
        const userid = verif.userid;
        var queryText = "SELECT * FROM roles WHERE userid = $1 AND role = $2";
        const schoolsPromise = new Promise((resolve, reject) => {
            pool.query(queryText, [userid, req.body.role], (error, results) => {
                if (error) {
                    reject(error);
                }
                resolve(results);
            });
        })
        schoolsPromise.then((value) => {
            res.status(200).send({rows: value.rows});
        }).catch((err) => {
            console.log(err);
            res.status(401).send({msg: "Error retrieving from database"})
        });
    } else {
        res.status(401).send({msg: verif.msg})
    }
});



module.exports = router;

var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const { verifyUser, isContributorFor, isContributorAt, schoolQuery } = require('../authFunctions.js');
const stripe = require('stripe')(process.env.STRIPE_KEY);

// Routes here are for the admin portal for school administrators to manage the school's profile

async function generateStripeConnectedAccount(school) {
    const account = await stripe.accounts.create({
        type: 'standard',
    });

    // Add the account to the database
    const response = await pool.query("INSERT INTO schools (school, stripeid) VALUES ($1, $2)", [school, account.id]);

    return account;
}

router.get('/', async function (req, res, next) {
    try {
        //login required
        if (res.locals.user === undefined) {
            res.redirect("/login");
            return;
        }

        const school = req.query.school;
        const verif = await isContributorAt(res.locals.user, school);

        if (!verif.iscontributor) {
            throw new Error("You are not a contributor at this school");
        }
        
        if (verif.role != 'admin') {
            throw new Error("You are not an admin at this school");
        }

        var schoolData = await schoolQuery(school);
        console.log(schoolData);

        var account = null;
        if (schoolData.onboarded == "notCreated") {
            // Create the account
            account = await generateStripeConnectedAccount(school);
            schoolData.onboarded = false;
        }

        if (schoolData.onboarded == false) {
            // Check the account status
            if (account == null) account = await stripe.accounts.retrieve(schoolData.data.stripeid);

            if (account.details_submitted == false) {
                console.log('School not yet onboarded, creating account link');
                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: `${process.env.DOMAIN}/admin/?school=${encodeURIComponent(school)}`,
                    return_url: `${process.env.DOMAIN}/settings/${req.cookies.firebtoken}`,
                    type: 'account_onboarding',
                });

                console.log(accountLink);
                res.redirect(accountLink.url);
                return;
            }
            else {
                // Update the database
                console.log("School onboarded, updating database");
                schoolData = await pool.query("UPDATE schools SET onboarded = true WHERE school = $1 RETURNING *", [school]);
            }
        }

        res.render('admin', { schooldata: schoolData, school: school });
    } catch(err) {
        res.status(401).send(err);
    }
});


module.exports = router;

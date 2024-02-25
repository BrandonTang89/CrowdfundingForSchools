var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const { verifyUser, isContributorFor, isContributorAt, schoolQuery } = require('../authFunctions.js');
const stripe = require('stripe')(process.env.STRIPE_KEY);

// Routes here are for the admin portal for school administrators to manage the school's profile

async function generateStripeConnectedAccount(school){
    const account = await stripe.accounts.create({
        type: 'standard',
    });

    // Add the account to the database
    const addAccountPromise = new Promise((resolve, reject) =>
    {
        pool.query("INSERT INTO schools (school, stripeid) VALUES ($1, $2)", [school, account.id], (error, results) => {
            if (error) {
                reject(error);
            }
            resolve(results);
        });
    });
    
    try{
        await addAccountPromise;
    }
    catch(error){
        console.log('Error adding account to database');
        console.log(error);
    }
    
    return account;
}

router.get('/', async function(req, res) {
    const school = req.query.school;
    const firebtoken = req.query.firebtoken;
    const verif = await isContributorAt(firebtoken, school);
    
    if (!verif.iscontributor){
        res.status(401).send(verif.msg);
        return;
    }
    if (verif.role != 'admin'){
        console.log(verif);
        res.status(401).send('You are not an admin at this school');
        return;
    }
    
    var schoolData = await schoolQuery(school);
    console.log(schoolData);

    if (schoolData.onboarded == "notCreated"){
        // Create the account
        const account = await generateStripeConnectedAccount(school);
        schoolData.onboarded = false;
    }

    if (schoolData.onboarded == false){
        // Check the account status
        const account = await stripe.accounts.retrieve(schoolData.data.stripeid);
        
        if (account.details_submitted == false){
            console.log('School not yet onboarded, creating account link');
            const accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: 'http://localhost:3000/admin/?school=' + encodeURIComponent(school) + '&firebtoken=' + firebtoken,
                return_url: 'http://localhost:3000/settings/' + firebtoken,
                type: 'account_onboarding',
              });
    
            console.log(accountLink);
            res.redirect(accountLink.url);
            return;
        }
        else{
            // Update the database
            console.log("School onboarded, updating database");
            const updatePromise = new Promise((resolve, reject) => {
                pool.query("UPDATE schools SET onboarded = true WHERE school = $1 RETURNING *", [school], (error, results) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(results);
                });
            });
            try{
                schooldata = await updatePromise;
            }
            catch(error){
                console.log('Error updating database');
                console.log(error);
            }
        }
    }

    res.render('admin', {schooldata: schoolData, school: school});
});


module.exports = router;

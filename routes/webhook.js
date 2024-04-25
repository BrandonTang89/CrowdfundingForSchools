var express = require('express');
var router = express.Router();
const pool = require('../db.js');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const endpointSecret = process.env.WEBHOOK_SECRET;

/** Logs the data of the donation
 * @param { {projectid: Int, userid: Int, amount: Int}} donationData 
 */
function logDonation(donationData) {
    console.log("Logging Donation", donationData);
    const amtinpounds = Math.floor(donationData.amount / 100);

    // Update the projects list
    const projectupdate = pool.query("UPDATE projects SET currentmoney = currentmoney + $1 WHERE projectid = $2", [amtinpounds, donationData.projectid]);

    // Update the donations list
    const donationdate = new Date().toISOString();
    const donationupdate = pool.query("INSERT INTO donations (projectid, userid, amount, donationdate) VALUES ($1, $2, $3, $4)", [donationData.projectid, donationData.userid, amtinpounds, donationdate]);

    Promise.all([projectupdate, donationupdate]).then(() => {
        console.log("Donation logged successfully");
    }).catch((error) => {
        console.log("Error logging donation");
        console.log(error);
    });
}


router.post('/', async (request, response) => {
    const payload = request.body;
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️  Webhook Error: ${err.message}`);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
        console.log("Checkout session completed", event.data.object);

        // We attach the relevant information to the session to the client_reference_id
        var donationData = JSON.parse(event.data.object.client_reference_id);
        donationData.amount = event.data.object.amount_total;
        logDonation(donationData);
    }

    response.status(200).end();
});

module.exports = router;

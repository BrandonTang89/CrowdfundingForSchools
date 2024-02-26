# Payment
We will use Stripe for payment processing. Specifically we will be using [Stripe Connect](https://docs.stripe.com/connect) to enable the the schools to accept payments directly.


## Intoduction to Stripe Connect
Stripe connect is stripe's solution to platform/marketplace type of products. The feature we will specifically be using is the ability to send direct payments from donors to schools. 

All entities that will receive payments will need to have a connected account. There are 3 types of [connected accounts](https://docs.stripe.com/connect/accounts) but we will be using the standard account type. With this account, the school's administrator will need to sign up for a stripe account (or use an existing on), this will be handled in the onboarding process which we will discuss later.

The rationale is that the standard account will have no fees other than the fees directly related to receive payment via stripe. This is unlike the express account which has other fees, including fees for payout. See the details at the [connect pricing page](https://stripe.com/gb/connect/pricing).

## Flow for Stripe
### Initial Set-Up
Since we don't want just about anyone signing up as a school, the first administrator for a school has to be manually added to the database. This can be done by directly editing the database to add a new role.

### Onboarding
- When a school joins the platform, we first need to create a new connected account. This connected account will have to be [onboarded](https://docs.stripe.com/connect/standard-accounts) by an administrator of the school. This involves the school administrator filling up a form about the business.
- We do this when an admin tries to go the school settings page.
- The record of whether the school has completed this onboarding is kept as a record in the schools table of the database. 
    - Specifically, the record of the school is created at the same time that the school's connected stripe account is connected. This means we operate on the assumption that the school has a created stripe account if and only if the school record exists in the database.
    - When the school finishes onboarding, we set the 'onboarded' field to true.

_Note that you might find documentation about using [OAuth while onboarding](https://docs.stripe.com/connect/oauth-standard-accounts?locale=en-GB). This is the old way of doing things and is not necessary for our use case._

### Donations
- When a user creates a project, we first check if the school has completed the onboarding process and thus has a connected account. If not then we inform the user that the school cannot accept donations at the moment.
- Else, when the project is created, we create a corresponding product in the school's stripe account along with a price. We then store the productID and priceID in the projects table.
- When a user donates to a project, we create a checkout session with the productID and priceID. We then redirect the user to the checkout session URL. 
    - Information about the user is stored in the checkout session within the `client_reference_id`
    - This information is used to updated the database later.

> We make a decision to archive the product and price when the project is closed. This makes the dashboard cleaner for the school administrator.

### Post Donations
- When a user donates and finishes the transaction successfully, they will be redirected to the success page
- We rely on a [stripe webhook](https://docs.stripe.com/webhooks) to update the database with the new donation information. 
- During live use, stripe will directly forward the events to our domain. However, for local testing, we set up a listener to forward the events. 
- For each successful transction, we update the project with the new donation amount and create a new donation record in the donations table.
- **Follow the [online guide](https://docs.stripe.com/webhooks#test-webhook) to set up the webhook listener locally**
    - Note that the the webhook listener built in the node.js version of the guide is for a version of express.js before 4.17 so it doesn't have the `express.raw()` middleware that is used by us.
    

### School Dashboard
Schools will likely want to monitor how much money is actually going into their account. Since we are using standard accounts, the school admin should just log into stripe externally to see this information. We will not be providing a dashboard for this.

_Express accounts support a [dashboard](https://docs.stripe.com/connect/express-dashboard?locale=en-GB) since the users will not be able to access the stripe account directly. But this is irrelevant for us._


## Testing
Testing the features related to stripe can be quite a pain to deal with. The [documentation](https://docs.stripe.com/testing) talks about creating connected accounts via OAuth but we aren't doing that. The best way I saw was basically to just sign up for stripe with 2 emails, one for you to do development with and one to test with.

Note that what stripe calls an "account" refers essentially to a business. It is possible to have 2 accounts under the same email. However, it is not recommended to try testing the application with the same email tied to the development account and the connected account.

Testing the payment is less painful, refer to the table in the testing documentation on the different test card credentials.

## Possible Errors / Issues
- It is possible for the connected account administrator to directly edit the product catalog which would break the donations if they archieved products or prices. We detect this case and remove the donate button if so.


## Stripe References
- https://docs.stripe.com/connect
- https://docs.stripe.com/testing
- https://stripe.com/gb/connect/pricing

const { getAuth } = require('firebase-admin/auth');

/** Verify the user's token and retrieves the user's email and user ID
 * @param {*} firebtoken 
 * @returns {Status: Int, email: String, UserId: String}
 * If token is valid, returns status 200
 * If token is invalid or email is not verified, returns status 401
 */
async function verifyUser(firebtoken){
    try{
        var decodedToken = await getAuth().verifyIdToken(firebtoken);
        var uid = decodedToken.uid;
        var userRecord = await getAuth().getUser(uid)
        var email = userRecord.email;
        var emailVerified = userRecord.emailVerified;

        if (emailVerified == false){
            return {status: 401};
        }
    
        return {status: 200, email: email, UserId: uid};
    }
    catch (e){
        console.log(e)
        return {status: 401};
    }
}

module.exports = {
    verifyUser
}
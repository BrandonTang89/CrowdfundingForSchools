const { getAuth } = require('firebase-admin/auth');
const pool = require('./db.js');

/** Verify the user's token and retrieves the user's email and user ID
 * @param {*} firebtoken 
 * @returns {Status: Int, email: String, userid: String}
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
    
        return {email: email, userid: uid, msg: "Success"};
    }
    catch (e){
        console.log(e)
        return {msg: "Unable to verify user"};
    }
}

/** Determines whether the user is valid contributor at the school
 * @param {String} firebtoken 
 * @param {String} school
 * @returns {iscontributor: Boolean, msg: String}
 */
async function isContributorAt(firebtoken, school){
    // A contributor is a teacher/admin for a certain school
    const user = await verifyUser(firebtoken);
    if (user.msg != "Success") {
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
                    reject({ iscontributor: false, msg: "Not a contributor at this school" });
                } else {
                    resolve({ iscontributor: true, msg: "Success", role: results.rows[0].role});
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

/** Returns project data if it exists
 * 
 * @param {String} projectid 
 * @returns {msg: String, project: {projectid: String, title: String, ...}}
 */
async function getProjectData(projectid){
    const projectDataPromise = new Promise((resolve, reject) =>
    {
        pool.query("SELECT * FROM projects WHERE projectid = $1", [projectid], (error, results) => {
            if (error) {
                reject(error);
            }
            if (results.rows.length == 0){
                reject("Project doesn't exist");
            }
            resolve(results.rows[0]);
        });
    }
    );
    try{
        const projectData = await projectDataPromise;
        return {project: projectData, msg: "Success"};
    }
    catch(error){
        console.log('Error fetching project data');
        console.log(error);
        return {msg: "Error fetching project data"};
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
    const promiseRes = await getProjectData(projectid);
    if (promiseRes.msg != "Success"){
        return {iscontributor: false, msg: promiseRes.msg};
    }

    var verif = await isContributorAt(firebtoken, promiseRes.project.school);
    verif.project = promiseRes.project;
    return verif;
}


/** Returns information about the school, if any
 * @param {String} school 
 * @returns  {onboarded: String/Boolean, school: String, 
 *            data: {school: string, stripeid: string, onboarded: boolean, ...}}}
 */
async function schoolQuery(school){
    const schoolQueryPromise = new Promise((resolve, reject) => {
        pool.query("SELECT * FROM schools WHERE school = $1", [school], (error, results) => {
            if (error) {
                reject(error);
            }
            if (results.rows.length == 0){
                resolve({msg: "success", onboarded: "notCreated", school: school});
            }
            else{
                resolve({msg: "success", onboarded: results.rows[0].onboarded, school: school, data: results.rows[0]})
            }

        });
    });

    try{
        const schoolData = await schoolQueryPromise;
        return schoolData;  
    }
    catch{
        res.status(501).send({msg: "Error fetching school data"});
        return;
    }
}


module.exports = {
    verifyUser, isContributorAt, isContributorFor, schoolQuery, getProjectData
}
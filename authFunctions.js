const { getAuth } = require('firebase-admin/auth');
const pool = require('./db.js');

async function verifyUser(firebtoken) {
    var decodedToken = await getAuth().verifyIdToken(firebtoken);
    var uid = decodedToken.uid;
    return await getAuth().getUser(uid);
}

async function isContributorAt(user, school) {  
    const userid = user.userid;

    const results = await pool.query("SELECT * FROM roles WHERE userid = $1 AND school = $2", [userid, school]);
    if (results.rowCount == 0) {
        return { iscontributor: false };
    } else {
        return { iscontributor: true, role: results.rows[0].role };
    }

}

/** Returns project data if it exists
 * 
 * @param {String} projectid 
 * @returns {projectid: String, title: String, ...}
 */
async function getProjectData(projectid) {
    const projectData = await pool.query("SELECT * FROM projects WHERE projectid = $1", [projectid]);

    if (projectData.rowCount === 0) {
        throw new Error("Project doesn't exist.");
    }

    return projectData;
}

/** Determines whether the user is a valid contributor of a certain project.
 * @param {User} user 
 * @param {String} projectid 
 * @returns {iscontributor: Boolean, project: {projectid: String, title: String, ...}}
 * 
 * Returns whether the user is a valid contributor, if so, what school.
 */
async function isContributorFor(user, projectid) {
    const project = await getProjectData(projectid);

    var verif = await isContributorAt(user, project.school);
    verif.project = project;
    
    return verif;
}

/** Returns information about the school, if any
 * @param {String} school 
 * @returns  {onboarded: String/Boolean, school: String, 
 *            data: {school: String, stripeid: String, onboarded: boolean, ...}}}
 */
async function schoolQuery(school) {
    const response = await pool.query("SELECT * FROM schools WHERE school = $1", [school]);

    if (results.rows.length == 0) {
        return { onboarded: "notCreated", school: school };
    } else {
        return { onboarded: results.rows[0].onboarded, school: school, data: results.rows[0] }
    }

}


module.exports = {
    verifyUser, isContributorAt, isContributorFor, schoolQuery, getProjectData
}
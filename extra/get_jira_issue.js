const jira = require('../utils/jira.js');

async function getIssue() {
    const result = await jira.getIssue('MM-16734');

    return result;
}

getIssue().then(data => console.log(data.data.fields));

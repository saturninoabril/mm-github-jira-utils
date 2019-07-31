require('dotenv').config();

const jira = require('../utils/jira.js');
const github = require('../utils/github.js');

function createGithubFromJiraIssue(issueNumber) {
    jira.getIssue(issueNumber).then(jiraResult => {
        const description = jira.parseDescription(jiraResult.data.fields.description, issueNumber);

        github.createIssue(jiraResult.data.fields.summary, description).then(githubResult => {
            if (githubResult.data) {
                const issueUrl = githubResult.data.html_url;

                const data = {
                    fields: {
                        customfield_11106: issueUrl,
                        fixVersions: [{ name: 'Help Wanted' }],
                    },
                };

                jira.updateIssue(issueNumber, data);
            }
        });
    });
}

process.env.JIRA_ISSUES.split(',').forEach(createGithubFromJiraIssue);

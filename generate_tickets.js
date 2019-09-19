const fs = require('fs');

const jira = require('./utils/jira.js');
const github = require('./utils/github.js');
const spreadsheet = require('./utils/spreadsheet.js');

require('dotenv').config();

// Load test cases from data/test_cases.json
fs.readFile('data/test_cases.json', (err, content) => {
    if (err) return console.log('Error loading data/test_cases.json:', err);

    const testCases = JSON.parse(content);

    testCases.forEach((testCase, index) => {
        const title = `UI Automation: Write an automated test using Cypress for "${testCase.title}"`;

        const jiraIssueDescription = jira.generateDescription(testCase);

        jira.createIssue(title, jiraIssueDescription).then(result => {
            if (result.data && result.data.key) {
                const issueNumber = result.data.key;
                const key = process.env.SPREADSHEET_KEY + result.data.key.split('-')[1];
                const testKey = `**Test Key:** ${key}\n`;
                const githubIssueDescription = github.generateDescription(
                    testKey + jiraIssueDescription,
                    issueNumber
                );

                github.createIssue(title, githubIssueDescription).then(result => {
                    if (result.data) {
                        const issueUrl = result.data.html_url;

                        const data = {
                            fields: {
                                customfield_11106: issueUrl,
                                fixVersions: [{ name: 'Help Wanted' }],
                            },
                        };

                        jira.updateIssue(issueNumber, data);

                        console.log('Updating Google spreadsheet');
                        const row = testCases[index].row_number + 2;

                        // Update Cypress Test Key
                        spreadsheet.runToSpreadsheet((auth) => spreadsheet.updateValue(auth, `P${row}`, key))

                        // Update Help wanted ticket
                        spreadsheet.runToSpreadsheet((auth) => spreadsheet.updateValue(auth, `N${row}`, `${process.env.MATTERMOST_JIRA_PROJECT_ISSUE_URL}/${issueNumber}`))
                    }
                });
            }
        });
    });
});



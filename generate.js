const fs = require('fs');

const jira = require('./utils/jira.js');
const github = require('./utils/github.js');

// Load test cases from data/test_cases.json
fs.readFile('data/test_cases.json', (err, content) => {
    if (err) return console.log('Error loading data/test_cases.json:', err);

    const testCases = JSON.parse(content);

    testCases.forEach((testCase, index) => {
        const title = `UI Automation: Write an automated test using Cypress for "${testCase.title}"`;

        const jiraIssueDescription = jira.generateDescription(testCase);
        const testKey = `**Test Key:** To follow\n`;

        jira.createIssue(title, testKey + jiraIssueDescription).then(result => {
            if (result.data && result.data.key) {
                const issueNumber = result.data.key;
                const testKey = `**Test Key:** ${process.env.SPREADSHEET_KEY}${result.data.id}\n`;
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
                    }
                });
            }
        });
    });
});

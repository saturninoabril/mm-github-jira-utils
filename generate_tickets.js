const fs = require('fs');

const jira = require('./utils/jira.js');
const github = require('./utils/github.js');
const spreadsheet = require('./utils/spreadsheet.js');

require('dotenv').config();

const {
    SPREADSHEET_KEY,
    TEST_FOLDER,
    SPREADSHEET_ROW_START,
    SPREADSHEET_ROW_TEST_KEY,
    SPREADSHEET_ROW_HW_TICKET,
    MATTERMOST_JIRA_PROJECT_ISSUE_URL,
} = process.env;

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
                const key = SPREADSHEET_KEY + result.data.key.split('-')[1];
                const testKey = `**Test Key:** ${key}\n`;
                const testFolder = '**Test folder:** ' + '`' + TEST_FOLDER + '`';

                const githubIssueDescription = github.generateDescription(
                    [testKey, testFolder, jiraIssueDescription].join('\n'),
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

                        const row = testCases[index].row_number + parseInt(SPREADSHEET_ROW_START, 10);

                        // Update Cypress Test Key
                        spreadsheet.runToSpreadsheet((auth) => spreadsheet.updateValue(auth, `${SPREADSHEET_ROW_TEST_KEY}${row}`, key))

                        // Update Help wanted ticket
                        spreadsheet.runToSpreadsheet((auth) => spreadsheet.updateValue(auth, `${SPREADSHEET_ROW_HW_TICKET}${row}`, `${MATTERMOST_JIRA_PROJECT_ISSUE_URL}/${issueNumber}`))
                    }
                });
            }
        });
    });
});



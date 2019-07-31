const axios = require('axios');

require('dotenv').config();

function createIssue(title, description) {
    data = {
        fields: {
            project: { key: 'MM' },
            summary: title,
            description: description,
            issuetype: { name: 'Story' },
            customfield_11101: { value: 'QA' },
        },
    };

    return axios({
        auth: {
            username: process.env.JIRA_USERNAME,
            password: process.env.JIRA_TOKEN,
        },
        method: 'post',
        url: 'https://mattermost.atlassian.net/rest/api/2/issue/',
        data,
    })
        .then(resp => {
            console.log(`Successfully created:`, resp.data.key);
            return { status: resp.status, data: resp.data };
        })
        .catch(err => {
            console.log(`Error creating Jira issue for:`, title);
            return { error: err };
        });
}

function getIssue(issueNumber) {
    return axios({
        auth: {
            username: process.env.JIRA_USERNAME,
            password: process.env.JIRA_TOKEN,
        },
        method: 'get',
        url: `${process.env.MATTERMOST_JIRA_API_ISSUE_URL}/${issueNumber}`,
    })
        .then(resp => {
            return { status: resp.status, data: resp.data };
        })
        .catch(err => {
            console.log(`Error getting ${issueNumber}`);
            return { error: err };
        });
}

function updateIssue(issueNumber, data) {
    axios({
        auth: {
            username: process.env.JIRA_USERNAME,
            password: process.env.JIRA_TOKEN,
        },
        method: 'put',
        url: `${process.env.MATTERMOST_JIRA_API_ISSUE_URL}/${issueNumber}`,
        data,
    })
        .then(resp => {
            console.log(`Successfully updated ${issueNumber}`);
            return { status: resp.status, data: resp.body };
        })
        .catch(err => {
            console.log(`Error updating ${issueNumber}`);
            return { error: err };
        });
}

function parseDescription(data, issueNumber) {
    let description =
        'If you\'re interested please comment here and come [join our "Contributors" community channel](https://community.mattermost.com/core/channels/tickets) on our daily build server, where you can discuss questions with community members and the Mattermost core team. For technical advice or questions, please  [join our "Developers" community channel](https://community.mattermost.com/core/channels/developers).\n\n';
    description +=
        "New contributors please see our [Developer's Guide](https://developers.mattermost.com/contribute/getting-started/).\n\n";
    description += '----\n\n';
    description += `**Notes**: [Jira ticket](${process.env.MATTERMOST_JIRA_PROJECT_ISSUE_URL}/${issueNumber})\n`;

    data.content.forEach(element => {
        if (element.content && element.content.length > 0) {
            description += '\n';
            element.content.forEach(el => {
                if (el.type === 'text') {
                    if (el.marks && el.marks[0].type === 'strong') {
                        if (el.text === 'Expected:' || el.text === 'Steps:') {
                            description += '\n';
                        }
                        description += `__${el.text}__`;
                    } else if (el.marks && el.marks[0].type === 'code') {
                        description += '``' + el.text + '``';
                    } else {
                        description += el.text;
                    }
                } else if (el.type === 'hardBreak') {
                    description += '\n';
                } else if (el.type === 'listItem' && el.content && el.content.length > 0) {
                    el.content.forEach(elc => {
                        if (elc.content && elc.content.length > 0) {
                            elc.content.forEach(elcc => {
                                description += `- ${elcc.text}\n`;
                            });
                        }
                    });
                }
            });
        }
    });

    return description;
}

function generateDescription(testCase) {
    console.log('testCase:', testCase);
    return `
**Title:** ${testCase.title}
    
**Steps:**
${testCase.steps}
        
**Expected:**
${testCase.expected}
        
See our [end-to-end testing documentation](https://developers.mattermost.com/contribute/webapp/end-to-end-tests/) for reference.
`;
}

module.exports = {
    createIssue,
    getIssue,
    generateDescription,
    parseDescription,
    updateIssue,
};

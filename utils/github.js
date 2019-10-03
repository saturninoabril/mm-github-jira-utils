require('dotenv').config();

const Octokit = require('@octokit/rest');

function createIssue(title, description) {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
    });

    return octokit.issues
        .create({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            title,
            body: description,
            labels: process.env.GITHUB_LABELS.split(','),
        })
        .then(resp => {
            console.log('Successfully created Github issue - ', resp.data.html_url);
            return { status: resp.status, data: resp.data };
        })
        .catch(err => {
            console.log('Failed to create Github issue for:', title);
            return { error: err };
        });
}

function getPullRequests(repo) {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
    });

    return octokit.pulls
        .list({
            owner: process.env.GITHUB_OWNER,
            repo,
            state: 'open',
            per_page: 100,
        })
        .then(resp => {
            return { repo, status: resp.status, data: resp.data };
        })
        .catch(err => {
            console.log('Failed to get Github list of pull request');
            return { error: err };
        });
}

function generateDescription(content, jiraIssueNumber) {
    return `


${content}

**Jira ticket**: [${jiraIssueNumber}](${process.env.MATTERMOST_JIRA_PROJECT_ISSUE_URL}/${jiraIssueNumber})

---
If you're interested, please comment here and come [join our "Contributors" community channel](https://community.mattermost.com/core/channels/tickets) on our daily build server, where you can discuss questions with community members and the Mattermost core team. For technical advice or questions, please  [join our "Developers" community channel](https://community.mattermost.com/core/channels/developers).


New contributors please see our [Developer's Guide](https://developers.mattermost.com/contribute/getting-started/).
`;
}

module.exports = {
    createIssue,
    generateDescription,
    getPullRequests,
};

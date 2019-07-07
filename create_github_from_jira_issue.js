require('dotenv').config();

const axios = require('axios');
const Octokit = require('@octokit/rest');

function createGithubIssue(title, description) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  return octokit.issues
    .create({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      title,
      body: description,
      labels: process.env.GITHUB_LABELS.split(',')
    })
    .then(res => {
      console.log('Successfully created Gihub issue - ', res.data.html_url);
      return { status: res.status, url: res.data.html_url };
    })
    .catch(err => {
      console.log('Failed to create Github issue');
      return { err };
    });
}

async function getJiraIssue(issueNumber) {
  const response = await axios({
    method: 'get',
    url: `${process.env.MATTERMOST_JIRA_API_ISSUE_URL}${issueNumber}`
  });

  return {
    status: response.status,
    link: `${process.env.MATTERMOST_JIRA_ISSUE_URL}${issueNumber}`,
    summary: response.data.fields.summary,
    description: response.data.fields.description
  };
}

function updateJiraIssue(issueNumber, data) {
  axios({
    auth: {
      username: process.env.JIRA_USERNAME,
      password: process.env.JIRA_TOKEN
    },
    method: 'put',
    url: `${process.env.MATTERMOST_JIRA_API_ISSUE_URL}${issueNumber}`,
    data
  })
    .then(resp => {
      console.log(`Successfully updated ${issueNumber}`);
    })
    .catch(err => {
      console.log(`Error updating ${issueNumber}`);
    });
}

function parseJiraDescription(data, issueNumber) {
  let description =
    'If you\'re interested please comment here and come [join our "Contributors" community channel](https://community.mattermost.com/core/channels/tickets) on our daily build server, where you can discuss questions with community members and the Mattermost core team. For technical advice or questions, please  [join our "Developers" community channel](https://community.mattermost.com/core/channels/developers).\n\n';
  description +=
    "New contributors please see our [Developer's Guide](https://developers.mattermost.com/contribute/getting-started/).\n\n";
  description += '----\n\n';
  description += `**Notes**: [Jira ticket](${process.env.MATTERMOST_JIRA_ISSUE_URL}${issueNumber})\n`;

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

function main(issueNumber) {
  getJiraIssue(issueNumber).then(res => {
    const description = parseJiraDescription(res.description, issueNumber);
    createGithubIssue(res.summary, description).then(githubResponse => {
      if (githubResponse.url) {
        const data = {
          fields: {
            customfield_11106: githubResponse.url,
            fixVersions: [{ name: 'Help Wanted' }]
          }
        };
        updateJiraIssue(issueNumber, data);
      }
    });
  });
}

process.env.JIRA_ISSUES.split(',').forEach(main);

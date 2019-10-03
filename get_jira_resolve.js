const axios = require('axios');

const jira = require('./utils/jira.js');

require('dotenv').config();

const TEAM_FIELD = 'customfield_11101';         // value [Apps]
const ISSUE_TYPE_FIELD = 'issuetype';           // name [Bug]
const RESOLUTION_FIELD = 'resolution';          // name [Duplicate]
const RESOLUTION_DATE_FIELD = 'resolutiondate';
const STATUS_FIELD = 'status';                  // name [Resolved]
const SUMMARY_FIELD = 'summary';
const FIX_VERSIONS_FIELD = 'fixVersions';       // array, .name [v5.16 (Oct 2019)]
const ASSIGNEE_FIELD = 'assignee';              // name

async function getTickets(startAt) {
    const tickets = await jira.getResolvedTickets(startAt);
    return tickets;
};

// TODO:
function groupIssuesPerResolution(issues = []) {
    return issues.reduce((acc, issue) => {
        console.log('issue.key:', issue.key)
        const resolution = issue.fields[RESOLUTION_FIELD];
        if (resolution && resolution.name) {
            if (acc[resolution.name]) {
                acc[resolution.name] = acc[resolution.name] + 1;
            } else {
                acc[resolution.name] = 1;
            }
        }

        return acc
    }, {})
}

function getIssuesPerResolution(issues = [], name) {
    return issues.
        filter(issue => issue.fields[RESOLUTION_FIELD].name === name);
}

function extractInfo(issues) {
    return issues.map(issue => ({
        key: issue.key,
        assignee: issue.fields[ASSIGNEE_FIELD] ? issue.fields[ASSIGNEE_FIELD].name : '',
        resolution: issue.fields[RESOLUTION_FIELD] ? issue.fields[RESOLUTION_FIELD].name : '',
        resolution_date: issue.fields[RESOLUTION_DATE_FIELD],
        status: issue.fields[STATUS_FIELD] ? issue.fields[STATUS_FIELD].name : '',
        summary: issue.fields[SUMMARY_FIELD],
        team: issue.fields[TEAM_FIELD] ? issue.fields[TEAM_FIELD].value : '',
        type: issue.fields[ISSUE_TYPE_FIELD] ? issue.fields[ISSUE_TYPE_FIELD].name : '',
        versions: issue.fields[FIX_VERSIONS_FIELD].reduce((acc, version) => {
            if (acc) {
                acc += `, ${version.name}`;
                return acc;
            } else {
                return version.name;
            }
        }, ''),
    })).sort((a, b) => {
        const aVersion = a.versions;
        const bVersion = b.versions;

        if (aVersion > bVersion) {
            return 1;
        } else if (bVersion > aVersion) {
            return -1;
        } else {
            return 0;
        }
    });
}

function generateTemplate(issues, resolution, totalIssues, start, max) {
    console.log('max:', max);
    const lines = [];
    issues.forEach((issue) => {
        const prefix = resolution === 'Done' ? `(${issue.type})` : `(${issue.resolution}, ${issue.type})`;
        const versions = issue.versions ? `[${issue.versions}]` : '';
        const line = `- ${prefix} [${issue.summary}](${process.env.MATTERMOST_JIRA_PROJECT_ISSUE_URL}/${issue.key}) ${versions}`;
        lines.push(line);
    });

    return `
---
Jira: "${resolution}" resolved tickets: ${start} to ${max}
---
Total: **${totalIssues}**

${lines.join('\n')}

#jira_qa_resolve #${today.toDateString().replace(/\s/g, '_')}
`;
}

function submitMessage(text) {
    return axios({
        method: 'post',
        url: process.env.MATTERMOST_INCOMING_WEBHOOK,
        data: {text},
    }).then(resp => {
        console.log(`Successfully sent to Mattermost`);
    }).catch(err => {
        console.log(`Failed to sent to Mattermost`);
    });
}

const output = [];
[0, 100, 200, 300].forEach((startAt) => {
// [0].forEach((startAt) => {
    console.log('startAt:', startAt);
    output.push(getTickets(startAt));
});

var today = new Date();
Promise.all(output).then(out => {
    let total = 0;
    const issues = [];
    out.forEach(tickets => {
        // console.log('tickets', tickets);
        if (tickets.data.issues.length > 0) {
            // console.log(tickets.data.issues[0]);
        }

        total = tickets.data.total
        if (tickets.data.issues.length > 0) {
            // console.log('CONCAT', tickets.data.issues)
            tickets.data.issues.forEach((issue) => issues.push(issue));
            // issues.concat(tickets.data.issues);
            // console.log('CONCAT AFTER', issues.length)
        }

        // console.log('tickets.data.startAt:', tickets.data.startAt);
        // console.log('tickets.data.maxResults:', tickets.data.maxResults);
        // console.log('tickets.data.total:', tickets.data.total);
        // console.log('tickets.data.issues:', tickets.data.issues.length);
    });

    // console.log('total:', total);
    // console.log('issues.length:', issues.length);

    // const groupIssues = groupIssuesPerResolution(issues);
    // console.log('groupIssues', groupIssues);
    const doneIssues = getIssuesPerResolution(issues, 'Done');
    console.log('doneIssues.length:', doneIssues.length);
    
    const notValid = [];
    ['Cannot Reproduce', 'Duplicate', 'Invalid', 'Won\'t Do', 'Won\'t Fix'].forEach((name) => {
        console.log('name:', name);
        getIssuesPerResolution(issues, name).forEach((i) => notValid.push(i));
    });
    console.log('notValid.length:', notValid.length);
    const extractInfoNotValid = extractInfo(notValid);

    const notValidMessage = generateTemplate(extractInfoNotValid, 'Not valid', extractInfoNotValid.length, 1, extractInfoNotValid.length);
    submitMessage(notValidMessage);

    const extractInfoDone = extractInfo(doneIssues);

    const doneMessage = generateTemplate(extractInfoDone, 'Done', extractInfoDone.length, 1, extractInfoDone.length);
    submitMessage(doneMessage);

    // const PAGE = 50;
    // const pages = Math.ceil(extractInfoDone.length / PAGE);
    // console.log('pages', pages);

    // for (let i = 0; i < pages; i++) {
    //     console.log('i', i);

    //     const start = i * PAGE;
    //     const end = PAGE * (i + 1);
    //     const doneIssues = extractInfoDone.slice(start, end);
    //     console.log('doneIssues.length', doneIssues.length);
    //     const doneMessage = generateTemplate(doneIssues, 'Done', extractInfoDone.length, start + 1, end > extractInfoDone.length ? extractInfoDone.length : end);
    //     submitMessage(doneMessage);
    // }
});

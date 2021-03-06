const axios = require('axios');

require('dotenv').config();

const github = require('./utils/github.js');

async function getPRs(repo) {
    const prs = await github.getPullRequests(repo);

    return prs;
}

function getPRLabel(pr) {
    return pr.labels.reduce((acc, el) => {
        acc.push(el.name);
        return acc;
    }, []);
}

function getPRReviewer(pr) {
    return pr.requested_reviewers.reduce((acc, el) => {
        acc.push(el.login);
        return acc;
    }, []);
}

function getQAReviewer(reviewers = []) {
    const qaReviewer = [];
    reviewers.forEach(rev => {
        if (process.env.GITHUB_QA_USERS.includes(rev)) {
            qaReviewer.push(rev);
        }
    });

    return qaReviewer;
}

function groupPRsPerQA(PRs = [], repo) {
    return PRs.
        filter(pr => getPRLabel(pr).includes('2: QA Review')).
        map(pr => {
            const reviewers = getPRReviewer(pr);
            return {
                author: pr.user.login,
                labels: getPRLabel(pr),
                milestone: pr.milestone ? pr.milestone.title : '',
                qa_reviewer: getQAReviewer(reviewers),
                repo,
                reviewers,
                title: pr.title,
                url: pr.html_url,
            }
        }).
        sort((a, b) => {
            const aReviewer = a.qa_reviewer.join('');
            const bReviewer = b.qa_reviewer.join('');

            if (aReviewer < bReviewer) {
                return -1;
            } else if (aReviewer > bReviewer) {
                return 1;
            }

            return 0;
        });
}

function generateTemplate(repo, totalPR, qaPRs) {
    const lines = [];
    qaPRs.forEach((pr) => {
        const milestone = pr.milestone ? `[${pr.milestone}]` : '';
        const line = `- (${pr.qa_reviewer.length > 0 ? pr.qa_reviewer.join(', ') : ':point_up:'}) [${pr.title}](${pr.url}) ${milestone} `;
        lines.push(line);
    });

    return `
---
${repo}
---

Total Open PRs: **${totalPR}**
Open for QA review: **${qaPRs.length}**

${lines.join('\n')}

#github_qa_review #${today.toDateString().replace(/\s/g, '_')}
`;
}

function submitMessage(text) {
    axios({
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
process.env.GITHUB_REPOS.split(',').forEach((repo) => {
    output.push(getPRs(repo));
});

var today = new Date();

Promise.all(output).then(out => {
    out.forEach(prs => {
        const qaLabelled = groupPRsPerQA(prs.data, prs.repo);

        const text = generateTemplate(prs.repo, prs.data.length, qaLabelled)

        submitMessage(text);
    });
});

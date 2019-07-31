require('dotenv').config();

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'credentials/token.json';
const DATA_PATH = 'data/test_cases.json';

// Load client secrets from a local file.
fs.readFile('credentials/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), getTestCases);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', code => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Returns test cases
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getTestCases(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get(
        {
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: `${process.env.SPREADSHEET_TAB}!A2:P`,
        },
        (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                const testCases = rows
                    .filter(r => r[15] === 'Yes')
                    .map(r => ({
                        title: r[1],
                        steps: r[2],
                        expected: r[3],
                    }));

                const invalidData = testCases.filter(isValid);

                if (invalidData.length > 0) {
                    console.log('Invalid data', invalidData, invalidData.length);
                    console.log('Please check written test cases');
                } else {
                    fs.writeFile(DATA_PATH, JSON.stringify(testCases), err => {
                        if (err) return console.error(err);
                        console.log('Data stored to', DATA_PATH);
                    });
                }
            } else {
                console.log('No data found.');
            }
        }
    );
}

function isValid(testCase) {
    return testCase.title.split('\n').length === 1;
}

module.exports = {
    getTestCases,
};

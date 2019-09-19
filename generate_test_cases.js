const fs = require('fs');
const { google } = require('googleapis');

require('dotenv').config();

const spreadsheet = require('./utils/spreadsheet.js');

spreadsheet.runToSpreadsheet(getTestCases);

// Utility functions

/**
 * Returns test cases
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getTestCases(auth) {
    const DATA_PATH = 'data/test_cases.json';
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
                    .map((r, index) => {
                        r[r.length] = index;
                        return r;
                    })
                    .filter((r) => {
                        return r[15] && r[15].toLowerCase() === 'yes';
                    })
                    .map(r => ({
                        title: r[1],
                        steps: r[2],
                        expected: r[3],
                        row_number: r[r.length - 1],
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
    return testCase.title.split('\n').length > 1;
}
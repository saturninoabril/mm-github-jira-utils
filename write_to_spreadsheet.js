const fs = require('fs');
const { google } = require('googleapis');

require('dotenv').config();

const spreadsheet = require('./utils/spreadsheet.js');

spreadsheet.runToSpreadsheet(update);

// Utility functions

/**
 * Returns test cases
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function update(auth, cell, value) {
    const request = {
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `${process.env.SPREADSHEET_TAB}!${cell}`,
        valueInputOption: 'USER_ENTERED',
        resource: {values: [[value]]}
        
    };
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.update(request, function(err, response) {
        if (err) {
            console.error(err);
            return;
        }

        console.log('Successfully updated the spreadsheet!');
    });
}

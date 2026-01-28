const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const getAuth = () => {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        : path.join(__dirname, '../credentials.json');

    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: SCOPES,
    });
    return auth;
};

const getSheetsService = () => {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
};

/**
 * Get metadata about the spreadsheet (sheet names, etc.)
 * @param {string} spreadsheetId 
 */
const getSpreadsheetMetadata = async (spreadsheetId) => {
    const service = getSheetsService();
    const meta = await service.spreadsheets.get({
        spreadsheetId,
    });
    return meta.data;
};

/**
 * Get all values from a specific sheet range
 * @param {string} spreadsheetId 
 * @param {string} range (e.g., "Sheet1!A:Z")
 */
const getSheetValues = async (spreadsheetId, range) => {
    const service = getSheetsService();
    const result = await service.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    return result.data.values; // Array of arrays
};

module.exports = {
    getSpreadsheetMetadata,
    getSheetValues
};

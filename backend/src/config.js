require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3030,
  backlog: {
    apiKey: process.env.BACKLOG_API_KEY,
    spaceId: process.env.BACKLOG_SPACE_ID,
    projectKey: process.env.PROJECT_KEY || 'V2A9',
  },
  holidayCsvPath: process.env.HOLIDAY_CSV_PATH || './data/holidays.csv',
  // IDs will be added here or used directly from env
  customFields: {
    status: process.env.CUSTOM_FIELD_ID_STATUS,
    releaseDate: process.env.CUSTOM_FIELD_ID_RELEASE_DATE,
    progress: process.env.CUSTOM_FIELD_ID_PROGRESS,
  },
  issueTypeAnken: process.env.ISSUE_TYPE_ID_ANKEN,
};

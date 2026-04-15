const axios = require('axios');
const config = require('./config');

async function investigate() {
  if (!config.backlog.apiKey || !config.backlog.spaceId) {
    console.error('Error: BACKLOG_API_KEY or BACKLOG_SPACE_ID is not set in .env');
    return;
  }

  const baseUrl = `https://${config.backlog.spaceId}.backlog.com/api/v2`;
  const projectKey = config.backlog.projectKey;

  console.log(`Checking project: ${projectKey} on space: ${config.backlog.spaceId}`);

  try {
    // 1. Get Custom Fields
    console.log('\n--- Custom Fields ---');
    const cfResponse = await axios.get(`${baseUrl}/projects/${projectKey}/customFields`, {
      params: { apiKey: config.backlog.apiKey }
    });

    const targetFields = ['ステータス', 'テストリリース予定日', '進捗率'];
    cfResponse.data.forEach(field => {
      const isTarget = targetFields.includes(field.name);
      console.log(`${isTarget ? '⭐' : '  '} [ID: ${field.id}] ${field.name} (${field.fieldTypeName})`);
    });

    // 2. Get Issue Types (for 00.案件)
    console.log('\n--- Issue Types ---');
    const itResponse = await axios.get(`${baseUrl}/projects/${projectKey}/issueTypes`, {
      params: { apiKey: config.backlog.apiKey }
    });
    
    itResponse.data.forEach(type => {
      console.log(`${type.name === '00.案件' ? '⭐' : '  '} [ID: ${type.id}] ${type.name}`);
    });

    // 3. Get Statuses
    console.log('\n--- Project Statuses ---');
    const stResponse = await axios.get(`${baseUrl}/projects/${projectKey}/statuses`, {
      params: { apiKey: config.backlog.apiKey }
    });
    
    stResponse.data.forEach(status => {
      console.log(`   [ID: ${status.id}] ${status.name}`);
    });

    console.log('\nInvestigation completed. Please update your .env file with the starred IDs.');

  } catch (error) {
    console.error('API Error:', error.response ? error.response.data : error.message);
  }
}

investigate();

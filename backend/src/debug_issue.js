const axios = require('axios');
const config = require('./config');

async function debugIssue(issueKey) {
  const baseUrl = `https://${config.backlog.spaceId}.backlog.com/api/v2`;
  const apiKey = config.backlog.apiKey;

  try {
    console.log(`--- Debugging Issue: ${issueKey} ---`);
    const response = await axios.get(`${baseUrl}/issues/${issueKey}`, {
      params: { apiKey }
    });
    const parent = response.data;
    
    console.log('Parent Info:');
    console.log(`  Estimated: ${parent.estimatedHours}`);
    console.log(`  Actual: ${parent.actualHours}`);
    const progressCf = parent.customFields.find(cf => cf.id === parseInt(config.customFields.progress));
    console.log(`  Progress CF (ID ${config.customFields.progress}):`, progressCf ? progressCf.value : 'Not found');

    const childrenResponse = await axios.get(`${baseUrl}/issues`, {
      params: {
        apiKey,
        'parentIssueId[]': [parent.id]
      }
    });

    console.log('\nChildren Info:');
    childrenResponse.data.forEach(child => {
      const childProgressCf = child.customFields.find(cf => cf.id === parseInt(config.customFields.progress));
      console.log(`  Child ${child.issueKey}:`);
      console.log(`    Estimated: ${child.estimatedHours}`);
      console.log(`    Actual: ${child.actualHours}`);
      console.log(`    Progress CF:`, childProgressCf ? childProgressCf.value : 'Not found');
    });

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

debugIssue('V2A9-1128');

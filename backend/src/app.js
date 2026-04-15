const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const backlogApi = require('./services/backlogApi');
const progressCalc = require('./services/progressCalc');

// Progress API
app.get('/api/progress', async (req, res) => {
  console.log('GET /api/progress request received');
  try {
    // 1. 親課題（案件）の取得
    const parents = await backlogApi.getParentIssues();
    
    if (!parents.length) {
      return res.json({ status: 'success', data: [] });
    }

    // 2. 子課題の取得（並列実行）
    const results = await Promise.all(parents.map(async (parent) => {
      const children = await backlogApi.getChildIssues([parent.id]);
      // 3. 各案件の集計
      return progressCalc.calculate(parent, children);
    }));

    res.json({ status: 'success', data: results });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(config.port, () => {
  console.log(`BPM Server running at http://localhost:${config.port}`);
});

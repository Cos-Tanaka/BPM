const axios = require('axios');
const config = require('../config');

class BacklogApi {
  constructor() {
    this.baseUrl = `https://${config.backlog.spaceId}.backlog.com/api/v2`;
    this.apiKey = config.backlog.apiKey;
    this.projectId = null;
  }

  async init() {
    if (this.projectId) return;
    try {
      const response = await axios.get(`${this.baseUrl}/projects/${config.backlog.projectKey}`, {
        params: { apiKey: this.apiKey }
      });
      this.projectId = response.data.id;
    } catch (error) {
      console.error('Failed to init BacklogApi:', error.message);
      throw error;
    }
  }

  /**
   * 親課題（案件）の一覧を取得する
   */
  async getParentIssues() {
    await this.init();
    
    // 基本設計書5.2の条件に基づき取得
    // ステータス: 1(未対応), 2(処理中)
    // 課題種別: ISSUE_TYPE_ID_ANKEN
    // ※ カスタム項目「ステータス」の40-60判定は取得後のフィルタリングで行う
    
    try {
      const params = {
        apiKey: this.apiKey,
        'projectId[]': [this.projectId],
        'issueTypeId[]': [config.issueTypeAnken],
        'statusId[]': [1, 2], // 未対応, 処理中
        // 'parentChild': 1, // 親課題のみ (一旦コメントアウトして確認)
        count: 100
      };
      
      console.log('Fetching issues with params:', JSON.stringify(params, null, 2));
      const response = await axios.get(`${this.baseUrl}/issues`, { params });

      console.log(`Fetched ${response.data.length} raw issues.`);

      // カスタム項目「ステータス」によるフィルタリング (40〜60)
      const filtered = response.data.filter(issue => {
        // 親課題チェック (parentIssueId が null であること)
        if (issue.parentIssueId !== null) return false;

        const cfStatus = issue.customFields.find(cf => cf.id === parseInt(config.customFields.status));
        if (!cfStatus || !cfStatus.value) {
          console.log(`Issue ${issue.issueKey} has no custom status field (${config.customFields.status}).`);
          return false;
        }
        
        let statusValue = cfStatus.value;
        if (typeof statusValue === 'object' && statusValue !== null) {
          statusValue = statusValue.name;
        }

        if (typeof statusValue !== 'string') {
          console.log(`Issue ${issue.issueKey} custom status value type is ${typeof statusValue}.`);
          return false;
        }
        
        // 先頭の数値を抽出して判定
        const match = statusValue.match(/^(\d+)/);
        if (!match) {
          console.log(`Issue ${issue.issueKey} custom status value "${statusValue}" format is invalid.`);
          return false;
        }
        
        const statusNum = parseInt(match[1]);
        const isTarget = statusNum >= 40 && statusNum <= 60;
        if (!isTarget) {
          console.log(`Issue ${issue.issueKey} status ${statusNum} is out of range (40-60).`);
        }
        return isTarget;
      });

      console.log(`Filtered down to ${filtered.length} target issues.`);
      return filtered;
    } catch (error) {
      console.error('getParentIssues error:', error.message);
      throw error;
    }
  }

  /**
   * 指定した親課題群に紐づく全ての子課題を取得する
   */
  async getChildIssues(parentIssueIds) {
    if (!parentIssueIds.length) return [];
    
    // Backlog APIの制限を考慮し、一度に取得する（parentIssueId[] を複数指定可能）
    try {
      const response = await axios.get(`${this.baseUrl}/issues`, {
        params: {
          apiKey: this.apiKey,
          'parentIssueId[]': parentIssueIds,
          count: 100 // 1案件あたりの子課題が多い場合は100で足りるか検討が必要だが通常は十分
        }
      });
      return response.data;
    } catch (error) {
      console.error('getChildIssues error:', error.message);
      throw error;
    }
  }
}

module.exports = new BacklogApi();

const config = require('../config');
const holidayLoader = require('./holidayLoader');

class ProgressCalc {
  /**
   * 親課題と子課題リストから進捗集計データを生成する
   */
  calculate(parent, children) {
    // 1. 各項目の抽出と合算
    const estimatedHours = this.sumHours(parent, children, 'estimatedHours');
    const actualHours = this.sumHours(parent, children, 'actualHours');
    
    // 各課題ごとの残工数を集計 (基本設計 9.2.2 優先順位)
    const remainingHours = this.calculateTotalRemainingHours(parent, children);
    
    // 予定工数が 0 の場合は進捗率 0 とする
    const progressRate = estimatedHours > 0 
      ? Math.round(((estimatedHours - remainingHours) / estimatedHours) * 100)
      : 0;

    // 2. 日付関連の取得
    const testReleaseDate = this.getCustomFieldValue(parent, config.customFields.releaseDate);
    const startDate = parent.startDate ? new Date(parent.startDate) : new Date(parent.created);
    const now = new Date();

    // 3. 工程別進捗の集約
    const phases = this.aggregatePhases(children);

    // 本番リリース待ち判定 (ステータスが 59 から始まる場合)
    const statusRaw = this.getCustomFieldValue(parent, config.customFields.status);
    let statusName = '';
    if (typeof statusRaw === 'object' && statusRaw !== null) {
      statusName = statusRaw.name || '';
    } else if (typeof statusRaw === 'string') {
      statusName = statusRaw;
    }
    const isWaitingForProduction = statusName.startsWith('59');

    // 営業日残日数の計算
    let availableDays = null;
    if (testReleaseDate) {
      availableDays = holidayLoader.getWorkingDaysCount(now, new Date(testReleaseDate));
    }

    // 4. リスク判定 (基本設計 9.5)
    const risk = this.evaluateRisk({
      estimatedHours,
      remainingHours,
      testReleaseDate,
      availableDays,
      startDate,
      now,
      isFinished: (parent.status.id === 4), // 完了ステータス
      isWaitingForProduction
    });

    return {
      issueKey: parent.issueKey,
      summary: parent.summary,
      assignee: parent.assignee ? parent.assignee.name : '未選択',
      testReleaseDate: testReleaseDate ? testReleaseDate.substring(0, 10) : null,
      availableDays,
      estimatedHours,
      actualHours,
      remainingHours: Math.round(remainingHours * 10) / 10,
      progressRate,
      riskLevel: risk.level,
      riskIcon: risk.icon,
      phases,
      isWaitingForProduction,
      backlogUrl: `https://${config.backlog.spaceId}.backlog.com/view/${parent.issueKey}`
    };
  }

  sumHours(parent, children, field) {
    const parentVal = parent[field] || 0;
    const childrenVal = children.reduce((sum, child) => sum + (child[field] || 0), 0);
    return parentVal + childrenVal;
  }

  calculateTotalRemainingHours(parent, children) {
    const allIssues = [parent, ...children];
    return allIssues.reduce((sum, issue) => {
      if (!issue.estimatedHours) return sum;

      const progressRaw = this.getCustomFieldValue(issue, config.customFields.progress);
      
      // 優先順位1: 進捗率カスタムフィールド
      if (progressRaw !== null) {
        let progressValue = progressRaw;
        // オブジェクト形式の場合は name プロパティから取得
        if (typeof progressValue === 'object' && progressValue !== null) {
          progressValue = progressValue.name;
        }
        
        const progress = parseFloat(progressValue);
        if (!isNaN(progress)) {
          return sum + (issue.estimatedHours * (1 - progress / 100));
        }
      }
      
      // 優先順位2: 実績工数
      if (issue.actualHours !== null && issue.actualHours !== undefined) {
        return sum + Math.max(0, issue.estimatedHours - issue.actualHours);
      }

      // 優先順位3: フォールバック (予定工数のまま)
      return sum + issue.estimatedHours;
    }, 0);
  }

  getCustomFieldValue(issue, fieldId) {
    const field = issue.customFields.find(cf => cf.id === parseInt(fieldId));
    return field ? field.value : null;
  }

  aggregatePhases(children) {
    const result = {
      detailDesign: { completed: 0, total: 0 },
      unitTestDesign: { completed: 0, total: 0 },
      manufacturing: { completed: 0, total: 0 },
      unitTestExecution: { completed: 0, total: 0 }
    };

    const keywords = [
      { key: 'detailDesign', regex: /詳細設計|Detail Design|DD/i },
      { key: 'unitTestDesign', regex: /単体テスト設計|UTD|UT設計/i },
      { key: 'manufacturing', regex: /製造|Coding|実装/i },
      { key: 'unitTestExecution', regex: /単体テスト実施|UT実施/i }
    ];

    children.forEach(child => {
      const target = keywords.find(k => k.regex.test(child.summary) || (child.issueType && k.regex.test(child.issueType.name)));
      if (target) {
        result[target.key].total++;
        if (child.status.id === 4) { // 完了
          result[target.key].completed++;
        }
      }
    });

    return result;
  }

  evaluateRisk(data) {
    const { estimatedHours, remainingHours, testReleaseDate, availableDays, startDate, now, isFinished, isWaitingForProduction } = data;

    // 全て完了している場合、または本番リリース待ちの場合
    if (isFinished || isWaitingForProduction) return { level: 'success', icon: '🟢' };

    // データ不備 (9.5.1)
    if (!testReleaseDate || remainingHours === null || estimatedHours <= 0) {
      return { level: 'check', icon: '⚠️' };
    }

    const releaseDate = new Date(testReleaseDate);
    
    // 軸1：納期余裕率 (9.5.2)
    const availableHours = availableDays * 8;
    const M = availableHours > 0 ? (availableHours - remainingHours) / availableHours : -1;
    
    let axis1Danger = (availableHours <= 0 || M < 0.10);
    let axis1Warning = (!axis1Danger && M < 0.20);

    // 軸2：進捗遅延率 (9.5.3)
    const totalWorkingDays = holidayLoader.getWorkingDaysCount(startDate, releaseDate);
    const elapsedDays = holidayLoader.getWorkingDaysCount(startDate, now);
    
    const E = totalWorkingDays > 0 ? (elapsedDays / totalWorkingDays) : 1;
    const P = 1 - (remainingHours / estimatedHours);
    const L = E - P;

    let axis2Danger = (L > 0.15);
    let axis2Warning = (!axis2Danger && L > 0.08);

    // 最終判定 (9.5.4)
    if (axis1Danger || axis2Danger) return { level: 'danger', icon: '🔴' };
    if (axis1Warning || axis2Warning) return { level: 'warning', icon: '🟡' };
    
    return { level: 'success', icon: '🟢' };
  }
}

module.exports = new ProgressCalc();

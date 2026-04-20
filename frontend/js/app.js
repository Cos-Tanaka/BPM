let allIssuesData = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('BPM Dashboard initialized');
    
    // Initial fetch
    fetchProgress();

    // Event listeners
    document.getElementById('refresh-btn').addEventListener('click', fetchProgress);
    document.getElementById('assignee-filter').addEventListener('change', applyFilters);
    document.getElementById('risk-filter').addEventListener('change', applyFilters);
});

async function fetchProgress() {
    const tbody = document.getElementById('issue-table-body');
    // Keep internal loading state
    
    try {
        const response = await fetch('/api/progress');
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            allIssuesData = data.data;
            populateAssigneeFilter(allIssuesData);
            applyFilters();
        } else {
            allIssuesData = [];
            tbody.innerHTML = '<tr><td colspan="8" class="loading">案件が見つかりませんでした。</td></tr>';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading" style="color:red">エラーが発生しました。バックエンドサーバを確認してください。</td></tr>';
    }
}

function populateAssigneeFilter(issues) {
    const assigneeFilter = document.getElementById('assignee-filter');
    const currentValue = assigneeFilter.value;
    
    // Extract unique assignees, exclude null/undefined, and sort alphabetically
    const assignees = [...new Set(issues.map(i => i.assignee).filter(Boolean))].sort();
    
    // Build options
    let optionsHtml = '<option value="all">すべて</option>';
    assignees.forEach(assignee => {
        optionsHtml += `<option value="${assignee}">${assignee}</option>`;
    });
    
    assigneeFilter.innerHTML = optionsHtml;
    
    // Restore previous selection if it still exists
    if (assignees.includes(currentValue)) {
        assigneeFilter.value = currentValue;
    }
}

function applyFilters() {
    const assigneeValue = document.getElementById('assignee-filter').value;
    const riskValue = document.getElementById('risk-filter').value;
    
    let filtered = allIssuesData;
    
    if (assigneeValue !== 'all') {
        filtered = filtered.filter(i => i.assignee === assigneeValue);
    }
    
    if (riskValue !== 'all') {
        if (riskValue === 'check') {
            filtered = filtered.filter(i => i.riskLevel === 'check' || i.riskLevel === 'warning'); // Customize if needed
        } else {
            filtered = filtered.filter(i => i.riskLevel === riskValue);
        }
    }
    
    renderTable(filtered);
}

function renderTable(issues) {
    const tbody = document.getElementById('issue-table-body');
    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">条件に一致する案件がありません。</td></tr>';
    } else {
        tbody.innerHTML = issues.map(issue => `
            <tr>
                <td><a href="${issue.backlogUrl}" target="_blank" class="issue-key">${issue.issueKey}</a></td>
                <td>${issue.summary}</td>
                <td>
                    <div class="date-cell">
                        ${issue.isWaitingForProduction 
                            ? '<span class="status-badge waiting">本番リリース待ち</span>'
                            : `<span>${issue.testReleaseDate ? issue.testReleaseDate.replace(/-/g, '/') : '—'}</span>
                               ${issue.availableDays !== null ? `<span class="days-badge ${issue.availableDays <= 0 ? 'danger' : ''}">残 ${issue.availableDays} 営業日</span>` : ''}`
                        }
                    </div>
                </td>
                <td>${issue.assignee || '未設定'}</td>
                <td>
                    <div class="hours-grid">
                        <div class="hour-item"><span class="label">予:</span><span class="value">${issue.estimatedHours || 0}</span><span class="unit">h</span></div>
                        <div class="hour-item"><span class="label">実:</span><span class="value">${issue.actualHours || 0}</span><span class="unit">h</span></div>
                        <div class="hour-item remaining"><span class="label">残:</span><span class="value">${issue.remainingHours || 0}</span><span class="unit">h</span></div>
                    </div>
                </td>
                <td>
                    <div class="progress-info">
                        <span class="progress-text">${issue.progressRate}%</span>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${issue.progressRate}%"></div>
                        </div>
                    </div>
                </td>
                <td>${window.renderPhaseStatus(issue.phases)}</td>
                <td>
                    <div class="risk-cell">
                        <span class="risk-badge risk-${issue.riskLevel}">${issue.riskIcon} ${issue.riskLevel.toUpperCase()}</span>
                        ${ (issue.marginRate !== null || issue.delayRate !== null) ? `
                            <div class="risk-details">
                                ${issue.marginRate !== null ? `<span>余裕: ${issue.marginRate}%</span>` : ''}
                                ${issue.delayRate !== null ? `<span>遅延: ${issue.delayRate}%</span>` : ''}
                                <div class="tooltip">
                                    <span class="tooltip-title">リスク指標の詳細と判定基準</span>
                                    <div class="tooltip-item">
                                        <span class="tooltip-label">■ 納期余裕率</span>
                                        <span class="tooltip-desc">予定日までの残り時間に対する残工数の余裕度です。
                                            <br>🔴危険: 10%未満 / 🟡注意: 20%未満</span>
                                    </div>
                                    <div class="tooltip-item">
                                        <span class="tooltip-label">■ 進捗遅延率</span>
                                        <span class="tooltip-desc">理想の進捗（経過日数比）に対する実際の進捗の遅れです。
                                            <br>🔴危険: 15%超 / 🟡注意: 8%超</span>
                                    </div>
                                </div>
                            </div>
                        ` : '' }
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateOverview(issues);
}

function updateOverview(issues) {
    const stats = {
        total: issues.length,
        danger: issues.filter(i => i.riskLevel === 'danger').length,
        warning: issues.filter(i => i.riskLevel === 'warning').length,
        success: issues.filter(i => i.riskLevel === 'success').length
    };

    const container = document.querySelector('.overview-stats');
    container.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">全案件</span>
            <span class="stat-value">${stats.total}</span>
        </div>
        <div class="stat-card danger">
            <span class="stat-label">🔴 危険</span>
            <span class="stat-value">${stats.danger}</span>
        </div>
        <div class="stat-card warning">
            <span class="stat-label">🟡 注意</span>
            <span class="stat-value">${stats.warning}</span>
        </div>
        <div class="stat-card success">
            <span class="stat-label">🟢 正常</span>
            <span class="stat-value">${stats.success}</span>
        </div>
    `;
}

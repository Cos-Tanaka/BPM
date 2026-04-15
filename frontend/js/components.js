function renderPhaseStatus(phases) {
    const keys = [
        { id: 'detailDesign', label: '詳細設計' },
        { id: 'unitTestDesign', label: '単テ設計' },
        { id: 'manufacturing', label: '製造' },
        { id: 'unitTestExecution', label: '単テ実施' }
    ];

    return `
        <div class="phase-grid">
            ${keys.map(k => {
                const phase = phases[k.id];
                const isComplete = phase.total > 0 && phase.completed === phase.total;
                const isEmpty = phase.total === 0;
                return `
                    <div class="phase-item ${isComplete ? 'complete' : ''} ${isEmpty ? 'empty' : ''}">
                        <span class="phase-label">${k.label}</span>
                        <span class="phase-count">${phase.completed}/${phase.total}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Global exposure
window.renderPhaseStatus = renderPhaseStatus;

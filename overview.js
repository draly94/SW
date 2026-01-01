// overview.js

const OVERVIEW_CSS = `
    .view-container {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        animation: fadeIn 0.5s ease-in-out;
    }

    .view-header {
        margin-bottom: var(--space-xl);
    }

    .view-header h1 {
        font-size: var(--font-lg);
        font-weight: 600;
        margin: 0;
        color: var(--primary);
    }

    .view-subtitle {
        font-size: var(--font-sm);
        opacity: 0.6;
        margin-top: var(--space-xs);
    }

    .content-card {
        background: var(--sidebar-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }

    .section-title {
        font-size: var(--font-xs);
        font-weight: 700;
        text-transform: uppercase;
        color: var(--accent);
    }
`;

export function renderOverviewView(state, el, injectStyles, t) {
    // Inject specific styles using the utility from your main file
    injectStyles('style-overview-view', OVERVIEW_CSS);

    const displayName = state.session.user.user_metadata?.display_name || state.session.user.email;

    // Wrap everything in a single 'div' node to satisfy the appendChild requirement
    return [el('div', { className: 'view-container' },
        el('div', { className: 'view-header' },
            el('h1', {}, t('overview', state.language)),
            el('p', { className: 'view-subtitle' }, `${t('overviewWelcome', state.language)}, ${displayName}`)
        ),
        el('div', { className: 'content-card' },
            el('div', { className: 'section-title' }, t('accountStatus', state.language)),
            el('p', { style: 'margin:0' }, t('workspaceActive', state.language))
        )
    )];
}

// overview.js
import { t } from './translations.js';
export function renderOverviewView(state, el) {
    // Access the display_name from user_metadata
    const displayName = state.session.user.user_metadata?.display_name || state.session.user.email;

    return [
        el('div', { className: 'view-header' },
            el('h1', {}, t('overview', state.language)),
            el('p', { className: 'view-subtitle' }, `${t('overviewWelcome', state.language)}, ${displayName}`)
        ),
        el('div', { className: 'content-card' },
            el('div', { className: 'section-title' }, 'Account Status'),
            el('p', { style: 'margin:0' }, 'Your workspace is active and synced.')
        )
    ];
}

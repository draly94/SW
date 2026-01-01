// Register Service Worker for PWA installation
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker registered'))
            .catch(err => console.error('[PWA] Registration failed:', err));
    });
}
import { initAuth } from './auth.js';
import { Icons } from './icons.js';
import { t } from './translations.js';
import { renderOverviewView } from './overview.js';
import { renderSettingsView } from './settings.js';
import { renderProfileView } from './profile.js';
import { renderStaffView } from './staff.js';
import { renderAddStaffView } from './addStaff.js';
import { renderEditPermissionsView } from './editPermissions.js';
import { renderInventoryView } from './inventory.js';
import { renderAddItemView } from './addInventoryItem.js';
import { renderPatientsView } from './patients.js';
import { renderNewPatientView } from './newPatient.js';
import { renderPatientFileView } from './patientFile.js';
import { renderPatientInfoView } from './patientInfo.js'; 
import { renderPatientAppointmentsView } from './patientAppointments.js';
import { renderAppointmentsView } from './appointments.js';
import { renderNewAppointmentView } from './newAppointment.js';

//------ Configuration ------
const SUPABASE_URL = 'https://ytsjknqlksyylfjkzmar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0c2prbnFsa3N5eWxmamt6bWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1ODUyODMsImV4cCI6MjA4MTE2MTI4M30.f-_DqejEjTLgVQQ5II4r1F1sadeZEhZRKTrw5B1T_6g';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById('app');

// Detection for Magic Link / Invitation
const isMagicLink = window.location.hash.includes('type=magiclink') || window.location.hash.includes('access_token=');

const state = {
    session: null,
    theme: localStorage.getItem('theme') || 'device',
    language: localStorage.getItem('lang') || (navigator.language.startsWith('ar') ? 'ar' : 'en'),
    currentView: 'overview',
    viewData: null,
    isLoading: isMagicLink,
    branches: [], 
    selectedBranchId: null,
    permissions: [], 
    error: null,
    toast: { message: '', type: 'success', visible: false },
    isMagicLink: isMagicLink, 
    isRegistration: false 
};

// --- Core Utilities ---

export function el(tag, props = {}, ...children) {
    const element = document.createElement(tag);
    if (props.className) element.className = props.className;
    Object.assign(element, props);
    children.forEach(child => {
        if (typeof child === 'string') element.appendChild(document.createTextNode(child));
        else if (child) element.appendChild(child);
    });
    return element;
}

export function can(resource, action) {
    if (!state.session || !state.selectedBranchId || !state.permissions) return false;
    return state.permissions.includes(`${resource}_${action}`);
}

/**
 * Checks if the currently selected branch has an expired subscription.
 */
function isSubscriptionExpired() {
    const currentBranch = state.branches.find(b => b.id === state.selectedBranchId);
    if (!currentBranch || !currentBranch.expiresAt) return false;
    // Compare current date to expiration date
    return new Date() > currentBranch.expiresAt;
}

export function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

export function renderCustomDropdown(options, selectedId, onSelect, placeholder = "Select...") {
    const selectedOption = options.find(opt => opt.id === selectedId);
    const container = el('div', { className: 'custom-select-wrapper' });
    const trigger = el('div', { 
        className: 'custom-select-trigger',
        onclick: (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-options.show').forEach(m => {
                if(m !== optionsMenu) m.classList.remove('show');
            });
            const isOpen = optionsMenu.classList.contains('show');
            optionsMenu.classList.toggle('show');
            if (!isOpen) {
                const closeMenu = (event) => {
                    if (!container.contains(event.target)) {
                        optionsMenu.classList.remove('show');
                        window.removeEventListener('click', closeMenu);
                    }
                };
                window.addEventListener('click', closeMenu);
            }
        },
        innerHTML: `<span>${selectedOption ? selectedOption.label : placeholder}</span> <span class="chevron">▾</span>`
    });

    const optionsMenu = el('div', { className: 'custom-options' });
    options.forEach(opt => {
        const item = el('div', {
            className: `custom-option ${opt.id === selectedId ? 'selected' : ''}`,
            onclick: (e) => {
                e.stopPropagation();
                onSelect(opt.id);
                optionsMenu.classList.remove('show');
            },
            textContent: opt.label
        });
        optionsMenu.appendChild(item);
    });
    container.appendChild(trigger);
    container.appendChild(optionsMenu);
    return container;
}

function applyTheme() {
    let themeToApply = state.theme;
    if (themeToApply === 'device') {
        themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', themeToApply);
}

function toggleSidebar(forceClose = false) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar || !overlay) return;
    if (window.innerWidth >= 1024 && !forceClose) return;
    const isOpen = sidebar.classList.contains('open');
    const shouldOpen = forceClose ? false : !isOpen;
    if (shouldOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function renderLoading() {
    return el('div', { className: 'loader-overlay' },
        el('div', { className: 'spinner' })
    );
}

export function showToast(message, type = 'success') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// --- Layout & Rendering ---

function initializeShell() {
    const currentBranch = state.branches.find(b => b.id === state.selectedBranchId);
    const displayTitle = currentBranch ? currentBranch.orgName : 'App Console';
    
    if (document.getElementById('layout-shell')) {
        const titleEl = document.querySelector('.header-title');
        if (titleEl) titleEl.textContent = displayTitle;
        const selectorContainer = document.getElementById('selector-container');
        if (selectorContainer) {
            selectorContainer.innerHTML = '';
            selectorContainer.appendChild(createBranchSelector());
        }
    } else {
        app.innerHTML = '';
        applyTheme();
        document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = state.language;
        const overlay = el('div', { id: 'overlay', onclick: () => toggleSidebar(true) });
        const menuBtn = el('button', { className: 'menu-toggle', onclick: (e) => { e.stopPropagation(); toggleSidebar(); }}, '≡');
        const header = el('header', { id: 'app-header' }, 
            menuBtn, 
            el('span', { className: 'header-title' }, displayTitle),
            el('div', { style: 'flex: 1' }),
            el('div', { id: 'selector-container' }, createBranchSelector())
        );
        const sidebar = el('aside', { id: 'sidebar' }, 
            el('div', { className: 'sidebar-content', id: 'sidebar-nav-container' })
        );
        const mainContainer = el('main', { id: 'main-content' });
        const toastEl = el('div', { id: 'global-toast', className: 'toast' });
        const shell = el('div', { id: 'layout-shell' }, overlay, sidebar, header, mainContainer, toastEl);
        app.appendChild(shell);
    }

    // Handle Expiration Warning
    const mainContent = document.getElementById('main-content');
    const existingWarning = document.getElementById('expiry-warning');
    if (existingWarning) existingWarning.remove();

    if (isSubscriptionExpired()) {
        const warningBanner = el('div', { 
            id: 'expiry-warning',
            className: 'warning-banner',
            style: 'background-color: #fee2e2; color: #991b1b; padding: 12px; text-align: center; border-bottom: 1px solid #f87171; font-weight: 600; font-size: 0.9rem; z-index: 10;'
        }, `⚠️ ${t('subscriptionExpiredWarning', state.language) || 'Subscription Expired. Please contact support.'}`);
        mainContent.prepend(warningBanner);
    }
}

function createBranchSelector() {
    const uniqueOrgCount = new Set(state.branches.map(b => b.orgName)).size;
    const options = state.branches.map(branch => ({
        id: branch.id,
        label: uniqueOrgCount > 1 ? `${branch.orgName} - ${branch.name}` : branch.name
    }));
    return renderCustomDropdown(
        options, 
        state.selectedBranchId, 
        (id) => {
            state.selectedBranchId = id;
            const activeBranch = state.branches.find(b => b.id === id);
            state.permissions = activeBranch ? activeBranch.permissions : [];
            renderDashboard();
        },
        t('selectBranch', state.language)
    );
}

function renderDashboard() {
    if (state.error) { renderErrorState(); return; }
    if (state.isLoading && !document.getElementById('layout-shell')) {
        app.innerHTML = '';
        applyTheme();
        app.appendChild(renderLoading());
        return; 
    }
    initializeShell();
    const mainContent = document.getElementById('main-content');
    const navContainer = document.getElementById('sidebar-nav-container');

    const primaryNav = [
        { id: 'overview', icon: Icons.overview(), label: t('overview', state.language), visible: true },
        { id: 'patients', icon: Icons.patients(), label: t('patients', state.language), views: ['patients', 'new-patient', 'patient-file', 'patient-info'] , visible: can('pat', 'r')},
        { id: 'appointments', icon: Icons.appointments(), label: t('appointments', state.language) , visible: can('apt', 'r')},
        { id: 'staff', icon: Icons.staff(), label: t('staff', state.language) , visible: can('staff', 'r')},
        { id: 'inventory', icon: Icons.inventory(), label: t('inventory', state.language), views: ['inventory', 'add-inventory-item'] , visible: can('inv', 'r') }
    ];
    const secondaryNav = [
        { id: 'profile', icon: Icons.profile(), label: t('profile', state.language) },
        { id: 'settings', icon: Icons.settings(), label: t('settings', state.language) }
    ];

    navContainer.innerHTML = '';
    navContainer.appendChild(el('div', { className: 'sidebar-header' }, t('workspace', state.language)));
    const navGroup = el('nav', { className: 'nav-group' });
    const createNavItem = (item) => {
        const isActive = state.currentView === item.id || (item.views && item.views.includes(state.currentView));
        return el('div', {
            className: `nav-item ${isActive ? 'active' : ''}`,
            onclick: () => { navigateTo(item.id); toggleSidebar(true); },
            innerHTML: `${item.icon} <span>${item.label}</span>`
        });
    };
    primaryNav.filter(item => item.visible !== false) .forEach(item => navGroup.appendChild(createNavItem(item)));
    navGroup.appendChild(el('div', { style: 'flex: 1' }));
    secondaryNav.forEach(item => navGroup.appendChild(createNavItem(item)));
    navGroup.appendChild(el('button', { 
        className: 'nav-item signout-item',
        onclick: handleSignOut,
        innerHTML: `${Icons.logout()} <span>${t('signout', state.language)}</span>`
    }));
    navContainer.appendChild(navGroup);

    // Filter out previous view contents, but keep the warning banner if it exists
    const viewContainer = el('div', { className: 'view-container' });
    const viewRoutes = {
        'settings': () => renderSettingsView(state, el, applyTheme, supabaseClient, showToast),
        'profile': () => renderProfileView(state, el, supabaseClient, showToast, injectStyles, t),
        'staff': () => renderStaffView(state, el, supabaseClient, navigateTo),
        'add-staff': () => renderAddStaffView(state, el, supabaseClient, () => navigateTo('staff')),
        'edit-permissions': () => renderEditPermissionsView(state, el, supabaseClient, navigateTo, showToast, t),
        'inventory': () => renderInventoryView(state, el, supabaseClient, showToast, navigateTo),
        'add-inventory-item': () => renderAddItemView(state, el, supabaseClient, showToast, () => navigateTo('inventory')),
        'patients': () => renderPatientsView(state, el, supabaseClient, navigateTo, injectStyles, t),
        'new-patient': () => renderNewPatientView(state, el, supabaseClient, () => navigateTo('patients')),
        'patient-file': () => renderPatientFileView(state, el, supabaseClient, () => navigateTo('patients'), navigateTo, injectStyles, t),
        'patient-info': () => renderPatientInfoView(state, el, supabaseClient, () => window.history.back(),showToast, injectStyles, t),
        'patient-appointments': () => renderPatientAppointmentsView(state.viewData, el, supabaseClient, () => window.history.back()),
        'appointments': () => renderAppointmentsView(state, el, supabaseClient, navigateTo),
        'new-appointment': () => renderNewAppointmentView(state, el, supabaseClient, () => navigateTo('appointments'), state.viewData)
    };
    
    const renderFn = viewRoutes[state.currentView] || (() => renderOverviewView(state, el, injectStyles, t));
    
    // Clear everything EXCEPT the warning banner
    const warning = document.getElementById('expiry-warning');
    mainContent.innerHTML = '';
    if (warning) mainContent.appendChild(warning);
    
    viewContainer.append(...renderFn());
    mainContent.appendChild(viewContainer);
    if (state.isLoading) mainContent.appendChild(renderLoading());
}

function renderErrorState() {
    app.innerHTML = '';
    applyTheme();
    app.appendChild(el('div', { className: 'auth-container' },
        el('div', { className: 'auth-card', style: 'text-align: center;' },
            el('div', { style: 'font-size: 3rem;' }, '📡'),
            el('h2', { className: 'auth-header' }, t('connectionErrorTitle', state.language)),
            el('button', { className: 'primary-btn', onclick: () => loadAppData(state.session.user.id) }, t('connectionErrorBtn', state.language))
        )
    ));
}

// --- Logic & Events ---

function navigateTo(viewName, data = null) {
    const guards = {
        'add-inventory-item': () => can('inv', 'c'),
        'add-staff': () => can('staff', 'c'),
        'new-patient': () => can('pat', 'c'),
        'new-appointment': () => can('apt', 'c')
    };

    if (guards[viewName] && !guards[viewName]()) {
        showToast(t('unauthorized', state.language), 'error');
        return;
    }

    state.currentView = viewName;
    state.viewData = data;
    history.pushState({ view: viewName, data: data }, '', `#${viewName}`);
    renderDashboard();
}

async function handleSignOut() {
    state.isLoading = true;
    renderDashboard(); 
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Error signing out:", error.message);
        state.isLoading = false;
        renderDashboard();
    } else {
        state.session = null;
        state.permissions = []; 
        state.isLoading = false;
        window.location.href = window.location.origin + window.location.pathname;
    }
}

const loadAppData = async (userId, attempt = 1) => {
    state.isLoading = true;
    state.error = null;
    renderDashboard(); 
    try {
        const userEmail = state.session?.user?.email;
        if (userEmail) {
            let { data, error } = await supabaseClient.rpc('claim_invitation', {
                target_user_id: userId,
                target_email: userEmail
            });
            if (error) console.error("RPC Error:", error.message);
        }
        
        const branches = await fetchUserBranches(userId);
        state.branches = branches;
        
        if (branches.length > 0) {
            if (!state.selectedBranchId) {
                state.selectedBranchId = branches[0].id;
            }
            const activeBranch = branches.find(b => b.id === state.selectedBranchId);
            state.permissions = activeBranch ? activeBranch.permissions : [];
        }

    } catch (err) {
        console.error("App data load error:", err);
        if (attempt < 5) return loadAppData(userId, attempt + 1);
        state.error = 'connection_timeout';
    } finally {
        state.isLoading = false;
        renderDashboard();
    }
};

async function fetchUserBranches(userId) {
    const { data, error } = await supabaseClient
        .from('user_branches')
        .select(`
            *, 
            org_branches(
                branch_name, 
                organizations(
                    name
                )
            )
        `)
        .eq('user_id', userId);

    if (error) throw error;

    return (data || []).filter(i => i.org_branches).map(row => {
        // 1. Destructure ALL non-permission columns shown in your schema image
        const { 
            id,
            user_id, 
            branch_id, 
            role, 
            created_by, 
            created_at, 
            subscription_expires_at, 
            org_branches,
            ...permissionsFields 
        } = row;
        
        // 2. Map the remaining boolean fields (pat_r, apt_c, etc.)
        const activePermissions = Object.keys(permissionsFields)
            .filter(key => permissionsFields[key] === true);

        return {
            id: branch_id,
            role: role, // You can now use state.branches[0].role in your UI
            name: org_branches.branch_name,
            orgName: org_branches.organizations?.name || 'App Console',
            joinedAt: new Date(created_at),
            expiresAt: subscription_expires_at ? new Date(subscription_expires_at) : null,
            permissions: activePermissions 
        };
    }).sort((a, b) => a.joinedAt - b.joinedAt);
}


async function subscribeToPush() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        const sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BHgvMYmv0t0zKzjjclSMGbBlOWkjRsnyRcnwHhWNvhXS-e53vC3HODRONy2qNvMZmHcSVDZb6FM5VVRgQdZoV0A'
        });
        const subJSON = JSON.parse(JSON.stringify(sub));
        const { data: existing } = await supabaseClient.from('user_subscriptions').select('id').eq('subscription_json->>endpoint', subJSON.endpoint).maybeSingle();
        if (!existing) {
            await supabaseClient.from('user_subscriptions').insert({ user_id: state.session.user.id, subscription_json: subJSON });
        }
    }
}

const auth = initAuth(state, el, applyTheme, supabaseClient, loadAppData, navigateTo, showToast, injectStyles, t);

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    if (session) {
        if (state.isMagicLink || event === 'PASSWORD_RECOVERY') {
            state.isRegistration = true;
            state.isMagicLink = false;
            state.isLoading = false;
            auth.renderRegistration();
        } 
        else if (state.isRegistration) {
            auth.renderRegistration();
        }
        else {
            loadAppData(session.user.id);
            subscribeToPush();
        }
    } else {
        state.isLoading = false;
        auth.renderLogin();
    }
});

window.addEventListener('popstate', (e) => {
    if (e.state) {
        state.currentView = e.state.view || 'overview';
        state.viewData = e.state.data || null;
    }
    renderDashboard();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'device') applyTheme();
});

window.addEventListener('beforeunload', (e) => {
    if (state.isRegistration) {
        e.preventDefault();
        e.returnValue = ''; 
    }
});

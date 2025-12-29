// Register Service Worker for PWA installation
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Updated path for GitHub Pages subfolder
        navigator.serviceWorker.register('/SW/sw.js')
            .then(reg => console.log('[PWA] Service Worker registered'))
            .catch(err => console.error('[PWA] Registration failed:', err));
    });
}


import { Icons } from './icons.js';
import { t } from './translations.js';
import { renderOverviewView } from './overview.js';
import { renderSettingsView } from './settings.js';
import { renderProfileView } from './profile.js';
import { renderStaffView } from './staff.js';
import { renderAddStaffView } from './addStaff.js';
import { renderInventoryView } from './inventory.js';
import { renderAddItemView } from './addInventoryItem.js';
import { renderPatientsView } from './patients.js';
import { renderNewPatientView } from './newPatient.js';
import { renderPatientFileView } from './patientFile.js';
import { renderPatientInfoView } from './patientInfo.js'; 
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
    error: null,
    toast: { message: '', type: 'success', visible: false },
    isMagicLink: isMagicLink, // Store this to control UI visibility
    isRegistration: false // Changed: Do not force registration view immediately
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
/**
 * Checks if the current user has a specific permission for a resource in the selected branch.
 * @param {string} resource - The resource key (e.g., 'apt', 'inv', 'pat')
 * @param {string} action - The action character (e.g., 'c', 'r', 'u', 'd')
 * @returns {boolean}
 */
export function can(resource, action) {
    if (!state.session || !state.selectedBranchId) return false;

    const branchPerms = state.session.user.app_metadata?.branch_perms?.[state.selectedBranchId];
    
    if (!branchPerms) return false;

    // 1. Check if the branch access is expired
    const expiryDate = new Date(branchPerms.e);
    if (expiryDate < new Date()) {
        console.warn("Branch access expired");
        return false;
    }

    // 2. Check the permission string inside the 'p' object
    const permissions = branchPerms.p?.[resource] || '';
    return permissions.includes(action);
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
        return;
    }
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

    mainContent.innerHTML = '';
    const viewContainer = el('div', { className: 'view-container' });
    const viewRoutes = {
        'settings': () => renderSettingsView(state, el, applyTheme, supabaseClient, showToast),
        'profile': () => renderProfileView(state.session, el, supabaseClient, showToast),
        'staff': () => renderStaffView(state, el, supabaseClient, navigateTo),
        'add-staff': () => renderAddStaffView(state, el, supabaseClient, () => navigateTo('staff')),
        'inventory': () => renderInventoryView(state, el, supabaseClient, showToast, navigateTo),
        'add-inventory-item': () => renderAddItemView(state, el, supabaseClient, showToast, () => navigateTo('inventory')),
        'patients': () => renderPatientsView(state, el, supabaseClient, navigateTo),
        'new-patient': () => renderNewPatientView(state, el, supabaseClient, () => navigateTo('patients')),
        'patient-file': () => renderPatientFileView(state.viewData, el, supabaseClient, () => navigateTo('patients'), navigateTo),
        'patient-info': () => renderPatientInfoView(state.viewData, el, supabaseClient, () => window.history.back()),
        'appointments': () => renderAppointmentsView(state, el, supabaseClient, navigateTo),
        'new-appointment': () => renderNewAppointmentView(state, el, supabaseClient, () => navigateTo('appointments'), state.viewData)
    };
    const renderFn = viewRoutes[state.currentView] || (() => renderOverviewView(state, el));
    viewContainer.append(...renderFn());
    mainContent.appendChild(viewContainer);
    if (state.isLoading) mainContent.appendChild(renderLoading());
}

// --- Auth & Error States ---

function renderLogin() {
    // If the user manually triggered registration flow, show that
    if (state.isRegistration) {
        renderRegistration();
        return;
    }
    app.innerHTML = '';
    applyTheme();
    document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
    const emailInp = el('input', { type: 'email', placeholder: 'Email' });
    const passInp = el('input', { type: 'password', placeholder: 'Password' });
    const handleLogin = async () => {
        if (state.isLoading) return;
        state.isLoading = true;
        renderLogin(); 
        const { error } = await supabaseClient.auth.signInWithPassword({ email: emailInp.value, password: passInp.value });
        if (error) { state.isLoading = false; renderLogin(); alert(error.message); }
    };
    
    const loginCard = el('div', { className: 'auth-card' },
        el('h2', { className: 'auth-header' }, 'Sign In'),
        emailInp, passInp,
        el('button', { className: 'primary-btn', onclick: handleLogin }, state.isLoading ? 'Signing in...' : 'Continue')
    );

    // Only show registration option if accessing via Magic Link / Invite
    if (state.isMagicLink) {
        const registerLink = el('div', { 
            style: 'margin-top: 20px; text-align: center; font-size: 0.9rem; color: var(--text-secondary);' 
        }, 
            'Need to set up your account? ',
            el('button', { 
                style: 'background:none; border:none; color:var(--primary-color); cursor:pointer; font-weight:bold; padding:0;',
                onclick: () => {
                    state.isRegistration = true;
                    renderRegistration();
                }
            }, 'Register Here')
        );
        loginCard.appendChild(registerLink);
    }

    app.appendChild(el('div', { className: 'auth-container' }, loginCard));
}

function renderRegistration() {
    app.innerHTML = '';
    applyTheme();
    
    const passInp = el('input', { type: 'password', placeholder: 'New Password' });
    const confirmPassInp = el('input', { type: 'password', placeholder: 'Confirm Password' });
    
    const handleRegistration = async () => {
        const password = passInp.value;
        const confirm = confirmPassInp.value;

        if (!password || !confirm) {
            return alert("Please fill in both password fields.");
        }
        if (password !== confirm) {
            return alert("Passwords do not match.");
        }
        if (password.length < 6) {
            return alert("Password must be at least 6 characters.");
        }

        state.isLoading = true;
        renderRegistration(); 

        const { data, error } = await supabaseClient.auth.updateUser({ 
            password: password
        });

        if (error) {
            state.isLoading = false; 
            renderRegistration(); 
            alert(error.message); 
        } else {
            state.isLoading = false; 
            state.isRegistration = false; 
            
            // 1. First, fetch the necessary app data (branches, etc.)
            await loadAppData(state.session.user.id);
            
            // 2. Override the default view to 'profile' immediately after loading
            navigateTo('profile');
            
            showToast("Password set successfully. Please complete your profile.");
        }
    };

    app.appendChild(el('div', { className: 'auth-container' }, 
        el('div', { className: 'auth-card' },
            el('h2', { className: 'auth-header' }, 'Set Your Password'),
            el('p', { style: 'margin-bottom: 20px; color: var(--text-secondary); font-size: 0.9rem;' }, 
                'Create a password to secure your account.'
            ),
            passInp, 
            confirmPassInp,
            el('button', { className: 'primary-btn', onclick: handleRegistration }, 
                state.isLoading ? 'Updating...' : 'Set Password'
            ),
        )
    ));
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
    // Define required permissions for specific routes
    const guards = {
        'add-inventory-item': () => can('inv', 'c'),
        'add-staff': () => can('staff', 'c'),
        'new-patient': () => can('pat', 'c'),
        'new-appointment': () => can('apt', 'c')
    };

    // If a guard exists for this view and it returns false, block navigation
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
    renderDashboard(); // Show loading spinner
    
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
        console.error("Error signing out:", error.message);
        state.isLoading = false;
        renderDashboard();
    } else {
        // Clear local cache/state and force go to login
        state.session = null;
        state.isLoading = false;
        
        // This is the most reliable way to clear PWA state on logout:
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
        if (branches.length > 0 && !state.selectedBranchId) {
            state.selectedBranchId = branches[0].id;
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
            branch_id, 
            org_branches(
                branch_name, 
                created_at,
                organizations(name)
            )
        `)
        .eq('user_id', userId);
    if (error) throw error;
    return (data || []).filter(i => i.org_branches).map(i => ({
        id: i.branch_id,
        name: i.org_branches.branch_name,
        orgName: i.org_branches.organizations?.name || 'App Console',
        createdAt: new Date(i.org_branches.created_at)
    })).sort((a, b) => a.createdAt - b.createdAt);
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

async function unsubscribeUser() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await supabaseClient.from('user_subscriptions').delete().eq('subscription_json->>endpoint', subscription.endpoint);
        await subscription.unsubscribe();
    }
}

// --- Lifecycle ---

// app.js - Update the lifecycle listener
// app.js
// app.js - Optimized Lifecycle
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    state.session = session;

    if (session) {
        // If we detected a magic link hash or the event is a password recovery/signup
        // we force the registration state to true
        if (state.isMagicLink || event === 'PASSWORD_RECOVERY') {
            state.isRegistration = true;
            state.isMagicLink = false; // Clear it so it doesn't loop
            state.isLoading = false;
            renderRegistration();
        } 
        else if (state.isRegistration) {
            // Safety check if state was already set
            renderRegistration();
        }
        else {
            // Normal login flow
            loadAppData(session.user.id);
            subscribeToPush();
        }
    } else {
        state.isLoading = false;
        renderLogin();
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
// Prevent accidental navigation/closing during registration
window.addEventListener('beforeunload', (e) => {
    if (state.isRegistration) {
        // Standard way to trigger the browser's confirmation dialog
        e.preventDefault();
        e.returnValue = ''; 
    }
});

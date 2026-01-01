// auth.js

/**
 * AUTH MODULE STYLES
 * Powered by Global CSS Variables from style.css
 */
const authStyles = `
    .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: var(--bg);
        padding: var(--space-lg);
    }

    .auth-card {
        width: 100%;
        max-width: var(--input-max-width);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        padding: var(--space-xl);
        background: var(--sidebar-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: var(--auth-card-shadow);
        animation: fadeIn 0.4s ease-out;
    }

    .auth-header {
        font-weight: 700;
        font-size: var(--font-lg);
        text-align: center;
        margin: 0;
        color: var(--primary);
        letter-spacing: -0.5px;
    }

    .auth-subtitle {
        margin: -8px 0 var(--space-sm) 0;
        color: var(--accent);
        font-size: var(--font-sm);
        text-align: center;
        line-height: 1.4;
    }

    .auth-footer-text {
        margin-top: var(--space-md);
        text-align: center;
        font-size: var(--font-sm);
        color: var(--accent);
        border-top: 1px solid var(--border);
        padding-top: var(--space-lg);
    }

    .auth-link-btn {
        background: none;
        border: none;
        color: var(--primary);
        cursor: pointer;
        font-weight: 700;
        padding: 0;
        font-size: inherit;
        text-decoration: underline;
        margin-inline-start: var(--space-xs);
        transition: opacity var(--transition-speed);
    }

    .auth-link-btn:hover {
        opacity: 0.7;
    }

    /* Target inputs inside auth card specifically */
    .auth-card .form-input {
        height: 42px;
        background: var(--bg);
    }
`;

export function initAuth(state, el, applyTheme, supabaseClient, loadAppData, navigateTo, showToast, injectStyles, t) {
    
    injectStyles('auth-module-styles', authStyles);

    function renderLogin() {
        if (state.isRegistration) {
            renderRegistration();
            return;
        }
        const app = document.getElementById('app');
        app.innerHTML = '';
        applyTheme();
        document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';

        const emailInp = el('input', { 
            type: 'email', 
            placeholder: t('email', state.language), 
            className: 'form-input' 
        });
        const passInp = el('input', { 
            type: 'password', 
            placeholder: t('password', state.language), 
            className: 'form-input' 
        });
        
        const handleLogin = async () => {
            if (state.isLoading) return;
            state.isLoading = true;
            renderLogin(); 
            const { error } = await supabaseClient.auth.signInWithPassword({ 
                email: emailInp.value, 
                password: passInp.value 
            });
            if (error) { 
                state.isLoading = false; 
                renderLogin(); 
                showToast(error.message, 'error'); 
            }
        };
        
        const loginCard = el('div', { className: 'auth-card' },
            el('h2', { className: 'auth-header' }, t('signin', state.language)),
            emailInp, 
            passInp,
            el('button', { 
                className: 'primary-btn', 
                style: 'margin-top: var(--space-sm)',
                onclick: handleLogin 
            }, 
                state.isLoading ? t('signingIn', state.language) : t('continue', state.language)
            )
        );

        // Footer for registration/magic link
        if (state.isMagicLink) {
            loginCard.appendChild(
                el('div', { className: 'auth-footer-text' }, 
                    t('needAccount', state.language),
                    el('button', { 
                        className: 'auth-link-btn',
                        onclick: () => {
                            state.isRegistration = true;
                            renderRegistration();
                        }
                    }, t('registerHere', state.language))
                )
            );
        }

        app.appendChild(el('div', { className: 'auth-container' }, loginCard));
    }

    function renderRegistration() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        applyTheme();
        
        const passInp = el('input', { type: 'password', placeholder: t('newPassword', state.language), className: 'form-input' });
        const confirmPassInp = el('input', { type: 'password', placeholder: t('confirmPassword', state.language), className: 'form-input' });
        
        const handleRegistration = async () => {
            const password = passInp.value;
            const confirm = confirmPassInp.value;

            if (!password || !confirm) return showToast(t('fillAllFields', state.language), 'error');
            if (password !== confirm) return showToast(t('passMismatch', state.language), 'error');
            if (password.length < 6) return showToast(t('passTooShort', state.language), 'error');

            state.isLoading = true;
            renderRegistration(); 

            const { error } = await supabaseClient.auth.updateUser({ password: password });

            if (error) {
                state.isLoading = false; 
                renderRegistration(); 
                showToast(error.message, 'error'); 
            } else {
                state.isLoading = false; 
                state.isRegistration = false; 
                await loadAppData(state.session.user.id);
                navigateTo('profile');
                showToast(t('passSetSuccess', state.language), 'success');
            }
        };

        app.appendChild(el('div', { className: 'auth-container' }, 
            el('div', { className: 'auth-card' },
                el('h2', { className: 'auth-header' }, t('setPassTitle', state.language)),
                el('p', { className: 'auth-subtitle' }, t('setPassSubtitle', state.language)),
                passInp, 
                confirmPassInp,
                el('button', { 
                    className: 'primary-btn', 
                    style: 'margin-top: var(--space-sm)',
                    onclick: handleRegistration 
                }, 
                    state.isLoading ? t('updating', state.language) : t('setPassBtn', state.language)
                ),
            )
        ));
    }

    return { renderLogin, renderRegistration };
}

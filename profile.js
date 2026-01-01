// profile.js

export function renderProfileView(state, el, supabaseClient, showToast, injectStyles, t) {
    const user = state.session.user;
    // Extract current language from state
    const lang = state.language;

    // 1. Inject Component-Specific Styles
    injectStyles('profile-view-styles', `
  .profile-container {
        max-width: 600px;
        margin: 0 auto;
    }
    .profile-form-card {
        margin-top: var(--space-lg);
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        margin-bottom: var(--space-lg);
    }
    .form-label {
        font-size: var(--font-xs);
        font-weight: 700;
        text-transform: uppercase;
        color: var(--accent);
    }
    .form-input {
        width: 100%;
        max-width: 100% !important;
        padding: 10px var(--space-md);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: var(--font-base);
        color: var(--text);
        transition: border-color 0.2s;
    }
        .form-input:focus {
            border-color: var(--primary);
            outline: none;
        }
        .readonly-input {
            opacity: 0.7;
            cursor: not-allowed;
            background: var(--overlay);
        }
        .profile-footer {
            margin-top: 24px;
        }
    `);

    // 2. Define Inputs with localized loading placeholders
    const inputs = {
        name: el('input', { 
            type: 'text', 
            placeholder: t('loadingName', lang), 
            className: 'form-input' 
        }),
        email: el('input', { 
            type: 'email', 
            value: user.email, 
            className: 'form-input readonly-input', 
            readOnly: true 
        }),
        phone: el('input', { 
            type: 'tel', 
            placeholder: t('loadingPhone', lang), 
            className: 'form-input' 
        })
    };

    // 3. Data Fetching Logic
    supabaseClient
        .from('profiles')
        .select('name, email, phone')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
            // Update placeholders to standard input prompts after load using state.language
            inputs.name.placeholder = t('namePlaceholder', lang);
            inputs.phone.placeholder = t('phonePlaceholder', lang);

            if (!error && data) {
                inputs.name.value = data.name || '';
                inputs.phone.value = data.phone || '';
            } else {
                inputs.name.value = '';
                inputs.phone.value = '';
            }
        });

    // 4. Update Handler
    const handleUpdate = async (e) => {
        const btn = e.target;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = t('updating', lang);

        try {
            const { error: dbError } = await supabaseClient
                .from('profiles')
                .upsert({
                    user_id: user.id,
                    name: inputs.name.value,
                    email: user.email,
                    phone: inputs.phone.value
                });

            if (dbError) throw dbError;
            showToast(t('updateSuccess', lang));

        } catch (err) {
            showToast(err.message || t('updateError', lang), 'error');
            console.error('Update Error:', err);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };

    // 5. Build and Return UI
    return [
        el('div', { className: 'view-header' },
            el('div', {},
                el('h1', {}, t('profileTitle', lang)),
                el('p', { className: 'view-subtitle' }, t('profileSubtitle', lang))
            )
        ),
        el('div', { className: 'profile-container' },
            el('div', { className: 'content-card profile-form-card' },
                el('div', { className: 'section-title' }, t('accountDetails', lang)),
                
                el('div', { className: 'form-group' },
                    el('label', { className: 'form-label' }, t('fullName', lang)),
                    inputs.name
                ),
                el('div', { className: 'form-group' },
                    el('label', { className: 'form-label' }, t('emailAddress', lang)),
                    inputs.email
                ),
                el('div', { className: 'form-group' },
                    el('label', { className: 'form-label' }, t('phoneNumber', lang)),
                    inputs.phone
                ),

                el('div', { className: 'profile-footer' },
                    el('button', { 
                        className: 'primary-btn', 
                        style: 'width: 100%;',
                        onclick: handleUpdate 
                    }, t('saveChanges', lang))
                )
            )
        )
    ];
}

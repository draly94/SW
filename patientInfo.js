/**
 * Patient Information View Module
 */

export function renderPatientInfoView(state, el, supabaseClient, onComplete, showToast, injectStyles, t) {
    const patientId = state.viewData;
    // 1. Inject view-specific styles
    injectStyles('patient-info-view-styles', `
        .info-form-container {
            display: flex;
            flex-direction: column;
            gap: var(--space-xl);
        }
        .info-field-label {
            display: block;
            margin-bottom: var(--space-xs);
            color: var(--accent);
            font-size: var(--font-xs);
            text-transform: uppercase;
            font-weight: 700;
        }
        .info-field-value {
            font-weight: 500;
            color: var(--text);
            padding: var(--space-xs) 0;
        }
        .info-actions {
            display: flex;
            gap: var(--space-md);
            margin-top: var(--space-md);
        }
        .info-actions button {
            flex: 1;
        }
    `);

    const container = el('div', { className: 'view-container' });
    
    let patient = null;
    let isEditing = false;
    let internalLoading = false;

    // Helper to mask sensitive data
    const mask = (value, isSensitive) => {
        if (!value) return t('notProvided', state.language);
        if (!isSensitive) return value;
        return value.length > 4 ? `****${value.slice(-4)}` : '****';
    };

    const render = () => {
        container.innerHTML = '';
        
        if (!patient) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; opacity: 0.6;">${t('loadingPatientInfo', state.language)}</div>`;
            return;
        }

        const header = el('div', { className: 'view-header', style: 'margin-bottom: var(--space-lg);' },
            el('h2', {}, isEditing ? t('editPatientDetails', state.language) : t('patientInformation', state.language)),
            el('p', { className: 'view-subtitle' }, `${t('manageDataFor', state.language)} ${patient.name || t('patient', state.language)}`)
        );

        const fields = [
            { label: 'fullName', key: 'name', sensitive: false },
            { label: 'dob', key: 'dob', sensitive: false },
            { label: 'phoneNumber', key: 'phone', sensitive: true },
            { label: 'address', key: 'address', sensitive: true },
            { label: 'nationalId', key: 'gov_id', sensitive: true }
        ];

        const form = el('div', { className: 'content-card info-form-container' },
            ...fields.map(field => el('div', { className: 'form-group' },
                el('label', { className: 'info-field-label' }, t(field.label, state.language)),
                isEditing 
                    ? el('input', { 
                        type: 'text', 
                        className: 'form-input', 
                        value: patient[field.key] || '', 
                        oninput: (e) => { patient[field.key] = e.target.value; } 
                      })
                    : el('div', { className: 'info-field-value' }, mask(patient[field.key], field.sensitive))
            ))
        );

        const actions = el('div', { className: 'info-actions' },
            isEditing ? el('button', { 
                className: 'primary-btn', 
                disabled: internalLoading,
                onclick: async () => {
                    internalLoading = true;
                    render();

                    try {
                        const { error } = await supabaseClient
                            .from('patients')
                            .update({ 
                                name: patient.name, 
                                phone: patient.phone, 
                                address: patient.address,
                                dob: patient.dob,
                                gov_id: patient.gov_id 
                            })
                            .eq('id', patientId);

                        if (error) throw error;

                        showToast(t('updateSuccess', state.language));
                        isEditing = false;
                    } catch (err) {
                        showToast(err.message, 'error');
                    } finally {
                        internalLoading = false;
                        render();
                    }
                }
            }, internalLoading ? t('saving', state.language) : t('saveChanges', state.language))
            : el('button', { 
                className: 'primary-btn', 
                onclick: () => { isEditing = true; render(); } 
            }, t('editDetails', state.language))
        );

        container.append(header, form, actions);
        
        if (internalLoading) {
            container.appendChild(el('div', { className: 'loader-overlay' }, el('div', { className: 'spinner' })));
        }
    };

    const fetchPatientData = async () => {
        const { data, error } = await supabaseClient
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();
        
        if (error) {
            showToast(t('errorLoadingPatient', state.language), 'error');
            container.innerHTML = `<div class="content-card">${t('failedToLoadRecord', state.language)}</div>`;
        } else {
            patient = data;
            render();
        }
    };

    fetchPatientData();
    return [container];
}

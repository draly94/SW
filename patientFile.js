import { Icons } from './icons.js';
import { can } from './app.js';

export function renderPatientFileView(state, el, supabaseClient, onBack, navigateTo, injectStyles, t) {
    const patientId = state.viewData;
    // Inject view-specific styles
    injectStyles('patient-file-view-styles', `
        .patient-file-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
        }
        .header-actions {
            display: flex;
            gap: var(--space-lg);
            padding-top: var(--space-sm);
        }
        .action-icon {
            cursor: pointer;
            display: flex;
            transition: transform var(--transition-speed);
        }
        .action-icon:hover {
            transform: scale(1.1);
        }
        .back-btn-container {
            margin-top: var(--space-lg);
            width: 100%;
        }
        .full-width-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
        }
    `);

    const container = el('div', { className: 'view-container' });
    
    if (!patientId) {
        container.append(el('div', { className: 'content-card' }, t('noPatientSelected', state.language)));
        return [container];
    }

    const loadData = async () => {
        container.innerHTML = `<div style="text-align: center; padding: 40px; opacity: 0.6;">${t('loadingPatientFile', state.language)}</div>`;
        
        const { data: patient, error } = await supabaseClient
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error || !patient) {
            container.innerHTML = `<div class="content-card">${t('errorLoadingPatient', state.language)}</div>`;
            return;
        }

        container.innerHTML = ''; 

        const calculateAge = (dobString) => {
            if (!dobString) return t('na', state.language);
            const birthDate = new Date(dobString);
            return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
        };

        const cleanPhone = patient.phone ? patient.phone.replace(/\D/g, '') : '';

        const header = el('div', { className: 'view-header', style: 'margin-bottom: var(--space-sm);' },
            el('div', { className: 'patient-file-header' },
                el('div', {},
                    el('h1', {}, patient.name),
                    el('p', { className: 'view-subtitle' }, 
                        `${patient.id} • ${calculateAge(patient.dob)} ${t('yearsOld', state.language)} • ${patient.dob || t('noDob', state.language)}`
                    )
                ),
                can('pat', 'c') ? el('div', { className: 'header-actions' },
                    patient.phone ? el('span', { 
                        className: 'action-icon',
                        onclick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank'),
                        innerHTML: Icons.whatsapp(24)
                    }) : null,
                    patient.phone ? el('span', { 
                        className: 'action-icon',
                        style: 'color: var(--primary);', 
                        onclick: () => window.location.href = `tel:${cleanPhone}`,
                        innerHTML: Icons.phone(24)
                    }) : null
                ) : null
            )
        );

        const actionButtons = [
            { key: 'information', icon: Icons.info(24), onclick: () => navigateTo('patient-info', patient.id) },
            { key: 'appointments', icon: Icons.appointments(24), onclick: () => navigateTo('patient-appointments', patient.id)  },
            { key: 'procedures', icon: Icons.procedure(24), onclick: () => {} },
            { key: 'labOrders', icon: Icons.lab(24), onclick: () => {} },
            { key: 'prescriptions', icon: Icons.prescription(24), onclick: () => {} },
            { key: 'transactions', icon: Icons.finance(24), onclick: () => {} },
            { key: 'medicalHistory', icon: Icons.history(24), onclick: () => {} }
        ];

        const grid = el('div', { className: 'action-grid' }, 
            ...actionButtons.map(btn => el('button', {
                className: 'content-card action-btn', 
                onclick: btn.onclick
            }, 
                el('span', { style: 'color: var(--text); display: flex;', innerHTML: btn.icon }),
                el('span', { className: 'grid-label' }, t(btn.key, state.language))
            ))
        );

        const backBtn = el('button', { 
            className: 'primary-btn full-width-btn', 
            onclick: onBack 
        }, el('span', { style: 'display: flex;', innerHTML: Icons.back(18) }), t('backToPatients', state.language));

        container.append(header, grid, el('div', { className: 'back-btn-container' }, backBtn));
    };

    loadData();

    return [container];
}

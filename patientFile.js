import { Icons } from './icons.js';
import { can } from './app.js';

export function renderPatientFileView(patientId, el, supabaseClient, onBack, navigateTo) {
    const container = el('div', { className: 'view-container' });
    
    if (!patientId) {
        container.append(el('div', { className: 'content-card' }, 'No patient selected.'));
        return [container];
    }

    const loadData = async () => {
        container.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.6;">Loading Patient File...</div>';
        
        const { data: patient, error } = await supabaseClient
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error || !patient) {
            container.innerHTML = '<div class="content-card">Error loading patient record.</div>';
            return;
        }

        container.innerHTML = ''; 

        const calculateAge = (dobString) => {
            if (!dobString) return 'N/A';
            const birthDate = new Date(dobString);
            return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
        };

        const cleanPhone = patient.phone ? patient.phone.replace(/\D/g, '') : '';

        const header = el('div', { className: 'view-header', style: 'margin-bottom: 8px;' },
            el('div', { style: 'display: flex; justify-content: space-between; align-items: flex-start; width: 100%;' },
                el('div', {},
                    el('h1', {}, patient.name),
                    el('p', { className: 'view-subtitle' }, 
                        `${patient.id} • ${calculateAge(patient.dob)} yrs • ${patient.dob || 'No DOB'}`
                    )
                ),
                can('pat', 'c') ? el('div', { style: 'display: flex; gap: 16px; padding-top: 8px;' },
                    patient.phone ? el('span', { 
                        style: 'cursor: pointer;',
                        onclick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank'),
                        innerHTML: Icons.whatsapp(24) // WhatsApp maintains its green stroke from icons.js
                    }) : null,
                    patient.phone ? el('span', { 
                        // Using var(--primary) ensures this flips white/black based on theme
                        style: 'cursor: pointer; color: var(--primary);', 
                        onclick: () => window.location.href = `tel:${cleanPhone}`,
                        innerHTML: Icons.phone(24)
                    }) : null
                ) : null
            )
        );

        const actionButtons = [
            { label: 'Information', icon: Icons.info(24), onclick: () => navigateTo('patient-info', patient.id) },
            { label: 'Appointments', icon: Icons.appointments(24), onclick: () => navigateTo('patient-appointments', patient.id)  },
            { label: 'Procedures', icon: Icons.procedure(24), onclick: () => {} },
            { label: 'Lab Orders', icon: Icons.lab(24), onclick: () => {} },
            { label: 'Prescriptions', icon: Icons.prescription(24), onclick: () => {} },
            { label: 'Transactions', icon: Icons.finance(24), onclick: () => {} },
            { label: 'Medical History', icon: Icons.history(24), onclick: () => {} }
        ];

        const grid = el('div', { className: 'action-grid' }, 
            ...actionButtons.map(btn => el('button', {
                className: 'content-card action-btn', 
                onclick: btn.onclick
            }, 
                // Set color to var(--text) so stroke="currentColor" works in dark mode
                el('span', { style: 'color: var(--text); display: flex;', innerHTML: btn.icon }),
                el('span', { className: 'grid-label' }, btn.label)
            ))
        );

        const backBtn = el('button', { 
            className: 'primary-btn', 
            style: 'margin-top: 16px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;',
            onclick: onBack 
        }, el('span', { style: 'display: flex;', innerHTML: Icons.back(18) }), 'Back to Patients');

        container.append(header, grid, backBtn);
    };

    loadData();

    return [container];
}

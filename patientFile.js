import { Icons } from './icons.js';
import { can } from './app.js'; // Ensure can is imported to check JWT permissions

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

        // Corrected Header Logic
        const header = el('div', { className: 'view-header', style: 'margin-bottom: 8px;' },
            el('div', { style: 'display: flex; justify-content: space-between; align-items: flex-start;' },
                el('div', {},
                    el('h1', {}, patient.name),
                    el('p', { className: 'view-subtitle' }, 
                        `${patient.id} • ${calculateAge(patient.dob)} yrs • ${patient.dob || 'No DOB'}`
                    )
                ),
                // Fixed Syntax: Removed extra ] and properly closed the ternary
                can('pat', 'c') ? el('div', { style: 'display: flex; gap: 16px; padding-top: 8px;' },
                    patient.phone ? el('span', { 
                        style: 'cursor: pointer; color: #25D366;',
                        onclick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank'),
                        innerHTML: Icons?.whatsapp ? Icons.whatsapp(22) : '💬' 
                    }) : null,
                    patient.phone ? el('span', { 
                        style: 'cursor: pointer; color: var(--primary);',
                        onclick: () => window.location.href = `tel:${cleanPhone}`,
                        innerHTML: Icons?.phone ? Icons.phone(22) : '📞'
                    }) : null
                ) : null
            )
        );

        const actionButtons = [
            { label: 'Information', icon: 'ℹ️', onclick: () => navigateTo('patient-info', patient.id) },
            { label: 'Appointments', icon: '📅' },
            { label: 'Procedures', icon: '💉' },
            { label: 'Lab Orders', icon: '🧪' },
            { label: 'Prescriptions', icon: '💊' },
            { label: 'Transactions', icon: '💰' },
            { label: 'Medical History', icon: '📜' }
        ];

        const grid = el('div', { className: 'action-grid' }, 
            ...actionButtons.map(btn => el('button', {
                className: 'content-card action-btn', 
                onclick: btn.onclick
            }, 
                el('span', { style: 'font-size: 1.2rem;' }, btn.icon),
                el('span', { className: 'grid-label' }, btn.label)
            ))
        );

        const backBtn = el('button', { 
            className: 'primary-btn', 
            style: 'margin-top: 8px; width: 100%;',
            onclick: onBack 
        }, '← Back to Patients');

        container.append(header, grid, backBtn);
    };

    loadData();

    return [container];
}

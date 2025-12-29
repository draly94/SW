/**
 * Patient Information View Module
 */
import { showToast } from './app.js';

export function renderPatientInfoView(patientId, el, supabaseClient, onComplete) {
    // 1. Create the container shell immediately
    const container = el('div', { className: 'view-container' });
    
    let patient = null;
    let isEditing = false;
    let internalLoading = false;

    // Helper to mask sensitive data
    const mask = (value, isSensitive) => {
        if (!value) return 'Not provided';
        if (!isSensitive) return value;
        return value.length > 4 ? `****${value.slice(-4)}` : '****';
    };

    const render = () => {
        container.innerHTML = '';
        
        if (!patient) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.6;">Loading Patient Information...</div>';
            return;
        }

        const header = el('div', { className: 'view-header', style: 'margin-bottom: 16px;' },
            el('h2', { style: 'margin: 0;' }, isEditing ? 'Edit Patient Details' : 'Patient Information'),
            el('p', { className: 'view-subtitle' }, `Manage data for ${patient.name || 'Patient'}`)
        );

        const fields = [
            { label: 'Full Name', key: 'name', sensitive: false },
            { label: 'Date of Birth', key: 'dob', sensitive: false },
            { label: 'Phone Number', key: 'phone', sensitive: true },
            { label: 'Address', key: 'address', sensitive: true },
            { label: 'National ID / Passport', key: 'gov_id', sensitive: true }
        ];

        const form = el('div', { className: 'content-card', style: 'display: flex; flex-direction: column; gap: 20px;' },
            ...fields.map(field => el('div', { className: 'form-group' },
                el('label', { className: 'grid-label', style: 'display: block; margin-bottom: 4px;' }, field.label),
                isEditing 
                    ? el('input', { 
                        type: 'text', 
                        className: 'theme-input', 
                        value: patient[field.key] || '', 
                        oninput: (e) => { patient[field.key] = e.target.value; } 
                      })
                    : el('div', { style: 'font-weight: 500; color: var(--text);' }, mask(patient[field.key], field.sensitive))
            ))
        );

        const actions = el('div', { style: 'display: flex; gap: 12px; margin-top: 12px;' },
            isEditing ? el('button', { 
                className: 'primary-btn', 
                style: 'flex: 1',
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
                            .eq('id', patientId); // Use the passed patientId

                        if (error) throw error;

                        showToast('Patient info updated successfully!');
                        isEditing = false;
                    } catch (err) {
                        showToast(err.message, 'error');
                    } finally {
                        internalLoading = false;
                        render();
                    }
                }
            }, internalLoading ? 'Saving...' : 'Save Changes')
            : el('button', { 
                className: 'primary-btn', 
                style: 'flex: 1', 
                onclick: () => { isEditing = true; render(); } 
            }, 'Edit Details')
        );

        container.append(header, form, actions);
        
        if (internalLoading) {
            container.appendChild(el('div', { className: 'loader-overlay' }, el('div', { className: 'spinner' })));
        }
    };

    // 2. Fetch the patient data using the ID
    const fetchPatientData = async () => {
        const { data, error } = await supabaseClient
            .from('patients')
            .select('*')
            .eq('id', patientId) // Querying by the passed ID
            .single();
        
        if (error) {
            showToast('Error loading patient info', 'error');
            container.innerHTML = '<div class="content-card">Failed to load patient record.</div>';
        } else {
            patient = data;
            render();
        }
    };

    fetchPatientData(); // Start fetch immediately
    return [container]; // Return shell to the app router
}

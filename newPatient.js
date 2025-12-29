// newPatient.js
import { showToast } from './app.js';


export function renderNewPatientView(state, el, supabaseClient, onBack) {
    const container = el('div', { className: 'view-container' });

    const header = el('div', { className: 'view-header', style: 'display: flex; align-items: center; gap: 15px;' },
        el('div', {},
            el('h1', {}, 'New Patient'),
            el('p', { className: 'view-subtitle' }, 'Add a person to the registry')
        )
    );

    const nameInp = el('input', { type: 'text', placeholder: 'Full Name', required: true });
    const dobInp = el('input', { type: 'date', placeholder: 'Date of Birth' });
    const phoneInp = el('input', { type: 'tel', placeholder: 'Phone Number (e.g. 012...)' });

    const handleSave = async (e) => {
        e.preventDefault();
        const btn = e.target;
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const { data, error } = await supabaseClient
            .from('patients')
            .insert([{
                name: nameInp.value,
                dob: dobInp.value,
                phone: phoneInp.value,
                branch_id: state.selectedBranchId
            }])
            .select();

        if (error) {
            alert('Error saving patient: ' + error.message);
            btn.disabled = false;
            btn.textContent = 'Save Patient';
        } else {
            onBack();
            showToast('Patient added successfully!', 'success');
        }
    };

    const form = el('form', { 
        className: 'content-card', 
        style: 'display: flex; flex-direction: column; gap: 15px; max-width: 500px;',
        onsubmit: handleSave 
    },
        el('label', {}, 'Name', nameInp),
        el('label', {}, 'Date of Birth', dobInp),
        el('label', {}, 'Phone Number', phoneInp),
        el('button', { type: 'submit', className: 'primary-btn' }, 'Save Patient')
    );

    container.append(header, form);
    return [container];
}

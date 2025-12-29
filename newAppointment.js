// newAppointment.js
import { showToast } from './app.js';

const formatToAMPM = (time24) => {
    let [hours, minutes] = time24.split(':');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
};

export function renderNewAppointmentView(state, el, supabaseClient, onBack, initialData = {}) {
    const container = el('div', { className: 'view-container' });
    
    let duration = 15;
    let selectedPatientId = null;
    let providers = []; // To store fetched dentists
    const displayTime = formatToAMPM(initialData.time);
    const clinicNumber = initialData.clinic || 1;

    const header = el('div', { className: 'view-header', style: 'display: flex; align-items: center; gap: 15px;' },
        el('button', { className: 'icon-btn', onclick: onBack, innerHTML: '←' }),
        el('div', {},
            el('h1', {}, 'Schedule Appointment'),
            el('p', { className: 'view-subtitle' }, 
                `For ${initialData.date} at ${displayTime} (Clinic ${clinicNumber})`
            )
        )
    );

    // --- Provider Dropdown Logic ---
    const providerSelect = el('select', { required: true, className: 'form-input' }, 
        el('option', { value: '' }, 'Loading providers...')
    );

    const fetchProviders = async () => {
        const { data, error } = await supabaseClient
            .from('user_branches')
            .select(`
                user_id,
                profiles:user_id ( name )
            `)
            .eq('branch_id', state.selectedBranchId)
            .eq('role', 'dentist');

        if (error) {
            console.error('Error fetching providers:', error);
            providerSelect.innerHTML = '<option value="">Error loading providers</option>';
            return;
        }

        providerSelect.innerHTML = '<option value="">Select Provider</option>';
        data.forEach(item => {
            const option = el('option', { value: item.user_id }, item.profiles.name);
            providerSelect.appendChild(option);
        });
    };

    fetchProviders();
    // ------------------------------

    const patientSearch = el('input', { type: 'text', placeholder: 'Search patient name...', required: true });
    const notesInp = el('textarea', { placeholder: 'Notes (Optional)', style: 'height: 100px; padding: 10px;' });
    const resultsList = el('div', { style: 'max-height: 200px; overflow-y: auto;' });

    const durationDisplay = el('span', { style: 'font-weight: bold; min-width: 80px; text-align: center;' }, `${duration} mins`);
    const updateDuration = (amt) => {
        const nextValue = duration + amt;
        if (nextValue > 0) {
            duration = nextValue;
            durationDisplay.textContent = `${duration} mins`;
        }
    };

    const durationControl = el('div', { style: 'display: flex; align-items: center; gap: 10px;' },
        el('button', { type: 'button', className: 'icon-btn', onclick: () => updateDuration(-15), innerHTML: '−' }),
        durationDisplay,
        el('button', { type: 'button', className: 'icon-btn', onclick: () => updateDuration(15), innerHTML: '+' })
    );

    patientSearch.oninput = async (e) => {
        const query = e.target.value;
        if (query.length < 2) { resultsList.innerHTML = ''; return; }
        
        const { data } = await supabaseClient
            .from('patients')
            .select('id, name')
            .eq('branch_id', state.selectedBranchId)
            .ilike('name', `${query}%`)
            .limit(5);

        resultsList.innerHTML = '';
        data?.forEach(p => {
            const item = el('div', { 
                className: 'content-card', 
                style: 'padding: 10px; margin-bottom: 5px; cursor: pointer;',
                onclick: () => {
                    selectedPatientId = p.id;
                    patientSearch.value = p.name;
                    resultsList.innerHTML = '';
                }
            }, p.name);
            resultsList.appendChild(item);
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedPatientId) return alert('Please select a patient from the list.');
        if (!providerSelect.value) return alert('Please select a provider.');

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Checking availability...';

        const startISO = `${initialData.date}T${initialData.time}:00Z`;
        const startDate = new Date(startISO);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        const range = `[${startISO}, ${endDate.toISOString()})`;

        const { error } = await supabaseClient
            .from('appointments')
            .insert([{
                patient_id: selectedPatientId,
                branch_id: state.selectedBranchId,
                user_id: providerSelect.value, // Added provider ID to the record
                clinic_number: clinicNumber,
                appointment_date: initialData.date,
                appointment_time: initialData.time,
                duration_minutes: duration,
                appointment_range: range,
                notes: notesInp.value,
                created_by: state.session.user.id,
                status: 'scheduled'
            }]);

        if (error) {
            if (error.code === '23P01') {
                showToast('Conflict: This time slot overlaps with an existing appointment.', 'error');
            } else {
                alert('Error: ' + error.message);
            }
            btn.disabled = false;
            btn.textContent = 'Confirm Appointment';
        } else {
            onBack();
            showToast('Appointment scheduled successfully!', 'success');
        }
    };

    const form = el('form', { 
        className: 'content-card', 
        style: 'display: flex; flex-direction: column; gap: 15px;',
        onsubmit: handleSave 
    },
        el('label', {}, 'Patient', patientSearch, resultsList),
        el('label', {}, 'Provider', providerSelect), // Added the provider dropdown to the form
        el('label', { style: 'display: flex; flex-direction: column; gap: 5px;' }, 'Duration', durationControl),
        el('label', {}, 'Notes', notesInp),
        el('button', { type: 'submit', className: 'primary-btn' }, 'Confirm Appointment')
    );

    container.append(header, form);
    return [container];
}

import { showToast, can, el } from './app.js';
import { Icons } from './icons.js';

export function renderPatientAppointmentsView(patientId, el, supabaseClient, onBack) {
    const container = el('div', { className: 'view-container' });
    let appointments = [];
    let isLoading = true;
    let editingId = null;

    const formatTo24h = (timeStr) => {
        if (!timeStr) return "09:00";
        return timeStr.substring(0, 5); 
    };

    const fetchAppointments = async () => {
        isLoading = true;
        render();
        const { data, error } = await supabaseClient
            .from('appointments')
            .select(`id, appointment_date, appointment_time, duration_minutes, clinic_number, notes, user_id, profiles:user_id ( name )`)
            .eq('patient_id', patientId)
            .order('appointment_date', { ascending: false });

        if (error) showToast(error.message, 'error');
        else appointments = data || [];
        isLoading = false;
        render();
    };

    const saveEdit = async (apt, updates) => {
        try {
            const startISO = `${updates.appointment_date}T${updates.appointment_time}:00Z`;
            const startDate = new Date(startISO);
            if (isNaN(startDate.getTime())) throw new Error("Invalid Date/Time");

            const endDate = new Date(startDate.getTime() + updates.duration_minutes * 60000);
            const range = `[${startISO}, ${endDate.toISOString()})`;

            const { error } = await supabaseClient
                .from('appointments')
                .update({ ...updates, appointment_range: range })
                .eq('id', apt.id);

            if (error) throw error;

            showToast('Updated successfully');
            editingId = null;
            fetchAppointments();
        } catch (err) {
            showToast(err.code === '23P01' ? 'Time slot conflict!' : err.message, 'error');
        }
    };

    const render = () => {
        container.innerHTML = '';
        const header = el('div', { className: 'view-header', style: 'margin-bottom: 12px; display:flex; align-items:center; gap:10px;' },
            el('button', { className: 'icon-btn', onclick: onBack, innerHTML: Icons.back(20) }),
            el('h2', { style: 'margin:0; font-size:1.1rem;' }, 'Patient Appointments')
        );

        const list = el('div', { style: 'display:flex; flex-direction:column; gap:8px;' });

        appointments.forEach(apt => {
            const isEditing = editingId === apt.id;
            const card = el('div', { className: 'content-card', style: 'padding:10px; border-left:4px solid var(--primary);' });

            if (isEditing) {
                let tempDur = apt.duration_minutes || 15;
                const durDisp = el('span', { style: 'font-weight:bold; width:50px; text-align:center;' }, `${tempDur}m`);
                const dateInp = el('input', { type: 'date', className: 'theme-input', value: apt.appointment_date });
                const timeInp = el('input', { type: 'time', className: 'theme-input', value: formatTo24h(apt.appointment_time) });
                const noteInp = el('input', { type: 'text', className: 'theme-input', value: apt.notes || '', placeholder: 'Notes' });

                card.append(
                    el('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:8px;' }, dateInp, timeInp),
                    el('div', { style: 'display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;' },
                        el('span', { style: 'font-size:0.8rem' }, 'Duration'),
                        el('div', { style: 'display:flex; align-items:center; gap:8px;' },
                            el('button', { className: 'icon-btn', onclick: () => { if(tempDur > 15) { tempDur -= 15; durDisp.textContent = `${tempDur}m`; }}}, '−'),
                            durDisp,
                            el('button', { className: 'icon-btn', onclick: () => { tempDur += 15; durDisp.textContent = `${tempDur}m`; }}, '+')
                        )
                    ),
                    noteInp,
                    el('div', { style: 'display:flex; gap:5px; margin-top:8px;' },
                        el('button', { className: 'primary-btn', style: 'flex:1; padding:6px;', onclick: () => saveEdit(apt, {
                            appointment_date: dateInp.value,
                            appointment_time: timeInp.value,
                            duration_minutes: tempDur,
                            notes: noteInp.value
                        })}, 'Save'),
                        el('button', { className: 'btn-secondary', style: 'flex:1; padding:6px;', onclick: () => { editingId = null; render(); }}, 'Cancel')
                    )
                );
            } else {
                card.style.display = 'flex';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';
                card.append(
                    el('div', {},
                        el('div', { style: 'font-weight:bold; font-size:0.95rem;' }, `${apt.appointment_date} @ ${apt.appointment_time}`),
                        el('div', { style: 'font-size:0.8rem; color:var(--text-secondary);' }, `Dr. ${apt.profiles?.name || 'Staff'} • ${apt.duration_minutes}m`),
                        apt.notes ? el('div', { style: 'font-size:0.75rem; font-style:italic; opacity:0.7;' }, apt.notes) : null
                    ),
                    el('div', { style: 'display:flex; gap:5px;' },
                        can('apt', 'u') ? el('button', { className: 'icon-btn', innerHTML: Icons.edit(18), onclick: () => { editingId = apt.id; render(); } }) : null
                    )
                );
            }
            list.appendChild(card);
        });

        container.append(header, isLoading ? el('div', { style: 'text-align:center; padding:20px;' }, '...') : list);
    };

    fetchAppointments();
    return [container];
}

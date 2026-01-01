// appointments.js
export function renderAppointmentsView(state, el, supabaseClient, onNavigate, t) {
    const container = el('div', { 
        className: 'view-container',
        style: 'height: calc(100vh - 120px); display: flex; flex-direction: column; overflow: hidden;' 
    });
    
    let selectedDate = new Date().toISOString().split('T')[0];
    let appointments = [];
    let clinics = []; 
    let currentClinicIndex = 0;
    const SLOT_HEIGHT = 60;

    const fetchInitialData = async () => {
        const { data: branchData, error: branchError } = await supabaseClient
            .from('org_branches')
            .select('clinic_count')
            .eq('branch_id', state.selectedBranchId)
            .single();

        if (!branchError && branchData) {
            const count = parseInt(branchData.clinic_count) || 1;
            clinics = Array.from({ length: count }, (_, i) => i + 1);
        } else {
            clinics = [1];
        }
        await fetchAppointments();
    };

    const fetchAppointments = async () => {
        const currentClinicNumber = clinics[currentClinicIndex];
        const { data, error } = await supabaseClient
            .from('appointments')
            .select(`
                patient_id,
                appointment_time,
                duration_minutes,
                patients ( name ),
                profiles:user_id ( name )
            `) 
            .eq('branch_id', state.selectedBranchId)
            .eq('appointment_date', selectedDate)
            .eq('clinic_number', currentClinicNumber); 

        if (!error) {
            appointments = data || [];
            renderContent();
        }
    };

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        let hours, minutes;
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const [time, modifier] = timeStr.split(' ');
            let [h, m] = time.split(':').map(Number);
            if (modifier === 'PM' && h < 12) h += 12;
            if (modifier === 'AM' && h === 12) h = 0;
            hours = h; minutes = m;
        } else {
            [hours, minutes] = timeStr.split(':').map(Number);
        }
        return hours * 60 + (minutes || 0);
    };

    const renderContent = () => {
        container.innerHTML = '';
        const now = new Date();
        const isToday = selectedDate === now.toISOString().split('T')[0];
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

        const header = el('div', { style: 'flex-shrink: 0; background: var(--bg);' },
            el('div', { className: 'view-header', style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px;' },
                el('h1', { style: 'margin:0;' }, 'Appointments'),
                el('input', { 
                    type: 'date', 
                    value: selectedDate,
                    className: 'branch-select',
                    onchange: (e) => { 
                        selectedDate = e.target.value; 
                        fetchAppointments(); 
                    }
                })
            )
        );

        if (clinics.length > 1) {
            const switcher = el('div', { 
                style: 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: var(--bg-alt); border-bottom: 1px solid var(--border);' 
            },
                el('button', { 
                    className: 'btn-secondary', 
                    style: 'border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;',
                    onclick: () => {
                        currentClinicIndex = (currentClinicIndex - 1 + clinics.length) % clinics.length;
                        fetchAppointments();
                    }
                }, '←'),
                el('div', { style: 'text-align: center;' },
                    el('div', { style: 'font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;' }, 'Current Clinic'),
                    el('div', { style: 'font-weight: 700; font-size: 1.1rem;' }, `Clinic ${clinics[currentClinicIndex]}`)
                ),
                el('button', { 
                    className: 'btn-secondary', 
                    style: 'border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;',
                    onclick: () => {
                        currentClinicIndex = (currentClinicIndex + 1) % clinics.length;
                        fetchAppointments();
                    }
                }, '→')
            );
            header.appendChild(switcher);
        }

        const scrollContainer = el('div', { className: 'schedule-container' });
        const relativeWrapper = el('div', { style: 'position: relative;' });
        const scheduleGrid = el('div', { style: 'display: flex; flex-direction: column;' });

        for (let hour = 0; hour < 24; hour++) {
            for (let min = 0; min < 60; min += 15) {
                const totalMins = hour * 60 + min;
                const hour24 = hour.toString().padStart(2, '0');
                const minStr = min.toString().padStart(2, '0');
                const time24h = `${hour24}:${minStr}`;

                const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayTime = `${displayHour}:${minStr} ${ampm}`;
                
                const isNow = isToday && currentTotalMinutes >= totalMins && currentTotalMinutes < totalMins + 15;

                const row = el('div', { 
                    className: `schedule-row ${min === 0 ? 'row-hour-mark' : ''} ${isNow ? 'is-now' : ''}`,
                    onclick: () => onNavigate('new-appointment', { 
                        date: selectedDate, 
                        time: time24h,
                        clinic: clinics[currentClinicIndex] 
                    })
                },
                    el('div', { className: `time-column ${min === 0 ? 'bold-hour' : ''}` }, displayTime),
                    el('div', { className: 'slot-content' })
                );
                scheduleGrid.appendChild(row);
            }
        }

        const apptLayer = el('div', { className: 'appointments-layer' });
        appointments.forEach(appt => {
            const startMins = timeToMinutes(appt.appointment_time);
            const duration = appt.duration_minutes || 15;
            const top = (startMins / 15) * SLOT_HEIGHT;
            const height = (duration / 15) * SLOT_HEIGHT - 2;

            // UPDATED CARD: Removed appt-time-label
            const card = el('div', { 
                className: 'appointment-card',
                style: `top: ${top}px; height: ${height}px; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 8px;`,
                onclick: (e) => {
                    e.stopPropagation();
                    onNavigate('patient-file', appt.patient_id);
                }
            },
                el('div', { style: 'display: flex; flex-direction: column;' },
                    el('span', { style: 'font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }, appt.patients?.name || 'Booked')
                    // Time label removed from here
                ),
                el('div', { 
                    style: 'font-size: 0.7rem; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 2px; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' 
                }, `Dr. ${appt.profiles?.name || 'Unassigned'}`)
            );
            apptLayer.appendChild(card);
        });

        relativeWrapper.append(scheduleGrid, apptLayer);
        scrollContainer.appendChild(relativeWrapper);
        container.append(header, scrollContainer);

        setTimeout(() => {
            const nowElement = scheduleGrid.querySelector('.is-now');
            if (nowElement) {
                nowElement.scrollIntoView({ block: 'center', behavior: 'auto' });
            } else {
                const eightAM = scheduleGrid.children[8 * 4];
                if (eightAM) eightAM.scrollIntoView({ block: 'start', behavior: 'auto' });
            }
            requestAnimationFrame(() => {
                scrollContainer.classList.add('is-ready');
            });
        }, 60);
    };

    fetchInitialData();
    return [container];
}

import { Icons } from './icons.js'; 
import { can } from './app.js'; // - Import permission helper

export function renderPatientsView(state, el, supabaseClient, onNavigate) {
    const container = el('div', { className: 'view-container' });
    let latestPatients = [];

    const calculateAge = (dobString) => {
        if (!dobString) return 'N/A';
        const birthDate = new Date(dobString);
        return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
    };

    // Helper to create a patient card
    const createPatientCard = (patient) => {
        const cleanPhone = patient.phone ? patient.phone.replace(/\D/g, '') : '';
        return el('div', { 
            className: 'content-card', 
            style: 'margin-bottom: 8px; cursor: pointer; border-left: 4px solid var(--primary);',
            onclick: () => onNavigate('patient-file', patient.id) 
        },
            el('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                el('div', {},
                    el('div', { style: 'font-weight: 600;' }, patient.name),
                    el('div', { style: 'font-size: 0.8rem; opacity: 0.6;' }, `${calculateAge(patient.dob)} years old`)
                ),
                // Only show icons if user has 'create' permissions ('c') for patients ('pat')
                can('pat', 'c') ? el('div', { style: 'display: flex; gap: 12px;' },
                    patient.phone ? el('span', { 
                        onclick: (e) => { e.stopPropagation(); window.open(`https://wa.me/${cleanPhone}`); },
                        innerHTML: Icons?.whatsapp ? Icons.whatsapp(18) : '💬' 
                    }) : null,
                    patient.phone ? el('span', { 
                        onclick: (e) => { e.stopPropagation(); window.location.href = `tel:${cleanPhone}`; },
                        innerHTML: Icons?.phone ? Icons.phone(18) : '📞'
                    }) : null
                ) : null
            )
        );
    };

    const renderMainView = async () => {
        container.innerHTML = '';
        
        // Header
        const header = el('div', {className: 'view-header',},
            el('div', {},
                el('h1', {}, 'Patients Management'),
                el('p', { className: 'view-subtitle' }, 'Search registry or view recent arrivals')
            ),
            // Also secure the Plus Button so only those with 'c' permission can see it
            can('pat', 'c') ? el('button', { 
                className: 'primary-btn circular-btn', 
                onclick: () => onNavigate('new-patient') 
            }, '+') : null
        );

        if (latestPatients.length === 0) {
            const { data } = await supabaseClient
                .from('patients')
                .select('id, name, dob, phone')
                .eq('branch_id', state.selectedBranchId)
                .order('created_at', { ascending: false })
                .limit(10);
            latestPatients = data || [];
        }

        const searchResultsContainer = el('div', { className: 'results-list' });
        const latestContainer = el('div', { className: 'latest-list' },
            el('div', { className: 'section-title' }, 'Recent Patients'),
            ...latestPatients.map(p => createPatientCard(p))
        );

        const handleSearch = async (query) => {
            state.lastSearchQuery = query;
            if (!query || query.trim().length < 2) {
                searchResultsContainer.innerHTML = '';
                return;
            }
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.appendChild(el('div', { style: 'text-align: center; padding: 20px; opacity: 0.7;' }, 'Searching...'));

            const { data } = await supabaseClient
                .from('patients')
                .select('id, name, dob, phone')
                .eq('branch_id', state.selectedBranchId)
                .ilike('name', `${query}%`)
                .limit(10);

            searchResultsContainer.innerHTML = '';
            if (!data || data.length === 0) {
                searchResultsContainer.appendChild(el('div', { className: 'content-card' }, 'No results found.'));
            } else {
                data.forEach(p => searchResultsContainer.appendChild(createPatientCard(p)));
            }
        };

        let searchTimeout;
        const searchInput = el('input', {
            type: 'text',
            placeholder: 'Type to search...',
            value: state.lastSearchQuery || '',
            oninput: (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => handleSearch(e.target.value), 400);
            }
        });

        const layoutGrid = el('div', { className: 'patient-layout-grid' },
            el('div', { className: 'search-column' },
                el('div', { className: 'section-title' }, 'Find Patient'),
                el('div', { className: 'content-card' }, searchInput),
                searchResultsContainer
            ),
            latestContainer
        );

        container.append(header, layoutGrid);
    };

    renderMainView();
    return [container];
}

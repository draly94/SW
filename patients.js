import { Icons } from './icons.js'; 
import { can } from './app.js'; 

export function renderPatientsView(state, el, supabaseClient, onNavigate, injectStyles, t) {
    // Inject view-specific styles and layout logic
    injectStyles('patients-view-styles', `
        .view-container { animation: fadeIn var(--transition-fade); }
        .patient-layout-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--space-xl);
            align-items: start;
        }
        @media (min-width: 600px) {
            .patient-layout-grid { grid-template-columns: 1.5fr 1fr; }
            .latest-list { position: sticky; top: 80px; }
        }
        .patient-card {
            background: var(--sidebar-bg);
            border: 1px solid var(--border);
            border-left: 4px solid var(--primary);
            border-radius: var(--radius-md);
            padding: var(--card-padding);
            cursor: pointer;
            transition: all var(--transition-speed);
            margin-bottom: var(--space-sm);
        }
        .patient-card:hover {
            border-color: #3b82f6;
            background: var(--bg);
        }
    `);

    const container = el('div', { className: 'view-container' });
    let latestPatients = [];

    const calculateAge = (dobString) => {
        if (!dobString) return t('na', state.language); 
        const birthDate = new Date(dobString);
        return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
    };

    const createPatientCard = (patient) => {
        const cleanPhone = patient.phone ? patient.phone.replace(/\D/g, '') : '';
        return el('div', { 
            className: 'patient-card', 
            onclick: () => onNavigate('patient-file', patient.id) 
        },
            el('div', { className: 'flex-between' }, 
                el('div', {},
                    el('div', { style: 'font-weight: 600;' }, patient.name),
                    el('div', { className: 'view-subtitle' }, 
                        `${calculateAge(patient.dob)} ${t('yearsOld', state.language)}` 
                    )
                ),
                can('pat', 'c') ? el('div', { className: 'flex-row' }, 
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
        
        const header = el('div', { className: 'view-header' }, 
            el('div', {},
                el('h1', {}, t('patientsManagement', state.language)), 
                el('p', { className: 'view-subtitle' }, t('patientsSubtitle', state.language)) 
            ),
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
            el('div', { className: 'section-title' }, t('recentPatients', state.language)), 
            ...latestPatients.map(p => createPatientCard(p))
        );

        const handleSearch = async (query) => {
            state.lastSearchQuery = query;
            if (!query || query.trim().length < 2) {
                searchResultsContainer.innerHTML = '';
                return;
            }
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.appendChild(el('div', { style: 'text-align: center; padding: 20px; opacity: 0.7;' }, 
                t('searching', state.language) 
            ));

            const { data } = await supabaseClient
                .from('patients')
                .select('id, name, dob, phone')
                .eq('branch_id', state.selectedBranchId)
                .ilike('name', `${query}%`)
                .limit(10);

            searchResultsContainer.innerHTML = '';
            if (!data || data.length === 0) {
                searchResultsContainer.appendChild(el('div', { className: 'content-card' }, 
                    t('noResults', state.language) 
                ));
            } else {
                data.forEach(p => searchResultsContainer.appendChild(createPatientCard(p)));
            }
        };

        let searchTimeout;
        const searchInput = el('input', {
            className: 'form-input', 
            type: 'text',
            placeholder: t('searchPlaceholder', state.language), 
            value: state.lastSearchQuery || '',
            oninput: (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => handleSearch(e.target.value), 400);
            }
        });

        const layoutGrid = el('div', { className: 'patient-layout-grid' }, 
            el('div', { className: 'search-column' },
                el('div', { className: 'section-title' }, t('findPatient', state.language)), 
                el('div', { className: 'content-card', style: 'margin-bottom: var(--space-md);' }, searchInput),
                searchResultsContainer
            ),
            latestContainer
        );

        container.append(header, layoutGrid);
    };

    renderMainView();
    return [container];
}

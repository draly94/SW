// settings.js
export function renderSettingsView(state, el, applyTheme, supabaseClient, showToast) {
    const container = el('div', { className: 'view-container' });
    
    // Internal state to track if inventory section is expanded
    let isInventoryExpanded = false;

    // --- Inventory Config Logic ---
    const configWrapper = el('div', { className: 'content-card', style: 'margin-top: 20px;' });
    
    const renderConfig = async () => {
        configWrapper.innerHTML = '';

        // Collapsible Header
        const header = el('div', { 
            className: 'flex-between', 
            style: 'cursor: pointer; padding: 4px 0;',
            onclick: () => {
                isInventoryExpanded = !isInventoryExpanded;
                renderConfig();
            }
        },
            el('div', {},
                el('div', { className: 'section-title', style: 'margin:0;' }, 'Inventory Configuration'),
                el('p', { className: 'view-subtitle', style: 'margin:0; font-size:0.8rem;' }, 'Manage categories and sub-categories')
            ),
            el('span', { style: 'font-size: 1.2rem; transition: transform 0.3s;' }, isInventoryExpanded ? '▲' : '▼')
        );

        configWrapper.appendChild(header);

        // If collapsed, stop rendering the rest
        if (!isInventoryExpanded) return;

        // Expanded Content
        const detailsContainer = el('div', { style: 'margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px;' });
        detailsContainer.innerHTML = '<p class="loader">Loading configuration...</p>';
        configWrapper.appendChild(detailsContainer);

        const { data, error } = await supabaseClient
            .from('org_branches')
            .select('inventory_config')
            .eq('branch_id', state.selectedBranchId)
            .single();

        if (error) {
            detailsContainer.innerHTML = '<p class="error">Failed to load config</p>';
            return;
        }

        const config = data.inventory_config || { categories: [] };

        const saveConfig = async (newConfig) => {
            const { error: saveErr } = await supabaseClient
                .from('org_branches')
                .update({ inventory_config: newConfig })
                .eq('branch_id', state.selectedBranchId);
            
            if (saveErr) showToast('Failed to save', 'error');
            else {
                showToast('Updated');
                renderConfig();
            }
        };

        detailsContainer.innerHTML = '';

        // Category Rendering
        config.categories.forEach((cat, cIdx) => {
            const catItem = el('div', { 
                className: 'content-card', 
                style: 'background: var(--bg); border-left: 4px solid var(--primary); margin-bottom: 12px;' 
            },
                el('div', { className: 'flex-between' },
                    el('div', { className: 'flex-row' },
                        el('div', { className: 'flex-column', style: 'gap:2px' },
                            el('button', { onclick: (e) => { e.stopPropagation(); move(config.categories, cIdx, -1); }, style: 'padding:0; font-size:10px; width:20px', disabled: cIdx === 0 }, '▲'),
                            el('button', { onclick: (e) => { e.stopPropagation(); move(config.categories, cIdx, 1); }, style: 'padding:0; font-size:10px; width:20px', disabled: cIdx === config.categories.length - 1 }, '▼')
                        ),
                        el('strong', { 
                            contentEditable: true, 
                            onblur: (e) => { cat.name = e.target.innerText; saveConfig(config); },
                            style: 'outline: none;'
                        }, cat.name)
                    ),
                    el('div', { className: 'flex-row' },
                        el('button', { 
                            className: 'primary-btn', 
                            style: 'font-size: 0.7rem; padding: 4px 8px;',
                            onclick: () => {
                                const sub = prompt('New Sub-category:');
                                if (sub) { cat.subCategories.push(sub); saveConfig(config); }
                            }
                        }, '+ Sub'),
                        el('button', { 
                            onclick: () => { if(confirm('Delete category?')) { config.categories.splice(cIdx, 1); saveConfig(config); } },
                            style: 'background:none; border:none; color:#e74c3c; cursor:pointer;'
                        }, '✕')
                    )
                ),
                // Sub-categories
                el('div', { style: 'margin-top:10px; display:flex; flex-direction:column; gap:6px; padding-left: 20px;' },
                    ...cat.subCategories.map((sub, sIdx) => el('div', { 
                        className: 'flex-between', 
                        style: 'padding: 4px 8px; background: var(--sidebar-bg); border-radius:4px; font-size:0.85rem; border: 1px solid var(--border);' 
                    },
                        el('div', { className: 'flex-row' },
                             el('button', { onclick: () => move(cat.subCategories, sIdx, -1), style: 'font-size:8px', disabled: sIdx === 0 }, '▲'),
                             el('span', { 
                                contentEditable: true, 
                                onblur: (e) => { cat.subCategories[sIdx] = e.target.innerText; saveConfig(config); },
                                style: 'outline: none;'
                             }, sub)
                        ),
                        el('button', { 
                            onclick: () => { cat.subCategories.splice(sIdx, 1); saveConfig(config); },
                            style: 'background:none; border:none; color:#e74c3c; cursor:pointer'
                        }, '✕')
                    ))
                )
            );
            detailsContainer.appendChild(catItem);
        });

        const addBtn = el('button', {
            className: 'primary-btn',
            style: 'width:100%; margin-top:10px',
            onclick: () => {
                const name = prompt('Category Name:');
                if (name) { config.categories.push({ name, subCategories: [] }); saveConfig(config); }
            }
        }, '+ Add Category');

        detailsContainer.appendChild(addBtn);

        function move(arr, index, delta) {
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= arr.length) return;
            const element = arr.splice(index, 1)[0];
            arr.splice(newIndex, 0, element);
            saveConfig(config);
        }
    };

    // --- Initial Render ---
    renderConfig();

    container.append(
        el('div', { className: 'view-header' },
            el('h1', {}, 'Settings'),
            el('p', { className: 'view-subtitle' }, 'Branch & System Preferences')
        ),
        el('div', { className: 'content-card' },
            el('div', { className: 'section-title' }, 'Appearance'),
            el('select', {
                className: 'branch-select',
                onchange: (e) => { state.theme = e.target.value; localStorage.setItem('theme', state.theme); applyTheme(); }
            },
                el('option', { value: 'light', selected: state.theme === 'light' }, 'Light'),
                el('option', { value: 'dark', selected: state.theme === 'dark' }, 'Dark'),
                el('option', { value: 'device', selected: state.theme === 'device' }, 'System Match')
            )
        ),
        configWrapper
    );

    return [container];
}

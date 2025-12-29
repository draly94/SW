// settings.js

export function renderSettingsView(state, el, applyTheme, supabaseClient, showToast) {
    const container = el('div', { className: 'view-container' });

    /**
     * Reusable component for configuration sections (Inventory, Pricing, etc.)
     * Updated to support multi-lingual (EN/AR) labels for categories and sub-categories
     */
    const renderCollapsibleConfig = (title, subtitle, column) => {
        const configWrapper = el('div', { className: 'content-card', style: 'margin-top: 20px;' });
        let isExpanded = false;

        const render = async () => {
            configWrapper.innerHTML = '';

            // Collapsible Header
            const header = el('div', { 
                className: 'flex-between', 
                style: 'cursor: pointer; padding: 4px 0;',
                onclick: () => {
                    isExpanded = !isExpanded;
                    render();
                }
            },
                el('div', {},
                    el('div', { className: 'section-title', style: 'margin:0;' }, title),
                    el('p', { className: 'view-subtitle', style: 'margin:0; font-size:0.8rem;' }, subtitle)
                ),
                el('span', { style: 'font-size: 1.2rem; transition: transform 0.3s;' }, isExpanded ? '▲' : '▼')
            );

            configWrapper.appendChild(header);
            if (!isExpanded) return;

            // Expanded Content
            const detailsContainer = el('div', { style: 'margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px;' });
            detailsContainer.innerHTML = '<p class="loader">Loading...</p>';
            configWrapper.appendChild(detailsContainer);

            const { data, error } = await supabaseClient
                .from('org_branches')
                .select(column)
                .eq('branch_id', state.selectedBranchId) // Note: Changed to 'id' to match branch select logic in app.js
                .single();

            if (error) {
                detailsContainer.innerHTML = '<p class="error">Failed to load config</p>';
                return;
            }

            const config = data[column] || { categories: [] };

            const saveConfig = async (newConfig) => {
                const { error: saveErr } = await supabaseClient
                    .from('org_branches')
                    .update({ [column]: newConfig })
                    .eq('branch_id', state.selectedBranchId);
                
                if (saveErr) showToast('Failed to save', 'error');
                else {
                    showToast('Updated');
                    render();
                }
            };

            detailsContainer.innerHTML = '';

            const move = (arr, index, delta) => {
                const newIndex = index + delta;
                if (newIndex < 0 || newIndex >= arr.length) return;
                const element = arr.splice(index, 1)[0];
                arr.splice(newIndex, 0, element);
                saveConfig(config);
            };

            // Category Rendering
            config.categories.forEach((cat, cIdx) => {
                // DATA MIGRATION: Convert string names to localized objects {en, ar}
                if (typeof cat.name === 'string') {
                    cat.name = { en: cat.name, ar: '' };
                }

                const catItem = el('div', { 
                    className: 'content-card', 
                    style: 'background: var(--bg); border-left: 4px solid var(--primary); margin-bottom: 12px;' 
                },
                    el('div', { className: 'flex-between' },
                        el('div', { className: 'flex-row', style: 'gap: 10px; flex: 1;' },
                            el('div', { className: 'flex-column', style: 'gap:2px' },
                                el('button', { onclick: (e) => { e.stopPropagation(); move(config.categories, cIdx, -1); }, style: 'padding:0; font-size:10px; width:20px', disabled: cIdx === 0 }, '▲'),
                                el('button', { onclick: (e) => { e.stopPropagation(); move(config.categories, cIdx, 1); }, style: 'padding:0; font-size:10px; width:20px', disabled: cIdx === config.categories.length - 1 }, '▼')
                            ),
                            // English Label Input
                            el('input', {
                                className: 'form-input',
                                style: 'margin:0; padding:4px; font-weight:bold; flex: 1;',
                                value: cat.name.en || '',
                                placeholder: 'English Category',
oninput: (e) => {
        if (/[^a-zA-Z\s0-9]/.test(e.target.value)) {
            // Visual warning: subtle red background flash
            e.target.style.background = 'rgba(231, 76, 60, 0.1)';
            setTimeout(() => { e.target.style.background = 'none'; }, 500);
            showToast('Only English characters and numbers are allowed', 'error');
        }
        // Strip non-English characters
        e.target.value = e.target.value.replace(/[^a-zA-Z\s0-9]/g, '');
    },
                                onchange: (e) => { cat.name.en = e.target.value; saveConfig(config); }
                            }),
                            // Arabic Label Input
                            el('input', {
                                className: 'form-input',
                                style: 'margin:0; padding:4px; font-weight:bold; text-align:right; flex: 1;',
                                dir: 'rtl',
                                value: cat.name.ar || '',
                                placeholder: 'الفئة (بالعربي)',
                                oninput: (e) => {
        if (/[^\u0600-\u06FF\s]/.test(e.target.value)) {
            // Flash background color since these inputs have no borders
            e.target.style.background = 'rgba(231, 76, 60, 0.1)';
            setTimeout(() => { e.target.style.background = 'none'; }, 500);
            showToast('Only Arabic characters and numbers are allowed', 'error');
        }
        e.target.value = e.target.value.replace(/[^\u0600-\u06FF\s]/g, '');
    },
                                onchange: (e) => { cat.name.ar = e.target.value; saveConfig(config); }
                            })
                        ),
                        el('div', { className: 'flex-row', style: 'margin-left: 10px;' },
                            el('button', { 
                                className: 'primary-btn', 
                                style: 'font-size: 0.7rem; padding: 4px 8px;',
                                onclick: () => {
                                    if(!cat.subCategories) cat.subCategories = [];
                                    cat.subCategories.push({ en: 'New Sub', ar: '' }); 
                                    saveConfig(config); 
                                }
                            }, '+ Sub'),
                            el('button', { 
                                onclick: () => { if(confirm('Delete category?')) { config.categories.splice(cIdx, 1); saveConfig(config); } },
                                style: 'background:none; border:none; color:#e74c3c; cursor:pointer; padding-left: 8px;'
                            }, '✕')
                        )
                    ),
                    // Sub-categories list
                    el('div', { style: 'margin-top:10px; display:flex; flex-direction:column; gap:6px; padding-left: 20px;' },
                        ...(cat.subCategories || []).map((sub, sIdx) => {
                            // DATA MIGRATION: Convert string subcategories to localized objects
                            if (typeof sub === 'string') {
                                sub = cat.subCategories[sIdx] = { en: sub, ar: '' };
                            }

                            return el('div', { 
                                className: 'flex-between', 
                                style: 'padding: 4px 8px; background: var(--sidebar-bg); border-radius:4px; border: 1px solid var(--border); gap: 8px;' 
                            },
                                el('div', { className: 'flex-row', style: 'flex: 1; gap: 8px;' },
                                     el('button', { onclick: () => move(cat.subCategories, sIdx, -1), style: 'font-size:8px', disabled: sIdx === 0 }, '▲'),
                                     // EN Sub Input
                                     el('input', {
                                        style: 'flex: 1; background:none; border:none; color:var(--text); font-size:0.85rem; outline: none;',
                                        value: sub.en || '',
                                        placeholder: 'EN Sub',
oninput: (e) => {
        if (/[^a-zA-Z\s0-9]/.test(e.target.value)) {
            // Visual warning: subtle red background flash
            e.target.style.background = 'rgba(231, 76, 60, 0.1)';
            setTimeout(() => { e.target.style.background = 'none'; }, 500);
            showToast('Only English characters and numbers are allowed', 'error');
        }
        // Strip non-English characters
        e.target.value = e.target.value.replace(/[^a-zA-Z\s0-9]/g, '');
    },
                                        onchange: (e) => { sub.en = e.target.value; saveConfig(config); }
                                     }),
                                     // AR Sub Input
                                     el('input', {
                                        style: 'flex: 1; background:none; border:none; color:var(--text); font-size:0.85rem; text-align:right; outline: none;',
                                        dir: 'rtl',
                                        value: sub.ar || '',
                                        placeholder: 'الفرعي (عربي)',
                                         oninput: (e) => {
        if (/[^\u0600-\u06FF\s]/.test(e.target.value)) {
            // Flash background color since these inputs have no borders
            e.target.style.background = 'rgba(231, 76, 60, 0.1)';
            setTimeout(() => { e.target.style.background = 'none'; }, 500);
            showToast('Only Arabic characters and numbers are allowed', 'error');
        }
        e.target.value = e.target.value.replace(/[^\u0600-\u06FF\s]/g, '');
    },
                                        onchange: (e) => { sub.ar = e.target.value; saveConfig(config); }
                                     })
                                ),
                                el('button', { 
                                    onclick: () => { cat.subCategories.splice(sIdx, 1); saveConfig(config); },
                                    style: 'background:none; border:none; color:#e74c3c; cursor:pointer'
                                }, '✕')
                            );
                        })
                    )
                );
                detailsContainer.appendChild(catItem);
            });

            const addBtn = el('button', {
                className: 'primary-btn',
                style: 'width:100%; margin-top:10px',
                onclick: () => {
                    config.categories.push({ name: { en: 'New Category', ar: '' }, subCategories: [] }); 
                    saveConfig(config);
                }
            }, '+ Add Category');

            detailsContainer.appendChild(addBtn);
        };

        render();
        return configWrapper;
    };

    // Instantiate the sections
    const inventorySection = renderCollapsibleConfig('Inventory Configuration', 'Manage categories and sub-categories', 'inventory_config');
    const pricingSection = renderCollapsibleConfig('Pricing Configuration', 'Manage pricing tiers and groups', 'pricing_config');
    const languageSection = el('div', { className: 'content-card' },
        el('div', { className: 'section-title' }, state.language === 'ar' ? 'اللغة' : 'Language'),
        el('select', {
            className: 'branch-select',
            onchange: (e) => { 
                state.language = e.target.value; 
                localStorage.setItem('lang', state.language);
                // Refresh to apply global direction changes
                window.location.reload(); 
            }
        },
            el('option', { value: 'en', selected: state.language === 'en' }, 'English'),
            el('option', { value: 'ar', selected: state.language === 'ar' }, 'العربية (Arabic)')
        )
    );
    // Create a horizontal row for Appearance and Language
    const topRow = el('div', { 
        style: 'display: flex; gap: 20px; align-items: stretch; margin-bottom: 20px;' 
    },
        // Appearance Section
        el('div', { className: 'content-card', style: 'flex: 1; margin: 0;' },
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
        // Language Section (moved into the row)
        el('div', { className: 'content-card', style: 'flex: 1; margin: 0;' },
            el('div', { className: 'section-title' }, state.language === 'ar' ? 'اللغة' : 'Language'),
            el('select', {
                className: 'branch-select',
                onchange: (e) => { 
                    state.language = e.target.value; 
                    localStorage.setItem('lang', state.language);
                    window.location.reload(); 
                }
            },
                el('option', { value: 'en', selected: state.language === 'en' }, 'English'),
                el('option', { value: 'ar', selected: state.language === 'ar' }, 'العربية (Arabic)')
            )
        )
    );

    container.append(
        el('div', { className: 'view-header' },
            el('h1', {}, 'Settings'),
            el('p', { className: 'view-subtitle' }, 'Branch & System Preferences')
        ),
        topRow,
        inventorySection,
        pricingSection
    );

    return [container];
}

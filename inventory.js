// inventory.js
import { renderCustomDropdown } from './app.js'; // Ensure it's exported in app.js

export function renderInventoryView(state, el, supabaseClient, showToast, navigateTo) {
    const container = el('div', { className: 'view-container' });
    const listContainer = el('div', { className: 'staff-list-grid' });
    const filterBarContainer = el('div', { className: 'content-card', style: 'margin-bottom: 20px;' });
    const sentinel = el('div', { style: 'height: 40px; width: 100%; margin-top: 20px;' });
    
    let page = 0;
    const itemsPerPage = 10;
    let loading = false;
    let hasMore = true;
    let config = { categories: [] };

    // --- State for Filters ---
    let selectedCatEn = '';
    let selectedSubEn = '';
    const searchInput = el('input', { 
        type: 'text', 
        placeholder: 'Search name... / ابحث عن الاسم', 
        className: 'form-input',
        oninput: () => refreshList()
    });

    const refreshList = () => {
        page = 0;
        hasMore = true;
        listContainer.replaceChildren();
        loadInventory();
    };

    const renderFilters = () => {
        filterBarContainer.innerHTML = '';
        
        // Prepare Category Options
        const catOptions = [
            { id: '', label: 'All Categories' },
            ...config.categories.map(c => ({ id: c.name.en, label: `${c.name.en} / ${c.name.ar}` }))
        ];

        // Prepare Sub-Category Options
        const selectedCategory = config.categories.find(c => c.name.en === selectedCatEn);
        const subOptions = [{ id: '', label: 'All Sub-Categories' }];
        if (selectedCategory) {
            selectedCategory.subCategories.forEach(s => {
                subOptions.push({ id: s.en, label: `${s.en} / ${s.ar || ''}` });
            });
        }

        const grid = el('div', { 
            style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;' 
        }, 
            searchInput,
            // Category Dropdown
            renderCustomDropdown(catOptions, selectedCatEn, (id) => {
                selectedCatEn = id;
                selectedSubEn = ''; // Reset sub-cat when category changes
                renderFilters();
                refreshList();
            }, 'Category'),
            // Sub-Category Dropdown
            renderCustomDropdown(subOptions, selectedSubEn, (id) => {
                selectedSubEn = id;
                renderFilters();
                refreshList();
            }, 'Sub-Category'),
            // Clear Button
            el('button', { 
                className: 'primary-btn', 
                style: 'background: var(--border); color: var(--text);',
                onclick: () => {
                    searchInput.value = '';
                    selectedCatEn = '';
                    selectedSubEn = '';
                    renderFilters();
                    refreshList();
                }
            }, 'Clear')
        );

        filterBarContainer.appendChild(grid);
    };

    async function loadInventory() {
        if (loading || !hasMore) return;
        loading = true;
        
        const loader = el('p', { className: 'loader', textContent: 'Loading...' });
        listContainer.appendChild(loader);

        let query = supabaseClient
            .from('inventory')
            .select('*')
            .eq('branch_id', state.selectedBranchId)
            .order('created_at', { ascending: false })
            .range(page * itemsPerPage, (page + 1) * itemsPerPage - 1);

        if (selectedCatEn) query = query.eq('details->category->>en', selectedCatEn);
        if (selectedSubEn) query = query.eq('details->sub_category->>en', selectedSubEn);
        if (searchInput.value.trim() !== '') {
            const term = `%${searchInput.value.trim()}%`;
            query = query.or(`details->name->>en.ilike.${term},details->name->>ar.ilike.${term}`);
        }

        const { data, error } = await query;
        loader.remove();

        if (error) {
            listContainer.appendChild(el('p', { className: 'error', textContent: error.message }));
            loading = false;
            return;
        }

        if (data.length < itemsPerPage) hasMore = false;
        if (data.length === 0 && page === 0) {
            listContainer.appendChild(el('div', { className: 'empty-state', textContent: 'No items found | لا يوجد أصناف' }));
        }

        data.forEach(item => {
            const info = item.details || {};
            const adjustWidth = (input) => { input.style.width = (input.value.length + 1.5) + 'ch'; };

            const updateStock = async (newVal, input) => {
                const { error } = await supabaseClient
                    .from('inventory')
                    .update({ stock: parseInt(newVal) || 0 })
                    .eq('id', item.id);
                
                if (error) {
                    showToast(error.message, 'error');
                } else {
                    showToast('Stock updated | تم تحديث المخزون', 'success');
                    adjustWidth(input);
                }
            };

            const card = el('div', { className: 'staff-card' },
                el('div', { style: 'display: grid; grid-template-columns: 1fr auto 1fr; gap: 15px; align-items: center;' },
                    el('div', { style: 'text-align: left;' },
                        el('div', { className: 'staff-name', textContent: info.name?.en || 'N/A' }),
                        el('div', { className: 'grid-label', textContent: info.sub_category?.en || '' }),
                        el('div', { style: 'font-size: 0.75rem; opacity: 0.5;', textContent: info.category?.en || '' })
                    ),
                    el('div', { style: 'text-align: center;' },
                        (() => {
                            const input = el('input', {
                                type: 'number', value: item.stock,
                                style: 'font-size: 2rem; font-weight: 800; color: var(--primary); border: none; background: transparent; text-align: center; outline: none; padding: 0; min-width: 40px;',
                                oninput: (e) => adjustWidth(e.target),
                                onchange: (e) => updateStock(e.target.value, e.target)
                            });
                            setTimeout(() => adjustWidth(input), 0);
                            return input;
                        })(),
                        el('div', { style: 'font-size: 0.65rem; opacity: 0.6; text-transform: uppercase;' }, 'Stock')
                    ),
                    el('div', { style: 'text-align: right;', dir: 'rtl' },
                        el('div', { className: 'staff-name', textContent: info.name?.ar || 'N/A' }),
                        el('div', { className: 'grid-label', textContent: info.sub_category?.ar || '' }),
                        el('div', { style: 'font-size: 0.75rem; opacity: 0.5;', textContent: info.category?.ar || '' })
                    )
                )
            );
            listContainer.appendChild(card);
        });

        page++;
        loading = false;
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadInventory();
    }, { threshold: 0.1 });
    observer.observe(sentinel);

    // Initial Load
    (async () => {
        const { data } = await supabaseClient.from('org_branches').select('inventory_config').eq('branch_id', state.selectedBranchId).single();
        if (data?.inventory_config) config = data.inventory_config;
        renderFilters();
        loadInventory();
    })();

    const header = el('div', { className: 'view-header' },
        el('div', {},
            el('h1', { textContent: 'Inventory' }),
            el('p', { className: 'view-subtitle', textContent: 'Manage your branch stock' })
        ),
        el('button', { className: 'primary-btn', onclick: () => navigateTo('add-inventory-item'), textContent: '+ Add | إضافة' })
    );

    container.append(header, filterBarContainer, listContainer, sentinel);
    return [container];
}

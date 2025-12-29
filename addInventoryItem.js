// addInventoryItem.js
export function renderAddItemView(state, el, supabaseClient, showToast,onComplete) {
    const container = el('div', { className: 'view-container' });
    let config = { categories: [] };

    // Form Elements
    const nameEn = el('input', { type: 'text', placeholder: 'Item Name (English)', className: 'form-input' });
    const nameAr = el('input', { type: 'text', placeholder: 'اسم الصنف (عربي)', className: 'form-input', dir: 'rtl' });
    const catSelect = el('select', { className: 'form-input' });
    const subSelect = el('select', { className: 'form-input', disabled: true });
    const stockInput = el('input', { type: 'number', placeholder: 'Initial Stock Quantity', className: 'form-input', value: '0' });

    catSelect.onchange = (e) => {
        const selected = config.categories.find(c => c.name.en === e.target.value);
        subSelect.replaceChildren(el('option', { value: '' }, 'Select Sub-Category'));
        if (selected && selected.subCategories) {
            selected.subCategories.forEach(s => {
                subSelect.appendChild(el('option', { value: s.en }, `${s.en} / ${s.ar || ''}`));
            });
            subSelect.disabled = false;
        } else {
            subSelect.disabled = true;
        }
    };

    const handleSave = async (btn) => {
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const selectedCat = config.categories.find(c => c.name.en === catSelect.value);
        const selectedSub = selectedCat?.subCategories.find(s => s.en === subSelect.value);

        const { error } = await supabaseClient.from('inventory').insert([{
            branch_id: state.selectedBranchId,
            stock: parseInt(stockInput.value) || 0,
            details: {
                name: { en: nameEn.value, ar: nameAr.value },
                category: selectedCat ? selectedCat.name : null,
                sub_category: selectedSub || null
            }
        }]);

        if (!error) {
            onComplete();
        } else {
            alert('Error saving item: ' + error.message);
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };

    // Header
    const header = el('div', { className: 'view-header' },
        el('div', {},
            el('h1', { textContent: 'New Item' }),
            el('p', { className: 'view-subtitle', textContent: 'Add items to your inventory' })
        )
    );

    // Form Card
    const formCard = el('div', { className: 'content-card' },
        el('div', { className: 'form-group' }, el('label', { className: 'section-title', textContent: 'Category' }), catSelect),
        el('div', { className: 'form-group' }, el('label', { className: 'section-title', textContent: 'Sub-Category' }), subSelect),
        el('div', { className: 'form-group' }, el('label', { className: 'section-title', textContent: 'Names' }), nameEn, nameAr),
        el('div', { className: 'form-group' }, el('label', { className: 'section-title', textContent: 'Initial Stock' }), stockInput),
        el('div', { className: 'flex-row', style: 'margin-top: 10px' },
            el('button', { 
                className: 'primary-btn', 
                style: 'flex: 1',
                onclick: (e) => handleSave(e.target), 
                textContent: 'Save Item' 
            }),
            el('button', { 
                className: 'nav-item', 
                style: 'background: var(--bg); border: 1px solid var(--border)',
                onclick: onComplete, 
                textContent: 'Cancel' 
            })
        )
    );

    (async () => {
        const { data } = await supabaseClient.from('org_branches').select('inventory_config').eq('branch_id', state.selectedBranchId).single();
        if (data?.inventory_config) {
            config = data.inventory_config;
            catSelect.replaceChildren(el('option', { value: '' }, 'Select Category'));
            config.categories.forEach(c => {
                catSelect.appendChild(el('option', { value: c.name.en }, `${c.name.en} / ${c.name.ar}`));
            });
        }
    })();

    container.append(header, formCard);
    return [container];
}

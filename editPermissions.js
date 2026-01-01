export function renderEditPermissionsView(state, el, supabase, navigateTo, showToast, t) {
    const container = el('div', { className: 'view-animated' });
    const staffMember = state.viewData; // Expects {user_id, name, branch_id}

    if (!staffMember) {
        navigateTo('staff');
        return [container];
    }

    const header = el('div', { className: 'view-header' },
        el('div', {}, 
            el('button', { className: 'back-btn', onclick: () => window.history.back() }, '←'),
            el('h2', { style: 'margin: 0;' }, `Permissions: ${staffMember.name}`),
            el('p', { className: 'view-subtitle' }, 'Toggle specific access rights for this branch')
        )
    );

    const permissionsGrid = el('div', { className: 'permissions-grid' });

    // Helper to create a toggle row
    const createToggle = (label, column, currentVal) => {
        const checkbox = el('input', { 
            type: 'checkbox', 
            checked: currentVal,
            className: 'perm-switch',
            onchange: async (e) => {
                const isChecked = e.target.checked;
                const { error } = await supabase
                    .from('user_branches')
                    .update({ [column]: isChecked })
                    .match({ user_id: staffMember.user_id, branch_id: state.selectedBranchId });

                if (error) {
                    showToast(error.message, 'error');
                    e.target.checked = !isChecked; // Revert UI
                } else {
                    showToast(t('permissionsUpdated', state.language));
                }
            }
        });

        return el('div', { className: 'perm-item' },
            el('span', { className: 'perm-label' }, label),
            el('label', { className: 'switch' }, checkbox, el('span', { className: 'slider' }))
        );
    };

    const modules = [
        { key: 'pat', name: 'Patients' },
        { key: 'apt', name: 'Appointments' },
        { key: 'staff', name: 'Staff' },
        { key: 'inv', name: 'Inventory' }
    ];

    async function loadPermissions() {
        permissionsGrid.innerHTML = '<div class="loader">Loading...</div>';
        
        const { data, error } = await supabase
            .from('user_branches')
            .select('*')
            .match({ user_id: staffMember.user_id, branch_id: state.selectedBranchId })
            .single();

        if (error) {
            permissionsGrid.innerHTML = `<div class="error">${error.message}</div>`;
            return;
        }

        permissionsGrid.innerHTML = '';
        modules.forEach(mod => {
            const section = el('div', { className: 'perm-section' }, el('h3', {}, mod.name));
            ['r', 'c', 'u', 'd'].forEach(action => {
                const actionLabels = { r: 'Read', c: 'Create', u: 'Update', d: 'Delete' };
                const colName = `${mod.key}_${action}`;
                section.appendChild(createToggle(actionLabels[action], colName, data[colName]));
            });
            permissionsGrid.appendChild(section);
        });
    }

    loadPermissions();
    container.append(header, permissionsGrid);
    return [container];
}

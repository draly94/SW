export function renderStaffView(state, el, supabase, navigateTo) {
    const container = el('div', { className: 'view-animated' });
    const staffListContainer = el('div', { className: 'staff-list-grid' });
    
    // Header with Filter
    const filterSelect = el('select', {
        className: 'compact-filter',
        onchange: (e) => fetchAndRenderStaff(e.target.value)
    }, 
        el('option', { value: 'all' }, 'All Roles'),
        el('option', { value: 'admin' }, 'Admin'),
        el('option', { value: 'dentist' }, 'Dentist'),
        el('option', { value: 'nurse' }, 'Nurse'),
        el('option', { value: 'receptionist' }, 'Receptionist'),
        el('option', { value: 'janitor' }, 'Janitor')
    );

    const header = el('div', { className: 'view-header' },
        el('div', {}, 
            el('h2', { style: 'margin: 0;' }, 'Staff Directory'),
            el('p', { className: 'view-subtitle' }, 'Manage team members and roles for this branch')
        ),
        filterSelect,
        el('button', { 
            className: 'primary-btn', 
            onclick: () => navigateTo('add-staff')
        }, '+ Add Member')
    );
    
    /**
     * Resend an invitation
     */
async function resendInvitation(email, btn) {
    const originalText = btn.innerText;
    btn.innerText = 'Sending...';
    btn.disabled = true;

    try {
        // 1. Update the database timestamp (for your internal tracking)
        const { error: dbError } = await supabase
            .from('invitations')
            .update({ created_at: new Date().toISOString() })
            .match({ email: email, branch_id: state.selectedBranchId });

        if (dbError) throw dbError;

        // 2. Trigger the actual Magic Link email from Supabase Auth
        const { error: authError } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                // This ensures they are redirected back to your registration flow
                emailRedirectTo: window.location.origin, 
                // Set to false if you want to ensure only pre-invited emails work
                shouldCreateUser: false 
            }
        });

        if (authError) throw authError;

        alert(`Success! A Magic Link has been sent to ${email}`);
    } catch (err) {
        console.error('Resend failed:', err);
        alert('Error: ' + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


    /**
     * Fetches both active staff and pending invitations
     */
    async function fetchAndRenderStaff(roleFilter = 'all') {
        staffListContainer.innerHTML = '<div class="loader">Loading staff directory...</div>';
        
        try {
            // 1. Fetch active users linked to this branch
            let staffQuery = supabase
                .from('user_branches')
                .select(`
                    role,
                    user_id,
                    profiles:user_id (name, email, phone)
                `)
                .eq('branch_id', state.selectedBranchId);

            // 2. Fetch pending invitations for this branch (Including NAME)
            let inviteQuery = supabase
                .from('invitations')
                .select(`role, email, name`)
                .eq('branch_id', state.selectedBranchId);

            if (roleFilter !== 'all') {
                staffQuery = staffQuery.eq('role', roleFilter);
                inviteQuery = inviteQuery.eq('role', roleFilter);
            }

            const [staffRes, inviteRes] = await Promise.all([staffQuery, inviteQuery]);

            if (staffRes.error) throw staffRes.error;
            if (inviteRes.error) throw inviteRes.error;

            staffListContainer.innerHTML = '';
            
            // Combine datasets
            const activeStaff = staffRes.data || [];
            const pendingInvites = (inviteRes.data || []).map(inv => ({ ...inv, isPending: true }));
            const allItems = [...activeStaff, ...pendingInvites];

            if (allItems.length === 0) {
                staffListContainer.append(el('p', { className: 'empty-state' }, 'No staff members or invitations found.'));
                return;
            }

            allItems.forEach(item => {
                const isPending = item.isPending;
                const profile = item.profiles || {};
                
                // Display Name Logic:
                // If pending: use name from invitations table
                // If active: use name from profiles table
                const displayName = isPending ? (item.name || 'Invited User') : (profile.name || 'Unknown User');
                const displayEmail = isPending ? item.email : (profile.email || 'No email');

                const card = el('div', { className: `staff-card ${isPending ? 'pending-invite' : ''}` },
                    isPending ? el('div', { className: 'status-badge-container' }, 
                        el('span', { className: 'badge-pending' }, 'PENDING')
                    ) : null,

                    el('div', { className: 'staff-name' }, displayName),
                    el('div', { className: 'staff-role-badge' }, item.role.toUpperCase()),
                    
                    el('div', { className: 'staff-contact' }, 
                        el('span', {}, displayEmail),
                        !isPending ? el('span', { style: 'opacity: 0.7;' }, profile.phone || '') : null
                    )
                );

                if (isPending) {
                    const resendBtn = el('button', {
                        className: 'resend-btn',
                        style: 'margin-top: 12px; font-size: 0.8rem; padding: 4px 8px; cursor: pointer;',
                        onclick: (e) => resendInvitation(item.email, e.target)
                    }, '↺ Resend Invite');
                    card.appendChild(resendBtn);
                }

                staffListContainer.appendChild(card);
            });

        } catch (err) {
            staffListContainer.innerHTML = `<div class="error">Error loading staff: ${err.message}</div>`;
        }
    }

    fetchAndRenderStaff();

    container.append(header, staffListContainer);
    return [container];
}

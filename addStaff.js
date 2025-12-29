export function renderAddStaffView(state, el, supabase, onBack) {
    const container = el('div', { className: 'view-animated' });

    // Header
    const header = el('div', { className: 'view-header' },
        el('div', {}, 
            el('h2', { style: 'margin: 0;' }, 'Invite Staff Member'),
            el('p', { className: 'view-subtitle' }, 'The member will be added to the currently selected branch')
        ),
        el('button', { className: 'secondary-btn', onclick: onBack }, 'Cancel')
    );

    // Form Elements
    const nameInp = el('input', { type: 'text', placeholder: 'Full Name', className: 'form-input' });
    const emailInp = el('input', { type: 'email', placeholder: 'Email Address', className: 'form-input' });
    const phoneInp = el('input', { type: 'tel', placeholder: 'Phone Number', className: 'form-input' });
    
    const roleSelect = el('select', { className: 'form-input' },
        el('option', { value: 'nurse' }, 'Nurse'),
        el('option', { value: 'dentist' }, 'Dentist'),
        el('option', { value: 'receptionist' }, 'Receptionist'),
        el('option', { value: 'admin' }, 'Admin'),
        el('option', { value: 'janitor' }, 'Janitor')
    );

    const submitBtn = el('button', { 
        className: 'primary-btn', 
        style: 'width: 100%; margin-top: 20px;',
        onclick: () => handleInvite()
    }, 'Send Invitation');

    async function handleInvite() {
        const email = emailInp.value.trim().toLowerCase();
        const name = nameInp.value.trim();
        const phone = phoneInp.value.trim();
        const role = roleSelect.value;

        if (!email || !name) return alert("Please enter Name and Email");

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        // 1. Insert into invitations table with name and phone
        const { error: inviteErr } = await supabase
            .from('invitations')
            .insert({ 
                email, 
                role, 
                name, // New field
                phone, // New field
                branch_id: state.selectedBranchId // Automatically uses the selected branch
            });

        if (inviteErr) {
            alert("Invite failed: " + inviteErr.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Invitation';
            return;
        }

        // 2. Send Magic Link
        const { error: authErr } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin }
        });

        if (authErr) alert("Email failed: " + authErr.message);
        else {
            alert("Invitation sent to " + email);
            onBack();
        }
    }

    const formCard = el('div', { className: 'auth-card', style: 'max-width: 500px; margin: 2rem auto;' },
        el('div', { className: 'form-group' }, el('label', {}, 'Full Name'), nameInp),
        el('div', { className: 'form-group' }, el('label', {}, 'Email'), emailInp),
        el('div', { className: 'form-group' }, el('label', {}, 'Phone'), phoneInp),
        el('div', { className: 'form-group' }, el('label', {}, 'Role'), roleSelect),
        submitBtn
    );

    container.append(header, formCard);
    return [container];
}

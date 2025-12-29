// profile.js
export function renderProfileView(session, el, supabaseClient, showToast) {
    const user = session.user;

    // 1. Local state for inputs
    const inputs = {
        name: el('input', { type: 'text', placeholder: 'Loading name...', className: 'form-input' }),
        // Email is readOnly because we are not syncing with Auth system
        email: el('input', { type: 'email', value: user.email, className: 'form-input', readOnly: true, style: 'opacity: 0.7; cursor: not-allowed;' }),
        phone: el('input', { type: 'tel', placeholder: 'Loading phone...', className: 'form-input' })
    };

    // 2. Fetch data from 'profiles' table immediately (Sync compatible for app.js)
    supabaseClient
        .from('profiles')
        .select('name, email, phone')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
            if (error) {
                // If no record exists yet, just show empty fields
                inputs.name.value = '';
                inputs.phone.value = '';
            } else if (data) {
                inputs.name.value = data.name || '';
                inputs.phone.value = data.phone || '';
            }
        });

    // 3. Update Handler (Strictly Profiles Table)
    const handleUpdate = async (e) => {
        const btn = e.target;
        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
            const { error: dbError } = await supabaseClient
                .from('profiles')
                .upsert({
                    user_id: user.id,
                    name: inputs.name.value,
                    email: user.email, // Keep consistent with auth email
                    phone: inputs.phone.value
                });

            if (dbError) throw dbError;

            showToast('Profile updated successfully!');

        } catch (err) {
            showToast(err.message, 'error');
            console.error('Database Update Error:', err);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    };

    // 4. Return UI elements (Synchronous array for app.js router)
    return [
        el('div', { className: 'view-header' },
            el('h1', {}, 'User Profile'),
            el('p', { className: 'view-subtitle' }, 'Update your personal information')
        ),
        el('div', { className: 'content-card profile-form' },
            el('div', { className: 'section-title' }, 'Account Details'),
            
            el('div', { className: 'form-group' },
                el('label', {}, 'Full Name'),
                inputs.name
            ),
            el('div', { className: 'form-group' },
                el('label', {}, 'Email Address'),
                inputs.email
            ),
            el('div', { className: 'form-group' },
                el('label', {}, 'Phone Number'),
                inputs.phone
            ),

            el('button', { 
                className: 'primary-btn', 
                style: 'margin-top: 20px; width: 100%;',
                onclick: handleUpdate 
            }, 'Save Changes')
        )
    ];
}

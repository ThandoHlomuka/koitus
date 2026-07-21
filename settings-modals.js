// ==================== RENDER SETTINGS ====================
function renderSettings() {
    var container = document.getElementById('view-settings');
    if (!container) return;

    var notificationsEnabled = localStorage.getItem('koitus_notifications') !== 'false';
    var locationEnabled = localStorage.getItem('koitus_location') !== 'false';
    var darkMode = document.body.classList.contains('dark');

    container.innerHTML =
        '<div class="view-header">' +
            '<h1>Settings</h1>' +
        '</div>' +
        '<div class="settings-container">' +
            '<div class="settings-section">' +
                '<h3>Account</h3>' +
                '<div class="settings-list">' +
                    '<div class="settings-item" onclick="showEditProfileModal()">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-user"></i>' +
                            '<span>Edit Profile</span>' +
                        '</div>' +
                        '<button class="btn btn-icon btn-sm">' +
                            '<i class="fas fa-chevron-right"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="settings-item" onclick="showChangePasswordModal()">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-lock"></i>' +
                            '<span>Change Password</span>' +
                        '</div>' +
                        '<button class="btn btn-icon btn-sm">' +
                            '<i class="fas fa-chevron-right"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="settings-item" onclick="showPrivacyModal()">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-shield-alt"></i>' +
                            '<span>Privacy Settings</span>' +
                        '</div>' +
                        '<button class="btn btn-icon btn-sm">' +
                            '<i class="fas fa-chevron-right"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="settings-section">' +
                '<h3>Preferences</h3>' +
                '<div class="settings-list">' +
                    '<div class="settings-item">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-bell"></i>' +
                            '<span>Notifications</span>' +
                        '</div>' +
                        '<label class="toggle-switch">' +
                            '<input type="checkbox" id="toggle-notifications" ' + (notificationsEnabled ? 'checked' : '') + ' onchange="var t=this;localStorage.setItem(\'koitus_notifications\',t.checked);showNotification(\'Notifications \'+(t.checked?\'enabled\':\'disabled\'),\'info\')">' +
                            '<span class="toggle-slider"></span>' +
                        '</label>' +
                    '</div>' +
                    '<div class="settings-item">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-location-arrow"></i>' +
                            '<span>Location Services</span>' +
                        '</div>' +
                        '<label class="toggle-switch">' +
                            '<input type="checkbox" id="toggle-location" ' + (locationEnabled ? 'checked' : '') + ' onchange="var t=this;localStorage.setItem(\'koitus_location\',t.checked);showNotification(\'Location services \'+(t.checked?\'enabled\':\'disabled\'),\'info\')">' +
                            '<span class="toggle-slider"></span>' +
                        '</label>' +
                    '</div>' +
                    '<div class="settings-item">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-moon"></i>' +
                            '<span>Dark Mode</span>' +
                        '</div>' +
                        '<label class="toggle-switch">' +
                            '<input type="checkbox" id="toggle-dark-mode" ' + (darkMode ? 'checked' : '') + ' onchange="document.body.classList.toggle(\'dark\',this.checked);localStorage.setItem(\'koitus_dark_mode\',this.checked);showNotification(\'Dark mode \'+(this.checked?\'enabled\':\'disabled\'),\'info\')">' +
                            '<span class="toggle-slider"></span>' +
                        '</label>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="settings-section">' +
                '<h3>Support</h3>' +
                '<div class="settings-list">' +
                    '<div class="settings-item" onclick="showHelpCenterModal()">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-question-circle"></i>' +
                            '<span>Help Center</span>' +
                        '</div>' +
                        '<button class="btn btn-icon btn-sm">' +
                            '<i class="fas fa-chevron-right"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="settings-item" onclick="showContactModal()">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-envelope"></i>' +
                            '<span>Contact Us</span>' +
                        '</div>' +
                        '<button class="btn btn-icon btn-sm">' +
                            '<i class="fas fa-chevron-right"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="settings-item" onclick="showTermsModal()">' +
                        '<div class="settings-item-info">' +
                            '<i class="fas fa-file-alt"></i>' +
                            '<span>Terms of Service</span>' +
                        '</div>' +
                        '<button class="btn btn-icon btn-sm">' +
                            '<i class="fas fa-chevron-right"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="settings-section danger-zone">' +
                '<button class="btn btn-danger btn-block" onclick="deleteAccount()">' +
                    '<i class="fas fa-trash"></i> Delete Account' +
                '</button>' +
            '</div>' +
        '</div>';
}

// ==================== EDIT PROFILE MODAL ====================
function showEditProfileModal() {
    var existing = document.getElementById('edit-profile-modal');
    if (existing) existing.remove();

    var u = state.currentUser;
    var interestsStr = (u.interests || []).join(', ');

    var html =
        '<div id="edit-profile-modal" class="modal-overlay" style="display:flex;" onclick="closeEditProfileModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:520px">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-user-edit"></i> Edit Profile</h2>' +
                    '<button class="modal-close" onclick="closeEditProfileModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<form id="edit-profile-form" onsubmit="saveEditProfile(event)">' +
                        '<div class="form-group">' +
                            '<label for="ep-name">Name</label>' +
                            '<input type="text" id="ep-name" required value="' + (u.name || '') + '">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="ep-age">Age</label>' +
                            '<input type="number" id="ep-age" required min="18" max="120" value="' + (u.age || '') + '">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="ep-bio">Bio</label>' +
                            '<textarea id="ep-bio" rows="3">' + (u.bio || '') + '</textarea>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="ep-interests">Interests (comma separated)</label>' +
                            '<input type="text" id="ep-interests" value="' + interestsStr + '">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="ep-location">Location</label>' +
                            '<input type="text" id="ep-location" value="' + (u.location || '') + '">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="ep-looking">Looking For</label>' +
                            '<select id="ep-looking">' +
                                '<option value="friendship" ' + (u.lookingFor === 'friendship' ? 'selected' : '') + '>Friendship</option>' +
                                '<option value="dating" ' + (u.lookingFor === 'dating' ? 'selected' : '') + '>Dating</option>' +
                                '<option value="relationship" ' + (u.lookingFor === 'relationship' ? 'selected' : '') + '>Relationship</option>' +
                                '<option value="networking" ' + (u.lookingFor === 'networking' ? 'selected' : '') + '>Networking</option>' +
                                '<option value="casual" ' + (u.lookingFor === 'casual' ? 'selected' : '') + '>Casual</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="modal-actions">' +
                            '<button type="button" class="btn btn-ghost" onclick="closeEditProfileModal()">Cancel</button>' +
                            '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function closeEditProfileModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('edit-profile-modal');
        if (modal) modal.remove();
    }
}

function saveEditProfile(event) {
    event.preventDefault();
    state.currentUser.name = document.getElementById('ep-name').value;
    state.currentUser.age = parseInt(document.getElementById('ep-age').value);
    state.currentUser.bio = document.getElementById('ep-bio').value;
    state.currentUser.interests = document.getElementById('ep-interests').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    state.currentUser.location = document.getElementById('ep-location').value;
    state.currentUser.lookingFor = document.getElementById('ep-looking').value;
    localStorage.setItem('koitus_user', JSON.stringify(state.currentUser));
    closeEditProfileModal();
    renderProfile();
    showNotification('Profile updated successfully!', 'success');
}

// ==================== CHANGE PASSWORD MODAL ====================
function showChangePasswordModal() {
    var existing = document.getElementById('change-password-modal');
    if (existing) existing.remove();

    var html =
        '<div id="change-password-modal" class="modal-overlay" style="display:flex;" onclick="closeChangePasswordModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:440px">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-lock"></i> Change Password</h2>' +
                    '<button class="modal-close" onclick="closeChangePasswordModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<form id="change-password-form" onsubmit="saveChangePassword(event)">' +
                        '<div class="form-group">' +
                            '<label for="cp-current">Current Password</label>' +
                            '<input type="password" id="cp-current" required>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="cp-new">New Password</label>' +
                            '<input type="password" id="cp-new" required minlength="6">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="cp-confirm">Confirm New Password</label>' +
                            '<input type="password" id="cp-confirm" required minlength="6">' +
                        '</div>' +
                        '<div class="modal-actions">' +
                            '<button type="button" class="btn btn-ghost" onclick="closeChangePasswordModal()">Cancel</button>' +
                            '<button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Update Password</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function closeChangePasswordModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('change-password-modal');
        if (modal) modal.remove();
    }
}

function saveChangePassword(event) {
    event.preventDefault();
    var current = document.getElementById('cp-current').value;
    var newPass = document.getElementById('cp-new').value;
    var confirm = document.getElementById('cp-confirm').value;

    if (newPass !== confirm) {
        showNotification('New passwords do not match.', 'error');
        return;
    }
    if (newPass.length < 6) {
        showNotification('Password must be at least 6 characters.', 'warning');
        return;
    }

    closeChangePasswordModal();
    showNotification('Password changed successfully!', 'success');
}

// ==================== PRIVACY MODAL ====================
function showPrivacyModal() {
    var existing = document.getElementById('privacy-modal');
    if (existing) existing.remove();

    var settings = JSON.parse(localStorage.getItem('koitus_privacy') || '{}');

    var html =
        '<div id="privacy-modal" class="modal-overlay" style="display:flex;" onclick="closePrivacyModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:480px">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-shield-alt"></i> Privacy Settings</h2>' +
                    '<button class="modal-close" onclick="closePrivacyModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<form id="privacy-form" onsubmit="savePrivacySettings(event)">' +
                        '<div class="form-group">' +
                            '<label for="priv-profile-visibility">Who can see my profile</label>' +
                            '<select id="priv-profile-visibility">' +
                                '<option value="everyone" ' + (settings.profileVisibility !== 'nobody' && settings.profileVisibility !== 'matches' ? 'selected' : '') + '>Everyone</option>' +
                                '<option value="matches" ' + (settings.profileVisibility === 'matches' ? 'selected' : '') + '>My Matches Only</option>' +
                                '<option value="nobody" ' + (settings.profileVisibility === 'nobody' ? 'selected' : '') + '>Nobody</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="priv-messaging">Who can message me</label>' +
                            '<select id="priv-messaging">' +
                                '<option value="everyone" ' + (settings.messaging !== 'matches' && settings.messaging !== 'nobody' ? 'selected' : '') + '>Everyone</option>' +
                                '<option value="matches" ' + (settings.messaging === 'matches' ? 'selected' : '') + '>My Matches Only</option>' +
                                '<option value="nobody" ' + (settings.messaging === 'nobody' ? 'selected' : '') + '>Nobody</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="settings-item" style="padding:12px 0">' +
                            '<div class="settings-item-info">' +
                                '<span>Show Online Status</span>' +
                            '</div>' +
                            '<label class="toggle-switch">' +
                                '<input type="checkbox" id="priv-online-status" ' + (settings.showOnlineStatus !== false ? 'checked' : '') + '>' +
                                '<span class="toggle-slider"></span>' +
                            '</label>' +
                        '</div>' +
                        '<div class="settings-item" style="padding:12px 0">' +
                            '<div class="settings-item-info">' +
                                '<span>Show Distance</span>' +
                            '</div>' +
                            '<label class="toggle-switch">' +
                                '<input type="checkbox" id="priv-show-distance" ' + (settings.showDistance !== false ? 'checked' : '') + '>' +
                                '<span class="toggle-slider"></span>' +
                            '</label>' +
                        '</div>' +
                        '<div class="modal-actions">' +
                            '<button type="button" class="btn btn-ghost" onclick="closePrivacyModal()">Cancel</button>' +
                            '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Privacy</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function closePrivacyModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('privacy-modal');
        if (modal) modal.remove();
    }
}

function savePrivacySettings(event) {
    event.preventDefault();
    var settings = {
        profileVisibility: document.getElementById('priv-profile-visibility').value,
        messaging: document.getElementById('priv-messaging').value,
        showOnlineStatus: document.getElementById('priv-online-status').checked,
        showDistance: document.getElementById('priv-show-distance').checked
    };
    localStorage.setItem('koitus_privacy', JSON.stringify(settings));
    closePrivacyModal();
    showNotification('Privacy settings saved!', 'success');
}

// ==================== HELP CENTER MODAL ====================
function showHelpCenterModal() {
    var existing = document.getElementById('help-center-modal');
    if (existing) existing.remove();

    var faqs = [
        { q: 'How do I edit my profile?', a: 'Go to Settings > Account > Edit Profile. You can update your name, age, bio, interests, and more.' },
        { q: 'How do I find matches?', a: 'Use the Discover tab to browse profiles. Swipe right to like, left to pass. When someone likes you back, it\'s a match!' },
        { q: 'How does the forum work?', a: 'The Forum tab lets you create posts, reply to discussions, and vote on content. Browse categories to find topics that interest you.' },
        { q: 'Can I delete my account?', a: 'Yes. Go to Settings, scroll to the Danger Zone section, and click "Delete Account". This action is permanent.' },
        { q: 'How do I reset my password?', a: 'Go to Settings > Account > Change Password. Enter your current password and a new password, then confirm.' }
    ];

    var faqItems = faqs.map(function(f, i) {
        return '<div class="faq-item" style="border-bottom:1px solid var(--gray-200);padding:12px 0">' +
            '<div class="faq-question" onclick="toggleFaq(this)" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:500">' +
                '<span>' + f.q + '</span>' +
                '<i class="fas fa-chevron-down" style="transition:transform 0.2s;font-size:12px"></i>' +
            '</div>' +
            '<div class="faq-answer" style="display:none;padding-top:8px;color:var(--gray-600);font-size:0.9rem">' +
                f.a +
            '</div>' +
        '</div>';
    }).join('');

    var html =
        '<div id="help-center-modal" class="modal-overlay" style="display:flex;" onclick="closeHelpCenterModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:560px">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-question-circle"></i> Help Center</h2>' +
                    '<button class="modal-close" onclick="closeHelpCenterModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<p style="margin-bottom:16px;color:var(--gray-600)">Frequently Asked Questions</p>' +
                    '<div class="faq-list">' + faqItems + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function toggleFaq(el) {
    var answer = el.nextElementSibling;
    var icon = el.querySelector('.fa-chevron-down');
    if (answer.style.display === 'none' || answer.style.display === '') {
        answer.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    } else {
        answer.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
}

function closeHelpCenterModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('help-center-modal');
        if (modal) modal.remove();
    }
}

// ==================== CONTACT MODAL ====================
function showContactModal() {
    var existing = document.getElementById('contact-modal');
    if (existing) existing.remove();

    var html =
        '<div id="contact-modal" class="modal-overlay" style="display:flex;" onclick="closeContactModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:480px">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-envelope"></i> Contact Us</h2>' +
                    '<button class="modal-close" onclick="closeContactModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<form id="contact-form" onsubmit="submitContactForm(event)">' +
                        '<div class="form-group">' +
                            '<label for="contact-name">Name</label>' +
                            '<input type="text" id="contact-name" required>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="contact-email">Email</label>' +
                            '<input type="email" id="contact-email" required>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="contact-message">Message</label>' +
                            '<textarea id="contact-message" rows="4" required></textarea>' +
                        '</div>' +
                        '<div class="modal-actions">' +
                            '<button type="button" class="btn btn-ghost" onclick="closeContactModal()">Cancel</button>' +
                            '<button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Send</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function closeContactModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('contact-modal');
        if (modal) modal.remove();
    }
}

function submitContactForm(event) {
    event.preventDefault();
    closeContactModal();
    showNotification('Thank you! Your message has been sent.', 'success');
}

// ==================== TERMS OF SERVICE MODAL ====================
function showTermsModal() {
    var existing = document.getElementById('terms-modal');
    if (existing) existing.remove();

    var html =
        '<div id="terms-modal" class="modal-overlay" style="display:flex;" onclick="closeTermsModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:600px;max-height:80vh">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-file-alt"></i> Terms of Service</h2>' +
                    '<button class="modal-close" onclick="closeTermsModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body" style="overflow-y:auto;max-height:60vh;line-height:1.6">' +
                    '<h3>1. Acceptance of Terms</h3>' +
                    '<p>By accessing and using Koitus, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>' +
                    '<h3>2. User Accounts</h3>' +
                    '<p>You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old to use this service.</p>' +
                    '<h3>3. User Conduct</h3>' +
                    '<p>You agree not to post offensive, harassing, or illegal content. Respect other users and their privacy. Impersonation is strictly prohibited.</p>' +
                    '<h3>4. Content Ownership</h3>' +
                    '<p>You retain ownership of content you post. By posting, you grant Koitus a license to display your content within the platform.</p>' +
                    '<h3>5. Privacy</h3>' +
                    '<p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your data.</p>' +
                    '<h3>6. Limitation of Liability</h3>' +
                    '<p>Koitus is provided "as is." We are not liable for damages arising from your use of the platform, including interactions with other users.</p>' +
                    '<h3>7. Termination</h3>' +
                    '<p>We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.</p>' +
                    '<h3>8. Changes</h3>' +
                    '<p>We may update these terms at any time. Continued use after changes constitutes acceptance of the new terms.</p>' +
                    '<h3>9. Contact</h3>' +
                    '<p>For questions about these terms, please use the Contact Us form in Settings.</p>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function closeTermsModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('terms-modal');
        if (modal) modal.remove();
    }
}

// ==================== FIX renderStories FILTER ====================
function renderStories() {
    var container = document.getElementById('stories-container');
    if (!container) return;

    var stories = state.stories || [];
    var filter = state.storiesFilter || 'all';

    if (filter !== 'all') {
        stories = stories.filter(function(s) { return s.type && s.type.toLowerCase() === filter; });
    }

    if (stories.length === 0 && (!state.stories || state.stories.length === 0)) {
        container.innerHTML = '\
            <div class="stories-empty">\
                <div class="empty-icon"><i class="fas fa-book-open"></i></div>\
                <h3>No Stories Yet</h3>\
                <p>Be the first to share a story, poem, or blog post!</p>\
                <button class="btn btn-primary" onclick="showCreateStoryModal()">\
                    <i class="fas fa-plus"></i> Create Story\
                </button>\
            </div>';
        return;
    }

    if (stories.length === 0 && state.stories && state.stories.length > 0) {
        container.innerHTML = '\
            <div class="stories-categories scroll-x">\
                <button class="story-cat-btn" onclick="filterStories(\'all\')">All</button>\
                <button class="story-cat-btn" onclick="filterStories(\'ebook\')">E-Books</button>\
                <button class="story-cat-btn" onclick="filterStories(\'story\')">Stories</button>\
                <button class="story-cat-btn" onclick="filterStories(\'poem\')">Poems</button>\
                <button class="story-cat-btn" onclick="filterStories(\'blog\')">Blog Posts</button>\
                <button class="story-cat-btn" onclick="filterStories(\'article\')">Articles</button>\
                <button class="story-cat-btn" onclick="filterStories(\'puff\')">Puff Pieces</button>\
                <button class="story-cat-btn" onclick="filterStories(\'pdf\')">PDFs</button>\
            </div>\
            <div class="stories-empty" style="margin-top:20px">\
                <div class="empty-icon"><i class="fas fa-filter"></i></div>\
                <h3>No ' + filter + ' stories found</h3>\
                <p>Try a different category or create a new one!</p>\
            </div>';
        return;
    }

    container.innerHTML = '\
        <div class="stories-categories scroll-x">\
            <button class="story-cat-btn ' + (filter === 'all' ? 'active' : '') + '" onclick="filterStories(\'all\')">All</button>\
            <button class="story-cat-btn ' + (filter === 'ebook' ? 'active' : '') + '" onclick="filterStories(\'ebook\')">E-Books</button>\
            <button class="story-cat-btn ' + (filter === 'story' ? 'active' : '') + '" onclick="filterStories(\'story\')">Stories</button>\
            <button class="story-cat-btn ' + (filter === 'poem' ? 'active' : '') + '" onclick="filterStories(\'poem\')">Poems</button>\
            <button class="story-cat-btn ' + (filter === 'blog' ? 'active' : '') + '" onclick="filterStories(\'blog\')">Blog Posts</button>\
            <button class="story-cat-btn ' + (filter === 'article' ? 'active' : '') + '" onclick="filterStories(\'article\')">Articles</button>\
            <button class="story-cat-btn ' + (filter === 'puff' ? 'active' : '') + '" onclick="filterStories(\'puff\')">Puff Pieces</button>\
            <button class="story-cat-btn ' + (filter === 'pdf' ? 'active' : '') + '" onclick="filterStories(\'pdf\')">PDFs</button>\
        </div>\
        <div class="stories-grid" id="stories-grid">\
            ' + stories.map(function(s) { return '\
                <div class="story-card" onclick="openStory(\'' + s.id + '\')">\
                    <div class="story-card-image">\
                        <img src="' + (s.image || "https://picsum.photos/seed/" + s.id + "/400/300") + '" alt="' + s.title + '" loading="lazy">\
                        <span class="story-type-badge">' + s.type + '</span>\
                    </div>\
                    <div class="story-card-body">\
                        <h3>' + s.title + '</h3>\
                        <p class="story-excerpt">' + (s.excerpt || s.content.substring(0, 120)) + '</p>\
                        <div class="story-meta">\
                            <span class="story-author"><i class="fas fa-user"></i> ' + s.author + '</span>\
                            <span class="story-date">' + s.date + '</span>\
                            <span class="story-likes"><i class="fas fa-heart"></i> ' + (s.likes || 0) + '</span>\
                        </div>\
                    </div>\
                </div>\
            '; }).join('') + '\
        </div>';
}

// ==================== SHOW CREATE STORY MODAL ====================
function showCreateStoryModal() {
    var existing = document.getElementById('create-story-modal');
    if (existing) existing.remove();

    var html =
        '<div id="create-story-modal" class="modal-overlay" style="display:flex;" onclick="closeCreateStoryModal(event)">' +
            '<div class="modal-content" onclick="event.stopPropagation()" style="max-width:520px">' +
                '<div class="modal-header">' +
                    '<h2><i class="fas fa-feather-alt"></i> Create Story</h2>' +
                    '<button class="modal-close" onclick="closeCreateStoryModal()"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<form id="create-story-form" onsubmit="submitCreateStory(event)">' +
                        '<div class="form-group">' +
                            '<label for="cs-title">Title</label>' +
                            '<input type="text" id="cs-title" required placeholder="Enter a title for your story">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="cs-type">Type</label>' +
                            '<select id="cs-type" required>' +
                                '<option value="">Select type...</option>' +
                                '<option value="ebook">E-Book</option>' +
                                '<option value="story">Story</option>' +
                                '<option value="poem">Poem</option>' +
                                '<option value="blog">Blog Post</option>' +
                                '<option value="article">Article</option>' +
                                '<option value="puff">Puff Piece</option>' +
                                '<option value="pdf">PDF</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="cs-content">Content</label>' +
                            '<textarea id="cs-content" rows="6" required placeholder="Write your story here..."></textarea>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="cs-image">Image URL (optional)</label>' +
                            '<input type="url" id="cs-image" placeholder="https://example.com/image.jpg">' +
                        '</div>' +
                        '<div class="modal-actions">' +
                            '<button type="button" class="btn btn-ghost" onclick="closeCreateStoryModal()">Cancel</button>' +
                            '<button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Publish</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function closeCreateStoryModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('create-story-modal');
        if (modal) modal.remove();
    }
}

function submitCreateStory(event) {
    event.preventDefault();

    var newStory = {
        id: 'story_' + Date.now(),
        title: document.getElementById('cs-title').value,
        type: document.getElementById('cs-type').value,
        content: document.getElementById('cs-content').value,
        image: document.getElementById('cs-image').value || '',
        author: state.currentUser ? state.currentUser.name : 'Anonymous',
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        likes: 0,
        excerpt: document.getElementById('cs-content').value.substring(0, 120)
    };

    if (!state.stories) state.stories = [];
    state.stories.unshift(newStory);

    closeCreateStoryModal();
    state.storiesFilter = 'all';
    renderStories();
    showNotification('Your story has been published!', 'success');
}

// ==================== SUPABASE DATA ACCESS LAYER ====================
// Handles all CRUD operations, auth, and storage
// Note: All methods call getSupabase() internally for lazy initialization

// ==================== AUTH ====================

var AuthDB = {
    async signUp(email, password, profileData) {
        var sb = getSupabase();
        if (!sb) return this._fallbackSignUp(email, password, profileData);
        try {
            var { data, error } = await sb.auth.signUp({ email, password });
            if (error) throw error;
            if (data.user) {
                await sb.from('profiles').insert({
                    id: data.user.id,
                    email: email,
                    name: profileData.name || email.split('@')[0],
                    ...profileData
                });
            }
            return { user: data.user, error: null };
        } catch (e) {
            console.error('Auth signup error:', e);
            return this._fallbackSignUp(email, password, profileData);
        }
    },

    async signIn(email, password) {
        var sb = getSupabase();
        if (!sb) return this._fallbackSignIn(email, password);
        try {
            var { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return { user: data.user, error: null };
        } catch (e) {
            console.error('Auth signin error:', e);
            return this._fallbackSignIn(email, password);
        }
    },

    async signOut() {
        var sb = getSupabase();
        if (sb) {
            try { await sb.auth.signOut(); } catch (e) {}
        }
        state.currentUser = null;
        state.loggedIn = false;
        localStorage.removeItem('currentUser');
        if (typeof handleLogout === 'function') handleLogout();
    },

    async getSession() {
        var sb = getSupabase();
        if (!sb) return null;
        try {
            var { data } = await sb.auth.getSession();
            return data.session;
        } catch (e) { return null; }
    },

    async onAuthChange(callback) {
        var sb = getSupabase();
        if (!sb) return;
        sb.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // ---------- localStorage fallbacks ----------
    _fallbackSignUp(email, password, profileData) {
        var users = JSON.parse(localStorage.getItem('koitus_users') || '[]');
        if (users.find(function(u) { return u.email === email; })) {
            return { user: null, error: { message: 'User already exists' } };
        }
        var newUser = {
            id: 'local_' + Date.now(),
            email: email,
            name: profileData.name || email.split('@')[0],
            ...profileData,
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        localStorage.setItem('koitus_users', JSON.stringify(users));
        return { user: newUser, error: null };
    },

    _fallbackSignIn(email, password) {
        var users = JSON.parse(localStorage.getItem('koitus_users') || '[]');
        var user = users.find(function(u) { return u.email === email; });
        if (!user) {
            return { user: null, error: { message: 'Invalid email or password' } };
        }
        return { user: user, error: null };
    }
};

// ==================== PROFILES ====================

var ProfileDB = {
    async get(id) {
        var sb = getSupabase();
        if (!sb) return this._fallbackGet(id);
        try {
            var { data } = await sb.from('profiles').select('*').eq('id', id).single();
            return data;
        } catch (e) {
            console.warn('ProfileDB.get fallback:', e.message);
            return this._fallbackGet(id);
        }
    },

    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.profiles;
        try {
            var { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
            if (data) state.profiles = data;
            return state.profiles;
        } catch (e) {
            console.warn('ProfileDB.getAll fallback:', e.message);
            return state.profiles;
        }
    },

    async upsert(profile) {
        var sb = getSupabase();
        if (!sb) return this._fallbackUpsert(profile);
        try {
            var { data, error } = await sb.from('profiles').upsert(profile, { onConflict: 'id' });
            if (error) throw error;
            // Update local state
            var idx = state.profiles.findIndex(function(p) { return p.id === profile.id; });
            if (idx > -1) state.profiles[idx] = { ...state.profiles[idx], ...profile };
            else state.profiles.unshift(profile);
            return data;
        } catch (e) {
            console.warn('ProfileDB.upsert fallback:', e.message);
            return this._fallbackUpsert(profile);
        }
    },

    async updateOnlineStatus(userId, isOnline) {
        var sb = getSupabase();
        if (!sb) return;
        try {
            await sb.from('profiles').update({ online: isOnline }).eq('id', userId);
        } catch (e) {}
    },

    // Fallbacks
    _fallbackGet(id) {
        return state.profiles.find(function(p) { return p.id === id; }) || null;
    },
    _fallbackUpsert(profile) {
        var idx = state.profiles.findIndex(function(p) { return p.id === profile.id; });
        if (idx > -1) state.profiles[idx] = { ...state.profiles[idx], ...profile };
        else state.profiles.unshift(profile);
        if (typeof saveUserData === 'function') saveUserData();
        return profile;
    }
};

// ==================== FORUM ====================

var ForumDB = {
    async getPosts(category) {
        var sb = getSupabase();
        if (!sb) return this._localFilter(category);
        try {
            var query = sb.from('forum_posts').select('*, author:author_id(name, avatar, online)').eq('status', 'approved').order('created_at', { ascending: false });
            if (category && category !== 'all') query = query.eq('category', category);
            var { data } = await query;
            if (data) state.forumPosts = data;
            return state.forumPosts;
        } catch (e) {
            console.warn('ForumDB.getPosts fallback:', e.message);
            return this._localFilter(category);
        }
    },

    async createPost(post) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(post);
        try {
            var { data, error } = await sb.from('forum_posts').insert(post).select('*, author:author_id(name, avatar, online)').single();
            if (error) throw error;
            if (data) state.forumPosts.unshift(data);
            return data;
        } catch (e) {
            console.warn('ForumDB.createPost fallback:', e.message);
            return this._localCreate(post);
        }
    },

    async getReplies(postId) {
        var sb = getSupabase();
        if (!sb) return state.forumReplies.filter(function(r) { return r.post_id === postId; });
        try {
            var { data } = await sb.from('forum_replies').select('*, author:author_id(name, avatar, online)').eq('post_id', postId).order('created_at', { ascending: true });
            return data || [];
        } catch (e) {
            console.warn('ForumDB.getReplies fallback:', e.message);
            return state.forumReplies.filter(function(r) { return r.post_id === postId; });
        }
    },

    async addReply(reply) {
        var sb = getSupabase();
        if (!sb) return this._localAddReply(reply);
        try {
            var { data, error } = await sb.from('forum_replies').insert(reply).select('*, author:author_id(name, avatar, online)').single();
            if (error) throw error;
            // Increment reply count
            await sb.from('forum_posts').update({ replies: sb.rpc('increment', { x: 1 }) }).eq('id', reply.post_id);
            return data;
        } catch (e) {
            console.warn('ForumDB.addReply fallback:', e.message);
            return this._localAddReply(reply);
        }
    },

    _localFilter(category) {
        return category && category !== 'all'
            ? state.forumPosts.filter(function(p) { return p.category === category && p.status === 'approved'; })
            : state.forumPosts.filter(function(p) { return p.status === 'approved'; });
    },
    _localCreate(post) {
        post.id = state.forumPosts.length + 1;
        post.created_at = new Date().toISOString();
        post.status = 'approved';
        state.forumPosts.unshift(post);
        if (typeof saveUserData === 'function') saveUserData();
        return post;
    },
    _localAddReply(reply) {
        reply.id = state.forumReplies.length + 1;
        reply.created_at = new Date().toISOString();
        state.forumReplies.push(reply);
        var post = state.forumPosts.find(function(p) { return p.id === reply.post_id; });
        if (post) post.replies = (post.replies || 0) + 1;
        if (typeof saveUserData === 'function') saveUserData();
        return reply;
    }
};

// ==================== DIRECTORY LISTINGS ====================

var DirectoryDB = {
    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.directory.listings;
        try {
            var query = sb.from('directory_listings').select('*, owner:owner_id(name, avatar)').eq('status', 'active');
            var { data } = await query.order('created_at', { ascending: false });
            if (data) state.directory.listings = data;
            return state.directory.listings;
        } catch (e) {
            console.warn('DirectoryDB.getAll fallback:', e.message);
            return state.directory.listings;
        }
    },

    async create(listing) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(listing);
        try {
            var { data, error } = await sb.from('directory_listings').insert(listing).select('*, owner:owner_id(name, avatar)').single();
            if (error) throw error;
            if (data) state.directory.listings.unshift(data);
            return data;
        } catch (e) {
            console.warn('DirectoryDB.create fallback:', e.message);
            return this._localCreate(listing);
        }
    },

    async delete(id) {
        var sb = getSupabase();
        if (!sb) return this._localDelete(id);
        try {
            await sb.from('directory_listings').update({ status: 'deleted' }).eq('id', id);
            state.directory.listings = state.directory.listings.filter(function(l) { return l.id !== id; });
        } catch (e) {
            console.warn('DirectoryDB.delete fallback:', e.message);
            this._localDelete(id);
        }
    },

    _localCreate(listing) {
        listing.id = 'dir_' + Date.now();
        listing.created_at = new Date().toISOString();
        state.directory.listings.unshift(listing);
        if (typeof saveUserData === 'function') saveUserData();
        return listing;
    },
    _localDelete(id) {
        state.directory.listings = state.directory.listings.filter(function(l) { return l.id !== id; });
        if (typeof saveUserData === 'function') saveUserData();
    }
};

// ==================== PRODUCTS ====================

var ProductDB = {
    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.products.filter(function(p) { return p.status === 'active'; });
        try {
            var { data } = await sb.from('products').select('*, seller:seller_id(name, avatar)').eq('status', 'active').order('created_at', { ascending: false });
            if (data) state.products = data;
            return state.products;
        } catch (e) {
            console.warn('ProductDB.getAll fallback:', e.message);
            return state.products.filter(function(p) { return p.status === 'active'; });
        }
    },

    async create(product) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(product);
        try {
            var { data, error } = await sb.from('products').insert(product).select('*, seller:seller_id(name, avatar)').single();
            if (error) throw error;
            if (data) state.products.unshift(data);
            return data;
        } catch (e) {
            console.warn('ProductDB.create fallback:', e.message);
            return this._localCreate(product);
        }
    },

    _localCreate(product) {
        product.id = state.products.length + 1;
        product.created_at = new Date().toISOString();
        state.products.unshift(product);
        if (typeof saveUserData === 'function') saveUserData();
        return product;
    }
};

// ==================== EVENTS ====================

var EventDB = {
    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.events;
        try {
            var { data } = await sb.from('events').select('*, host:host_id(name, avatar)').order('created_at', { ascending: false });
            if (data) state.events = data;
            return state.events;
        } catch (e) {
            console.warn('EventDB.getAll fallback:', e.message);
            return state.events;
        }
    },

    async create(event) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(event);
        try {
            var { data, error } = await sb.from('events').insert(event).select('*, host:host_id(name, avatar)').single();
            if (error) throw error;
            if (data) state.events.unshift(data);
            return data;
        } catch (e) {
            console.warn('EventDB.create fallback:', e.message);
            return this._localCreate(event);
        }
    },

    _localCreate(event) {
        event.id = state.events.length + 1;
        event.created_at = new Date().toISOString();
        state.events.unshift(event);
        if (typeof saveUserData === 'function') saveUserData();
        return event;
    }
};

// ==================== MESSAGES ====================

var MessageDB = {
    async getConversations(userId) {
        var sb = getSupabase();
        if (!sb) return state.conversations;
        try {
            var { data } = await sb.from('conversations')
                .select('*')
                .contains('participant_ids', [userId])
                .order('last_message_at', { ascending: false });
            if (data) {
                // Load profiles for participants
                for (var conv of data) {
                    var otherId = conv.participant_ids.find(function(id) { return id !== userId; });
                    if (otherId) {
                        var profile = await ProfileDB.get(otherId);
                        conv.otherUser = profile;
                    }
                }
                state.conversations = data;
            }
            return state.conversations;
        } catch (e) {
            console.warn('MessageDB.getConversations fallback:', e.message);
            return state.conversations;
        }
    },

    async getMessages(conversationId) {
        var sb = getSupabase();
        if (!sb) return state.messages.filter(function(m) { return m.conversation_id === conversationId; });
        try {
            var { data } = await sb.from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            return data || [];
        } catch (e) {
            console.warn('MessageDB.getMessages fallback:', e.message);
            return state.messages.filter(function(m) { return m.conversation_id === conversationId; });
        }
    },

    async sendMessage(conversationId, senderId, text) {
        var sb = getSupabase();
        if (!sb) return this._localSendMessage(conversationId, senderId, text);
        try {
            var { data, error } = await sb.from('messages').insert({
                conversation_id: conversationId,
                sender_id: senderId,
                text: text
            }).select().single();
            if (error) throw error;
            // Update conversation last_message
            await sb.from('conversations').update({
                last_message: text,
                last_message_at: new Date().toISOString()
            }).eq('id', conversationId);
            return data;
        } catch (e) {
            console.warn('MessageDB.sendMessage fallback:', e.message);
            return this._localSendMessage(conversationId, senderId, text);
        }
    },

    async startConversation(participantIds, initialMessage) {
        var sb = getSupabase();
        if (!sb) return this._localStartConversation(participantIds, initialMessage);
        try {
            // Check if conversation already exists
            var { data: existing } = await sb.from('conversations')
                .select('*')
                .contains('participant_ids', participantIds);
            // This is simplified; a proper check would need array overlap
            if (existing && existing.length > 0) return existing[0];

            var { data, error } = await sb.from('conversations').insert({
                participant_ids: participantIds,
                last_message: initialMessage || 'Started a conversation'
            }).select().single();
            if (error) throw error;

            if (initialMessage) {
                await sb.from('messages').insert({
                    conversation_id: data.id,
                    sender_id: participantIds[0],
                    text: initialMessage
                });
            }
            if (data) state.conversations.unshift(data);
            return data;
        } catch (e) {
            console.warn('MessageDB.startConversation fallback:', e.message);
            return this._localStartConversation(participantIds, initialMessage);
        }
    },

    subscribeToMessages(conversationId, callback) {
        var sb = getSupabase();
        if (!sb) return null;
        return sb.channel('messages:' + conversationId)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId },
                function(payload) { callback(payload.new); }
            )
            .subscribe();
    },

    _localSendMessage(conversationId, senderId, text) {
        var msg = {
            id: state.messages.length + 1,
            conversation_id: conversationId,
            sender_id: senderId,
            text: text,
            is_read: false,
            created_at: new Date().toISOString()
        };
        state.messages.push(msg);
        var conv = state.conversations.find(function(c) { return c.id === conversationId; });
        if (conv) { conv.last_message = text; conv.last_message_at = new Date().toISOString(); }
        if (typeof saveUserData === 'function') saveUserData();
        return msg;
    },
    _localStartConversation(participantIds, initialMessage) {
        var conv = {
            id: state.conversations.length + 1,
            participant_ids: participantIds,
            last_message: initialMessage || 'Started a conversation',
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        state.conversations.unshift(conv);
        if (typeof saveUserData === 'function') saveUserData();
        return conv;
    }
};

// ==================== NOTIFICATIONS ====================

var NotificationDB = {
    async getForUser(userId) {
        var sb = getSupabase();
        if (!sb) return state.notifications.filter(function(n) { return n.user_id === userId; });
        try {
            var { data } = await sb.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            return data || [];
        } catch (e) {
            console.warn('NotificationDB fallback:', e.message);
            return state.notifications.filter(function(n) { return n.user_id === userId; });
        }
    },

    async create(notification) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(notification);
        try {
            var { data } = await sb.from('notifications').insert(notification).select().single();
            return data;
        } catch (e) {
            return this._localCreate(notification);
        }
    },

    subscribe(userId, callback) {
        var sb = getSupabase();
        if (!sb) return null;
        return sb.channel('notifications:' + userId)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
                function(payload) { callback(payload.new); }
            )
            .subscribe();
    },

    _localCreate(n) {
        n.id = state.notifications.length + 1;
        n.created_at = new Date().toISOString();
        state.notifications.unshift(n);
        if (typeof saveUserData === 'function') saveUserData();
        return n;
    }
};

// ==================== STORAGE (media uploads) ====================

var StorageDB = {
    async uploadFile(bucket, filePath, file) {
        var sb = getSupabase();
        if (!sb) return this._fallbackUpload(file);
        try {
            var { data, error } = await sb.storage.from(bucket).upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });
            if (error) throw error;
            var { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(filePath);
            return publicUrl;
        } catch (e) {
            console.warn('StorageDB upload fallback:', e.message);
            return this._fallbackUpload(file);
        }
    },

    async uploadAvatar(userId, file) {
        var ext = file.name.split('.').pop();
        var path = 'avatars/' + userId + '.' + ext;
        return await this.uploadFile('media', path, file);
    },

    async uploadListingMedia(listingId, file) {
        var ext = file.name.split('.').pop();
        var path = 'listings/' + listingId + '_' + Date.now() + '.' + ext;
        return await this.uploadFile('media', path, file);
    },

    _fallbackUpload(file) {
        return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.readAsDataURL(file);
        });
    }
};

// ==================== WALLET ====================

var WalletDB = {
    async getTransactions(userId) {
        var sb = getSupabase();
        if (!sb) return state.walletTransactions.filter(function(t) { return t.user_id === userId; });
        try {
            var { data } = await sb.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            return data || [];
        } catch (e) {
            return state.walletTransactions.filter(function(t) { return t.user_id === userId; });
        }
    },

    async addTransaction(tx) {
        var sb = getSupabase();
        if (!sb) return this._localAdd(tx);
        try {
            var { data } = await sb.from('wallet_transactions').insert(tx).select().single();
            return data;
        } catch (e) {
            return this._localAdd(tx);
        }
    },

    _localAdd(tx) {
        tx.id = state.walletTransactions.length + 1;
        tx.created_at = new Date().toISOString();
        state.walletTransactions.push(tx);
        if (typeof saveUserData === 'function') saveUserData();
        return tx;
    }
};

// ==================== PERSONALS ====================

var PersonalsDB = {
    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.personals;
        try {
            var { data } = await sb.from('personals').select('*, author:author_id(name, avatar)').order('created_at', { ascending: false });
            if (data) state.personals = data;
            return state.personals;
        } catch (e) {
            console.warn('PersonalsDB.getAll fallback:', e.message);
            return state.personals;
        }
    },

    async create(ad) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(ad);
        try {
            var { data, error } = await sb.from('personals').insert(ad).select('*, author:author_id(name, avatar)').single();
            if (error) throw error;
            if (data) state.personals.unshift(data);
            return data;
        } catch (e) {
            console.warn('PersonalsDB.create fallback:', e.message);
            return this._localCreate(ad);
        }
    },

    _localCreate(ad) {
        ad.id = ad.id || Date.now();
        ad.created_at = new Date().toISOString();
        state.personals.unshift(ad);
        if (typeof saveUserData === 'function') saveUserData();
        return ad;
    }
};

// ==================== STREAMS ====================

var StreamsDB = {
    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.streams;
        try {
            var { data } = await sb.from('streams').select('*, streamer:streamer_id(name, avatar)').order('created_at', { ascending: false });
            if (data) state.streams = data;
            return state.streams;
        } catch (e) {
            console.warn('StreamsDB.getAll fallback:', e.message);
            return state.streams;
        }
    },

    async create(stream) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(stream);
        try {
            var { data, error } = await sb.from('streams').insert(stream).select('*, streamer:streamer_id(name, avatar)').single();
            if (error) throw error;
            if (data) state.streams.unshift(data);
            return data;
        } catch (e) {
            console.warn('StreamsDB.create fallback:', e.message);
            return this._localCreate(stream);
        }
    },

    _localCreate(stream) {
        stream.id = stream.id || Date.now();
        stream.created_at = new Date().toISOString();
        state.streams.unshift(stream);
        if (typeof saveUserData === 'function') saveUserData();
        return stream;
    }
};

// ==================== CLUBS ====================

var ClubsDB = {
    async getAll() {
        var sb = getSupabase();
        if (!sb) return state.clubs;
        try {
            var { data } = await sb.from('clubs').select('*').order('created_at', { ascending: false });
            if (data) state.clubs = data;
            return state.clubs;
        } catch (e) {
            console.warn('ClubsDB.getAll fallback:', e.message);
            return state.clubs;
        }
    },

    async create(club) {
        var sb = getSupabase();
        if (!sb) return this._localCreate(club);
        try {
            var { data, error } = await sb.from('clubs').insert(club).select().single();
            if (error) throw error;
            if (data) state.clubs.unshift(data);
            return data;
        } catch (e) {
            console.warn('ClubsDB.create fallback:', e.message);
            return this._localCreate(club);
        }
    },

    _localCreate(club) {
        club.id = club.id || Date.now();
        club.created_at = new Date().toISOString();
        state.clubs.unshift(club);
        if (typeof saveUserData === 'function') saveUserData();
        return club;
    }
};

// ==================== INITIALIZATION ====================

async function loadAllData() {
    try {
        var session = await AuthDB.getSession();
        if (session) {
            var profile = await ProfileDB.get(session.user.id);
            if (profile) {
                state.currentUser = profile;
                state.loggedIn = true;
            }
        }
    } catch (e) {}

    // Track what loaded
    var loaded = { profiles: 0, forum: 0, directory: 0, products: 0, events: 0 };

    try { var p = await ProfileDB.getAll(); loaded.profiles = p ? p.length : 0; } catch(e) { loaded.profiles = -1; }
    try { var f = await ForumDB.getPosts('all'); loaded.forum = f ? f.length : 0; } catch(e) { loaded.forum = -1; }
    try { var d = await DirectoryDB.getAll(); loaded.directory = d ? d.length : 0; } catch(e) { loaded.directory = -1; }
    try { var pr = await ProductDB.getAll(); loaded.products = pr ? pr.length : 0; } catch(e) { loaded.products = -1; }
    try { var ev = await EventDB.getAll(); loaded.events = ev ? ev.length : 0; } catch(e) { loaded.events = -1; }
    try { await PersonalsDB.getAll(); } catch(e) {}
    try { await StreamsDB.getAll(); } catch(e) {}
    try { await ClubsDB.getAll(); } catch(e) {}

    console.log('📊 Supabase load results:', loaded);

    // If no data loaded from Supabase (fresh project or tables missing), fall back
    var hasData = loaded.profiles > 0 || loaded.forum > 0 || loaded.directory > 0 || loaded.products > 0 || loaded.events > 0;
    if (!hasData) {
        console.log('📂 No data from Supabase — loading from localStorage/samples');
        loadUserData();
        loadSampleData();
    }
}

async function bootstrapSupabase() {
    var sb = getSupabase();
    if (!sb) {
        console.log('☁️ Running in localStorage mode (no Supabase configured)');
        loadUserData();
        loadSampleData();
        return;
    }

    console.log('☁️ Supabase connected — loading from cloud...');
    await loadAllData();

    // Subscribe to realtime auth changes
    AuthDB.onAuthChange(function(event, session) {
        if (event === 'SIGNED_IN' && session) {
            ProfileDB.get(session.user.id).then(function(profile) {
                if (profile) {
                    state.currentUser = profile;
                    state.loggedIn = true;
                }
            });
        } else if (event === 'SIGNED_OUT') {
            state.currentUser = null;
            state.loggedIn = false;
        }
    });
}



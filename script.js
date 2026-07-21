/* ==================== KOITUS CHAT APP ====================
 * A modern chat and dating application
 * Developed by: Koitus Team
 * Version: 2.0.0 - Real-time with WebRTC
 */

// ==================== ERROR LOG & CHANGE DIARY SYSTEM ====================
window.__KOITUS_LOGS = {
    errors: JSON.parse(localStorage.getItem('koitus_error_log') || '[]'),
    changes: JSON.parse(localStorage.getItem('koitus_change_diary') || '[]'),
    MAX_LOG: 500
};

function saveErrors() {
    try {
        localStorage.setItem('koitus_error_log', JSON.stringify(window.__KOITUS_LOGS.errors.slice(-window.__KOITUS_LOGS.MAX_LOG)));
    } catch(e) { /* localStorage full, silently ignore */ }
}

function saveDiary() {
    try {
        localStorage.setItem('koitus_change_diary', JSON.stringify(window.__KOITUS_LOGS.changes.slice(-window.__KOITUS_LOGS.MAX_LOG)));
    } catch(e) { /* localStorage full, silently ignore */ }
}

function logError(source, error) {
    var entry = {
        ts: new Date().toISOString(),
        source: source,
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : '',
        url: window.location.href,
        userAgent: navigator.userAgent
    };
    window.__KOITUS_LOGS.errors.push(entry);
    saveErrors();
    console.log('📝 [Koitus Error Log]', entry.message);
    return entry;
}

function logChange(description, category) {
    var entry = {
        ts: new Date().toISOString(),
        description: description,
        category: category || 'general',
        version: '2.0.0'
    };
    window.__KOITUS_LOGS.changes.push(entry);
    saveDiary();
    console.log('📓 [Koitus Change Diary]', description);
    return entry;
}

window.addEventListener('error', function(e) {
    logError('uncaught', e.error || e.message);
});
window.addEventListener('unhandledrejection', function(e) {
    logError('unhandled_promise', e.reason);
});
// Global image error handler - catches broken images and shows fallback
document.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'IMG' && e.target.src && !e.target.hasAttribute('data-fallback')) {
        e.target.setAttribute('data-fallback', '1');
        e.target.src = 'https://i.pravatar.cc/200?u=error';
        e.preventDefault();
    }
}, true);

var _origConsoleError = console.error;
console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    logError('console.error', args.join(' '));
    _origConsoleError.apply(console, arguments);
};

// Log startup
logChange('App initialized', 'system');

// ==================== STATE MANAGEMENT ====================
const state = {
    currentUser: null,
    currentView: 'discover',
    currentChat: null,
    profiles: [],
    matches: [],
    conversations: [],
    notifications: [],
    isLoggedIn: false,
    map: null,
    mapMarkers: [],
    selectedProfile: null,
    userLocation: { lat: -26.1076, lng: 28.0567 }, // Johannesburg
    mapFilter: 'all',
    userView: 'grid', // grid or list
    userFilter: {
        status: 'all',
        type: 'all',
        distance: '25'
    },
    // Real-time connection
    socket: null,
    connected: false,
    onlineUsers: new Map(),
    // WebRTC
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    activeCall: null,
    // WebRTC config
    rtcConfig: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    },
    // Events
    events: [],
    eventsTab: 'upcoming',
    selectedEvent: null,
    // Wallet
    wallet: {
        balance: 500.00,
        transactions: []
    },
    // Activity Feed
    activityFeed: [],
    // Streams
    streams: [],
    contentTab: 'videos',
    // Content
    content: [],
    // Forum
    forumCategories: [],
    providerForumCategories: [],
    forumPosts: [],
    providerForumPosts: [],
    forumReplies: {}, // Store replies by post ID
    forumVotes: {}, // Store votes by post ID
    // Products
    products: [],
    productsTab: 'all',
    // Stories
    stories: [],
    storiesFilter: 'all',
    // Reviews
    reviews: [],
    // Call History
    callHistory: [],
    // Admin
    adminData: {
        users: [],
        profiles: [],
        content: [],
        events: [],
        products: [],
        reports: [],
        rechargeRequests: [],
        clubs: [],
        activityLogs: [] // Track all user activity
    },
    // Clubs
    clubs: [],
    userClubs: [],
    // Emoji picker
    emojiPickerOpen: false,
    emojiPickerTimer: null,
    // AI Ice Breakers
    enableIcebreakers: true,
    // User profiles storage
    userProfiles: {},
    // Personals classifieds
    personals: [],
    personalsFilter: 'all',
    // Streams tab filter
    streamsTab: 'all',
    // Profiles browser
    profilesTab: 'all',
    profilesView: 'grid',
    profileLikes: {},
    profileFavourites: [],
    profileFollowers: {},
    // Store management
    store: {
        products: [],
        orders: [],
        earnings: [],
        reviews: [],
        tab: 'products',
        orderFilter: 'all'
    },
    // Discover section tabs
    discoverTabs: {
        events: 'upcoming',
        clubs: 'all',
        streams: 'all',
        content: 'videos',
        personals: 'all',
        products: 'all'
    },
    // Call state
    callType: null, // 'phone' or 'video'
    videoCallCount: 0,
    maxFreeVideoCalls: 3,
    // Blocked users
    blockedUsers: [],
    // Voice recording
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    recordingStartTime: null,
    // Business directory
    directory: {
        listings: [],
        categories: ['Adult Club', 'Studio', 'Escort Agency', 'Webcam', 'Content Creator', 'Venue', 'Event', 'Other'],
        country: '',
        search: ''
    },
    // User region detected via IP
    userRegion: null
};

// Simple UUID generator for frontend
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Storage keys for localStorage
const STORAGE_KEYS = {
    USER: 'koitus_user',
    PROFILES: 'koitus_profiles',
    WALLET: 'koitus_wallet',
    SETTINGS: 'koitus_settings',
    HAS_REGISTERED: 'koitus_has_registered'
};

// Profile types with colors
const profileTypes = {
    // Customer Types
    guest: { label: 'Guest', icon: 'user', color: '#6b7280' },
    hunter: { label: 'Hunter/Lion', icon: 'chess-lion', color: '#f59e0b' },
    freak: { label: 'Freak', icon: 'fire', color: '#ef4444' },
    lifestyler: { label: 'Lifestyler', icon: 'star', color: '#8b5cf6' },
    voyeur: { label: 'Voyeur', icon: 'eye', color: '#6366f1' },
    
    // Customer Sub-types
    switch: { label: 'Switch', icon: 'exchange-alt', color: '#ec4899' },
    mentor: { label: 'Mentor', icon: 'graduation-cap', color: '#14b8a6' },
    social: { label: 'Social', icon: 'users', color: '#22c55e' },
    
    // Service Provider Types
    provider: { label: 'Service Provider', icon: 'briefcase', color: '#6366f1' },
    creator: { label: 'Content Creator', icon: 'camera', color: '#8b5cf6' },
    dancer: { label: 'Exotic Dancer', icon: 'music', color: '#ec4899' },
    model: { label: 'Nude Model', icon: 'image', color: '#f59e0b' },
    escort: { label: 'Escort', icon: 'heart', color: '#ef4444' },
    promoter: { label: 'Promoter', icon: 'bullhorn', color: '#f97316' },
    studio: { label: 'Studio', icon: 'building', color: '#3b82f6' },
    venue: { label: 'Venue Owner', icon: 'map-pin', color: '#14b8a6' },
    club: { label: 'Club Owner', icon: 'door-open', color: '#a855f7' },
    vendor: { label: 'Vendor', icon: 'store-alt', color: '#22c55e' },
    seller: { label: 'Seller', icon: 'store', color: '#10b981' },
    advertiser: { label: 'Advertiser', icon: 'bullhorn', color: '#f97316' },
    webcammer: { label: 'Webcammer', icon: 'video', color: '#ef4444' },

    // Provider Additional Services
    consulting: { label: 'Consulting', icon: 'comments', color: '#14b8a6' },
    training: { label: 'Training', icon: 'chalkboard-teacher', color: '#22c55e' },
    equipment: { label: 'Equipment', icon: 'camera-retro', color: '#6b7280' },

    // Fallback
    general: { label: 'General', icon: 'user', color: '#6366f1' }
};

// ==================== SAMPLE DATA ====================
const sampleProfiles = [
    {
        id: 1,
        name: 'Sarah',
        age: 25,
        type: 'creator',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'creator',
        location: 'Cape Town, 5km away',
        bio: 'Adventure seeker ☀️ Love hiking, photography, and good coffee. Looking for someone to explore the world with!',
        interests: ['Hiking', 'Photography', 'Travel', 'Coffee'],
        image: 'https://i.pravatar.cc/400?u=Sarah',
        coords: { lat: -33.9249, lng: 18.4241 },
        online: true,
        distance: 1267,
        likes: 1234,
        fans: 567,
        rating: 4.8,
        reviews: 89
    },
    {
        id: 2,
        name: 'Michael',
        age: 28,
        type: 'hunter',
        accountType: 'customer',
        mainType: 'hunter',
        subTypes: ['social'],
        location: 'Johannesburg, 3km away',
        bio: 'Tech entrepreneur 💻 Passionate about startups and innovation. Let\'s grab coffee and talk ideas!',
        interests: ['Tech', 'Startups', 'Gym', 'Music'],
        image: 'https://i.pravatar.cc/400?u=Michael',
        coords: { lat: -26.1076, lng: 28.0567 },
        online: true,
        distance: 3,
        likes: 456,
        fans: 123,
        rating: 4.5,
        reviews: 34
    },
    {
        id: 3,
        name: 'Priya',
        age: 26,
        type: 'dancer',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'dancer',
        location: 'Durban, 8km away',
        bio: 'Foodie 🍕 Yoga enthusiast 🧘‍♀️ Always planning my next trip. Swipe right if you love spontaneous adventures!',
        interests: ['Food', 'Yoga', 'Travel', 'Dancing'],
        image: 'https://i.pravatar.cc/400?u=Priya',
        coords: { lat: -29.8587, lng: 31.0218 },
        online: false,
        distance: 570,
        likes: 2345,
        fans: 890,
        rating: 4.9,
        reviews: 156
    },
    {
        id: 4,
        name: 'David',
        age: 30,
        type: 'lifestyler',
        accountType: 'customer',
        mainType: 'lifestyler',
        subTypes: ['switch', 'mentor'],
        location: 'Pretoria, 12km away',
        bio: 'Music producer 🎵 Love creating beats and discovering new sounds. Let\'s make some magic together!',
        interests: ['Music', 'Production', 'Gaming', 'Movies'],
        image: 'https://i.pravatar.cc/400?u=David',
        coords: { lat: -25.7479, lng: 28.2293 },
        online: true,
        distance: 52
    },
    {
        id: 5,
        name: 'Zanele',
        age: 24,
        type: 'model',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'model',
        location: 'Sandton, 2km away',
        bio: 'Fashion designer 👗 Art lover 🎨 Looking for someone who appreciates creativity and good conversation.',
        interests: ['Fashion', 'Art', 'Design', 'Wine'],
        image: 'https://i.pravatar.cc/400?u=Zanele',
        coords: { lat: -26.1076, lng: 28.0567 },
        online: true,
        distance: 2,
        likes: 3456,
        fans: 1234,
        rating: 4.7,
        reviews: 234
    },
    {
        id: 6,
        name: 'James',
        age: 29,
        type: 'freak',
        accountType: 'customer',
        mainType: 'freak',
        subTypes: ['switch'],
        location: 'Centurion, 15km away',
        bio: 'Fitness coach 💪 Helping people become their best selves. Love outdoor activities and healthy living!',
        interests: ['Fitness', 'Nutrition', 'Running', 'Cycling'],
        image: 'https://i.pravatar.cc/400?u=James',
        coords: { lat: -25.8603, lng: 28.1894 },
        online: false,
        distance: 28
    },
    {
        id: 7,
        name: 'Amara',
        age: 27,
        type: 'escort',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'escort',
        location: 'Rosebank, 4km away',
        bio: 'Elegant companion for sophisticated events. Love art galleries, fine dining, and meaningful conversations.',
        interests: ['Art', 'Wine', 'Travel', 'Luxury'],
        image: 'https://i.pravatar.cc/400?u=Amara',
        coords: { lat: -26.1467, lng: 28.0436 },
        online: true,
        distance: 4,
        likes: 1890,
        fans: 756,
        rating: 4.6,
        reviews: 112
    },
    {
        id: 8,
        name: 'Thando',
        age: 23,
        type: 'voyeur',
        accountType: 'customer',
        mainType: 'voyeur',
        subTypes: ['social'],
        location: 'Soweto, 18km away',
        bio: 'Professional dancer 💃 Performing arts is my passion. Let\'s dance the night away!',
        interests: ['Dancing', 'Music', 'Fitness', 'Art'],
        image: 'https://i.pravatar.cc/400?u=Thando',
        coords: { lat: -26.2309, lng: 27.9109 },
        online: false,
        distance: 18
    },
    {
        id: 9,
        name: 'Marcus',
        age: 31,
        type: 'venue',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'venue',
        additionalServices: ['equipment', 'consulting'],
        location: 'Fourways, 20km away',
        bio: 'Private venue owner specializing in intimate events. Let me host for you! 🏛️',
        interests: ['Events', 'Wine', 'Travel', 'Music'],
        image: 'https://i.pravatar.cc/400?u=Marcus',
        coords: { lat: -26.0167, lng: 28.0067 },
        online: true,
        distance: 20
    },
    {
        id: 10,
        name: 'Lisa',
        age: 25,
        type: 'promoter',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'promoter',
        additionalServices: ['training'],
        location: 'Brooklyn, 6km away',
        bio: 'Event promoter and lifestyle coach. Let\'s create something beautiful together! 📢',
        interests: ['Events', 'Marketing', 'Photography', 'Yoga'],
        image: 'https://i.pravatar.cc/400?u=Lisa',
        coords: { lat: -25.7553, lng: 28.2067 },
        online: false,
        distance: 45,
        likes: 987,
        fans: 432,
        rating: 4.4,
        reviews: 67
    },
    {
        id: 11,
        name: 'Velvet Studio',
        age: 0,
        type: 'studio',
        accountType: 'provider',
        mainType: 'provider',
        subType: 'studio',
        additionalServices: ['equipment'],
        location: 'Sandton, 3km away',
        bio: 'Premium studio space for photography, film, and events. Fully equipped with professional lighting and backdrops.',
        interests: ['Photography', 'Film', 'Events', 'Art'],
        image: 'https://i.pravatar.cc/400?u=VelvetStudio',
        coords: { lat: -26.1076, lng: 28.0567 },
        online: true,
        distance: 3,
        likes: 1543,
        fans: 678,
        rating: 4.9,
        reviews: 234
    }
];

const sampleMatches = [
    { id: 1, name: 'Sarah', age: 25, image: sampleProfiles[0].image, lastMessage: 'Hey! I noticed you love hiking too! 🏔️', time: '2m ago', unread: true, online: true },
    { id: 2, name: 'Priya', age: 26, image: sampleProfiles[2].image, lastMessage: 'That sounds amazing! When are you free?', time: '1h ago', unread: true, online: true },
    { id: 3, name: 'Zanele', age: 24, image: sampleProfiles[4].image, lastMessage: 'Thanks! Your profile made me smile 😊', time: '3h ago', unread: false, online: false },
    { id: 4, name: 'Thando', age: 27, image: 'https://i.pravatar.cc/200?u=Thando2', lastMessage: 'Let\'s grab coffee this weekend!', time: '1d ago', unread: false, online: false },
    { id: 5, name: 'Lisa', age: 23, image: 'https://i.pravatar.cc/200?u=Lisa2', lastMessage: 'Haha, that\'s so funny! 😂', time: '2d ago', unread: false, online: true }
];

const sampleNotifications = [
    { id: 1, type: 'match', icon: 'match', title: 'It\'s a Match!', text: 'You and Sarah liked each other', time: '2m ago', unread: true },
    { id: 2, type: 'like', icon: 'like', title: 'Priya liked your profile', text: 'Check out her profile!', time: '15m ago', unread: true },
    { id: 3, type: 'message', icon: 'message', title: 'New message from Zanele', text: 'Thanks! Your profile made me smile...', time: '3h ago', unread: true },
    { id: 4, type: 'match', icon: 'match', title: 'It\'s a Match!', text: 'You and Thando liked each other', time: '1d ago', unread: false },
    { id: 5, type: 'system', icon: 'system', title: 'Profile Boost Active', text: 'Your profile is being shown to more people!', time: '2d ago', unread: false },
    { id: 6, type: 'like', icon: 'like', title: 'Lisa liked your profile', text: 'She\'s interested in you!', time: '3d ago', unread: false }
];

const sampleEvents = [
    {
        id: 1,
        name: 'Summer Rooftop Party',
        type: 'party',
        host: { id: 101, name: 'Thando Events', image: sampleProfiles[9].image },
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '19:00',
        location: 'Sky Lounge, Sandton',
        coords: { lat: -26.1076, lng: 28.0567 },
        description: 'Join us for the hottest summer party in Sandton! Live DJ, cocktails, and amazing views. Dress code: Smart casual.',
        price: 'R250',
        capacity: 150,
        attendees: [sampleProfiles[0].image, sampleProfiles[2].image, sampleProfiles[4].image],
        attendeeCount: 87,
        isPrivate: false,
        image: 'https://picsum.photos/seed/img0/400/300',
        isHost: false,
        rsvp: false
    },
    {
        id: 2,
        name: 'Networking Mixer for Professionals',
        type: 'networking',
        host: { id: 102, name: 'Business Connect SA', image: 'https://picsum.photos/seed/NetworkingMixerforProfessionals/400/300' },
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '18:30',
        location: 'The Workspace, Rosebank',
        coords: { lat: -26.1481, lng: 28.0375 },
        description: 'Connect with like-minded professionals in a relaxed atmosphere. Great for entrepreneurs, freelancers, and corporate professionals looking to expand their network.',
        price: 'Free',
        capacity: 50,
        attendees: [sampleProfiles[1].image, sampleProfiles[3].image],
        attendeeCount: 32,
        isPrivate: false,
        image: 'https://picsum.photos/seed/img2/400/300',
        isHost: false,
        rsvp: true
    },
    {
        id: 3,
        name: 'Sunset Yoga & Wine',
        type: 'social',
        host: { id: 103, name: 'Wellness Hub', image: 'https://picsum.photos/seed/SunsetYogaWine/400/300' },
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '17:00',
        location: 'Botanical Gardens, Pretoria',
        coords: { lat: -25.7553, lng: 28.2067 },
        description: 'Unwind with a gentle sunset yoga session followed by wine tasting. Perfect for relaxation and meeting new people in a chill environment.',
        price: 'R180',
        capacity: 30,
        attendees: [sampleProfiles[5].image, sampleProfiles[7].image, sampleProfiles[8].image, sampleProfiles[9].image],
        attendeeCount: 24,
        isPrivate: false,
        image: 'https://picsum.photos/seed/img4/400/300',
        isHost: false,
        rsvp: false
    },
    {
        id: 4,
        name: 'Live Jazz Night',
        type: 'concert',
        host: { id: 104, name: 'Jazz Corner', image: 'https://picsum.photos/seed/LiveJazzNight/400/300' },
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '20:00',
        location: 'Marabi Club, Maboneng',
        coords: { lat: -26.2041, lng: 28.0473 },
        description: 'Experience the finest local jazz talent. Featuring the Cape Town Jazz Quartet. Limited seating available.',
        price: 'R350',
        capacity: 80,
        attendees: [sampleProfiles[6].image],
        attendeeCount: 56,
        isPrivate: false,
        image: 'https://picsum.photos/seed/img6/400/300',
        isHost: false,
        rsvp: false
    },
    {
        id: 5,
        name: 'Photography Workshop: Urban Landscapes',
        type: 'workshop',
        host: { id: 105, name: 'Creative Academy', image: 'https://picsum.photos/seed/PhotographyWorkshopUrbanLandscapes/400/300' },
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '09:00',
        location: 'Braamfontein, Johannesburg',
        coords: { lat: -26.1936, lng: 28.0305 },
        description: 'Learn urban landscape photography from award-winning photographers. Bring your camera and comfortable walking shoes. Lunch included.',
        price: 'R850',
        capacity: 15,
        attendees: [sampleProfiles[1].image, sampleProfiles[4].image],
        attendeeCount: 12,
        isPrivate: false,
        image: 'https://picsum.photos/seed/img8/400/300',
        isHost: false,
        rsvp: false
    },
    {
        id: 6,
        name: 'Exclusive VIP Lounge Night',
        type: 'party',
        host: { id: 106, name: 'Elite Events', image: 'https://picsum.photos/seed/ExclusiveVIPLoungeNight/400/300' },
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '21:00',
        location: 'Secret Location (Shared on RSVP)',
        coords: { lat: -26.1076, lng: 28.0567 },
        description: 'An exclusive VIP experience for select guests. Champagne, entertainment, and networking with high-profile attendees. Strict dress code applies.',
        price: 'R1500',
        capacity: 50,
        attendees: [sampleProfiles[3].image],
        attendeeCount: 28,
        isPrivate: true,
        image: 'https://picsum.photos/seed/img10/400/300',
        isHost: false,
        rsvp: false
    },
    {
        id: 7,
        name: 'Beach Cleanup & Braai',
        type: 'social',
        host: { id: 107, name: 'Green SA', image: 'https://picsum.photos/seed/BeachCleanupBraai/400/300' },
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '08:00',
        location: 'Bloubergstrand, Cape Town',
        coords: { lat: -33.8122, lng: 18.4702 },
        description: 'Give back to the community while having fun! Morning beach cleanup followed by a social braai. Meet environmentally conscious singles.',
        price: 'R50',
        capacity: 100,
        attendees: [sampleProfiles[0].image, sampleProfiles[2].image, sampleProfiles[5].image, sampleProfiles[7].image],
        attendeeCount: 78,
        isPrivate: false,
        image: 'https://picsum.photos/seed/img12/400/300',
        isHost: false,
        rsvp: false,
        isPast: true
    },
    {
        id: 8,
        name: 'My Birthday Bash',
        type: 'party',
        host: { id: 999, name: 'You', image: 'https://picsum.photos/seed/MyBirthdayBash/400/300' },
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '19:00',
        location: 'My Place, Fourways',
        coords: { lat: -26.0124, lng: 28.0067 },
        description: 'Celebrating another year! Music, food, drinks, and good vibes. RSVP so I know how much to prepare.',
        price: 'Free',
        capacity: 30,
        attendees: [sampleProfiles[0].image],
        attendeeCount: 5,
        isPrivate: true,
        image: 'https://picsum.photos/seed/img14/400/300',
        isHost: true,
        rsvp: false
    }
];

// ==================== WALLET SAMPLE DATA ====================
const sampleTransactions = [
    { id: 1, type: 'deposit', amount: 500, description: 'Deposit via Card', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'completed' },
    { id: 2, type: 'purchase', amount: -250, description: 'Summer Rooftop Party Ticket', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: 'completed' },
    { id: 3, type: 'purchase', amount: -50, description: 'Profile Boost (1 hour)', date: new Date(Date.now() - 5 * 60 * 60 * 1000), status: 'completed' }
];

// ==================== ACTIVITY FEED SAMPLE DATA ====================
const sampleActivityFeed = [
    {
        id: 1,
        type: 'new-member',
        icon: 'user-plus',
        title: 'New Member Joined',
        text: 'Welcome <strong>Jessica M.</strong> to the Koitus community! Say hello 👋',
        time: new Date(Date.now() - 30 * 60 * 1000),
        image: sampleProfiles[0].image
    },
    {
        id: 2,
        type: 'event',
        icon: 'calendar-alt',
        title: 'New Event Created',
        text: '<strong>Thando Events</strong> created a new event: Summer Rooftop Party this Friday!',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000),
        image: 'https://picsum.photos/seed/img0/400/300'
    },
    {
        id: 3,
        type: 'match',
        icon: 'heart',
        title: 'New Match',
        text: '<strong>You</strong> and <strong>Priya</strong> are now connected! Start a conversation 💬',
        time: new Date(Date.now() - 4 * 60 * 60 * 1000),
        image: sampleProfiles[2].image
    },
    {
        id: 4,
        type: 'content',
        icon: 'photo-video',
        title: 'New Content Posted',
        text: '<strong>Sarah</strong> shared a new photo from her hiking adventure in Cape Town 📸',
        time: new Date(Date.now() - 6 * 60 * 60 * 1000),
        image: sampleProfiles[0].image
    },
    {
        id: 5,
        type: 'forum',
        icon: 'comments',
        title: 'New Forum Discussion',
        text: '<strong>Michael</strong> started a discussion: "Best venues for first dates in Johannesburg?"',
        time: new Date(Date.now() - 12 * 60 * 60 * 1000),
        image: sampleProfiles[1].image
    },
    {
        id: 6,
        type: 'stream',
        icon: 'video',
        title: 'Live Stream Started',
        text: '<strong>Wellness Hub</strong> is now live: "Sunset Yoga Session" - Join now! 🧘',
        time: new Date(Date.now() - 30 * 60 * 1000),
        image: 'https://picsum.photos/seed/SunsetYogaWine/400/300'
    },
    {
        id: 7,
        type: 'new-member',
        icon: 'user-plus',
        title: 'New Member Joined',
        text: 'Welcome <strong>David K.</strong> to the Koitus community! 🎉',
        time: new Date(Date.now() - 24 * 60 * 60 * 1000),
        image: sampleProfiles[3].image
    },
    {
        id: 8,
        type: 'event',
        icon: 'calendar-alt',
        title: 'Event Starting Soon',
        text: '<strong>Networking Mixer</strong> starts in 2 hours! Don\'t miss out 🤝',
        time: new Date(Date.now() - 24 * 60 * 60 * 1000),
        image: 'https://picsum.photos/seed/img2/400/300'
    }
];

// ==================== STREAMS SAMPLE DATA ====================
const sampleStreams = [
    {
        id: 1,
        title: 'Sunset Yoga Session',
        streamer: { id: 103, name: 'Wellness Hub', image: 'https://picsum.photos/seed/SunsetYogaWine/400/300' },
        viewers: 1243,
        likes: 856,
        category: 'Lifestyle',
        isLive: true,
        isAdult: false,
        thumbnail: 'https://picsum.photos/seed/WellnessHub/400/300'
    },
    {
        id: 2,
        title: 'DJ Set - House Music Vibes',
        streamer: { id: 108, name: 'DJ Thabo', image: 'https://picsum.photos/seed/DJThabo/400/300' },
        viewers: 2156,
        likes: 1523,
        category: 'Music',
        isLive: true,
        isAdult: false,
        thumbnail: 'https://picsum.photos/seed/DJThabo/400/300'
    },
    {
        id: 3,
        title: 'Cooking Class: Traditional SA Cuisine',
        streamer: { id: 109, name: 'Chef Zanele', image: 'https://picsum.photos/seed/ChefZanele/400/300' },
        viewers: 0,
        likes: 0,
        category: 'Food',
        isLive: false,
        isAdult: false,
        scheduled: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        thumbnail: 'https://picsum.photos/seed/img19/400/300'
    },
    {
        id: 4,
        title: 'Q&A: Dating Advice & Tips',
        streamer: { id: 110, name: 'Relationship Coach', image: 'https://picsum.photos/seed/RelationshipCoach/400/300' },
        viewers: 0,
        likes: 0,
        category: 'Lifestyle',
        isLive: false,
        isAdult: false,
        scheduled: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        thumbnail: 'https://picsum.photos/seed/img21/400/300'
    },
    // Webcamming streams
    {
        id: 5,
        title: 'Private Dance Session 🔥',
        streamer: { id: 201, name: 'Roxy', image: 'https://picsum.photos/seed/RoxyCam/400/300' },
        viewers: 3456,
        likes: 2100,
        category: 'Webcam',
        isLive: true,
        isAdult: true,
        pricePerMin: 15,
        ageVerified: true,
        thumbnail: 'https://picsum.photos/seed/RoxyCam/400/300'
    },
    {
        id: 6,
        title: 'Late Night Fun 😈',
        streamer: { id: 202, name: 'Diamond', image: 'https://picsum.photos/seed/DiamondCam/400/300' },
        viewers: 5231,
        likes: 3400,
        category: 'Webcam',
        isLive: true,
        isAdult: true,
        pricePerMin: 20,
        ageVerified: true,
        thumbnail: 'https://picsum.photos/seed/DiamondCam/400/300'
    },
    {
        id: 7,
        title: 'Roleplay & Fantasy',
        streamer: { id: 203, name: 'Mystique', image: 'https://picsum.photos/seed/MystiqueCam/400/300' },
        viewers: 1876,
        likes: 980,
        category: 'Webcam',
        isLive: true,
        isAdult: true,
        pricePerMin: 25,
        ageVerified: true,
        isGroupShow: true,
        groupPrice: 10,
        thumbnail: 'https://picsum.photos/seed/MystiqueCam/400/300'
    },
    {
        id: 8,
        title: 'Couples Cam Show',
        streamer: { id: 204, name: 'Luna & Max', image: 'https://picsum.photos/seed/CoupleCam/400/300' },
        viewers: 4210,
        likes: 2800,
        category: 'Webcam',
        isLive: true,
        isAdult: true,
        pricePerMin: 30,
        ageVerified: true,
        isCouple: true,
        thumbnail: 'https://picsum.photos/seed/CoupleCam/400/300'
    },
    {
        id: 9,
        title: 'Massage & Relaxation',
        streamer: { id: 205, name: 'SensualSage', image: 'https://picsum.photos/seed/SensualSage/400/300' },
        viewers: 0,
        likes: 0,
        category: 'Webcam',
        isLive: false,
        isAdult: true,
        ageVerified: true,
        scheduled: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        thumbnail: 'https://picsum.photos/seed/SensualSage/400/300'
    }
];

// ==================== CONTENT SAMPLE DATA ====================
const sampleContent = [
    {
        id: 1,
        type: 'video',
        creator: { id: 1, name: 'Sarah', type: 'creator', image: sampleProfiles[0].image },
        caption: 'Amazing sunset hike at Lion\'s Head! 🌅 The view was absolutely worth the climb. #CapeTown #Hiking #Sunset',
        media: 'https://picsum.photos/seed/img22/400/300',
        likes: 234,
        views: 1523,
        comments: 45,
        isPublic: true,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
        id: 2,
        type: 'photo',
        creator: { id: 3, name: 'Priya', type: 'model', image: sampleProfiles[2].image },
        caption: 'New photoshoot vibes ✨ What do you think? #Photoshoot #Model #Fashion',
        media: 'https://picsum.photos/seed/Priya/400/300',
        likes: 567,
        views: 3421,
        comments: 89,
        isPublic: true,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
        id: 3,
        type: 'video',
        creator: { id: 108, name: 'DJ Thabo', type: 'creator', image: 'https://picsum.photos/seed/DJThabo/400/300' },
        caption: 'Live set from last weekend\'s rooftop party! 🎵 The energy was insane! #DJ #HouseMusic #LiveSet',
        media: 'https://picsum.photos/seed/img24/400/300',
        likes: 892,
        views: 5634,
        comments: 156,
        isPublic: true,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
        id: 4,
        type: 'photo',
        creator: { id: 5, name: 'Zanele', type: 'creator', image: sampleProfiles[4].image },
        caption: 'Coffee and good vibes ☕ Starting the week right! #MondayMotivation #CoffeeLover',
        media: 'https://picsum.photos/seed/Zanele/400/300',
        likes: 345,
        views: 2134,
        comments: 67,
        isPublic: true,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
        id: 5,
        type: 'video',
        creator: { id: 103, name: 'Wellness Hub', type: 'creator', image: 'https://picsum.photos/seed/SunsetYogaWine/400/300' },
        caption: '5-minute morning stretch routine 🧘‍♀️ Start your day feeling energized! #Yoga #Wellness #MorningRoutine',
        media: 'https://picsum.photos/seed/img26/400/300',
        likes: 1234,
        views: 8765,
        comments: 234,
        isPublic: true,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
        id: 6,
        type: 'photo',
        creator: { id: 2, name: 'Michael', type: 'hunter', image: sampleProfiles[1].image },
        caption: 'Business meeting with a view 🏙️ #Entrepreneur #Johannesburg #CityLife',
        media: 'https://picsum.photos/seed/Michael/400/300',
        likes: 456,
        views: 2876,
        comments: 78,
        isPublic: true,
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
];

// ==================== FORUM SAMPLE DATA ====================
const sampleForumCategories = [
    { id: 'general', name: 'General Discussion', icon: 'comments', color: '#6366f1', description: 'Talk about anything and everything', postCount: 156 },
    { id: 'advice', name: 'Advice & Tips', icon: 'lightbulb', color: '#f59e0b', description: 'Get advice from the community', postCount: 89 },
    { id: 'events', name: 'Events & Meetups', icon: 'calendar-alt', color: '#ec4899', description: 'Plan and discuss meetups', postCount: 67 },
    { id: 'safety', name: 'Safety & Verification', icon: 'shield-alt', color: '#22c55e', description: 'Stay safe and verified', postCount: 45 },
    { id: 'feedback', name: 'Feedback & Suggestions', icon: 'feedback', color: '#8b5cf6', description: 'Help us improve Koitus', postCount: 34 },
    { id: 'off-topic', name: 'Off-Topic', icon: 'random', color: '#14b8a6', description: 'Random discussions', postCount: 234 }
];

const sampleProviderForumCategories = [
    { id: 'business', name: 'Business Strategies', icon: 'chart-line', color: '#6366f1', description: 'Grow your service business', postCount: 89, providerOnly: true },
    { id: 'marketing', name: 'Marketing & Promotion', icon: 'bullhorn', color: '#f59e0b', description: 'Market your services effectively', postCount: 67, providerOnly: true },
    { id: 'legal', name: 'Legal & Compliance', icon: 'balance-scale', color: '#22c55e', description: 'Stay compliant and protected', postCount: 45, providerOnly: true },
    { id: 'networking', name: 'Networking', icon: 'users', color: '#ec4899', description: 'Connect with other providers', postCount: 123, providerOnly: true },
    { id: 'resources', name: 'Resources & Tools', icon: 'toolbox', color: '#8b5cf6', description: 'Share tools and resources', postCount: 56, providerOnly: true },
    { id: 'success', name: 'Success Stories', icon: 'trophy', color: '#14b8a6', description: 'Celebrate wins and milestones', postCount: 78, providerOnly: true }
];

const sampleForumPosts = [
    {
        id: 1,
        category: 'advice',
        title: 'Best venues for first dates in Johannesburg?',
        content: 'Hey everyone! I\'m new to Joburg and looking for recommendations for good first date spots. Preferably somewhere not too loud where we can actually talk. Budget around R300-500 per person. Thanks!',
        author: { id: 2, name: 'Michael', image: sampleProfiles[1].image },
        votes: 23,
        replies: 15,
        views: 342,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'user'
    },
    {
        id: 2,
        category: 'safety',
        title: 'Tips for staying safe on dating apps',
        content: 'Just wanted to share some safety tips I\'ve learned: 1) Always meet in public places first, 2) Tell a friend where you\'re going, 3) Trust your instincts, 4) Video call before meeting. What other tips do you have?',
        author: { id: 3, name: 'Priya', image: sampleProfiles[2].image },
        votes: 156,
        replies: 45,
        views: 1234,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'user'
    },
    {
        id: 3,
        category: 'events',
        title: 'Who\'s interested in a group hike this weekend?',
        content: 'Planning a group hike to Lion\'s Head in Cape Town this Saturday morning. Looking to meet new people and enjoy the views! Meeting point at the base around 7am. Comment if you\'re interested!',
        author: { id: 1, name: 'Sarah', image: sampleProfiles[0].image },
        votes: 45,
        replies: 28,
        views: 567,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'approved',
        type: 'user'
    },
    {
        id: 4,
        category: 'general',
        title: 'What\'s your favorite ice breaker?',
        content: 'Curious to know what everyone\'s go-to opening line is when matching with someone new. Share your best ice breakers!',
        author: { id: 5, name: 'Zanele', image: sampleProfiles[4].image },
        votes: 67,
        replies: 89,
        views: 890,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'user'
    },
    {
        id: 5,
        category: 'feedback',
        title: 'Suggestion: Add video call feature',
        content: 'Would love to see a video call feature added to the app. It would be great to have a quick video chat before meeting up in person. Any updates on this?',
        author: { id: 4, name: 'Thando', image: sampleProfiles[3].image },
        votes: 234,
        replies: 56,
        views: 1567,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'user'
    },
    {
        id: 6,
        category: 'general',
        title: 'New to the platform - introduction!',
        content: 'Hi everyone! Just joined Koitus and excited to be part of this community. Looking forward to meeting new people and participating in discussions. Any tips for a newcomer?',
        author: { id: 8, name: 'Jessica', image: 'https://picsum.photos/seed/Jessica/400/300' },
        votes: 12,
        replies: 8,
        views: 156,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'pending',
        type: 'user'
    },
    {
        id: 7,
        category: 'advice',
        title: 'How to handle rejection gracefully?',
        content: 'I\'ve been on a few dates through the app but haven\'t found a connection yet. How do you all handle rejection without taking it personally? Would appreciate some advice.',
        author: { id: 9, name: 'David K.', image: 'https://picsum.photos/seed/DavidK/400/300' },
        votes: 45,
        replies: 23,
        views: 445,
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'pending',
        type: 'user'
    }
];

const sampleProviderForumPosts = [
    {
        id: 101,
        category: 'business',
        title: 'Pricing strategies for new service providers',
        content: 'After 2 years in the industry, I\'ve learned that pricing is crucial. Start competitive but don\'t undervalue yourself. Here\'s my approach: 1) Research competitors, 2) Calculate your costs, 3) Factor in your experience level, 4) Adjust based on demand. What\'s your pricing strategy?',
        author: { id: 7, name: 'Amara', image: sampleProfiles[6].image, type: 'provider' },
        votes: 89,
        replies: 34,
        views: 567,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'provider'
    },
    {
        id: 102,
        category: 'marketing',
        title: 'Social media marketing tips that actually work',
        content: 'I\'ve grown my client base by 200% using these strategies: 1) Consistent posting schedule, 2) Behind-the-scenes content, 3) Client testimonials, 4) Collaborations with other providers, 5) Paid ads targeting. Happy to share more details!',
        author: { id: 10, name: 'Lisa', image: sampleProfiles[9].image, type: 'provider' },
        votes: 156,
        replies: 67,
        views: 1234,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'provider'
    },
    {
        id: 103,
        category: 'legal',
        title: 'Important: New regulations for service providers in 2026',
        content: 'Just attended a seminar on the new regulations. Key changes: 1) Updated licensing requirements, 2) New tax thresholds, 3) Enhanced privacy policies required, 4) Mandatory insurance for certain services. Please ensure you\'re compliant!',
        author: { id: 109, name: 'Advocate Mbeki', image: 'https://picsum.photos/seed/AdvocateMbeki/400/300', type: 'provider' },
        votes: 234,
        replies: 45,
        views: 2345,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'provider'
    },
    {
        id: 104,
        category: 'networking',
        title: 'Monthly provider meetup - Johannesburg',
        content: 'Organizing a casual meetup for service providers in Joburg. Last Saturday of every month at a rotating venue. Great for networking, sharing experiences, and collaborations. Next meetup: The Sky Lounge, Sandton, Jan 27th at 18:00. RSVP in comments!',
        author: { id: 1, name: 'Sarah', image: sampleProfiles[0].image, type: 'provider' },
        votes: 78,
        replies: 56,
        views: 890,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'approved',
        type: 'provider'
    },
    {
        id: 105,
        category: 'resources',
        title: 'Free booking system template for providers',
        content: 'I created a Google Sheets template for managing bookings, payments, and client info. It\'s automated with reminders and invoicing. Happy to share with anyone interested. Just comment below!',
        author: { id: 3, name: 'Priya', image: sampleProfiles[2].image, type: 'provider' },
        votes: 312,
        replies: 123,
        views: 3456,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'provider'
    },
    {
        id: 106,
        category: 'success',
        title: 'Just hit my first R50k month! 🎉',
        content: 'Started on Koitus 8 months ago with zero clients. Just completed my best month ever! Key learnings: be professional, deliver quality, ask for reviews, and stay consistent. Thank you to this community for all the support and advice. You all inspired me!',
        author: { id: 110, name: 'Nomsa M.', image: 'https://picsum.photos/seed/NomsaM/400/300', type: 'provider' },
        votes: 445,
        replies: 89,
        views: 4567,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isAnswered: true,
        status: 'approved',
        type: 'provider'
    },
    {
        id: 107,
        category: 'business',
        title: 'Looking for advice on expanding services',
        content: 'Currently offering photography services but considering adding video production. Has anyone successfully expanded their service offerings? What challenges should I expect? Investment costs? Client reception?',
        author: { id: 111, name: 'Marcus T.', image: 'https://picsum.photos/seed/MarcusT/400/300', type: 'provider' },
        votes: 34,
        replies: 18,
        views: 345,
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'pending',
        type: 'provider'
    }
];

// Pending posts for admin approval (separate tracking)
const pendingApprovalPosts = [
    {
        id: 6,
        category: 'general',
        title: 'New to the platform - introduction!',
        content: 'Hi everyone! Just joined Koitus and excited to be part of this community. Looking forward to meeting new people and participating in discussions. Any tips for a newcomer?',
        author: { id: 8, name: 'Jessica', image: 'https://picsum.photos/seed/Jessica/400/300' },
        votes: 12,
        replies: 8,
        views: 156,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'pending',
        type: 'user'
    },
    {
        id: 7,
        category: 'advice',
        title: 'How to handle rejection gracefully?',
        content: 'I\'ve been on a few dates through the app but haven\'t found a connection yet. How do you all handle rejection without taking it personally? Would appreciate some advice.',
        author: { id: 9, name: 'David K.', image: 'https://picsum.photos/seed/DavidK/400/300' },
        votes: 45,
        replies: 23,
        views: 445,
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'pending',
        type: 'user'
    },
    {
        id: 107,
        category: 'business',
        title: 'Looking for advice on expanding services',
        content: 'Currently offering photography services but considering adding video production. Has anyone successfully expanded their service offerings? What challenges should I expect? Investment costs? Client reception?',
        author: { id: 111, name: 'Marcus T.', image: 'https://picsum.photos/seed/MarcusT/400/300', type: 'provider' },
        votes: 34,
        replies: 18,
        views: 345,
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        isAnswered: false,
        status: 'pending',
        type: 'provider'
    }
];

// ==================== PRODUCTS SAMPLE DATA ====================
const sampleProducts = [
    {
        id: 1,
        name: 'Luxury Lingerie Set',
        seller: { id: 7, name: 'Amara', image: sampleProfiles[6].image },
        price: 850,
        originalPrice: 1200,
        category: 'lingerie',
        description: 'Elegant lace lingerie set in black. Premium quality, comfortable fit. Available in sizes S-XL.',
        images: ['https://picsum.photos/seed/img33/400/300'],
        rating: 4.8,
        reviews: 34,
        sold: 156,
        stock: 25,
        isFeatured: true,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
        id: 2,
        name: 'Professional Photo Shoot Package',
        seller: { id: 1, name: 'Sarah', image: sampleProfiles[0].image },
        price: 2500,
        originalPrice: 3500,
        category: 'photography',
        description: '1-hour professional photo shoot with edited photos. Perfect for portfolios, social media, or personal use.',
        images: ['https://picsum.photos/seed/img34/400/300'],
        rating: 4.9,
        reviews: 67,
        sold: 234,
        stock: 999,
        isFeatured: true,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
        id: 3,
        name: 'Custom Dance Choreography',
        seller: { id: 3, name: 'Priya', image: sampleProfiles[2].image },
        price: 1500,
        originalPrice: 2000,
        category: 'dance',
        description: 'Learn a custom dance routine for your special event. 2 sessions included. Any style: Bollywood, Hip-hop, Contemporary.',
        images: ['https://picsum.photos/seed/img35/400/300'],
        rating: 5.0,
        reviews: 45,
        sold: 89,
        stock: 999,
        isFeatured: true,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
        id: 4,
        name: 'Handmade Jewelry Collection',
        seller: { id: 5, name: 'Zanele', image: sampleProfiles[4].image },
        price: 650,
        originalPrice: 900,
        category: 'jewelry',
        description: 'Unique handmade jewelry pieces. Earrings, necklaces, and bracelets. Each piece is one-of-a-kind.',
        images: ['https://picsum.photos/seed/img36/400/300'],
        rating: 4.7,
        reviews: 56,
        sold: 312,
        stock: 15,
        isFeatured: false,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
        id: 5,
        name: 'Fitness Training Session',
        seller: { id: 6, name: 'James', image: sampleProfiles[5].image },
        price: 400,
        originalPrice: 600,
        category: 'fitness',
        description: 'Personal training session with certified fitness coach. Customized workout plan included.',
        images: ['https://picsum.photos/seed/img37/400/300'],
        rating: 4.6,
        reviews: 78,
        sold: 445,
        stock: 999,
        isFeatured: false,
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    },
    {
        id: 6,
        name: 'Event Planning Consultation',
        seller: { id: 10, name: 'Lisa', image: sampleProfiles[9].image },
        price: 1200,
        originalPrice: 1800,
        category: 'events',
        description: 'Professional event planning consultation. Perfect for parties, corporate events, or special occasions.',
        images: ['https://picsum.photos/seed/img38/400/300'],
        rating: 4.5,
        reviews: 23,
        sold: 67,
        stock: 999,
        isFeatured: false,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
        id: 7,
        name: 'Sensual Massage Oil Set',
        seller: { id: 7, name: 'Amara', image: sampleProfiles[6].image },
        price: 350,
        originalPrice: 500,
        category: 'wellness',
        description: 'Premium massage oil set with essential oils. Creates a relaxing and intimate atmosphere.',
        images: ['https://picsum.photos/seed/img39/400/300'],
        rating: 4.8,
        reviews: 89,
        sold: 567,
        stock: 50,
        isFeatured: true,
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    },
    {
        id: 8,
        name: 'DJ Mix - House Vibes',
        seller: { id: 108, name: 'DJ Thabo', image: 'https://picsum.photos/seed/DJThabo/400/300' },
        price: 150,
        originalPrice: 250,
        category: 'music',
        description: 'Exclusive 2-hour DJ mix featuring the best house music tracks. Digital download.',
        images: ['https://picsum.photos/seed/img24/400/300'],
        rating: 4.9,
        reviews: 123,
        sold: 890,
        stock: 999,
        isFeatured: false,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    }
];

const sampleStories = [
    {
        id: 'story-1',
        title: 'The Night We Met',
        type: 'story',
        author: 'Sarah',
        date: '2026-06-15',
        excerpt: 'A chance encounter at a rooftop bar that changed everything...',
        content: '<p>It was a warm summer evening when I decided to go to that rooftop bar alone for the first time. The city lights twinkled below as I ordered my usual cocktail. Little did I know that the stranger sitting two stools away would become the most important person in my life.</p><p>He smiled, I looked away. He said something funny, I laughed. Hours felt like minutes. We talked about everything and nothing at all. When the bar closed at 2 AM, we walked through the empty streets of Johannesburg, neither wanting the night to end.</p><p>That was six months ago. Now I can\'t imagine my life without him.</p>',
        likes: 47,
        image: 'https://picsum.photos/seed/story1/800/400'
    },
    {
        id: 'story-2',
        title: 'The Art of Connection',
        type: 'blog',
        author: 'Marcus',
        date: '2026-06-10',
        excerpt: 'Why genuine connection matters more than ever in the digital age...',
        content: '<p>In a world of swipes and likes, we often forget what it truly means to connect with another human being. The digital age has given us unprecedented access to potential partners, but has it made us better at love?</p><p>I believe the key lies in authenticity. Strip away the filters, the carefully curated profiles, and the rehearsed opening lines. What remains is the raw, beautiful, terrifying truth of who we are.</p><p>This blog explores how to foster genuine connections in a digital world, drawing from my own experiences and those of people I\'ve met along the way.</p>',
        likes: 32,
        image: 'https://picsum.photos/seed/story2/800/400'
    },
    {
        id: 'story-3',
        title: 'Midnight Musings',
        type: 'poem',
        author: 'Luna',
        date: '2026-06-08',
        excerpt: 'A poem about love found in the quiet hours...',
        content: '<p>In the velvet dark of midnight\'s grace<br>I found a smile on a stranger\'s face<br>Two souls adrift in city light<br>Colliding softly in the night</p><p>No words were spoken, none were needed<br>Two lonely hearts, at last unseeded<br>To grow a garden wild and free<br>From just a glance, you and me</p>',
        likes: 89,
        image: 'https://picsum.photos/seed/story3/800/400'
    },
    {
        id: 'story-4',
        title: 'Top 10 Date Ideas in Johannesburg',
        type: 'article',
        author: 'TravelDesk',
        date: '2026-06-05',
        excerpt: 'From rooftop cinemas to underground jazz bars...',
        content: '<p>Johannesburg is a city of hidden gems when it comes to dating. Whether you\'re planning a first date or looking to spice up your relationship, here are ten unforgettable date ideas in the City of Gold.</p><p><strong>1. Rooftop Cinema at The Bioscope</strong> - Nothing says romance like watching a classic film under the stars.</p><p><strong>2. Art Walk in Maboneng</strong> - Explore galleries, street art, and pop-up exhibitions hand in hand.</p><p><strong>3. Sundowners at The Living Room</strong> - Sip cocktails with a panoramic view of the city skyline.</p><p>Stay tuned for the full list in this comprehensive guide.</p>',
        likes: 156,
        image: 'https://picsum.photos/seed/story4/800/400'
    },
    {
        id: 'story-5',
        title: 'A Beginner\'s Guide to Dating in SA',
        type: 'ebook',
        author: 'Koitus Team',
        date: '2026-06-01',
        excerpt: 'Everything you need to know about modern dating in South Africa...',
        content: '<p>This comprehensive guide covers everything from creating the perfect profile to planning unforgettable dates. Written by our team of dating experts, this e-book is your essential companion for navigating the South African dating scene.</p><p>Chapters include: Understanding the Local Dating Culture, Crafting Your Perfect Profile, The Art of the First Message, Safety Tips for Online Dating, and much more.</p><p>Download the full e-book to transform your dating life today.</p>',
        likes: 203,
        image: 'https://picsum.photos/seed/story5/800/400'
    },
    {
        id: 'story-6',
        title: 'Why Confidence is Your Best Accessory',
        type: 'puff',
        author: 'StyleSage',
        date: '2026-05-28',
        excerpt: 'The one thing that makes any outfit look better...',
        content: '<p>We\'ve all heard the saying, but let\'s be real — confidence truly is the most attractive quality a person can wear. It\'s not about being loud or dominant; it\'s about being comfortable in your own skin.</p><p>In this puff piece, we explore how self-assurance transforms the way others perceive you, and more importantly, how you perceive yourself. From body language tips to mindset shifts, we\'ve got you covered.</p><p>Because the most attractive thing you can wear is your smile — and the confidence behind it.</p>',
        likes: 67,
        image: 'https://picsum.photos/seed/story6/800/400'
    }
];

const iceBreakers = [
    "Hey! I noticed you love [interest]. What's your favorite thing about it?",
    "That photo at [location] looks amazing! Where was it taken?",
    "I see we both enjoy [interest]. Any recommendations?",
    "Your smile is contagious! How's your day going?",
    "If you could travel anywhere right now, where would you go?",
    "What's the best thing that happened to you this week?",
    "I'm curious - what's your idea of a perfect weekend?",
    "Your profile caught my attention! What's your story?",
    "Coffee or tea? This is important! ☕",
    "What's something you're passionate about that most people don't know?"
];

// ==================== PERSONALS SAMPLE DATA ====================
const samplePersonals = [
    {
        id: 1,
        title: 'Looking for a hiking buddy',
        postedBy: { id: 1, name: 'Sarah', age: 25, image: sampleProfiles[0].image },
        lookingFor: 'Friendship / Activity Partner',
        description: 'Love exploring trails around Johannesburg and looking for someone who shares the same passion. Weekend hikes preferred!',
        location: 'Johannesburg',
        ageRange: '22-35',
        type: 'friendship',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        responses: 8
    },
    {
        id: 2,
        title: 'Searching for my soulmate',
        postedBy: { id: 2, name: 'Michael', age: 28, image: sampleProfiles[1].image },
        lookingFor: 'Dating / Relationship',
        description: 'Tired of swiping. Looking for a genuine connection with someone who values honesty, humor, and good conversation.',
        location: 'Cape Town',
        ageRange: '24-32',
        type: 'dating',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        responses: 15
    },
    {
        id: 3,
        title: 'Need a gym partner (female)',
        postedBy: { id: 3, name: 'Priya', age: 26, image: sampleProfiles[2].image },
        lookingFor: 'Fitness Partner',
        description: 'Looking for a consistent gym partner who takes fitness seriously. I go 5x a week, early mornings. Must be motivated!',
        location: 'Durban',
        ageRange: '22-30',
        type: 'friendship',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        responses: 6
    },
    {
        id: 4,
        title: 'Adventurous woman wanted!',
        postedBy: { id: 6, name: 'James', age: 30, image: sampleProfiles[5].image },
        lookingFor: 'Dating / Relationship',
        description: 'Skydiving, road trips, camping under the stars. If you love adrenaline and adventure, we\'ll get along perfectly.',
        location: 'Pretoria',
        ageRange: '23-33',
        type: 'dating',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        responses: 12
    },
    {
        id: 5,
        title: 'Looking for language exchange',
        postedBy: { id: 4, name: 'Thando', age: 27, image: sampleProfiles[3].image },
        lookingFor: 'Language / Cultural Exchange',
        description: 'Native Zulu speaker looking to improve my French. Happy to help with Zulu or Xhosa in return. Coffee dates welcome!',
        location: 'Johannesburg',
        ageRange: 'any',
        type: 'friendship',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        responses: 4
    },
    {
        id: 6,
        title: 'Cuddle buddy wanted',
        postedBy: { id: 7, name: 'Amara', age: 29, image: sampleProfiles[6].image },
        lookingFor: 'Casual / Friends with Benefits',
        description: 'Looking for a respectful, clean, and drama-free cuddle buddy. No expectations beyond mutual comfort and relaxation.',
        location: 'Cape Town',
        ageRange: '25-35',
        type: 'casual',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        responses: 20
    },
    {
        id: 7,
        title: 'Travel companion for Europe trip',
        postedBy: { id: 10, name: 'Lisa', age: 24, image: sampleProfiles[9].image },
        lookingFor: 'Travel Partner',
        description: 'Planning a 3-week Europe trip in December. Looking for a travel buddy to share costs and experiences. Flexible itinerary.',
        location: 'Johannesburg',
        ageRange: '22-30',
        type: 'friendship',
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        responses: 10
    }
];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    showMainApp();
    initRangeSliders();
    initChatEmojiPicker();
    detectUserRegion();
    initRealtimeConnection();

    // Boot via Supabase (loads from cloud or falls back to localStorage)
    bootstrapSupabase().then(function() {
        updateNavVisibility();
        // Re-render current view now that data is loaded
        if (state.currentView) {
            switchView(state.currentView);
        }
        if (state.currentUser?.isAdmin || state.currentUser?.role === 'admin') {
            setTimeout(function() {
                showAdminDashboard();
                console.log('🛡️ Admin dashboard loaded');
            }, 500);
        }
        console.log('💬 Koitus App Initialized');
        console.log('👤 User:', state.currentUser || 'Guest');
    });
}

function initRangeSliders() {
    const ageMin = document.getElementById('age-min');
    const ageMax = document.getElementById('age-max');
    const ageMinValue = document.getElementById('age-min-value');
    const ageMaxValue = document.getElementById('age-max-value');
    
    if (ageMin && ageMax) {
        ageMin.addEventListener('input', () => {
            ageMinValue.textContent = ageMin.value;
        });
        
        ageMax.addEventListener('input', () => {
            ageMaxValue.textContent = ageMax.value;
        });
    }
}

function loadSampleData() {
    state.profiles = [...sampleProfiles];
    state.matches = [...sampleMatches];
    state.notifications = [...sampleNotifications];
    state.events = [...sampleEvents];
    state.wallet.transactions = [...sampleTransactions];
    state.activityFeed = [...sampleActivityFeed];
    state.streams = [...sampleStreams];
    state.content = [...sampleContent];
    state.forumCategories = [...sampleForumCategories];
    state.providerForumCategories = [...sampleProviderForumCategories];
    state.forumPosts = [...sampleForumPosts];
    state.providerForumPosts = [...sampleProviderForumPosts];
    state.products = [...sampleProducts];
    state.stories = [...sampleStories];
    state.clubs = [...sampleClubs];
    state.personals = [...samplePersonals];

    // Load sample reports
    state.adminData.reports = [
        {
            id: 1,
            type: 'post',
            postId: 1,
            reason: 'Inappropriate content - this post contains offensive language',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            status: 'pending',
            reporterId: 2,
            reporterName: 'Sarah'
        },
        {
            id: 2,
            type: 'post',
            postId: 3,
            reason: 'Spam - suspicious link in post',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: 'resolved',
            resolvedBy: 'Administrator',
            resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            reporterId: 5,
            reporterName: 'Emily'
        }
    ];

    // Load sample activity logs
    state.adminData.activityLogs = [
        {
            id: Date.now() - 1000,
            timestamp: new Date(Date.now() - 1 * 60 * 1000),
            userId: 1,
            userName: 'Sarah',
            userEmail: 'sarah@example.com',
            type: ActivityType.LOGIN,
            level: ActivityLevel.INFO,
            action: 'User logged in',
            details: {},
            ipAddress: '192.168.1.100',
            userAgent: navigator.userAgent,
            session: 'sess_001'
        },
        {
            id: Date.now() - 2000,
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            userId: 2,
            userName: 'Michael',
            userEmail: 'michael@example.com',
            type: ActivityType.SIGNUP,
            level: ActivityLevel.INFO,
            action: 'New user registered',
            details: { email: 'michael@example.com' },
            ipAddress: '192.168.1.101',
            userAgent: navigator.userAgent,
            session: 'sess_002'
        },
        {
            id: Date.now() - 3000,
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            userId: 1,
            userName: 'Sarah',
            userEmail: 'sarah@example.com',
            type: ActivityType.MESSAGE_SENT,
            level: ActivityLevel.INFO,
            action: 'Sent a message in chat',
            details: { conversationId: 1 },
            ipAddress: '192.168.1.100',
            userAgent: navigator.userAgent,
            session: 'sess_001'
        },
        {
            id: Date.now() - 4000,
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            userId: 4,
            userName: 'Thabo',
            userEmail: 'thabo@example.com',
            type: ActivityType.FORUM_POST,
            level: ActivityLevel.INFO,
            action: 'Created new forum post',
            details: { postId: 3, title: 'Weekend Hiking Meetup' },
            ipAddress: '192.168.1.102',
            userAgent: navigator.userAgent,
            session: 'sess_003'
        },
        {
            id: Date.now() - 5000,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            userId: 6,
            userName: 'Jessica',
            userEmail: 'jessica@example.com',
            type: ActivityType.REPORT_SUBMIT,
            level: ActivityLevel.WARNING,
            action: 'Reported a post for inappropriate content',
            details: { postId: 1, reason: 'Inappropriate content' },
            ipAddress: '192.168.1.103',
            userAgent: navigator.userAgent,
            session: 'sess_004'
        },
        {
            id: Date.now() - 6000,
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            userId: 'admin',
            userName: 'Administrator',
            userEmail: state.currentUser?.email || 'admin@koitus.co.za',
            type: ActivityType.ADMIN_ACTION,
            level: ActivityLevel.CRITICAL,
            action: 'Resolved a user report',
            details: { reportId: 2, resolution: 'Content removed, user warned' },
            ipAddress: '192.168.1.1',
            userAgent: navigator.userAgent,
            session: 'sess_admin'
        }
    ];

    // Create sample conversations
    state.conversations = sampleMatches.map(match => ({
        id: match.id,
        name: match.name,
        avatar: match.image,
        messages: [
            { id: 1, text: match.lastMessage, sent: false, time: match.time }
        ],
        online: match.online
    }));

    try { renderUsers(); } catch (e) { console.warn('renderUsers error:', e); }
    try { renderDiscoverFeed(); } catch (e) { console.warn('renderDiscoverFeed error:', e); }
    try { renderMatches(); } catch (e) { console.warn('renderMatches error:', e); }
    try { renderConversations(); } catch (e) { console.warn('renderConversations error:', e); }
    try { renderNotifications(); } catch (e) { console.warn('renderNotifications error:', e); }
    try { renderEvents(); } catch (e) { console.warn('renderEvents error:', e); }
    try { renderWallet(); } catch (e) { console.warn('renderWallet error:', e); }
    try { renderActivityFeed(); } catch (e) { console.warn('renderActivityFeed error:', e); }
    try { renderStreams(); } catch (e) { console.warn('renderStreams error:', e); }
    try { renderContent(); } catch (e) { console.warn('renderContent error:', e); }
    try { renderForum(); } catch (e) { console.warn('renderForum error:', e); }
    try { renderProducts(); } catch (e) { console.warn('renderProducts error:', e); }
    try { renderClubs(); } catch (e) { console.warn('renderClubs error:', e); }
}

// ==================== SAMPLE CLUB DATA ====================
const sampleClubs = [
    {
        id: 1,
        name: 'Elite Professionals',
        description: 'Exclusive club for successful professionals in Johannesburg. Network, socialize, and build meaningful connections.',
        creator: { id: 1, name: 'Sarah', image: sampleProfiles[0].image },
        members: [sampleProfiles[0].image, sampleProfiles[1].image, sampleProfiles[2].image, sampleProfiles[6].image],
        memberCount: 24,
        maxMembers: 50,
        isPrivate: true,
        category: 'professional',
        tags: ['networking', 'professionals', 'elite'],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        activityLevel: 'high',
        image: 'https://picsum.photos/seed/img40/400/300'
    },
    {
        id: 2,
        name: 'Adventure Seekers SA',
        description: 'For thrill-seekers and outdoor enthusiasts. Hiking, skydiving, bungee jumping, and more!',
        creator: { id: 2, name: 'Michael', image: sampleProfiles[1].image },
        members: [sampleProfiles[1].image, sampleProfiles[3].image, sampleProfiles[5].image],
        memberCount: 45,
        maxMembers: 100,
        isPrivate: false,
        category: 'adventure',
        tags: ['outdoor', 'adventure', 'sports'],
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        activityLevel: 'very-high',
        image: 'https://picsum.photos/seed/img41/400/300'
    },
    {
        id: 3,
        name: 'Luxury Lifestyle',
        description: 'Premium club for those who appreciate the finer things. Exclusive events, fine dining, and luxury experiences.',
        creator: { id: 7, name: 'Amara', image: sampleProfiles[6].image },
        members: [sampleProfiles[6].image, sampleProfiles[4].image],
        memberCount: 15,
        maxMembers: 30,
        isPrivate: true,
        category: 'luxury',
        tags: ['luxury', 'lifestyle', 'exclusive'],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        activityLevel: 'medium',
        image: 'https://picsum.photos/seed/img42/400/300',
        joinFee: 500
    },
    {
        id: 4,
        name: 'Creative Minds',
        description: 'Artists, musicians, writers, and creatives unite! Share your work, collaborate, and get inspired.',
        creator: { id: 5, name: 'Zanele', image: sampleProfiles[4].image },
        members: [sampleProfiles[4].image, sampleProfiles[2].image, sampleProfiles[9].image],
        memberCount: 67,
        maxMembers: 150,
        isPrivate: false,
        category: 'creative',
        tags: ['art', 'music', 'creative'],
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        activityLevel: 'high',
        image: 'https://picsum.photos/seed/img43/400/300'
    },
    {
        id: 5,
        name: 'Fitness & Wellness Hub',
        description: 'Dedicated to health, fitness, and wellness. Workout tips, nutrition advice, and motivation.',
        creator: { id: 6, name: 'James', image: sampleProfiles[5].image },
        members: [sampleProfiles[5].image, sampleProfiles[0].image],
        memberCount: 89,
        maxMembers: 200,
        isPrivate: false,
        category: 'fitness',
        tags: ['fitness', 'health', 'wellness'],
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        activityLevel: 'very-high',
        image: 'https://picsum.photos/seed/img44/400/300'
    }
];

// ==================== AUTHENTICATION ====================
function showLogin() {
    document.getElementById('login-modal').classList.add('active');
}

function showSignup() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('signup-modal').classList.add('active');
    setTimeout(function() {
        populateCountrySelect('signup-country', '');
    }, 100);
}

function closeAuth() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('signup-modal').classList.remove('active');
}

// Admin authentication is handled via Supabase profiles (is_admin/role fields)
// No hardcoded credentials — admins must have is_admin=true in the profiles table

// Show admin login modal
function showAdminLogin() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close admin login modal
function closeAdminLogin() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Handle admin login
function handleAdminLogin(event) {
    event.preventDefault();

    var email = document.getElementById('admin-login-email').value;
    var password = document.getElementById('admin-login-password').value;

    AuthDB.signIn(email, password).then(function(result) {
        if (result.error) {
            showNotification('Invalid admin credentials. Access denied.', 'error');
            logActivity({
                type: ActivityType.LOGIN,
                level: ActivityLevel.WARNING,
                action: 'Failed admin login attempt from ' + email,
                details: { email: email, success: false }
            });
            return;
        }

        ProfileDB.get(result.user.id).then(function(profile) {
            if (profile && (profile.is_admin || profile.role === 'admin')) {
                state.currentUser = profile;
                state.isLoggedIn = true;
                state.isAdmin = true;
                saveUserData();
                closeAdminLogin();
                showMainApp();
                logActivity({
                    type: ActivityType.LOGIN,
                    level: ActivityLevel.CRITICAL,
                    action: 'Admin login from ' + email,
                    details: { email: email, role: 'admin' }
                });
                setTimeout(function() {
                    showAdminDashboard();
                    showNotification('Welcome back, Administrator! 🛡️', 'success');
                }, 500);
            } else {
                showNotification('Not an admin account.', 'error');
            }
        });
    });
}

function handleLogin(event) {
    event.preventDefault();

    var email = document.getElementById('login-email').value;
    var password = document.getElementById('login-password').value;

    AuthDB.signIn(email, password).then(function(result) {
        if (result.error) {
            // Fallback: create local session for demo
            state.currentUser = {
                id: 'user_' + Date.now(),
                name: email.split('@')[0],
                email: email,
                age: 25,
                location: 'Johannesburg, South Africa',
                bio: 'Just joined Koitus!',
                interests: ['Music', 'Travel', 'Food'],
                avatar: 'https://picsum.photos/seed/img46/400/300'
            };
            state.isLoggedIn = true;
            saveUserData();
            updateNavVisibility();
            if (!state.userProfiles[state.currentUser.id]) {
                state.userProfiles[state.currentUser.id] = getProfileTemplate();
            }
            closeAuth();
            showMainApp();
            showNotification('Welcome back! 👋', 'success');
            if (state.socket && state.socket.connected) joinPlatform();
            return;
        }

        // Logged in via Supabase
        ProfileDB.get(result.user.id).then(function(profile) {
            state.currentUser = profile || {
                id: result.user.id,
                email: email,
                name: email.split('@')[0]
            };
            state.isLoggedIn = true;
            saveUserData();
            updateNavVisibility();
            if (!state.userProfiles[state.currentUser.id]) {
                state.userProfiles[state.currentUser.id] = getProfileTemplate();
            }
            closeAuth();
            showMainApp();
            showNotification('Welcome back! 👋', 'success');
            if (state.socket && state.socket.connected) joinPlatform();
        });
    });
}
function handleSignup(event) {
    event.preventDefault();

    var name = document.getElementById('signup-name').value;
    var email = document.getElementById('signup-email').value;
    var password = document.getElementById('signup-password')?.value;
    if (!password) {
        showNotification('Please enter a password', 'error');
        return;
    }
    var age = document.getElementById('signup-age').value;
    var accountType = document.querySelector('input[name="account-type"]:checked')?.value;

    // Get profile types based on account type
    var profileData = { name: name, age: age };

    if (accountType === 'customer') {
        var mainType = document.getElementById('customer-main-type').value;
        if (!mainType) {
            showNotification('Please select your main type', 'warning');
            return;
        }
        var subTypes = [];
        document.querySelectorAll('#customer-subs input:checked').forEach(function(cb) {
            subTypes.push(cb.value);
        });
        profileData.accountType = 'customer';
        profileData.mainType = mainType;
        profileData.subTypes = subTypes;
        profileData.type = mainType;
    } else {
        var subTypeRadio = document.querySelector('#provider-type-selector input[type="radio"]:checked');
        var subType = subTypeRadio ? subTypeRadio.value : null;
        if (!subType) {
            showNotification('Please select your service type', 'warning');
            return;
        }
        var additionalServices = [];
        document.querySelectorAll('#provider-subs input:checked').forEach(function(cb) {
            additionalServices.push(cb.value);
        });
        profileData.accountType = 'provider';
        profileData.mainType = 'provider';
        profileData.subType = subType;
        profileData.additionalServices = additionalServices;
        profileData.type = subType;
    }

    var signupCountry = document.getElementById('signup-country')?.value || '';
    var signupState = document.getElementById('signup-state')?.value || '';
    var signupLocation = getLocationString(signupCountry, signupState) || 'Johannesburg, South Africa';
    profileData.location = signupLocation;
    profileData.country = signupCountry;
    profileData.state = signupState;

    AuthDB.signUp(email, password, profileData).then(function(result) {
        if (result.error && result.error.message !== 'User already exists') {
            showNotification('Signup error: ' + result.error.message, 'error');
            return;
        }

        state.currentUser = {
            id: result.user?.id || 'local_' + Date.now(),
            name: name,
            email: email,
            age: age,
            location: signupLocation,
            country: signupCountry,
            state: signupState,
            bio: 'Just joined Koitus! Excited to meet new people.',
            interests: ['Music', 'Travel', 'Food'],
            avatar: 'https://picsum.photos/seed/img46/400/300',
            ...profileData
        };
        state.isLoggedIn = true;
        saveUserData();
        state.userProfiles[state.currentUser.id] = getProfileTemplate();
        saveUserData();

        closeAuth();
        showMainApp();
        updateNavVisibility();
        showNotification('Welcome to Koitus! Your account has been created. 🎉', 'success');
        if (state.socket && state.socket.connected) joinPlatform();
        setTimeout(showOnboarding, 800);
    });
}

function selectAccountType(type) {
    // Update radio button
    const radio = document.querySelector(`input[name="account-type"][value="${type}"]`);
    if (radio) {
        radio.checked = true;
    }
    
    // Show/hide relevant sections
    const customerSection = document.getElementById('customer-types');
    const providerSection = document.getElementById('provider-types');
    
    if (type === 'customer') {
        customerSection.style.display = 'block';
        providerSection.style.display = 'none';
        document.getElementById('customer-main-type').required = true;
        document.querySelectorAll('#provider-type-selector input').forEach(el => el.required = false);
    } else {
        customerSection.style.display = 'none';
        providerSection.style.display = 'block';
        document.getElementById('customer-main-type').required = false;
        document.querySelectorAll('#provider-type-selector input').forEach(el => el.required = true);
    }
}

function selectProviderType(el, type) {
    document.querySelectorAll('.service-type-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

// ==================== ADVERTISE FUNCTIONS ====================
function showAdvertiseModal() {
    var modal = document.getElementById('advertise-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAdvertiseModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('advertise-modal');
        if (modal) modal.style.display = 'none';
    }
}

function submitAdvertiseRequest(event) {
    event.preventDefault();
    var name = document.getElementById('adv-name').value;
    var email = document.getElementById('adv-email').value;
    var type = document.getElementById('adv-type').value;
    var message = document.getElementById('adv-message').value;
    if (!name || !email || !type || !message) return;
    showToast('Thank you! Your advertising request has been submitted. Our team will contact you within 48 hours. 📢');
    closeAdvertiseModal();
    document.getElementById('advertise-form').reset();
}

// ==================== ONBOARDING SYSTEM ====================
var onboardingStep = 1;

function previewOnboardingPhoto(event) {
    var file = event.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById('onboarding-photo-preview');
            var placeholder = document.getElementById('onboarding-photo-placeholder');
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function selectOnboardingRole(type) {
    var radio = document.querySelector('input[name="onboarding-role"][value="' + type + '"]');
    if (radio) radio.checked = true;
}

function togglePref(btn) {
    btn.classList.toggle('active');
    var group = btn.parentElement;
    var everyone = group.querySelector('[data-pref="everyone"]');
    if (btn.getAttribute('data-pref') === 'everyone') {
        group.querySelectorAll('.toggle-btn').forEach(function(b) {
            if (b !== btn) b.classList.remove('active');
        });
    } else {
        if (everyone) everyone.classList.remove('active');
    }
}

function showOnboarding() {
    onboardingStep = 1;
    document.getElementById('onboarding-modal').classList.add('active');
    showOnboardingStep(1);
}

function showOnboardingStep(step) {
    for (var i = 1; i <= 5; i++) {
        var el = document.getElementById('onboarding-step-' + i);
        if (el) el.style.display = i === step ? 'block' : 'none';
    }
    var fill = document.getElementById('onboarding-progress-fill');
    if (fill) fill.style.width = (step * 20) + '%';
    document.querySelectorAll('.progress-step').forEach(function(s) {
        s.classList.toggle('active', parseInt(s.getAttribute('data-step')) <= step);
    });
}

function onboardingNext() {
    // Validate current step
    if (onboardingStep === 3) {
        var checked = document.querySelectorAll('#onboarding-interests input:checked');
        if (checked.length < 3) {
            showNotification('Please select at least 3 interests', 'warning');
            return;
        }
    }
    if (onboardingStep < 5) {
        onboardingStep++;
        showOnboardingStep(onboardingStep);
    }
}

function onboardingPrev() {
    if (onboardingStep > 1) {
        onboardingStep--;
        showOnboardingStep(onboardingStep);
    }
}

function completeOnboarding() {
    // Collect all onboarding data
    var bio = document.getElementById('onboarding-bio') ? document.getElementById('onboarding-bio').value : '';
    var ageMin = document.getElementById('onboarding-age-min') ? document.getElementById('onboarding-age-min').value : 18;
    var ageMax = document.getElementById('onboarding-age-max') ? document.getElementById('onboarding-age-max').value : 50;
    var distance = document.getElementById('onboarding-distance') ? document.getElementById('onboarding-distance').value : 25;
    var photoPreview = document.getElementById('onboarding-photo-preview');
    var roleRadio = document.querySelector('input[name="onboarding-role"]:checked');

    var interests = [];
    document.querySelectorAll('#onboarding-interests input:checked').forEach(function(cb) {
        interests.push(cb.value);
    });

    var interestedIn = [];
    document.querySelectorAll('[data-pref].active').forEach(function(btn) {
        interestedIn.push(btn.getAttribute('data-pref'));
    });

    // Update current user with onboarding data
    if (state.currentUser) {
        state.currentUser.bio = bio || state.currentUser.bio;
        state.currentUser.interests = interests.length > 0 ? interests : state.currentUser.interests;
        if (photoPreview && photoPreview.src && photoPreview.style.display !== 'none') {
            state.currentUser.avatar = photoPreview.src;
        }
        state.currentUser.preferences = {
            ageMin: parseInt(ageMin),
            ageMax: parseInt(ageMax),
            distance: parseInt(distance),
            interestedIn: interestedIn
        };
        state.currentUser.onboardingComplete = true;
        saveUserData();
    }

    document.getElementById('onboarding-modal').classList.remove('active');
    showMainApp();
    showNotification('Profile setup complete! Start exploring! 🎉', 'success');
}

function scrollToFeatures() {
    var features = document.getElementById('features');
    if (features) features.scrollIntoView({ behavior: 'smooth' });
}

function showMainApp() {
    document.getElementById('landing-page').classList.remove('active');
    document.getElementById('main-app').classList.add('active');

    // Toggle between guest auth and logged-in sidebar state
    var guestAuth = document.getElementById('sidebar-guest-auth');
    var sidebarFooter = document.querySelector('.sidebar-footer');
    if (state.currentUser) {
        if (guestAuth) guestAuth.style.display = 'none';
        if (sidebarFooter) sidebarFooter.style.display = 'block';
    } else {
        if (guestAuth) guestAuth.style.display = 'block';
        if (sidebarFooter) sidebarFooter.style.display = 'none';
    }

    // Update profile info
    if (state.currentUser) {
        document.getElementById('my-profile-name').textContent = `${state.currentUser.name}, ${state.currentUser.age}`;
        document.getElementById('my-profile-bio').textContent = state.currentUser.bio;

        // Render interests
        const interestsContainer = document.getElementById('my-profile-interests');
        if (interestsContainer) {
            interestsContainer.innerHTML = state.currentUser.interests
                .map(interest => `<span class="interest-tag">${interest}</span>`)
                .join('');
        }
        
        // Show admin features if admin
        if (state.currentUser.isAdmin || state.currentUser.role === 'admin') {
            showAdminFeatures();
        }
    }

    switchView('discover');
}

// Show admin-only features
function showAdminFeatures() {
    console.log('🛡️ Showing admin features...');
    
    // Show admin panel in settings
    const adminOnlyItems = document.querySelectorAll('.admin-only');
    adminOnlyItems.forEach(item => {
        item.style.display = 'flex';
        console.log('✅ Admin item shown:', item.className);
    });
    
    // Show admin button in forum
    const adminForumBtn = document.getElementById('admin-panel-btn');
    if (adminForumBtn) {
        adminForumBtn.style.display = 'flex';
        console.log('✅ Forum admin button shown');
    }
    
    // Show discreet admin link in sidebar
    const adminLink = document.querySelector('.admin-link-discreet');
    if (adminLink) {
        adminLink.style.display = 'flex';
        console.log('✅ Discreet admin link shown');
    }
    
    console.log('🛡️ Admin features enabled');
}

// ==================== NAVIGATION ====================
function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }
}

function switchView(viewName) {
    state.currentView = viewName;
    
    // Close sidebar on mobile
    var sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        var overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    // Update mobile bottom nav items
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Hide admin dashboard modal when switching to a regular view
    var adminDash = document.getElementById('admin-dashboard-modal');
    if (adminDash) adminDash.style.display = 'none';

    // Refresh data based on view
    function safeRender(fn, name) {
        try { fn(); } catch (e) { console.error('Error in', name, ':', e); }
    }
    switch(viewName) {
        case 'discover':
            safeRender(renderUsers, 'renderUsers');
            safeRender(renderDiscoverFeed, 'renderDiscoverFeed');
            break;
        case 'matches':
            safeRender(renderMatches, 'renderMatches');
            break;
        case 'messages':
            safeRender(renderConversations, 'renderConversations');
            break;
        case 'notifications':
            safeRender(renderNotifications, 'renderNotifications');
            break;
        case 'map':
            safeRender(initMap, 'initMap');
            break;
        case 'profile':
            safeRender(renderProfile, 'renderProfile');
            safeRender(renderProfileGallery, 'renderProfileGallery');
            setTimeout(function() { safeRender(initProfileCharts, 'initProfileCharts'); }, 100);
            break;
        case 'events':
            safeRender(renderEvents, 'renderEvents');
            break;
        case 'wallet':
            safeRender(renderWallet, 'renderWallet');
            break;
        case 'activity':
            safeRender(renderActivityFeed, 'renderActivityFeed');
            break;
        case 'streams':
            safeRender(renderStreams, 'renderStreams');
            break;
        case 'content':
            safeRender(renderContent, 'renderContent');
            break;
        case 'forum':
            safeRender(renderForum, 'renderForum');
            break;
        case 'products':
            safeRender(renderProducts, 'renderProducts');
            break;
        case 'games':
            safeRender(renderGames, 'renderGames');
            break;
        case 'stories':
            safeRender(renderStories, 'renderStories');
            break;
        case 'pricing':
            safeRender(renderPricing, 'renderPricing');
            break;
        case 'personals':
            safeRender(renderPersonals, 'renderPersonals');
            break;
        case 'profiles':
            safeRender(renderProfiles, 'renderProfiles');
            break;
        case 'store':
            safeRender(renderStore, 'renderStore');
            break;
        case 'provider-portal':
            safeRender(renderProviderPortal, 'renderProviderPortal');
            break;
        case 'directory':
            safeRender(renderDirectory, 'renderDirectory');
            break;
        case 'settings':
            // Static HTML — no dynamic render needed
            break;
    }
}

// ==================== PROFILES VIEW ====================
function renderProfiles() {
    var container = document.getElementById('profiles-container');
    var emptyState = document.getElementById('profiles-empty-state');
    if (!container) return;

    var tab = state.profilesTab || 'all';
    var view = state.profilesView || 'grid';

    var filtered = [...state.profiles];

    if (tab === 'online') {
        filtered = filtered.filter(function(p) { return p.online; });
    } else if (tab === 'favourites') {
        var favIds = state.profileFavourites || [];
        filtered = filtered.filter(function(p) { return favIds.indexOf(p.id) !== -1; });
    }

    var accFilter = document.getElementById('profiles-account-filter');
    if (accFilter && accFilter.value !== 'all') {
        filtered = filtered.filter(function(p) { return p.accountType === accFilter.value; });
    }

    var typeFilter = document.getElementById('profiles-type-filter');
    if (typeFilter && typeFilter.value !== 'all') {
        filtered = filtered.filter(function(p) { return p.type === typeFilter.value; });
    }

    var statusFilter = document.getElementById('profiles-status-filter');
    if (statusFilter && statusFilter.value !== 'all') {
        var isOnline = statusFilter.value === 'online';
        filtered = filtered.filter(function(p) { return p.online === isOnline; });
    }

    var sortFilter = document.getElementById('profiles-sort-filter');
    if (sortFilter) {
        var sv = sortFilter.value;
        if (sv === 'likes') {
            filtered.sort(function(a, b) { return (b.likes || 0) - (a.likes || 0); });
        } else if (sv === 'rating') {
            filtered.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
        } else {
            filtered.sort(function(a, b) { return (a.distance || 999) - (b.distance || 999); });
        }
    }

    if (filtered.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    container.style.display = view === 'grid' ? 'grid' : 'flex';
    if (emptyState) emptyState.style.display = 'none';
    container.className = view === 'grid' ? 'profiles-grid' : 'profiles-list';
    container.innerHTML = filtered.map(function(p) { return createProfileCard(p, view); }).join('');
}

function createProfileCard(profile, view) {
    var typeConfig = profileTypes[profile.type] || profileTypes.general;
    var isLiked = state.profileLikes && state.profileLikes[profile.id];
    var isFav = state.profileFavourites && state.profileFavourites.indexOf(profile.id) !== -1;
    var followerCount = state.profileFollowers && state.profileFollowers[profile.id] ? state.profileFollowers[profile.id].length : Math.floor(Math.random() * 50) + 1;

    if (view === 'list') {
        return '\
            <div class="profile-list-card" onclick="openUserProfile(' + profile.id + ')">\
                <div class="profile-list-avatar">\
                    <img src="' + profile.image + '" alt="' + profile.name + '">\
                    <span class="status-dot ' + (profile.online ? 'online' : 'offline') + '"></span>\
                </div>\
                <div class="profile-list-info">\
                    <h4>' + profile.name + ', ' + profile.age + '</h4>\
                    <div class="profile-list-meta">\
                        <span class="profile-type-badge" style="background:' + typeConfig.color + '">\
                            <i class="fas fa-' + typeConfig.icon + '"></i> ' + typeConfig.label + '\
                        </span>\
                        <span><i class="fas fa-map-marker-alt"></i> ' + (profile.distance || 'N/A') + 'km</span>\
                    </div>\
                </div>\
                <div class="profile-list-stats">\
                    <span><i class="fas fa-heart"></i> ' + (profile.likes || 0) + '</span>\
                    <span><i class="fas fa-users"></i> ' + followerCount + '</span>\
                </div>\
                <div class="profile-list-actions">\
                    <button class="btn btn-icon btn-sm" onclick="event.stopPropagation();toggleProfileLike(' + profile.id + ')" ' + (isLiked ? 'style="color:var(--primary)"' : '') + '>\
                        <i class="fas fa-heart"></i>\
                    </button>\
                    <button class="btn btn-icon btn-sm" onclick="event.stopPropagation();toggleProfileFav(' + profile.id + ')" ' + (isFav ? 'style="color:#f59e0b"' : '') + '>\
                        <i class="fas fa-star"></i>\
                    </button>\
                    <button class="btn btn-icon btn-sm" onclick="event.stopPropagation();followProfile(' + profile.id + ')">\
                        <i class="fas fa-user-plus"></i>\
                    </button>\
                </div>\
            </div>';
    }

    return '\
        <div class="profile-card" onclick="openUserProfile(' + profile.id + ')">\
            <div class="profile-card-image">\
                <img src="' + profile.image + '" alt="' + profile.name + '">\
                <span class="profile-card-status ' + (profile.online ? 'online' : 'offline') + '"></span>\
                <div class="profile-card-type" style="background:' + typeConfig.color + '">\
                    <i class="fas fa-' + typeConfig.icon + '"></i> ' + typeConfig.label + '\
                </div>\
            </div>\
            <div class="profile-card-body">\
                <h4>' + profile.name + ', ' + profile.age + '</h4>\
                <p class="profile-card-location"><i class="fas fa-map-marker-alt"></i> ' + (profile.distance || 'N/A') + 'km</p>\
                <div class="profile-card-stats">\
                    <span><i class="fas fa-heart"></i> ' + (profile.likes || 0) + '</span>\
                    <span><i class="fas fa-star"></i> ' + (profile.rating || '0.0') + '</span>\
                    <span><i class="fas fa-users"></i> ' + followerCount + '</span>\
                </div>\
                <div class="profile-card-actions">\
                    <button class="btn btn-sm ' + (isLiked ? 'btn-primary' : 'btn-outline') + '" onclick="event.stopPropagation();toggleProfileLike(' + profile.id + ')">\
                        <i class="fas fa-heart"></i> ' + (isLiked ? 'Liked' : 'Like') + '\
                    </button>\
                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();followProfile(' + profile.id + ')">\
                        <i class="fas fa-user-plus"></i> Follow\
                    </button>\
                </div>\
            </div>\
        </div>';
}

function switchProfilesTab(tab) {
    state.profilesTab = tab;
    document.querySelectorAll('.profiles-tab').forEach(function(t) {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
    renderProfiles();
}

function toggleProfilesFilters() {
    var filters = document.getElementById('profiles-filters');
    if (filters) filters.style.display = filters.style.display === 'none' ? 'flex' : 'none';
}

function switchProfilesView() {
    state.profilesView = state.profilesView === 'grid' ? 'list' : 'grid';
    var icon = document.getElementById('profiles-view-icon');
    if (icon) icon.className = state.profilesView === 'grid' ? 'fas fa-list' : 'fas fa-th';
    renderProfiles();
}

function toggleProfileLike(profileId) {
    if (!state.profileLikes) state.profileLikes = {};
    state.profileLikes[profileId] = !state.profileLikes[profileId];
    var profile = state.profiles.find(function(p) { return p.id === profileId; });
    if (profile) profile.likes = (profile.likes || 0) + (state.profileLikes[profileId] ? 1 : -1);
    renderProfiles();
    showToast(state.profileLikes[profileId] ? 'Profile liked! ❤️' : 'Like removed');
}

function toggleProfileFav(profileId) {
    if (!state.profileFavourites) state.profileFavourites = [];
    var idx = state.profileFavourites.indexOf(profileId);
    if (idx === -1) {
        state.profileFavourites.push(profileId);
        showToast('Added to favourites ⭐');
    } else {
        state.profileFavourites.splice(idx, 1);
        showToast('Removed from favourites');
    }
    renderProfiles();
}

function followProfile(profileId) {
    if (!state.profileFollowers) state.profileFollowers = {};
    if (!state.profileFollowers[profileId]) state.profileFollowers[profileId] = [];
    var userId = state.currentUser ? state.currentUser.id : 'guest';
    var idx = state.profileFollowers[profileId].indexOf(userId);
    if (idx === -1) {
        state.profileFollowers[profileId].push(userId);
        showToast('Following this profile! 👍');
    } else {
        state.profileFollowers[profileId].splice(idx, 1);
        showToast('Unfollowed');
    }
    renderProfiles();
}

// ==================== DISCOVER FEED ====================
function renderDiscoverFeed() {
    renderDiscoverSections();
}

function renderDiscoverSections() {
    var container = document.getElementById('discover-sections');
    if (!container) return;

    var sections = [];

    // Events Section
    sections.push(buildDiscoverSection('events', 'calendar-alt', '#8b5cf6', 'Events', state.discoverTabs.events, [
        { tab: 'upcoming', label: 'Upcoming' },
        { tab: 'past', label: 'Past' },
        { tab: 'my-events', label: 'My Events' }
    ], state.events, function(item) {
        return '\
            <div class="disco-card" onclick="switchView(\'events\')">\
                <div class="disco-card-icon" style="background:#8b5cf6"><i class="fas fa-calendar-alt"></i></div>\
                <div class="disco-card-body">\
                    <h4>' + (item.title || 'Event') + '</h4>\
                    <p><i class="fas fa-map-marker-alt"></i> ' + (item.location || 'Various') + ' &middot; ' + (item.date || 'TBD') + '</p>\
                </div>\
            </div>';
    }));

    // Clubs Section
    sections.push(buildDiscoverSection('clubs', 'users', '#22c55e', 'Clubs', state.discoverTabs.clubs, [
        { tab: 'all', label: 'All' },
        { tab: 'professional', label: 'Professional' },
        { tab: 'adventure', label: 'Adventure' },
        { tab: 'luxury', label: 'Luxury' },
        { tab: 'creative', label: 'Creative' },
        { tab: 'fitness', label: 'Fitness' }
    ], state.clubs, function(item) {
        var memberCount = item.members ? item.members.length : 0;
        return '\
            <div class="disco-card" onclick="switchView(\'clubs\')">\
                <div class="disco-card-icon" style="background:#22c55e"><i class="fas fa-users"></i></div>\
                <div class="disco-card-body">\
                    <h4>' + (item.name || 'Club') + '</h4>\
                    <p>' + memberCount + ' members &middot; ' + (item.category || 'General') + '</p>\
                </div>\
            </div>';
    }));

    // Streams Section
    sections.push(buildDiscoverSection('streams', 'video', '#ef4444', 'Live Streams', state.discoverTabs.streams, [
        { tab: 'all', label: 'All' },
        { tab: 'webcam', label: 'Webcams' },
        { tab: 'lifestyle', label: 'Lifestyle' },
        { tab: 'music', label: 'Music' },
        { tab: 'food', label: 'Food' }
    ], state.streams, function(item) {
        return '\
            <div class="disco-card" onclick="switchView(\'streams\')">\
                <div class="disco-card-icon" style="background:#ef4444"><i class="fas fa-video"></i></div>\
                <div class="disco-card-body">\
                    <h4>' + (item.title || item.name || 'Stream') + '</h4>\
                    <p>' + (item.viewers || 0) + ' watching &middot; ' + (item.category || 'Live') + '</p>\
                </div>\
            </div>';
    }));

    // Content Section
    sections.push(buildDiscoverSection('content', 'photo-video', '#ec4899', 'Content', state.discoverTabs.content, [
        { tab: 'videos', label: 'Videos' },
        { tab: 'photos', label: 'Photos' },
        { tab: 'popular', label: 'Popular' },
        { tab: 'following', label: 'Following' }
    ], state.content, function(item) {
        return '\
            <div class="disco-card" onclick="switchView(\'content\')">\
                <div class="disco-card-icon" style="background:#ec4899"><i class="fas fa-photo-video"></i></div>\
                <div class="disco-card-body">\
                    <h4>' + (item.title || 'Content') + '</h4>\
                    <p>' + (item.type || 'Media') + ' &middot; ' + (item.likes || 0) + ' likes</p>\
                </div>\
            </div>';
    }));

    // Personals Section
    sections.push(buildDiscoverSection('personals', 'heart', '#ef4444', 'Personals', state.discoverTabs.personals, [
        { tab: 'all', label: 'All' },
        { tab: 'dating', label: 'Dating' },
        { tab: 'friendship', label: 'Friendship' },
        { tab: 'casual', label: 'Casual' }
    ], state.personals, function(item) {
        return '\
            <div class="disco-card" onclick="switchView(\'personals\')">\
                <div class="disco-card-icon" style="background:#ef4444"><i class="fas fa-heart"></i></div>\
                <div class="disco-card-body">\
                    <h4>' + (item.title || 'Ad') + '</h4>\
                    <p>' + (item.type || 'General') + ' &middot; ' + (item.location || 'Various') + '</p>\
                </div>\
            </div>';
    }));

    // Products Section
    sections.push(buildDiscoverSection('products', 'store', '#10b981', 'Marketplace', state.discoverTabs.products, [
        { tab: 'all', label: 'All' },
        { tab: 'featured', label: 'Featured' },
        { tab: 'services', label: 'Services' },
        { tab: 'digital', label: 'Digital' }
    ], state.products, function(item) {
        return '\
            <div class="disco-card" onclick="openProductDetail(' + item.id + ')">\
                <div class="disco-card-icon" style="background:#10b981"><i class="fas fa-store"></i></div>\
                <div class="disco-card-body">\
                    <h4>' + (item.name || 'Product') + '</h4>\
                    <p>R' + (item.price || 0) + ' &middot; ' + (item.category || 'General') + '</p>\
                </div>\
            </div>';
    }));

    container.innerHTML = sections.join('');
}

function buildDiscoverSection(key, icon, color, title, activeTab, tabs, items, renderItem) {
    var filtered = items || [];
    if (activeTab !== 'all' && activeTab !== 'upcoming' && activeTab !== 'videos') {
        if (key === 'clubs') {
            filtered = filtered.filter(function(i) { return (i.category || '').toLowerCase() === activeTab; });
        } else if (key === 'streams') {
            filtered = filtered.filter(function(i) { return (i.category || i.type || '').toLowerCase() === activeTab; });
        } else if (key === 'content') {
            filtered = filtered.filter(function(i) { return (i.type || '').toLowerCase() === activeTab; });
        } else if (key === 'personals') {
            filtered = filtered.filter(function(i) { return (i.type || '').toLowerCase() === activeTab; });
        } else if (key === 'products') {
            if (activeTab === 'featured') {
                filtered = filtered.filter(function(i) { return i.isFeatured; });
            } else {
                filtered = filtered.filter(function(i) { return (i.category || '').toLowerCase() === activeTab; });
            }
        }
    } else if (key === 'events') {
        if (activeTab === 'upcoming') {
            filtered = filtered.filter(function(i) { return !i.past; });
        } else if (activeTab === 'past') {
            filtered = filtered.filter(function(i) { return i.past; });
        }
    }

    var tabHtml = tabs.map(function(t) {
        return '<button class="disco-tab' + (t.tab === activeTab ? ' active' : '') + '" onclick="switchDiscoverTab(\'' + key + '\',\'' + t.tab + '\')">' + t.label + '</button>';
    }).join('');

    var itemsHtml = filtered.slice(0, 4).map(renderItem).join('');
    if (!itemsHtml) {
        itemsHtml = '<div class="disco-empty"><p>No ' + title.toLowerCase() + ' found</p></div>';
    }

    return '\
        <div class="discover-section">\
            <div class="discover-section-header">\
                <h3><i class="fas fa-' + icon + '" style="color:' + color + '"></i> ' + title + '</h3>\
                <a href="#" onclick="switchView(\'' + key + '\');return false;">View All &rarr;</a>\
            </div>\
            <div class="disco-tabs">' + tabHtml + '</div>\
            <div class="disco-items">' + itemsHtml + '</div>\
        </div>';
}

function switchDiscoverTab(section, tab) {
    if (!state.discoverTabs) state.discoverTabs = {};
    state.discoverTabs[section] = tab;
    renderDiscoverSections();
}

// ==================== USERS VIEW ====================
function renderUsers() {
    const container = document.getElementById('users-container');
    if (!container) return;
    
    // Filter users
    let filteredUsers = [...state.profiles];
    
    // Apply status filter
    if (state.userFilter.status !== 'all') {
        const isOnline = state.userFilter.status === 'online';
        filteredUsers = filteredUsers.filter(u => u.online === isOnline);
    }
    
    // Apply type filter
    if (state.userFilter.type !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.type === state.userFilter.type);
    }
    
    // Apply distance filter
    const maxDistance = state.userFilter.distance === 'any' ? Infinity : parseInt(state.userFilter.distance);
    filteredUsers = filteredUsers.filter(u => u.distance <= maxDistance);
    
    // Sort by distance (closest first)
    filteredUsers.sort((a, b) => a.distance - b.distance);
    
    // Render based on view type
    if (state.userView === 'grid') {
        container.className = 'users-container users-grid';
        container.innerHTML = filteredUsers.map(user => createUserGridCard(user)).join('');
    } else {
        container.className = 'users-container users-list';
        container.innerHTML = filteredUsers.map(user => createUserListCard(user)).join('');
    }
}

function createUserGridCard(user) {
    const typeConfig = profileTypes[user.type] || profileTypes.general;
    const isProvider = user.accountType === 'provider';
    
    return `
        <div class="user-grid-card" onclick="openUserProfile(${user.id})">
            <div class="user-card-image">
                <img src="${user.image}" alt="${user.name}">
                <span class="user-status-indicator ${user.online ? 'online' : 'offline'}"></span>
                <span class="user-type-badge" style="background: ${typeConfig.color}">
                    <i class="fas fa-${typeConfig.icon}"></i>
                </span>
            </div>
            <div class="user-card-info">
                <h4>${user.name}, ${user.age}</h4>
                <p class="user-distance"><i class="fas fa-location-arrow"></i> ${user.distance}km away</p>
                <p class="user-type-label" style="color: ${typeConfig.color}">${typeConfig.label}</p>
                ${isProvider ? `
                <div class="provider-stats-mini">
                    <span class="stat-item"><i class="fas fa-heart" style="color: #ef4444"></i> ${user.likes || 0}</span>
                    <span class="stat-item"><i class="fas fa-users" style="color: #6366f1"></i> ${user.fans || 0}</span>
                    <span class="stat-item"><i class="fas fa-star" style="color: #f59e0b"></i> ${user.rating || 0}</span>
                </div>
                ` : ''}
            </div>
            <div class="user-card-actions">
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); startChat(${user.id})">
                    <i class="fas fa-comment"></i> Message
                </button>
            </div>
        </div>
    `;
}

function createUserListCard(user) {
    const typeConfig = profileTypes[user.type] || profileTypes.general;
    return `
        <div class="user-list-card" onclick="openUserProfile(${user.id})">
            <div class="user-list-avatar">
                <img src="${user.image}" alt="${user.name}">
                <span class="user-status-indicator ${user.online ? 'online' : 'offline'}"></span>
            </div>
            <div class="user-list-info">
                <div class="user-list-header">
                    <h4>${user.name}, ${user.age}</h4>
                    <span class="user-type-badge-small" style="background: ${typeConfig.color}">
                        <i class="fas fa-${typeConfig.icon}"></i> ${typeConfig.label}
                    </span>
                </div>
                <div class="user-list-details">
                    <span class="user-distance"><i class="fas fa-location-arrow"></i> ${user.distance}km away</span>
                    <span class="user-location">${user.location}</span>
                </div>
                <p class="user-list-bio">${user.bio}</p>
            </div>
            <div class="user-list-actions">
                <button class="btn btn-primary" onclick="event.stopPropagation(); startChat(${user.id})">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `;
}



function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && hasHalf) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function likeProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (user) {
        user.likes = (user.likes || 0) + 1;
        showToast('Profile liked! ❤️');
        openUserProfile(userId); // Re-render to show updated count
    }
}

function fanProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (user) {
        user.fans = (user.fans || 0) + 1;
        showToast('You\'re now a fan! 🌟');
        openUserProfile(userId); // Re-render to show updated count
    }
}

function rateProfile(userId) {
    openPopupTab('reviews');
    const starBtns = document.querySelectorAll('#review-star-selector .star-btn');
    starBtns.forEach(b => b.classList.remove('active'));
}

function reviewProfile(userId) {
    openPopupTab('reviews');
    setTimeout(() => {
        const textarea = document.getElementById('review-text');
        if (textarea) textarea.focus();
    }, 300);
}

let reviewRating = 0;
let reviewTargetUserId = null;

function switchPopupTab(tab) {
    document.querySelectorAll('.popup-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('popup-tab-about').style.display = tab === 'about' ? 'block' : 'none';
    document.getElementById('popup-tab-reviews').style.display = tab === 'reviews' ? 'block' : 'none';
    if (tab === 'reviews' && reviewTargetUserId) {
        renderPopupReviews(reviewTargetUserId);
    }
}

function openPopupTab(tab) {
    const tabs = document.querySelectorAll('.popup-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'reviews' && tabs[1]) tabs[1].classList.add('active');
    else if (tabs[0]) tabs[0].classList.add('active');
    document.getElementById('popup-tab-about').style.display = tab === 'about' ? 'block' : 'none';
    document.getElementById('popup-tab-reviews').style.display = tab === 'reviews' ? 'block' : 'none';
}

function setReviewRating(stars) {
    reviewRating = stars;
    const btns = document.querySelectorAll('#review-star-selector .star-btn');
    btns.forEach((b, i) => {
        b.classList.toggle('active', i < stars);
    });
}

function submitReview() {
    if (!reviewTargetUserId) {
        showToast('No profile selected', 'error');
        return;
    }
    if (reviewRating === 0) {
        showToast('Please select a rating', 'warning');
        return;
    }
    const textarea = document.getElementById('review-text');
    const text = textarea ? textarea.value.trim() : '';
    if (!text) {
        showToast('Please write a review', 'warning');
        return;
    }

    const review = {
        id: Date.now(),
        userId: state.currentUser.id,
        userName: state.currentUser.name || 'Anonymous',
        userImage: state.currentUser.image || '',
        targetUserId: reviewTargetUserId,
        rating: reviewRating,
        text: text,
        date: new Date().toISOString(),
        helpful: 0
    };

    if (!state.reviews) state.reviews = [];
    state.reviews.push(review);
    localStorage.setItem('koitus_reviews', JSON.stringify(state.reviews));

    textarea.value = '';
    reviewRating = 0;
    document.querySelectorAll('#review-star-selector .star-btn').forEach(b => b.classList.remove('active'));
    showToast('Review submitted!', 'success');
    renderPopupReviews(reviewTargetUserId);
}

function getReviewsForUser(userId) {
    if (!state.reviews) state.reviews = [];
    return state.reviews.filter(r => r.targetUserId === userId);
}

function getAverageRating(userId) {
    const reviews = getReviewsForUser(userId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    return sum / reviews.length;
}

function renderStars(rating, size) {
    const sz = size || 14;
    let html = '<span class="stars-display" style="font-size:' + sz + 'px">';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            html += '<span class="star filled">★</span>';
        } else if (i - rating < 1 && i - rating > 0) {
            html += '<span class="star half">★</span>';
        } else {
            html += '<span class="star empty">★</span>';
        }
    }
    html += '</span>';
    return html;
}

function renderPopupReviews(userId) {
    const reviews = getReviewsForUser(userId);
    const avg = getAverageRating(userId);
    const countEl = document.getElementById('popup-review-count');
    if (countEl) countEl.textContent = reviews.length > 0 ? '(' + reviews.length + ')' : '';

    const summaryEl = document.getElementById('popup-review-summary');
    if (summaryEl) {
        summaryEl.innerHTML = reviews.length > 0 ?
            '<div class="review-avg"><span class="avg-number">' + avg.toFixed(1) + '</span>' + renderStars(avg, 18) + '<span class="review-total">' + reviews.length + ' review' + (reviews.length !== 1 ? 's' : '') + '</span></div>' :
            '<p class="no-reviews">No reviews yet. Be the first!</p>';
    }

    const listEl = document.getElementById('popup-reviews-items');
    if (!listEl) return;
    if (reviews.length === 0) {
        listEl.innerHTML = '';
        return;
    }

    listEl.innerHTML = reviews.slice(0, 10).map(r => {
        const timeAgo = getTimeAgo(r.date);
        return '<div class="review-card">' +
            '<div class="review-header">' +
                '<img src="' + (r.userImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.userName) + '&background=ff6b9d&color=fff&size=32') + '" class="review-avatar">' +
                '<div class="review-meta"><span class="reviewer-name">' + escapeHtml(r.userName) + '</span><span class="review-date">' + timeAgo + '</span></div>' +
                '<div class="review-stars">' + renderStars(r.rating, 12) + '</div>' +
            '</div>' +
            '<p class="review-text">' + escapeHtml(r.text) + '</p>' +
            '<div class="review-actions"><button class="btn-link" onclick="markReviewHelpful(' + r.id + ')"><i class="fas fa-thumbs-up"></i> Helpful (' + (r.helpful || 0) + ')</button></div>' +
        '</div>';
    }).join('');
}

function markReviewHelpful(reviewId) {
    if (!state.reviews) return;
    const review = state.reviews.find(r => r.id === reviewId);
    if (review) {
        review.helpful = (review.helpful || 0) + 1;
        localStorage.setItem('koitus_reviews', JSON.stringify(state.reviews));
        if (reviewTargetUserId) renderPopupReviews(reviewTargetUserId);
    }
}

function getTimeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return new Date(dateStr).toLocaleDateString();
}

// ==================== FULL PROFILE PAGE ====================
function viewFullProfile() {
    const userId = getCurrentPopupUserId();
    if (!userId) {
        showToast('No profile selected', 'warning');
        return;
    }
    openFullProfile(userId);
}

function openFullProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) {
        showToast('Profile not found', 'error');
        return;
    }

    closeMapPopup();

    const profileView = document.getElementById('view-user-profile');
    if (!profileView) return;

    reviewTargetUserId = userId;

    const gallery = document.getElementById('full-profile-gallery');
    const images = user.gallery && user.gallery.length > 0 ? user.gallery : (user.images || [user.image]);
    gallery.innerHTML = images.map((img, i) =>
        '<div class="gallery-thumb ' + (i === 0 ? 'active' : '') + '" onclick="setFullProfileMainImage(\'' + img + '\', this)">' +
        '<img src="' + img + '" alt="' + escapeHtml(user.name) + '"></div>'
    ).join('');

    document.getElementById('full-profile-name').textContent = user.name;
    document.getElementById('full-profile-display-name').textContent = user.name;
    document.getElementById('full-profile-bio').textContent = user.bio || 'No bio yet';

    const meta = document.getElementById('full-profile-meta');
    const age = user.age || calculateAge(user.dob);
    const distance = user.distance ? user.distance + 'km' : 'Unknown';
    meta.innerHTML = '<span class="meta-item"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(distance) + '</span>' +
        '<span class="meta-item"><i class="fas fa-birthday-cake"></i> ' + age + '</span>' +
        (user.callRate ? '<span class="meta-item"><i class="fas fa-coins"></i> R' + user.callRate + '/min</span>' : '') +
        (user.gender ? '<span class="meta-item"><i class="fas fa-venus-mars"></i> ' + escapeHtml(user.gender) + '</span>' : '');

    const avg = getAverageRating(userId);
    const reviews = getReviewsForUser(userId);
    document.getElementById('full-profile-rating').innerHTML = avg > 0 ?
        renderStars(avg, 16) + ' <span>(' + reviews.length + ' reviews)</span>' : '<span class="no-rating">No reviews yet</span>';

    const interests = document.getElementById('full-profile-interests');
    if (user.interests && user.interests.length > 0) {
        interests.innerHTML = '<div class="interests-grid">' + user.interests.map(i =>
            '<span class="interest-tag">' + escapeHtml(i) + '</span>'
        ).join('') + '</div>';
    } else {
        interests.innerHTML = '';
    }

    const details = document.getElementById('full-profile-details');
    let detailsHtml = '';
    if (user.type === 'provider' || user.role === 'provider') {
        detailsHtml += '<div class="detail-card"><h4><i class="fas fa-briefcase"></i> Provider Details</h4>';
        if (user.services) detailsHtml += '<p><strong>Services:</strong> ' + escapeHtml(Array.isArray(user.services) ? user.services.join(', ') : user.services) + '</p>';
        if (user.callRate) detailsHtml += '<p><strong>Rate:</strong> R' + user.callRate + '/min</p>';
        if (user.experience) detailsHtml += '<p><strong>Experience:</strong> ' + escapeHtml(user.experience) + '</p>';
        detailsHtml += '</div>';
    }
    detailsHtml += '<div class="detail-card"><h4><i class="fas fa-user"></i> About</h4>';
    if (user.location) detailsHtml += '<p><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(user.location) + '</p>';
    if (user.dob) detailsHtml += '<p><i class="fas fa-birthday-cake"></i> ' + escapeHtml(user.dob) + '</p>';
    if (user.zodiac) detailsHtml += '<p><i class="fas fa-star"></i> ' + escapeHtml(user.zodiac) + '</p>';
    detailsHtml += '</div>';
    details.innerHTML = detailsHtml;

    const fullReviewCount = document.getElementById('full-review-count');
    if (fullReviewCount) fullReviewCount.textContent = reviews.length > 0 ? '(' + reviews.length + ')' : '';
    const fullReviewsSection = document.getElementById('full-reviews-section');
    if (fullReviewsSection) {
        if (reviews.length === 0) {
            fullReviewsSection.innerHTML = '<p class="no-reviews">No reviews yet</p>';
        } else {
            fullReviewsSection.innerHTML =
                '<div class="review-summary"><span class="avg-number">' + avg.toFixed(1) + '</span>' + renderStars(avg, 18) + '</div>' +
                '<div class="reviews-list">' + reviews.map(r => {
                    return '<div class="review-card"><div class="review-header"><img src="' + (r.userImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.userName) + '&background=ff6b9d&color=fff&size=32') + '" class="review-avatar"><div class="review-meta"><span class="reviewer-name">' + escapeHtml(r.userName) + '</span><span class="review-date">' + getTimeAgo(r.date) + '</span></div><div class="review-stars">' + renderStars(r.rating, 12) + '</div></div><p class="review-text">' + escapeHtml(r.text) + '</p></div>';
                }).join('') + '</div>';
        }
    }

    const galleryGrid = document.getElementById('full-profile-gallery-grid');
    if (galleryGrid) {
        galleryGrid.innerHTML = images.map(img =>
            '<div class="gallery-full-item"><img src="' + img + '" alt="Photo"></div>'
        ).join('');
    }

    profileView.style.display = 'block';
    profileView.dataset.userId = userId;
}

function closeFullProfile() {
    const view = document.getElementById('view-user-profile');
    if (view) view.style.display = 'none';
}

function switchFullTab(tab) {
    document.querySelectorAll('.full-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('full-tab-info').style.display = tab === 'info' ? 'block' : 'none';
    document.getElementById('full-tab-reviews').style.display = tab === 'reviews' ? 'block' : 'none';
    document.getElementById('full-tab-gallery').style.display = tab === 'gallery' ? 'block' : 'none';
}

function setFullProfileMainImage(src, el) {
    const main = document.querySelector('#full-profile-gallery .gallery-thumb.active');
    if (main) main.classList.remove('active');
    if (el) el.classList.add('active');
    const hero = document.querySelector('#full-profile-gallery .gallery-hero img');
    if (hero) hero.src = src;
}

function startChatFromProfile() {
    const view = document.getElementById('view-user-profile');
    const userId = view ? view.dataset.userId : null;
    if (!userId) return;
    closeFullProfile();
    openChat(userId);
}

function startCallFromProfile(type) {
    const view = document.getElementById('view-user-profile');
    const userId = view ? view.dataset.userId : null;
    if (!userId) return;
    if (type === 'audio') {
        startAudioCallWith(userId);
    } else {
        startVideoCallWith(userId);
    }
}

function getCurrentPopupUserId() {
    const popup = document.getElementById('map-profile-popup');
    if (popup && popup.dataset.userId) return popup.dataset.userId;
    return null;
}

function toggleUserFilters() {
    const panel = document.getElementById('user-filters-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleUserView() {
    state.userView = state.userView === 'grid' ? 'list' : 'grid';
    const icon = document.getElementById('view-toggle-icon');
    icon.className = state.userView === 'grid' ? 'fas fa-th' : 'fas fa-list';
    renderUsers();
}

function applyUserFilters() {
    toggleUserFilters();
    renderUsers();
    showNotification('Filters applied!', 'success');
}

// Initialize user filter buttons
document.addEventListener('DOMContentLoaded', () => {
    // Status filters
    const statusButtons = document.querySelectorAll('#status-filters .toggle-btn');
    statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            statusButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.userFilter.status = btn.dataset.status;
        });
    });
    
    // Type filters
    const typeButtons = document.querySelectorAll('#type-filters .toggle-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.userFilter.type = btn.dataset.type;
        });
    });
    
    // Distance filter
    const distanceSelect = document.getElementById('user-distance-filter');
    if (distanceSelect) {
        distanceSelect.addEventListener('change', () => {
            state.userFilter.distance = distanceSelect.value;
        });
    }
});

// ==================== DISCOVER VIEW ====================
function renderDiscover() {
    if (state.profiles.length === 0 || state.currentProfileIndex >= state.profiles.length) {
        document.getElementById('profile-card').style.display = 'none';
        document.getElementById('no-more-profiles').style.display = 'block';
        return;
    }
    
    const profile = state.profiles[state.currentProfileIndex];
    
    document.getElementById('profile-image').src = profile.image;
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('profile-age').textContent = profile.age;
    document.getElementById('profile-location').textContent = profile.location;
    document.getElementById('profile-bio').textContent = profile.bio;
    
    const interestsHtml = profile.interests
        .map(interest => `<span class="interest-tag">${interest}</span>`)
        .join('');
    document.getElementById('profile-interests').innerHTML = interestsHtml;
    
    document.getElementById('profile-card').style.display = 'block';
    document.getElementById('no-more-profiles').style.display = 'none';
}

function swipe(direction) {
    const card = document.getElementById('profile-card');
    
    if (direction === 'left') {
        card.classList.add('swipe-left');
        setTimeout(() => {
            card.classList.remove('swipe-left');
            nextProfile();
        }, 500);
    } else if (direction === 'right') {
        card.classList.add('swipe-right');
        
        // Simulate match possibility (50% chance)
        const isMatch = Math.random() > 0.5;
        
        setTimeout(() => {
            card.classList.remove('swipe-right');
            
            if (isMatch) {
                const profile = state.profiles[state.currentProfileIndex];
                createMatch(profile);
            }
            
            nextProfile();
        }, 500);
    } else if (direction === 'super') {
        // Super like - guaranteed match animation
        card.classList.add('swipe-right');
        
        setTimeout(() => {
            card.classList.remove('swipe-right');
            const profile = state.profiles[state.currentProfileIndex];
            createMatch(profile, true);
            nextProfile();
        }, 500);
    }
}

function nextProfile() {
    state.currentProfileIndex++;
    renderDiscover();
}

function createMatch(profile, isSuperLike = false) {
    const match = {
        id: profile.id,
        name: profile.name,
        age: profile.age,
        image: profile.image,
        lastMessage: isSuperLike ? 'Super Liked you! ⭐' : 'It\'s a match!',
        time: 'Now',
        unread: true,
        online: true
    };
    
    state.matches.unshift(match);
    
    // Add notification
    state.notifications.unshift({
        id: Date.now(),
        type: 'match',
        icon: 'match',
        title: 'It\'s a Match!',
        text: `You and ${profile.name} liked each other`,
        time: 'Now',
        unread: true
    });
    
    // Update counts
    updateNotificationCounts();
    
    // Show match popup
    showMatchPopup(profile, isSuperLike);
}

function showMatchPopup(profile, isSuperLike) {
    const popup = document.createElement('div');
    popup.className = 'match-popup';
    popup.innerHTML = `
        <div class="match-popup-content">
            <div class="match-popup-header">
                <i class="fas fa-heart"></i>
                <h2>${isSuperLike ? 'Super Like!' : 'It\'s a Match!'}</h2>
            </div>
            <div class="match-popup-avatars">
                <img src="${state.currentUser.avatar}" alt="You">
                <img src="${profile.image}" alt="${profile.name}">
            </div>
            <p>You and ${profile.name} liked each other!</p>
            <div class="match-popup-actions">
                <button class="btn btn-outline" onclick="this.closest('.match-popup').remove()">Keep Swiping</button>
                <button class="btn btn-primary" onclick="startChat(${profile.id})">Send Message</button>
            </div>
        </div>
    `;
    
    // Add styles for match popup
    popup.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = popup.querySelector('.match-popup-content');
    content.style.cssText = `
        background: linear-gradient(135deg, #6366f1, #ec4899);
        padding: 48px;
        border-radius: 24px;
        text-align: center;
        color: white;
        max-width: 400px;
        animation: scaleIn 0.3s ease;
    `;
    
    document.body.appendChild(popup);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        popup.remove();
    }, 5000);
}

function refreshProfiles() {
    state.currentProfileIndex = 0;
    state.profiles = [...sampleProfiles].sort(() => Math.random() - 0.5);
    renderDiscover();
    showNotification('Profiles refreshed!', 'info');
}

function toggleFilters() {
    const panel = document.getElementById('filters-panel');
    panel.classList.toggle('active');
}

function applyFilters() {
    toggleFilters();
    showNotification('Filters applied!', 'success');
}

// ==================== MATCHES VIEW ====================
function renderMatches() {
    if (!state.matches) state.matches = [];
    
    let filtered = [...state.matches];
    const searchTerm = document.getElementById('matches-search-input');
    const activeFilter = document.querySelector('.filter-chip.active');
    const filterType = activeFilter ? activeFilter.dataset.filter : 'all';

    if (searchTerm && searchTerm.value.trim()) {
        const q = searchTerm.value.trim().toLowerCase();
        filtered = filtered.filter(m => m.name && m.name.toLowerCase().includes(q));
    }

    if (filterType === 'providers') {
        filtered = filtered.filter(m => m.type === 'provider' || m.role === 'provider');
    } else if (filterType === 'online') {
        filtered = filtered.filter(m => m.online);
    } else if (filterType === 'unmatched') {
        filtered = filtered.filter(m => m.unmatched);
    }

    const newMatches = filtered.slice(0, 5);
    const allMatches = filtered;

    const newCountEl = document.getElementById('new-matches-count');
    if (newCountEl) newCountEl.textContent = '(' + newMatches.length + ')';
    const allCountEl = document.getElementById('all-matches-count');
    if (allCountEl) allCountEl.textContent = '(' + allMatches.length + ')';

    // New matches grid
    const newMatchesGrid = document.getElementById('new-matches-grid');
    if (newMatchesGrid) {
        newMatchesGrid.innerHTML = newMatches.length === 0 ?
            '<p class="no-matches-msg">No new matches yet. Keep swiping!</p>' :
            newMatches.map(match => {
                const compatibility = calculateCompatibility(match);
                return `<div class="match-avatar" onclick="startChat(${match.id})">
                    <img src="${match.image}" alt="${match.name}">
                    <span class="match-name">${match.name}, ${match.age}</span>
                    <span class="match-compatibility">${compatibility}%</span>
                    ${match.online ? '<span class="online-indicator"></span>' : ''}
                    <button class="match-unmatch-btn" onclick="event.stopPropagation(); unmatchUser(${match.id})" title="Unmatch">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
            }).join('');
    }
    
    // All matches list
    const matchesList = document.getElementById('matches-list');
    if (matchesList) {
        matchesList.innerHTML = allMatches.length === 0 ?
            '<p class="no-matches-msg">No matches found. Try adjusting your filters!</p>' :
            allMatches.map(match => {
                const compatibility = calculateCompatibility(match);
                const matchDate = match.matchedAt ? getTimeAgo(match.matchedAt) : '';
                const lastMsg = match.lastMessage || '';
                const starter = !lastMsg ? getSuggestion(match) : '';
                return `<div class="match-item" onclick="startChat(${match.id})">
                    <div class="match-item-avatar">
                        <img src="${match.image}" alt="${match.name}">
                        ${match.online ? '<span class="online-indicator"></span>' : ''}
                    </div>
                    <div class="match-item-info">
                        <div class="match-item-name">
                            ${match.name}, ${match.age}
                            <span class="match-compatibility-badge">${compatibility}%</span>
                            ${match.type === 'provider' || match.role === 'provider' ? '<span class="match-provider-badge">Provider</span>' : ''}
                        </div>
                        <div class="match-item-last-message">${lastMsg || '<em class="conversation-starter">' + starter + '</em>'}</div>
                        ${matchDate ? '<div class="match-item-date">Matched ' + matchDate + '</div>' : ''}
                    </div>
                    <div class="match-item-actions">
                        <button class="btn-icon-sm" onclick="event.stopPropagation(); startChat(${match.id})" title="Chat">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="btn-icon-sm" onclick="event.stopPropagation(); openFullProfile(${match.id})" title="View Profile">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon-sm danger" onclick="event.stopPropagation(); unmatchUser(${match.id})" title="Unmatch">
                            <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                </div>`;
            }).join('');
    }
}

function calculateCompatibility(match) {
    if (!match || !state.currentUser) return Math.floor(Math.random() * 30) + 60;
    
    let score = 60;
    const userInterests = state.currentUser.interests || [];
    const matchInterests = match.interests || [];
    if (userInterests.length > 0 && matchInterests.length > 0) {
        const shared = userInterests.filter(i => matchInterests.includes(i));
        score += Math.min(shared.length * 8, 25);
    }
    
    if (match.location && state.currentUser.location) {
        if (match.location === state.currentUser.location) score += 10;
    }
    
    const ageDiff = Math.abs((match.age || 25) - (state.currentUser.age || 25));
    if (ageDiff <= 3) score += 5;
    else if (ageDiff > 10) score -= 5;
    
    return Math.min(Math.max(score, 40), 99);
}

function getSuggestion(match) {
    const suggestions = [
        'Hey! How\'s your day going? 😊',
        'I love your profile! What are you into?',
        'Hi there! What do you do for fun?',
        'You seem interesting! Tell me about yourself',
        'Hey! Any fun plans this weekend?',
        'Love your vibe! Want to chat? 💬',
        'Hi! What\'s your favorite thing about this app?'
    ];
    
    if (match.interests && match.interests.length > 0) {
        const interest = match.interests[Math.floor(Math.random() * match.interests.length)];
        return 'Hey! I see you\'re into ' + interest + '... tell me more! 👋';
    }
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
}

function toggleMatchesSearch() {
    const bar = document.getElementById('matches-search-bar');
    if (bar) {
        const isVisible = bar.style.display !== 'none';
        bar.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const input = document.getElementById('matches-search-input');
            if (input) input.focus();
        } else {
            filterMatches();
        }
    }
}

function toggleMatchesFilter() {
    const filters = document.getElementById('matches-filters');
    if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'flex' : 'none';
    }
}

function setMatchFilter(type, el) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderMatches();
}

function filterMatches() {
    renderMatches();
}

function unmatchUser(userId) {
    const match = state.matches.find(m => m.id === userId);
    if (!match) return;
    
    if (confirm('Are you sure you want to unmatch with ' + match.name + '?')) {
        state.matches = state.matches.filter(m => m.id !== userId);
        localStorage.setItem('koitus_matches', JSON.stringify(state.matches));
        showToast('Unmatched with ' + match.name, 'info');
        renderMatches();
    }
}

// ==================== MESSAGES VIEW ====================
function renderConversations() {
    const conversationsList = document.getElementById('conversations-list');
    if (!conversationsList) return;
    
    conversationsList.innerHTML = state.conversations.map(conv => `
        <div class="match-item" onclick="openChat(${conv.id})">
            <div class="match-item-avatar">
                <img src="${conv.avatar}" alt="${conv.name}">
                ${conv.online ? '<span class="online-indicator" style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;background:#22c55e;border:2px solid white;border-radius:50%;"></span>' : ''}
            </div>
            <div class="match-item-info">
                <div class="match-item-name">${conv.name}</div>
                <div class="match-item-last-message">${conv.messages[conv.messages.length - 1]?.text || 'Start a conversation'}</div>
            </div>
            <div class="match-item-time">Now</div>
        </div>
    `).join('');
}

function openChat(conversationId) {
    let conversation = state.conversations.find(c => c.id === conversationId);
    
    // If conversation doesn't exist, create it (no restrictions on chatting)
    if (!conversation) {
        const user = state.profiles.find(p => p.id === conversationId);
        if (user) {
            conversation = {
                id: user.id,
                name: user.name,
                avatar: user.image,
                messages: [],
                online: user.online
            };
            state.conversations.unshift(conversation);
            renderConversations();
        } else {
            return;
        }
    }

    state.currentChat = conversation;

    // Hide placeholder, show chat
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';

    // Update chat header
    document.getElementById('chat-user-avatar').src = conversation.avatar;
    document.getElementById('chat-user-name').textContent = conversation.name;
    document.getElementById('chat-user-status').textContent = conversation.online ? 'Online' : 'Offline';
    document.getElementById('chat-user-status').style.color = isUserBlocked(conversation.id) ? 'var(--error)' : '';

    // Update block button text
    updateBlockButton();

    // Disable input if blocked
    var input = document.getElementById('message-input');
    var sendBtn = document.querySelector('.chat-input-area .btn-primary');
    if (input) input.disabled = isUserBlocked(conversation.id);
    if (sendBtn) sendBtn.style.opacity = isUserBlocked(conversation.id) ? '0.4' : '1';

    // Render messages
    renderMessages();
}

function renderMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer || !state.currentChat) return;

    messagesContainer.innerHTML = state.currentChat.messages.map(msg => {
        var bubbleContent = '';
        if (msg.attachment) {
            var attachId = msg.id || 'att_' + Math.random().toString(36).substr(2, 9);
            msg.id = attachId;
            state.attachmentMap = state.attachmentMap || {};
            state.attachmentMap[attachId] = msg.attachment.data;
            if (msg.attachment.isImage) {
                bubbleContent = '<div class="msg-attachment"><img src="' + msg.attachment.data + '" alt="' + msg.attachment.name + '" class="msg-attach-image" onclick="openAttachmentImage(\'' + attachId + '\')"><div class="msg-attach-name"><i class="fas fa-image"></i> ' + msg.attachment.name + '</div></div>';
            } else {
                var icon = 'fa-file';
                if (msg.attachment.type.includes('pdf')) icon = 'fa-file-pdf';
                else if (msg.attachment.type.includes('word') || msg.attachment.type.includes('doc')) icon = 'fa-file-word';
                else if (msg.attachment.type.includes('zip')) icon = 'fa-file-archive';
                else if (msg.attachment.type.includes('audio')) icon = 'fa-file-audio';
                else if (msg.attachment.type.includes('video')) icon = 'fa-file-video';
                bubbleContent = '<div class="msg-attachment"><div class="msg-attach-file" onclick="downloadAttachment(\'' + msg.attachment.name + '\',\'' + attachId + '\')"><i class="fas ' + icon + '"></i><div class="msg-attach-info"><span class="msg-attach-filename">' + msg.attachment.name + '</span><span class="msg-attach-size">' + msg.attachment.size + '</span></div></div></div>';
            }
        }
        if (msg.voiceNote) {
            var vnId = msg.id || 'vn_' + Math.random().toString(36).substr(2, 9);
            msg.id = vnId;
            state.voiceNotesMap = state.voiceNotesMap || {};
            state.voiceNotesMap[vnId] = msg.voiceNote;
            bubbleContent = '\
            <div class="voice-note-bubble">\
                <button class="voice-note-btn" onclick="playVoiceNote(\'' + vnId + '\', this)">\
                    <i class="fas fa-play"></i>\
                </button>\
                <div class="voice-note-wave">\
                    <span></span><span></span><span></span><span></span><span></span>\
                    <span></span><span></span><span></span><span></span><span></span>\
                    <span></span><span></span><span></span><span></span><span></span>\
                </div>\
                <span class="voice-note-duration">' + (msg.voiceDuration || '0:05') + '</span>\
            </div>';
        }
        if (msg.location) {
            bubbleContent = '\
            <div class="msg-location" onclick="window.open(\'' + msg.location.url + '\',\'_blank\')">\
                <div class="msg-location-preview">\
                    <i class="fas fa-map-marker-alt"></i>\
                    <div class="msg-location-info">\
                        <strong>Live Location</strong>\
                        <span>' + msg.location.lat.toFixed(4) + ', ' + msg.location.lng.toFixed(4) + '</span>\
                    </div>\
                </div>\
                <div class="msg-location-map" style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(34,197,94,0.15))">\
                    <i class="fas fa-map"></i>\
                    <span>View on Google Maps</span>\
                </div>\
            </div>';
        }
        if (msg.text) {
            bubbleContent = parseEmoji(msg.text) + bubbleContent;
        }
        return `
        <div class="message ${msg.sent ? 'sent' : 'received'}"${msg.id ? ` data-msg-id="${msg.id}"` : ''}>
            ${!msg.sent ? `
                <div class="message-avatar">
                    <img src="${state.currentChat.avatar}" alt="${state.currentChat.name}">
                </div>
            ` : ''}
            <div class="message-content">
                <div class="message-bubble">${bubbleContent}</div>
                <div class="message-meta">
                    <span class="message-time">${msg.time}</span>
                    ${msg.sent ? `
                        <span class="message-status ${msg.read ? 'read' : (msg.delivered ? 'delivered' : 'sent')}">
                            ${msg.read ? '<i class="fas fa-check-double"></i>' : (msg.delivered ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>')}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `}).join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (!text || !state.currentChat) return;

    if (isUserBlocked(state.currentChat.id)) {
        showToast('You cannot send messages to a blocked user');
        return;
    }

    // Try real-time messaging first
    const sentViaSocket = sendMessageRealTime(state.currentChat.id, text);
    
    // Add message to UI immediately (optimistic update)
    state.currentChat.messages.push({
        id: uuidv4(),
        text: text,
        sent: true,
        time: 'Now',
        delivered: !sentViaSocket, // If sent via socket, wait for delivery confirmation
        read: false
    });

    input.value = '';
    renderMessages();
    renderConversations();

    // Send typing indicator
    sendTypingIndicator(state.currentChat.id, true);
    
    // Stop typing after delay
    setTimeout(() => {
        sendTypingIndicator(state.currentChat.id, false);
    }, 1000);

    // If not sent via socket (offline), use simulation
    if (!sentViaSocket) {
        // Show typing indicator
        showTypingIndicator();

        // Simulate user typing and reply with variable timing based on message length
        const typingDelay = Math.min(text.length * 50, 3000);
        const replyDelay = 1000 + Math.random() * 2000;

        setTimeout(() => {
            hideTypingIndicator();
            simulateLiveReply(text);
        }, typingDelay + replyDelay);
    }
}

let typingIndicatorShown = false;
let userIsTyping = false;

function showTypingIndicator() {
    if (typingIndicatorShown) return;
    
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    // Update status to show typing
    const statusElement = document.getElementById('chat-user-status');
    if (statusElement) {
        statusElement.textContent = 'Typing...';
        statusElement.style.color = 'var(--primary)';
        userIsTyping = true;
    }

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message received';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${state.currentChat.avatar}" alt="${state.currentChat.name}">
        </div>
        <div class="message-content">
            <div class="message-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    typingIndicatorShown = true;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    typingIndicatorShown = false;
    
    // Restore status
    const statusElement = document.getElementById('chat-user-status');
    if (statusElement && state.currentChat) {
        statusElement.textContent = state.currentChat.online ? 'Online' : 'Offline';
        statusElement.style.color = '';
        userIsTyping = false;
    }
}

function simulateLiveReply(userMessage) {
    if (!state.currentChat) return;

    // Generate contextual replies based on user's message
    const replies = {
        greeting: [
            "Hey there! 👋 How's your day going?",
            "Hi! So glad you messaged me! 😊",
            "Hello! What's up?",
            "Hey! I was just thinking about you! 💭"
        ],
        question: [
            "That's a great question! Let me think... 🤔",
            "Hmm, good point! I'd say it depends...",
            "Interesting question! Here's what I think...",
            "I've been wondering the same thing! My take is..."
        ],
        compliment: [
            "Aww, you're so sweet! 🥰",
            "That made me smile! Thank you! 😊",
            "You're making me blush! 🙈",
            "Right back at you! You're amazing too! ✨"
        ],
        default: [
            "That's interesting! Tell me more 😊",
            "Haha, I love that! 😂",
            "Really? That's so cool! 🔥",
            "I was just thinking the same thing! 💭",
            "You're amazing! 💕",
            "Let's continue this conversation over coffee sometime? ☕",
            "Your messages always make me smile! 😊",
            "Same here! We have so much in common! 🎯",
            "No way! That's crazy! 😱",
            "I totally agree with you! 👍",
            "That's so exciting! Tell me everything! 📖",
            "You always know what to say! 💬"
        ]
    };

    // Detect message type
    const lowerMessage = userMessage.toLowerCase();
    let replyCategory = 'default';

    if (/^(hi|hey|hello|howdy|greetings|yo|sup)/i.test(lowerMessage)) {
        replyCategory = 'greeting';
    } else if (/\?/.test(lowerMessage)) {
        replyCategory = 'question';
    } else if (/^(you|your|you're|so|very|really|beautiful|gorgeous|amazing|awesome|cute|sweet|lovely)/i.test(lowerMessage)) {
        replyCategory = 'compliment';
    }

    const categoryReplies = replies[replyCategory];
    const randomReply = categoryReplies[Math.floor(Math.random() * categoryReplies.length)];

    // Add received message
    state.currentChat.messages.push({
        id: Date.now(),
        text: randomReply,
        sent: false,
        time: 'Now',
        read: false
    });

    renderMessages();
    renderConversations();

    // Simulate read receipt after delay
    setTimeout(() => {
        const lastMessage = state.currentChat.messages[state.currentChat.messages.length - 1];
        if (lastMessage && !lastMessage.sent) {
            lastMessage.read = true;
            renderMessages();
        }
    }, 2000 + Math.random() * 2000);

    // Sometimes send a follow-up message
    if (Math.random() > 0.7) {
        const followUps = [
            "What about you? 🤗",
            "How about you? 😊",
            "And you? Tell me! 💬",
            "Btw, I love your profile! 😍",
            "We should meet up sometime! ☕",
            "Are you free this weekend? 📅"
        ];
        const followUp = followUps[Math.floor(Math.random() * followUps.length)];

        setTimeout(() => {
            if (state.currentChat) {
                state.currentChat.messages.push({
                    id: Date.now() + 1,
                    text: followUp,
                    sent: false,
                    time: 'Now'
                });
                renderMessages();
                renderConversations();
            }
        }, 4000 + Math.random() * 3000);
    }
}

function handleMessageKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function startChat(profileId) {
    // Close match popup if open
    document.querySelectorAll('.match-popup').forEach(p => p.remove());

    // Check if conversation exists, create if not (no restrictions)
    let conversation = state.conversations.find(c => c.id === profileId);
    
    if (!conversation) {
        const user = state.profiles.find(p => p.id === profileId);
        if (user) {
            conversation = {
                id: user.id,
                name: user.name,
                avatar: user.image,
                messages: [],
                online: user.online
            };
            state.conversations.unshift(conversation);
        }
    }

    // Switch to messages view
    switchView('messages');

    // Open chat
    setTimeout(() => {
        openChat(profileId);
    }, 100);
}

function toggleIceBreakers() {
    if (!state.enableIcebreakers) {
        showToast('AI Ice Breakers are disabled. Enable them in the chat menu.');
        return;
    }
    
    const panel = document.getElementById('ice-breakers-panel');
    const suggestionsContainer = document.getElementById('ice-breakers-suggestions');
    
    if (panel.style.display === 'none' || !panel.style.display) {
        // Generate ice breakers based on current chat
        const currentProfile = state.profiles.find(p => p.id === state.currentChat?.id) || state.profiles[0];
        const interest = currentProfile?.interests?.[0] || 'travel';
        
        const breakers = iceBreakers.slice(0, 5).map(breaker => 
            breaker.replace('[interest]', interest).replace('[location]', 'your photos')
        );
        
        suggestionsContainer.innerHTML = breakers.map(breaker => `
            <div class="ice-breaker-suggestion" onclick="useIceBreaker('${breaker.replace(/'/g, "\\'")}')">
                ${breaker}
            </div>
        `).join('');
        
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function toggleIceBreakersSetting() {
    state.enableIcebreakers = !state.enableIcebreakers;
    var text = document.getElementById('icebreakers-menu-text');
    var magicBtn = document.querySelector('.chat-actions .btn-icon[onclick="toggleIceBreakers()"]');
    if (text) {
        text.textContent = 'AI Ice Breakers: ' + (state.enableIcebreakers ? 'On' : 'Off');
    }
    if (magicBtn) {
        magicBtn.style.display = state.enableIcebreakers ? '' : 'none';
    }
    // Close panel if disabled
    if (!state.enableIcebreakers) {
        var panel = document.getElementById('ice-breakers-panel');
        if (panel) panel.style.display = 'none';
    }
    // Close the more menu
    var menu = document.getElementById('chat-more-menu');
    if (menu) menu.style.display = 'none';
    showToast('AI Ice Breakers ' + (state.enableIcebreakers ? 'enabled' : 'disabled'));
}

function useIceBreaker(text) {
    document.getElementById('message-input').value = text;
    toggleIceBreakers();
}

function attachFile() {
    if (!state.currentChat) {
        showToast('Open a conversation first', 'warning');
        return;
    }
    var input = document.getElementById('file-attach-input');
    if (!input) {
        input = document.createElement('input');
        input.id = 'file-attach-input';
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.mp3,.mp4,.mov';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            handleFileAttachment(file);
            input.value = '';
        });
    }
    input.click();
}

function openAttachmentImage(attachId) {
    var data = state.attachmentMap && state.attachmentMap[attachId];
    if (data) window.open(data);
}

function downloadAttachment(name, attachId) {
    var data = state.attachmentMap && state.attachmentMap[attachId];
    if (!data) return;
    var a = document.createElement('a');
    a.href = data;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function handleFileAttachment(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = e.target.result;
        var isImage = file.type.startsWith('image/');
        var fileSize = (file.size / 1024).toFixed(1);
        
        var msg = {
            id: 'msg-' + Date.now(),
            text: '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sent: true,
            delivered: true,
            read: false,
            attachment: {
                name: file.name,
                size: fileSize + ' KB',
                type: file.type,
                data: data,
                isImage: isImage
            }
        };
        
        if (state.currentChat) {
            state.currentChat.messages.push(msg);
            state.currentChat.lastMessage = '📎 ' + file.name;
            renderMessages();
            renderConversations();
        }
    };
    
    if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
    } else {
        reader.readAsDataURL(file);
    }
}

function startVideoCall() {
    if (!state.currentChat) {
        showNotification('Open a conversation first', 'warning');
        return;
    }
    startVideoCallWith(state.currentChat.id);
}

function startVoiceCall() {
    if (!state.currentChat) {
        showNotification('Open a conversation first', 'warning');
        return;
    }
    startAudioCallWith(state.currentChat.id);
}

function searchConversations(query) {
    const filtered = state.conversations.filter(conv => 
        conv.name.toLowerCase().includes(query.toLowerCase())
    );
    
    const conversationsList = document.getElementById('conversations-list');
    if (!conversationsList) return;
    
    conversationsList.innerHTML = filtered.map(conv => `
        <div class="match-item" onclick="openChat(${conv.id})">
            <div class="match-item-avatar">
                <img src="${conv.avatar}" alt="${conv.name}">
            </div>
            <div class="match-item-info">
                <div class="match-item-name">${conv.name}</div>
                <div class="match-item-last-message">${conv.messages[conv.messages.length - 1]?.text || 'Start a conversation'}</div>
            </div>
            <div class="match-item-time">Now</div>
        </div>
    `).join('');
}

// ==================== NOTIFICATIONS VIEW ====================
function renderNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    notificationsList.innerHTML = state.notifications.map(notif => `
        <div class="notification-item ${notif.unread ? 'unread' : ''}" onclick="markAsRead(${notif.id})">
            <div class="notification-icon ${notif.icon}">
                <i class="fas fa-${getNotificationIcon(notif.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-text">${notif.text}</div>
                <div class="notification-time">${notif.time}</div>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        match: 'heart',
        message: 'comment',
        like: 'star',
        system: 'bell'
    };
    return icons[type] || 'bell';
}

function markAsRead(notificationId) {
    const notification = state.notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.unread = false;
        renderNotifications();
        updateNotificationCounts();
    }
}

function markAllRead() {
    state.notifications.forEach(n => n.unread = false);
    renderNotifications();
    updateNotificationCounts();
    showNotification('All notifications marked as read', 'info');
}

function updateNotificationCounts() {
    const messagesCount = state.notifications.filter(n => n.type === 'message' && n.unread).length;
    const matchesCount = state.notifications.filter(n => n.type === 'match' && n.unread).length;
    const totalUnread = state.notifications.filter(n => n.unread).length;
    
    document.getElementById('messages-count').textContent = messagesCount || '';
    document.getElementById('matches-count').textContent = matchesCount || '';
    document.getElementById('notifications-count').textContent = totalUnread || '';
    
    // Hide badges if zero
    document.getElementById('messages-count').style.display = messagesCount ? 'inline-block' : 'none';
    document.getElementById('matches-count').style.display = matchesCount ? 'inline-block' : 'none';
    document.getElementById('notifications-count').style.display = totalUnread ? 'inline-block' : 'none';
}

// ==================== PROFILE VIEW ====================
function renderProfile() {
    if (!state.currentUser) return;
    
    document.getElementById('my-profile-name').textContent = state.currentUser.name + ', ' + state.currentUser.age;
    document.getElementById('my-profile-bio').textContent = state.currentUser.bio;
    
    const interestsContainer = document.getElementById('my-profile-interests');
    if (interestsContainer) {
        interestsContainer.innerHTML = state.currentUser.interests
            .map(interest => '<span class="interest-tag">' + interest + '</span>')
            .join('');
    }
    
    // Community Stats
    var userId = state.currentUser.id;
    var forumPosts = state.forumPosts.filter(function(p) { return p.author.id === userId; }).length;
    var forumReplies = Object.values(state.forumReplies || {}).flat().filter(function(r) { return r.author && r.author.id === userId; }).length;
    var eventsAttended = Math.min(state.events.length, Math.floor(Math.random() * 5) + 1);
    var clubsJoined = state.clubs.filter(function(c) { return c.members && c.members.includes(state.currentUser.image); }).length;
    var personalsCount = state.personals.filter(function(a) { return a.postedBy.id === userId; }).length;
    var productsSold = Math.floor(Math.random() * 10) + 1;
    
    var statsHtml = '\
        <div class="community-stat-item"><div class="community-stat-value">' + forumPosts + '</div><div class="community-stat-label">Forum Posts</div></div>\
        <div class="community-stat-item"><div class="community-stat-value">' + forumReplies + '</div><div class="community-stat-label">Replies</div></div>\
        <div class="community-stat-item"><div class="community-stat-value">' + eventsAttended + '</div><div class="community-stat-label">Events Attended</div></div>\
        <div class="community-stat-item"><div class="community-stat-value">' + clubsJoined + '</div><div class="community-stat-label">Clubs Joined</div></div>\
        <div class="community-stat-item"><div class="community-stat-value">' + personalsCount + '</div><div class="community-stat-label">Personals Ads</div></div>\
        <div class="community-stat-item"><div class="community-stat-value">' + productsSold + '</div><div class="community-stat-label">Products Sold</div></div>';
    
    var statsContainer = document.getElementById('community-stats');
    if (statsContainer) statsContainer.innerHTML = statsHtml;
    
    // Profile Likes
    var likesReceived = 156;
    var likesGiven = 89;
    var mutualLikes = 34;
    
    document.getElementById('likes-received').textContent = likesReceived;
    document.getElementById('likes-given').textContent = likesGiven;
    document.getElementById('mutual-likes').textContent = mutualLikes;
    
    // Likers (people who liked this profile)
    var likers = state.profiles.slice(0, 7).map(function(p) {
        return { id: p.id, name: p.name, image: p.image };
    });
    
    var likersHtml = likers.slice(0, 6).map(function(l) {
        return '<img src="' + l.image + '" alt="' + l.name + '" class="liker-avatar" title="' + l.name + '" onclick="showToast(\'' + l.name + ' liked your profile!\')">';
    }).join('');
    
    if (likers.length > 6) {
        likersHtml += '<div class="liker-more" onclick="showToast(\'View all likes coming soon!\')">+' + (likers.length - 6) + '</div>';
    }
    
    var likersContainer = document.getElementById('profile-likers');
    if (likersContainer) likersContainer.innerHTML = likersHtml;
    
    // Achievements
    var achievements = [
        { name: 'First Match', icon: '💕', unlocked: true },
        { name: 'Chat Master', icon: '💬', unlocked: true, progress: 80 },
        { name: 'Social Butterfly', icon: '🦋', unlocked: true, progress: 60 },
        { name: 'Event Seeker', icon: '🎉', unlocked: eventsAttended >= 3, progress: Math.min(100, (eventsAttended / 5) * 100) },
        { name: 'Forum Legend', icon: '📝', unlocked: forumPosts >= 3, progress: Math.min(100, (forumPosts / 5) * 100) },
        { name: 'Club Member', icon: '🏛️', unlocked: clubsJoined >= 1, progress: clubsJoined > 0 ? 100 : 0 },
        { name: 'Super Star', icon: '⭐', unlocked: false, progress: 45 },
        { name: 'Globetrotter', icon: '🌍', unlocked: false, progress: 20 }
    ];
    
    var achievementsHtml = achievements.map(function(a) {
        var progressBar = a.progress !== undefined
            ? '<div class="achievement-progress"><div class="achievement-progress-bar" style="width:' + a.progress + '%;background:var(--primary-gradient)"></div></div>'
            : '';
        return '\
            <div class="achievement-item' + (a.unlocked ? '' : ' locked') + '">\
                <span class="achievement-icon">' + a.icon + '</span>\
                <span class="achievement-name">' + a.name + '</span>\
                ' + progressBar + '\
            </div>';
    }).join('');
    
    var achievementsContainer = document.getElementById('achievements-grid');
    if (achievementsContainer) achievementsContainer.innerHTML = achievementsHtml;
}

function editProfile() {
    showNotification('Profile editing coming soon!', 'info');
}

function upgradeToPremium() {
    showNotification('Premium upgrade coming soon! 👑', 'info');
}

// ==================== SETTINGS VIEW ====================
function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        localStorage.removeItem('koitus_user');
        state.currentUser = null;
        state.isLoggedIn = false;
        document.getElementById('main-app').classList.remove('active');
        document.getElementById('landing-page').classList.add('active');
        showNotification('Account deleted. We\'re sorry to see you go!', 'info');
    }
}

// Dark mode toggle
document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark');
        });
    }
});

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIconType(type)}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationIconType(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1'
    };
    return colors[type] || '#6366f1';
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes scaleIn {
        from {
            transform: scale(0.8);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// ==================== MAP FUNCTIONS ====================
function initMap() {
    // Initialize map if not already done
    if (!state.map) {
        state.map = L.map('members-map').setView([state.userLocation.lat, state.userLocation.lng], 10);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(state.map);
        
        // Add user location marker
        L.marker([state.userLocation.lat, state.userLocation.lng])
            .addTo(state.map)
            .bindPopup('<b>You</b><br>Your location')
            .openPopup();
    }
    
    // Clear existing markers
    state.mapMarkers.forEach(marker => state.map.removeLayer(marker));
    state.mapMarkers = [];
    
    // Add member markers based on filter
    const filteredProfiles = state.mapFilter === 'all' 
        ? state.profiles 
        : state.profiles.filter(p => p.type === state.mapFilter);
    
    filteredProfiles.forEach(profile => {
        if (profile.coords) {
            const typeConfig = profileTypes[profile.type] || profileTypes.general;
            
            // Create custom icon
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="
                        background: ${typeConfig.color};
                        width: 40px;
                        height: 40px;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-${typeConfig.icon}" style="
                            color: white;
                            font-size: 18px;
                            transform: rotate(45deg);
                        "></i>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });
            
            const marker = L.marker([profile.coords.lat, profile.coords.lng], { icon: customIcon })
                .addTo(state.map);
            
            // Add click event
            marker.on('click', () => {
                showMapProfilePopup(profile);
            });
            
            // Add tooltip
            marker.bindTooltip(`${profile.name}, ${profile.age}`, {
                direction: 'top',
                offset: [0, -10]
            });
            
            state.mapMarkers.push(marker);
        }
    });
    
    // Fit map to show all markers
    if (state.mapMarkers.length > 0) {
        const group = L.featureGroup(state.mapMarkers);
        state.map.fitBounds(group.getBounds().pad(0.1));
    }
    
    // Re-render to ensure map is visible
    setTimeout(() => {
        if (state.map) {
            state.map.invalidateSize();
        }
    }, 100);
}

function showMapProfilePopup(profile) {
    state.selectedProfile = profile;
    
    // Calculate distance from user
    const distance = calculateDistance(
        state.userLocation.lat, state.userLocation.lng,
        profile.coords.lat, profile.coords.lng
    );
    
    // Populate popup
    document.getElementById('popup-image').src = profile.image;
    document.getElementById('popup-name').textContent = `${profile.name}, ${profile.age}`;
    document.getElementById('popup-location').textContent = profile.location;
    document.getElementById('popup-bio').textContent = profile.bio;
    document.getElementById('popup-type').textContent = profileTypes[profile.type]?.label || 'General';
    document.getElementById('popup-type').style.background = profileTypes[profile.type]?.color || '#6366f1';
    document.getElementById('popup-age').textContent = profile.age;
    document.getElementById('popup-distance').textContent = `${Math.round(distance)}km`;
    
    // Render interests
    const interestsHtml = profile.interests
        .map(interest => `<span class="interest-tag">${interest}</span>`)
        .join('');
    document.getElementById('popup-interests').innerHTML = interestsHtml;
    
    // Store userId for review system and full profile
    const popup = document.getElementById('map-profile-popup');
    popup.dataset.userId = profile.id;
    reviewTargetUserId = profile.id;

    // Render average rating
    const avg = getAverageRating(profile.id);
    const reviewCount = getReviewsForUser(profile.id).length;
    const ratingEl = document.getElementById('popup-rating');
    if (ratingEl) {
        ratingEl.innerHTML = avg > 0 ?
            renderStars(avg, 14) + ' <span class="review-count-inline">(' + reviewCount + ')</span>' :
            '<span class="no-rating">No reviews yet</span>';
    }
    const countBadge = document.getElementById('popup-review-count');
    if (countBadge) countBadge.textContent = reviewCount > 0 ? '(' + reviewCount + ')' : '';
    
    // Show popup
    popup.style.display = 'block';
    var backdrop = document.getElementById('profile-popup-backdrop');
    if (backdrop) backdrop.style.display = 'block';
}

function closeMapPopup() {
    document.getElementById('map-profile-popup').style.display = 'none';
    var backdrop = document.getElementById('profile-popup-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    state.selectedProfile = null;
}

function startChatFromMap() {
    if (state.selectedProfile) {
        // Close map popup
        closeMapPopup();
        
        // Check if conversation already exists
        let conversation = state.conversations.find(c => c.id === state.selectedProfile.id);
        
        if (!conversation) {
            // Create new conversation
            conversation = {
                id: state.selectedProfile.id,
                name: state.selectedProfile.name,
                avatar: state.selectedProfile.image,
                messages: [],
                online: state.selectedProfile.online
            };
            state.conversations.unshift(conversation);
        }
        
        // Switch to messages view
        switchView('messages');
        
        // Open chat after short delay to allow view switch
        setTimeout(() => {
            openChat(state.selectedProfile.id);
        }, 100);
    }
}

function showComplimentBox() {
    document.getElementById('compliment-box').style.display = 'block';
    document.getElementById('compliment-text').focus();
}

function hideComplimentBox() {
    document.getElementById('compliment-box').style.display = 'none';
    document.getElementById('compliment-text').value = '';
}

function sendCompliment() {
    const text = document.getElementById('compliment-text').value.trim();
    
    if (!text) {
        showNotification('Please write a compliment first!', 'warning');
        return;
    }
    
    if (state.selectedProfile) {
        // Create a notification for the compliment
        state.notifications.unshift({
            id: Date.now(),
            type: 'message',
            icon: 'message',
            title: `You sent a compliment to ${state.selectedProfile.name}`,
            text: text,
            time: 'Now',
            unread: false
        });
        
        showNotification(`Compliment sent to ${state.selectedProfile.name}! 💝`, 'success');
        hideComplimentBox();
        
        // Simulate response after delay
        setTimeout(() => {
            const responses = [
                `Aww, thank you so much! That made my day! 😊`,
                `You're so sweet! I'm blushing now! 🙈`,
                `What a lovely thing to say! Thank you! 💕`,
                `That's so kind of you! I appreciate it! ✨`,
                `You just made me smile! Thank you! 😊`,
                `Wow, what a nice compliment! You're amazing! 💖`
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            state.notifications.unshift({
                id: Date.now() + 1,
                type: 'message',
                icon: 'message',
                title: `${state.selectedProfile.name} loved your compliment`,
                text: randomResponse,
                time: 'Just now',
                unread: true
            });
            
            updateNotificationCounts();
            showNotification(`${state.selectedProfile.name} responded to your compliment! 💝`, 'success');
        }, 3000 + Math.random() * 3000);
    }
}

function viewFullProfile() {
    if (state.selectedProfile) {
        // Close map popup first
        closeMapPopup();
        
        // Open the user profile popup with full details
        openUserProfile(state.selectedProfile.id);
    }
}

function openUserProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) return;
    
    state.selectedProfile = user;
    
    // Calculate distance
    const distance = user.distance || calculateDistance(
        state.userLocation.lat, state.userLocation.lng,
        user.coords.lat, user.coords.lng
    );
    
    // Populate popup
    const popup = document.getElementById('map-profile-popup');
    if (popup) {
        popup.dataset.userId = user.id;
        reviewTargetUserId = user.id;
        document.getElementById('popup-image').src = user.image;
        document.getElementById('popup-name').textContent = `${user.name}, ${user.age}`;
        document.getElementById('popup-location').textContent = user.location;
        document.getElementById('popup-bio').textContent = user.bio;
        document.getElementById('popup-type').textContent = profileTypes[user.type]?.label || 'General';
        document.getElementById('popup-type').style.background = profileTypes[user.type]?.color || '#6366f1';
        document.getElementById('popup-age').textContent = user.age;
        document.getElementById('popup-distance').textContent = `${Math.round(distance)}km`;
        
        const interestsHtml = user.interests
            .map(interest => `<span class="interest-tag">${interest}</span>`)
            .join('');
        document.getElementById('popup-interests').innerHTML = interestsHtml;

        // Show rating
        const avg = getAverageRating(user.id);
        const reviewCount = getReviewsForUser(user.id).length;
        const ratingEl = document.getElementById('popup-rating');
        if (ratingEl) {
            ratingEl.innerHTML = avg > 0 ?
                renderStars(avg, 14) + ' <span class="review-count-inline">(' + reviewCount + ')</span>' :
                '<span class="no-rating">No reviews yet</span>';
        }
        const countBadge = document.getElementById('popup-review-count');
        if (countBadge) countBadge.textContent = reviewCount > 0 ? '(' + reviewCount + ')' : '';

        // Show provider stats if applicable
        const isProvider = user.accountType === 'provider';
        const providerStatsEl = document.getElementById('popup-provider-stats');
        if (providerStatsEl) {
            if (isProvider) {
                providerStatsEl.style.display = 'block';
                providerStatsEl.innerHTML = `
                    <div class="profile-stats-section">
                        <div class="profile-stat-box">
                            <span class="profile-stat-number">${user.likes || 0}</span>
                            <span class="profile-stat-label">Likes</span>
                        </div>
                        <div class="profile-stat-box">
                            <span class="profile-stat-number">${user.fans || 0}</span>
                            <span class="profile-stat-label">Fans</span>
                        </div>
                        <div class="profile-stat-box">
                            <span class="profile-stat-number">${user.rating || 0}</span>
                            <span class="profile-stat-label">Rating</span>
                        </div>
                    </div>
                    <div class="profile-rating-section">
                        <div class="profile-rating-header">
                            <span class="profile-rating-big">${user.rating || 0}</span>
                            <div>
                                <div class="profile-rating-stars">
                                    ${generateStars(user.rating || 0)}
                                </div>
                                <span class="profile-rating-count">${user.reviews || 0} reviews</span>
                            </div>
                        </div>
                        <div class="provider-actions">
                            <button class="provider-action-btn" onclick="likeProfile(${user.id})">
                                <i class="fas fa-heart"></i>
                                <span class="count">${user.likes || 0}</span>
                                <span>Like</span>
                            </button>
                            <button class="provider-action-btn" onclick="fanProfile(${user.id})">
                                <i class="fas fa-users"></i>
                                <span class="count">${user.fans || 0}</span>
                                <span>Fan</span>
                            </button>
                            <button class="provider-action-btn" onclick="rateProfile(${user.id})">
                                <i class="fas fa-star"></i>
                                <span>Rate</span>
                            </button>
                            <button class="provider-action-btn" onclick="reviewProfile(${user.id})">
                                <i class="fas fa-comment"></i>
                                <span>Review</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                providerStatsEl.style.display = 'none';
            }
        }
        
        popup.style.display = 'block';
        var backdrop = document.getElementById('profile-popup-backdrop');
        if (backdrop) backdrop.style.display = 'block';
    }
}

function toggleMapFilters() {
    const filters = document.getElementById('map-filters');
    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
}

function locateUser() {
    if (state.map) {
        state.map.flyTo([state.userLocation.lat, state.userLocation.lng], 13, {
            duration: 1.5
        });
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Initialize profile type filter buttons
document.addEventListener('DOMContentLoaded', () => {
    const typeButtons = document.querySelectorAll('#profile-type-filters .toggle-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.mapFilter = btn.dataset.type;
            initMap();
        });
    });
});

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    // Swipe left with left arrow
    if (e.key === 'ArrowLeft' && state.currentView === 'discover') {
        swipe('left');
    }
    
    // Swipe right with right arrow
    if (e.key === 'ArrowRight' && state.currentView === 'discover') {
        swipe('right');
    }

    // Super like with up arrow
    if (e.key === 'ArrowUp' && state.currentView === 'discover') {
        swipe('super');
    }

    // Send message with Enter
    if (e.key === 'Enter' && e.target.id === 'message-input') {
        sendMessage();
    }
});

// ==================== REAL-TIME CONNECTION (Socket.io) ====================
function initRealtimeConnection() {
    try {
        if (typeof io !== 'function') {
            console.warn('Socket.io not available (blocked by adblocker or CDN failure). Running in offline mode.');
            logError('realtime', new Error('Socket.io library not loaded'));
            return;
        }
    } catch (libCheck) {
        console.warn('Socket.io check failed. Running in offline mode.');
        logError('realtime', libCheck);
        return;
    }

    // Auto-detect server URL based on environment
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const productionServerUrl = 'https://koitus-server-f2qm.onrender.com';
    const SERVER_URL = isLocalhost ? 'http://localhost:3001' : (window.KOITUS_CONFIG?.SERVER_URL || productionServerUrl);
    
    try {
        state.socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    // Connection events
    state.socket.on('connect', () => {
        state.connected = true;
        console.log('✅ Connected to real-time server');
        showNotification('Connected to chat server', 'success');
        
        // Join with current user
        if (state.currentUser) {
            joinPlatform();
        }
    });

    state.socket.on('disconnect', () => {
        state.connected = false;
        console.log('❌ Disconnected from server');
        showNotification('Disconnected from chat server', 'warning');
    });

    state.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showNotification('Chat server unavailable - using offline mode', 'warning');
    });

    // Receive message in real-time
    state.socket.on('receive_message', (message) => {
        console.log('📨 Real-time message received:', message);
        
        // Add to conversation
        let conversation = state.conversations.find(c => c.id === message.from);
        if (!conversation) {
            const sender = state.profiles.find(p => p.id === message.from);
            if (sender) {
                conversation = {
                    id: message.from,
                    name: sender.name,
                    avatar: sender.image,
                    messages: [],
                    online: sender.online
                };
                state.conversations.unshift(conversation);
            }
        }
        
        if (conversation) {
            conversation.messages.push({
                id: message.id,
                text: message.text,
                sent: false,
                time: formatMessageTime(message.timestamp),
                read: false
            });
            
            // Update if this is the current chat
            if (state.currentChat && state.currentChat.id === message.from) {
                renderMessages();
                // Mark as read
                markAsRead(message.id, conversation.id);
            }
            
            renderConversations();
            
            // Show notification
            if (state.currentView !== 'messages' || state.currentChat?.id !== message.from) {
                showNotification(`New message from ${conversation.name}`, 'info');
            }
        }
    });

    // Message delivered
    state.socket.on('message_delivered', (data) => {
        console.log('✓ Message delivered:', data.messageId);
        // Update UI for delivery confirmation
        state.conversations.forEach(conv => {
            const msg = conv.messages.find(m => m.id === data.messageId);
            if (msg) {
                msg.delivered = true;
            }
        });
        if (state.currentChat) {
            renderMessages();
        }
    });

    // Message read
    state.socket.on('message_read', (data) => {
        if (state.currentChat) {
            const msg = state.currentChat.messages.find(m => m.id === data.messageId);
            if (msg) {
                msg.read = true;
                renderMessages();
            }
        }
    });

    // User typing
    state.socket.on('user_typing', (data) => {
        if (state.currentChat && state.currentChat.id === data.from) {
            if (data.typing) {
                showTypingIndicatorUI();
            } else {
                hideTypingIndicatorUI();
            }
        }
    });

    // Incoming call
    state.socket.on('incoming_call', (data) => {
        handleIncomingCall(data);
    });

    // Call accepted
    state.socket.on('call_accepted', (data) => {
        console.log('Call accepted:', data);
        setupWebRTCConnection('caller');
    });

    // Call rejected
    state.socket.on('call_rejected', (data) => {
        console.log('Call rejected:', data);
        stopCallTimer();
        hideCallUI();
        if (state.peerConnection) { state.peerConnection.close(); state.peerConnection = null; }
        if (state.localStream) { state.localStream.getTracks().forEach(t => t.stop()); state.localStream = null; }
        state.activeCall = null;
        showNotification('Call rejected', 'warning');
    });

    // Call ended by remote
    state.socket.on('call_ended', (data) => {
        console.log('Call ended by remote:', data);
        stopCallTimer();
        hideCallUI();
        if (state.peerConnection) { state.peerConnection.close(); state.peerConnection = null; }
        if (state.localStream) { state.localStream.getTracks().forEach(t => t.stop()); state.localStream = null; }
        if (state.activeCall) {
            chargeForCall(state.activeCall);
            state.activeCall = null;
        }
        showNotification('Call ended', 'info');
    });

    // WebRTC offer
    state.socket.on('webrtc_offer', async (data) => {
        console.log('Received WebRTC offer');
        await handleWebRTCOffer(data);
    });

    // WebRTC answer
    state.socket.on('webrtc_answer', async (data) => {
        console.log('Received WebRTC answer');
        await handleWebRTCAnswer(data);
    });

    // ICE candidate
    state.socket.on('webrtc_ice_candidate', async (data) => {
        if (state.peerConnection) {
            try {
                await state.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    });

    // User online/offline
    state.socket.on('user_online', (data) => {
        state.onlineUsers.set(data.userId, data.socketId);
        updateOnlineStatus(data.userId, true);
    });

    state.socket.on('user_offline', (data) => {
        state.onlineUsers.delete(data.userId);
        updateOnlineStatus(data.userId, false);
    });

    // Users list
    state.socket.on('users_list', (usersList) => {
        console.log('Users online:', usersList);
        usersList.forEach(user => {
            if (user.online) {
                state.onlineUsers.set(user.id, user.socketId);
            }
        });
    });
    } catch (socketError) {
        console.error('Failed to initialize real-time connection:', socketError);
        logError('realtime', socketError);
        showNotification('Chat server unavailable - using offline mode', 'warning');
    }
}

function joinPlatform() {
    if (!state.socket || !state.currentUser) return;
    
    state.socket.emit('user_join', {
        id: state.currentUser.id,
        name: state.currentUser.name,
        avatar: state.currentUser.avatar,
        type: state.currentUser.type,
        coords: state.currentUser.coords
    });
}

function sendMessageRealTime(to, text) {
    if (!state.socket || !state.currentUser) {
        // Fallback to simulated messages if offline
        return false;
    }
    
    state.socket.emit('send_message', {
        from: state.currentUser.id,
        to: to,
        text: text,
        type: 'text'
    });
    
    return true;
}

function sendTypingIndicator(to, typing) {
    if (!state.socket || !state.currentUser) return;
    
    state.socket.emit(typing ? 'typing_start' : 'typing_stop', {
        from: state.currentUser.id,
        to: to
    });
}

function markAsRead(messageId, conversationId) {
    if (!state.socket) return;
    
    state.socket.emit('mark_read', {
        messageId,
        conversationId
    });
}

// ==================== VIDEO CALLS (WebRTC) ====================
async function startVideoCallWith(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) return;
    
    if (!state.socket || !state.socket.connected) {
        showNotification('Chat server not connected', 'error');
        return;
    }
    
    try {
        state.localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        showCallUI(user, 'caller', 'video');
        
        state.socket.emit('initiate_call', {
            from: state.currentUser.id,
            to: userId,
            type: 'video'
        });
        
        state.activeCall = {
            callId: userId + '-' + Date.now(),
            userId,
            type: 'video',
            status: 'initiating'
        };
        
        startCallTimer();
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        showNotification('Could not access camera/microphone', 'error');
    }
}

function startAudioCallWith(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) return;
    
    if (!state.socket || !state.socket.connected) {
        showNotification('Chat server not connected', 'error');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
    }).then(stream => {
        state.localStream = stream;
        
        showCallUI(user, 'caller', 'audio');
        
        state.socket.emit('initiate_call', {
            from: state.currentUser.id,
            to: userId,
            type: 'audio'
        });
        
        state.activeCall = {
            callId: userId + '-' + Date.now(),
            userId,
            type: 'audio',
            status: 'initiating'
        };
        
        startCallTimer();
    }).catch(error => {
        console.error('Error accessing microphone:', error);
        showNotification('Could not access microphone', 'error');
    });
}

let callTimerInterval = null;
let callSeconds = 0;

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function calculateAge(dob) {
    if (!dob) return 0;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function formatCallTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startCallTimer() {
    callSeconds = 0;
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
        callSeconds++;
        const el = document.getElementById('call-timer');
        if (el) el.textContent = formatCallTime(callSeconds);
        const costEl = document.getElementById('call-cost-display');
        if (costEl && state.activeCall) {
            const provider = state.profiles.find(p => p.id === state.activeCall.userId);
            const rate = provider ? (provider.callRate || 0) : 0;
            const minutes = Math.ceil(callSeconds / 60);
            costEl.textContent = 'R' + (minutes * rate).toFixed(2);
        }
    }, 1000);
}

function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
    callSeconds = 0;
}

function handleIncomingCall(data) {
    const caller = state.profiles.find(p => p.id === data.from);
    if (!caller) return;

    // Remove existing incoming modal
    const existing = document.getElementById('incoming-call-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'incoming-call-modal';
    modal.className = 'incoming-call-modal';
    modal.innerHTML = `
        <div class="incoming-call-content">
            <div class="incoming-call-avatar">
                <img src="${caller.image}" alt="${caller.name}">
                <div class="pulse-ring"></div>
            </div>
            <h3>${data.type === 'video' ? '📹' : '📞'} Incoming ${data.type} call</h3>
            <p class="incoming-caller-name">${caller.name}</p>
            <div class="incoming-call-actions">
                <button class="call-btn reject" onclick="rejectCall('${data.callId}')">
                    <i class="fas fa-phone-slash"></i>
                </button>
                <button class="call-btn accept" onclick="acceptCall('${data.callId}', ${data.from})">
                    <i class="fas fa-phone"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Play ringtone
    playRingtone();
}

function playRingtone() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2);
        setTimeout(() => {
            if (document.getElementById('incoming-call-modal')) {
                playRingtone();
            }
        }, 2500);
    } catch(e) {}
}

function stopRingtone() {
    // Ringtone auto-stops when incoming-call-modal is removed
}

async function acceptCall(callId, from) {
    stopRingtone();
    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.remove();

    const callType = (state.activeCall && state.activeCall.type) || 'video';

    try {
        state.localStream = await navigator.mediaDevices.getUserMedia({
            video: callType !== 'audio',
            audio: true
        });
        
        const user = state.profiles.find(p => p.id === from);
        showCallUI(user || { name: 'User', image: '' }, 'receiver', callType);
        
        state.socket.emit('accept_call', {
            callId,
            from: state.currentUser.id
        });
        
        state.activeCall = {
            callId,
            userId: from,
            type: callType,
            status: 'accepted'
        };
        
        startCallTimer();
    } catch (error) {
        console.error('Error accepting call:', error);
        rejectCall(callId);
    }
}

function rejectCall(callId) {
    stopRingtone();
    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.remove();
    
    if (state.socket) {
        state.socket.emit('reject_call', {
            callId,
            from: state.currentUser.id
        });
    }
    showNotification('Call rejected', 'info');
}

// ==================== CALL BILLING ====================
function chargeForCall(activeCall) {
    if (!activeCall || !activeCall.userId) return;
    const provider = state.profiles.find(p => p.id === activeCall.userId);
    if (!provider) return;
    
    const ratePerMin = provider.callRate || 0;
    if (ratePerMin <= 0) return;
    
    const minutes = Math.ceil(callSeconds / 60);
    const charge = minutes * ratePerMin;
    
    if (charge <= 0) return;
    
    state.wallet.balance -= charge;
    state.wallet.transactions.unshift({
        id: Date.now(),
        type: 'call_charge',
        amount: -charge,
        description: `Call with ${provider.name} (${minutes} min @ R${ratePerMin}/min)`,
        date: new Date().toISOString(),
        userId: state.currentUser.id,
        toUserId: provider.id
    });
    
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(state.wallet));
    
    if (charge > 0) {
        showNotification(`Call charged: R${charge.toFixed(2)} (${minutes} min × R${ratePerMin}/min)`, 'info');
    }
    
    // Add to call history
    if (!state.callHistory) state.callHistory = [];
    state.callHistory.unshift({
        id: Date.now(),
        userId: provider.id,
        name: provider.name,
        image: provider.image,
        type: activeCall.type,
        duration: callSeconds,
        cost: charge,
        rate: ratePerMin,
        date: new Date().toISOString(),
        direction: 'outgoing'
    });
    localStorage.setItem('koitus_call_history', JSON.stringify(state.callHistory));
}

function endCall() {
    if (state.activeCall) {
        if (state.socket) {
            state.socket.emit('end_call', {
                callId: state.activeCall.callId
            });
        }
        
        if (state.peerConnection) {
            state.peerConnection.close();
            state.peerConnection = null;
        }
        
        if (state.localStream) {
            state.localStream.getTracks().forEach(track => track.stop());
            state.localStream = null;
        }
        
        stopCallTimer();
        chargeForCall(state.activeCall);
        hideCallUI();
        state.activeCall = null;
        
        showNotification('Call ended', 'info');
    }
}

async function setupWebRTCConnection(role) {
    // Create peer connection
    state.peerConnection = new RTCPeerConnection(state.rtcConfig);
    
    // Add local stream tracks
    if (state.localStream) {
        state.localStream.getTracks().forEach(track => {
            state.peerConnection.addTrack(track, state.localStream);
        });
    }
    
    // Create remote stream
    state.remoteStream = new MediaStream();
    
    // On track received
    state.peerConnection.ontrack = (event) => {
        console.log('Received remote track');
        event.streams[0].getTracks().forEach(track => {
            state.remoteStream.addTrack(track);
        });
        
        // Show remote video
        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo) {
            remoteVideo.srcObject = state.remoteStream;
        }
    };
    
    // On ICE candidate
    state.peerConnection.onicecandidate = (event) => {
        if (event.candidate && state.socket) {
            const to = role === 'caller' ? state.activeCall.userId : state.activeCall.userId;
            state.socket.emit('webrtc_ice_candidate', {
                to,
                candidate: event.candidate
            });
        }
    };
    
    // On connection state change
    state.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', state.peerConnection.connectionState);
        
        if (state.peerConnection.connectionState === 'connected') {
            updateCallStatus('Connected');
            showNotification('Call connected!', 'success');
        } else if (state.peerConnection.connectionState === 'disconnected' || 
                   state.peerConnection.connectionState === 'failed' ||
                   state.peerConnection.connectionState === 'closed') {
            if (state.activeCall && state.activeCall.status !== 'ended') {
                showNotification('Call disconnected', 'warning');
                endCall();
            }
        }
    };
    
    // If caller, create offer
    if (role === 'caller') {
        try {
            const offer = await state.peerConnection.createOffer();
            await state.peerConnection.setLocalDescription(offer);
            
            state.socket.emit('webrtc_offer', {
                to: state.activeCall.userId,
                offer: state.peerConnection.localDescription
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }
}

async function handleWebRTCOffer(data) {
    if (!state.peerConnection) {
        await setupWebRTCConnection('receiver');
    }
    
    await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    
    const answer = await state.peerConnection.createAnswer();
    await state.peerConnection.setLocalDescription(answer);
    
    state.socket.emit('webrtc_answer', {
        to: data.from,
        answer: state.peerConnection.localDescription
    });
}

async function handleWebRTCAnswer(data) {
    if (state.peerConnection) {
        await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
}

// Call UI Functions
let isMuted = false;
let isCameraOff = false;
let isSpeakerOn = false;

function showCallUI(user, role, callType) {
    const existing = document.getElementById('call-modal');
    if (existing) existing.remove();

    const ratePerMin = user.callRate || 0;
    const rateInfo = ratePerMin > 0 ? `R${ratePerMin}/min` : 'Free';

    const callModal = document.createElement('div');
    callModal.id = 'call-modal';
    callModal.className = 'call-modal';
    callModal.innerHTML = `
        <div class="call-container">
            <div class="call-status-bar">
                <div class="call-status-left">
                    <span id="call-status-text">${role === 'caller' ? 'Calling...' : 'Connecting...'}</span>
                    <span id="call-timer" style="display:none">00:00</span>
                </div>
                <div class="call-status-right">
                    <span class="call-rate-badge"><i class="fas fa-coins"></i> ${rateInfo}</span>
                    <span class="call-cost" id="call-cost-display">R0.00</span>
                </div>
            </div>
            <div class="call-video-grid" id="call-video-grid">
                <div class="video-container remote" id="call-bg-remote">
                    <video id="remote-video" autoplay playsinline></video>
                    <div class="video-label">${user.name}</div>
                    ${callType === 'audio' ? '<div class="audio-only-indicator"><i class="fas fa-music"></i> Audio Call</div>' : ''}
                </div>
                <div class="video-container local" id="call-bg-local">
                    <video id="local-video" autoplay playsinline muted></video>
                    <div class="video-label">You</div>
                </div>
            </div>
            <div class="call-customize-bar" id="call-customize-bar" style="display:${callType === 'audio' ? 'none' : 'flex'}">
                <button class="call-customize-btn active" onclick="setCallBackground('none')" title="No Background">
                    <i class="fas fa-ban"></i><span>None</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('blur')" title="Blur">
                    <i class="fas fa-circle-half-stroke"></i><span>Blur</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('beach')" title="Beach">
                    <span style="font-size:16px">🏖️</span><span>Beach</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('space')" title="Space">
                    <span style="font-size:16px">🌌</span><span>Space</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('sunset')" title="Sunset">
                    <span style="font-size:16px">🌅</span><span>Sunset</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('city')" title="City">
                    <span style="font-size:16px">🌃</span><span>City</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('forest')" title="Forest">
                    <span style="font-size:16px">🌲</span><span>Forest</span>
                </button>
                <button class="call-customize-btn" onclick="setCallBackground('gradient')" title="Gradient">
                    <span style="font-size:16px">🎨</span><span>Art</span>
                </button>
            </div>
            <div class="call-controls">
                <button class="call-btn" id="call-mute-btn" onclick="toggleMute()" title="Mute">
                    <i class="fas fa-microphone"></i>
                </button>
                <button class="call-btn" id="call-camera-btn" onclick="toggleCamera()" title="Camera" style="display:${callType === 'audio' ? 'none' : 'flex'}">
                    <i class="fas fa-video"></i>
                </button>
                <button class="call-btn" id="call-speaker-btn" onclick="toggleSpeaker()" title="Speaker">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="call-btn" id="call-effects-btn" onclick="toggleCallEffects()" title="Effects" style="display:${callType === 'audio' ? 'none' : 'flex'}">
                    <i class="fas fa-magic"></i>
                </button>
                <button class="call-btn end" onclick="endCall()" title="End Call">
                    <i class="fas fa-phone-slash"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(callModal);

    setTimeout(() => {
        const localVideo = document.getElementById('local-video');
        if (localVideo && state.localStream) {
            localVideo.srcObject = state.localStream;
        }
        if (callType === 'audio') {
            const grid = document.getElementById('call-video-grid');
            if (grid) {
                grid.style.display = 'flex';
                grid.style.alignItems = 'center';
                grid.style.justifyContent = 'center';
                const remote = grid.querySelector('.remote');
                if (remote) {
                    remote.style.width = '300px';
                    remote.style.height = '300px';
                    remote.style.borderRadius = '50%';
                }
            }
        }
    }, 100);
}

function toggleCallEffects() {
    const bar = document.getElementById('call-customize-bar');
    if (bar) {
        bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
    }
}

const callBackgrounds = {
    none: '',
    blur: 'blur(20px) brightness(0.7)',
    beach: 'linear-gradient(135deg, #00b4db, #0083b0)',
    space: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    sunset: 'linear-gradient(135deg, #fa709a, #fee140)',
    city: 'linear-gradient(135deg, #232526, #414345)',
    forest: 'linear-gradient(135deg, #134e5e, #71b280)',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)'
};

function setCallBackground(bg) {
    const remote = document.getElementById('call-bg-remote');
    const local = document.getElementById('call-bg-local');
    document.querySelectorAll('.call-customize-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (!remote || !local) return;

    if (bg === 'none') {
        remote.style.background = '';
        remote.style.backdropFilter = '';
        local.style.background = '';
        local.style.backdropFilter = '';
        const vid = document.getElementById('remote-video');
        if (vid) vid.style.filter = '';
    } else if (bg === 'blur') {
        remote.style.background = '';
        remote.style.backdropFilter = 'blur(20px)';
        local.style.background = '';
        local.style.backdropFilter = 'blur(20px)';
        const vid = document.getElementById('remote-video');
        if (vid) vid.style.filter = 'brightness(0.85)';
    } else {
        remote.style.background = callBackgrounds[bg];
        remote.style.backdropFilter = '';
        local.style.background = callBackgrounds[bg];
        local.style.backdropFilter = '';
        const vid = document.getElementById('remote-video');
        if (vid) vid.style.filter = '';
    }
}

function hideCallUI() {
    const callModal = document.getElementById('call-modal');
    if (callModal) {
        callModal.remove();
    }
}

function updateCallStatus(status) {
    const el = document.getElementById('call-status-text');
    if (el) el.textContent = status;
    if (status === 'Connected') {
        const timer = document.getElementById('call-timer');
        if (timer) timer.style.display = 'inline';
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('call-mute-btn');
    if (state.localStream) {
        const audioTrack = state.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !isMuted;
        }
    }
    if (btn) {
        btn.innerHTML = isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
        btn.style.background = isMuted ? 'var(--error)' : 'var(--bg-tertiary)';
    }
}

function toggleCamera() {
    isCameraOff = !isCameraOff;
    const btn = document.getElementById('call-camera-btn');
    if (state.localStream) {
        const videoTrack = state.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !isCameraOff;
        }
    }
    if (btn) {
        btn.innerHTML = isCameraOff ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
        btn.style.background = isCameraOff ? 'var(--error)' : 'var(--bg-tertiary)';
    }
}

function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    const btn = document.getElementById('call-speaker-btn');
    if (btn) {
        btn.innerHTML = isSpeakerOn ? '<i class="fas fa-volume-off"></i>' : '<i class="fas fa-volume-up"></i>';
    }
}

function updateOnlineStatus(userId, isOnline) {
    // Update in profiles
    const profile = state.profiles.find(p => p.id === userId);
    if (profile) {
        profile.online = isOnline;
    }
    
    // Update in conversations
    const conv = state.conversations.find(c => c.id === userId);
    if (conv) {
        conv.online = isOnline;
    }
    
    // Re-render if needed
    if (state.currentChat && state.currentChat.id === userId) {
        const statusEl = document.getElementById('chat-user-status');
        if (statusEl) {
            statusEl.textContent = isOnline ? 'Online' : 'Offline';
        }
    }
    
    renderConversations();
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

function showTypingIndicatorUI() {
    const statusEl = document.getElementById('chat-user-status');
    if (statusEl) {
        statusEl.textContent = 'Typing...';
        statusEl.style.color = 'var(--primary)';
    }
}

function hideTypingIndicatorUI() {
    const statusEl = document.getElementById('chat-user-status');
    if (statusEl && state.currentChat) {
        statusEl.textContent = state.currentChat.online ? 'Online' : 'Offline';
        statusEl.style.color = '';
    }
}

// ==================== EVENTS & PARTIES ====================
function renderEvents() {
    const container = document.getElementById('events-container');
    const emptyState = document.getElementById('events-empty-state');
    if (!container) return;

    let filteredEvents = [...state.events];

    // Filter by tab
    if (state.eventsTab === 'upcoming') {
        filteredEvents = filteredEvents.filter(e => !e.isPast);
    } else if (state.eventsTab === 'past') {
        filteredEvents = filteredEvents.filter(e => e.isPast);
    } else if (state.eventsTab === 'my-events') {
        filteredEvents = filteredEvents.filter(e => e.isHost);
    }

    // Filter by type
    const typeFilter = document.getElementById('event-type-filter')?.value || 'all';
    if (typeFilter !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.type === typeFilter);
    }

    // Filter by date
    const dateFilter = document.getElementById('event-date-filter')?.value || 'all';
    if (dateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        filteredEvents = filteredEvents.filter(e => {
            const eventDate = new Date(e.date);
            eventDate.setHours(0, 0, 0, 0);

            switch (dateFilter) {
                case 'today':
                    return eventDate.getTime() === today.getTime();
                case 'tomorrow':
                    return eventDate.getTime() === tomorrow.getTime();
                case 'this-week':
                    return eventDate >= today && eventDate <= nextWeek;
                case 'this-weekend':
                    const day = eventDate.getDay();
                    return day === 0 || day === 6;
                case 'next-week':
                    return eventDate > nextWeek && eventDate <= new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
                default:
                    return true;
            }
        });
    }

    // Filter by distance
    const distanceFilter = document.getElementById('event-distance-filter')?.value || '25';
    if (distanceFilter !== 'any') {
        const maxDistance = parseInt(distanceFilter);
        filteredEvents = filteredEvents.filter(e => {
            const distance = calculateDistance(
                state.userLocation.lat,
                state.userLocation.lng,
                e.coords?.lat || state.userLocation.lat,
                e.coords?.lng || state.userLocation.lng
            );
            return distance <= maxDistance;
        });
    }

    // Sort by date
    filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Render
    if (filteredEvents.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        container.style.display = 'grid';
        emptyState.style.display = 'none';
        container.innerHTML = filteredEvents.map(event => createEventCard(event)).join('');
    }
}

function createEventCard(event) {
    const typeLabels = {
        party: 'Party',
        social: 'Social',
        networking: 'Networking',
        workshop: 'Workshop',
        concert: 'Concert',
        other: 'Other'
    };

    const dateObj = new Date(event.date);
    const dateStr = dateObj.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    const dayStr = dateObj.toLocaleDateString('en-ZA', { weekday: 'short' });

    const attendeeAvatars = event.attendees?.slice(0, 4).map(img => 
        `<img src="${img}" alt="Attendee" class="attendee-avatar">`
    ).join('') || '';

    const remainingCount = event.attendeeCount - (event.attendees?.length || 0);

    return `
        <div class="event-card" onclick="openEventDetail(${event.id})">
            <div class="event-card-image">
                <img src="${event.image}" alt="${event.name}">
                <span class="event-card-type">${typeLabels[event.type] || event.type}</span>
                ${event.isPrivate ? '<span class="event-card-private"><i class="fas fa-lock"></i> Private</span>' : ''}
            </div>
            <div class="event-card-info">
                <h3>${event.name}</h3>
                <div class="event-card-host">
                    <img src="${event.host.image}" alt="${event.host.name}">
                    <span>Hosted by ${event.host.name}</span>
                </div>
                <div class="event-card-meta">
                    <div class="event-card-meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${dayStr}, ${dateStr}</span>
                    </div>
                    <div class="event-card-meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${event.time}</span>
                    </div>
                    <div class="event-card-meta-item">
                        <i class="fas fa-location-dot"></i>
                        <span>${event.location}</span>
                    </div>
                </div>
                <div class="event-card-footer">
                    <span class="event-card-price ${event.price === 'Free' ? 'free' : ''}">
                        ${event.price}
                    </span>
                    <div class="event-card-attendees">
                        ${attendeeAvatars}
                        <span class="event-card-attendees-count">
                            <i class="fas fa-users"></i> ${event.attendeeCount}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function switchEventTab(tab) {
    state.eventsTab = tab;
    
    document.querySelectorAll('.event-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        }
    });
    
    renderEvents();
}

function toggleEventFilters() {
    const filters = document.getElementById('event-filters');
    if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'grid' : 'none';
    }
}

function showCreateEventModal() {
    const modal = document.getElementById('create-event-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('event-date').setAttribute('min', today);
    }
}

function closeCreateEventModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('create-event-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

function createEvent(event) {
    event.preventDefault();
    
    const name = document.getElementById('event-name').value;
    const type = document.getElementById('event-type').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const location = document.getElementById('event-location').value;
    const lat = document.getElementById('event-lat').value;
    const lng = document.getElementById('event-lng').value;
    const description = document.getElementById('event-description').value;
    const price = document.getElementById('event-price').value || 'Free';
    const capacity = document.getElementById('event-capacity').value || 100;
    const isPrivate = document.getElementById('event-private').checked;

    const newEvent = {
        id: Date.now(),
        name,
        type,
        host: {
            id: state.currentUser?.id || 999,
            name: state.currentUser?.name || 'You',
            image: state.currentUser?.avatar || 'https://picsum.photos/seed/img47/400/300'
        },
        date,
        time,
        location,
        coords: { lat: lat ? parseFloat(lat) : state.userLocation.lat, lng: lng ? parseFloat(lng) : state.userLocation.lng },
        description,
        price,
        capacity: parseInt(capacity),
        attendees: [],
        attendeeCount: 0,
        isPrivate,
        image: 'https://picsum.photos/seed/img0/400/300',
        isHost: true,
        rsvp: false
    };

    state.events.unshift(newEvent);
    EventDB.create({
        name: newEvent.name,
        type: newEvent.type,
        description: newEvent.description,
        date: newEvent.date,
        time: newEvent.time,
        location: newEvent.location,
        coords: newEvent.coords,
        host_id: state.currentUser?.id || 'guest',
        is_past: false,
        is_host: true,
        rsvp_count: 0
    });
    
    document.getElementById('create-event-form').reset();
    closeCreateEventModal();
    switchEventTab('my-events');
    showToast('Event created successfully! 🎉');
}

function openEventDetail(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    state.selectedEvent = event;

    // Populate detail modal
    document.getElementById('detail-image').src = event.image;
    document.getElementById('detail-type').textContent = event.type.charAt(0).toUpperCase() + event.type.slice(1);
    document.getElementById('detail-name').textContent = event.name;
    
    // Host section
    document.getElementById('detail-host-image').src = event.host.image;
    document.getElementById('detail-host-name').textContent = event.host.name;
    
    // Show/hide message host button (hide if user is host)
    const messageHostBtn = document.getElementById('detail-message-host-btn');
    if (messageHostBtn) {
        messageHostBtn.style.display = event.isHost ? 'none' : 'flex';
    }

    // Date and time
    const dateObj = new Date(event.date);
    document.getElementById('detail-date').textContent = dateObj.toLocaleDateString('en-ZA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('detail-time').textContent = event.time;
    document.getElementById('detail-location').textContent = event.location;
    document.getElementById('detail-description').textContent = event.description;

    // Features
    document.getElementById('detail-capacity').textContent = `${event.attendeeCount}/${event.capacity} attendees`;
    const availableSpots = event.capacity - event.attendeeCount;
    document.getElementById('detail-availability').textContent = availableSpots > 0 
        ? `${availableSpots} spots available` 
        : 'Event is full';

    // Price section
    const priceSection = document.getElementById('detail-price-section');
    const buyTicketBtn = document.getElementById('buy-ticket-btn');
    if (event.price && event.price !== 'Free') {
        priceSection.style.display = 'flex';
        document.getElementById('detail-price').textContent = event.price;
        buyTicketBtn.style.display = 'flex';
    } else {
        priceSection.style.display = 'none';
        buyTicketBtn.style.display = 'none';
    }

    // Private event badge
    const privateBadge = document.getElementById('detail-private-badge');
    if (privateBadge) {
        privateBadge.style.display = event.isPrivate ? 'flex' : 'none';
    }

    // Render attendees
    const attendeesContainer = document.getElementById('detail-attendees');
    const attendeesNote = document.getElementById('attendees-note');
    const attendeeCountLabel = document.getElementById('detail-attendee-count');
    
    if (attendeeCountLabel) {
        attendeeCountLabel.textContent = `(${event.attendeeCount})`;
    }
    
    if (event.attendees && event.attendees.length > 0) {
        attendeesContainer.innerHTML = event.attendees.map(img =>
            `<img src="${img}" alt="Attendee" class="attendee-avatar" title="Attendee">`
        ).join('');
        if (attendeesNote) attendeesNote.style.display = 'none';
    } else {
        attendeesContainer.innerHTML = '';
        if (attendeesNote) {
            attendeesNote.style.display = 'block';
            attendeesNote.textContent = 'Be the first to RSVP!';
        }
    }

    // Update RSVP button
    const rsvpBtn = document.getElementById('rsvp-btn');
    const rsvpButtonText = document.getElementById('rsvp-button-text');
    if (event.isHost) {
        rsvpBtn.style.display = 'none';
    } else {
        rsvpBtn.style.display = 'flex';
        rsvpButtonText.textContent = event.rsvp ? "Cancel RSVP" : "I'm Going";
    }

    // Show/hide host actions
    const hostActions = document.getElementById('detail-host-actions');
    if (hostActions) {
        hostActions.style.display = event.isHost ? 'block' : 'none';
    }

    // Show modal
    const modal = document.getElementById('event-detail-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeEventDetail(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('event-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        state.selectedEvent = null;
    }
}

function toggleRSVP() {
    const event = state.selectedEvent;
    if (!event) return;

    if (event.isHost) {
        showToast('You are the host! 🎉');
        return;
    }

    event.rsvp = !event.rsvp;
    
    if (event.rsvp) {
        event.attendeeCount++;
        if (!event.attendees) event.attendees = [];
        // Add current user avatar (placeholder)
        event.attendees.push('https://picsum.photos/seed/img47/400/300');
        showToast("You're going! See you there! 🎉");
    } else {
        event.attendeeCount--;
        if (event.attendees.length > 0) {
            event.attendees.pop();
        }
        showToast('RSVP cancelled');
    }

    // Update UI
    openEventDetail(event.id);
    renderEvents();
}

function shareEvent() {
    const event = state.selectedEvent;
    if (!event) return;

    if (navigator.share) {
        navigator.share({
            title: event.name,
            text: `Check out this event: ${event.name}`,
            url: window.location.href
        }).catch(() => {
            fallbackShare(event);
        });
    } else {
        fallbackShare(event);
    }
}

function fallbackShare(event) {
    // Copy to clipboard
    const shareText = `Check out this event: ${event.name}\nDate: ${event.date} at ${event.time}\nLocation: ${event.location}\n${event.description}`;

    navigator.clipboard.writeText(shareText).then(() => {
        showToast('Event details copied to clipboard! 📋');
    }).catch(() => {
        showToast('Share feature not supported on this device');
    });
}

// ==================== MESSAGE HOST ====================
function messageHost() {
    const event = state.selectedEvent;
    if (!event) return;

    // Check if user is logged in
    if (!state.currentUser) {
        showToast('Please login to send messages 🔐');
        showLogin();
        return;
    }

    // Check if user is trying to message themselves
    if (event.isHost) {
        showToast('You cannot message yourself! 😊');
        return;
    }

    // Find or create conversation with host
    const hostId = event.host.id;
    let conversation = state.conversations.find(c => c.id === hostId);

    if (!conversation) {
        // Create new conversation
        conversation = {
            id: hostId,
            name: event.host.name,
            avatar: event.host.image,
            messages: [],
            online: true
        };
        state.conversations.unshift(conversation);
    }

    // Switch to messages view
    switchView('messages');

    // Open chat with host
    setTimeout(() => {
        openChat(hostId);
        // Add initial message suggestion
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.value = `Hi! I'm interested in your event "${event.name}". `;
            messageInput.focus();
        }
    }, 100);

    showToast(`Opening chat with ${event.host.name} 💬`);
}

// ==================== BUY TICKET ====================
let ticketQuantity = 1;
let ticketPrice = 0;

function buyTicket() {
    const event = state.selectedEvent;
    if (!event) return;

    // Check if user is logged in
    if (!state.currentUser) {
        showToast('Please login to purchase tickets 🔐');
        showLogin();
        return;
    }

    // Check if event is free
    if (event.price === 'Free') {
        showToast('This event is free! Just RSVP to attend 🎉');
        toggleRSVP();
        return;
    }

    // Parse price
    ticketPrice = parseFloat(event.price.replace(/[^0-9.]/g, '')) || 0;

    // Populate ticket modal
    document.getElementById('ticket-event-name').textContent = event.name;
    updateTicketAmount();

    // Pre-fill user info if available
    if (state.currentUser) {
        document.getElementById('ticket-name').value = state.currentUser.name || '';
        document.getElementById('ticket-email').value = state.currentUser.email || '';
    }

    // Show modal
    const modal = document.getElementById('buy-ticket-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeBuyTicketModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('buy-ticket-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        ticketQuantity = 1;
    }
}

function updateTicketQuantity(change) {
    const input = document.getElementById('ticket-quantity');
    if (!input) return;

    const newValue = ticketQuantity + change;
    if (newValue >= 1 && newValue <= 10) {
        ticketQuantity = newValue;
        input.value = ticketQuantity;
        updateTicketAmount();
    }
}

function updateTicketAmount() {
    const total = ticketPrice * ticketQuantity;
    document.getElementById('ticket-amount').textContent = `R${total.toFixed(2)}`;
}

function processTicketPurchase(event) {
    event.preventDefault();

    const eventName = document.getElementById('ticket-event-name').textContent;
    const name = document.getElementById('ticket-name').value;
    const email = document.getElementById('ticket-email').value;
    const phone = document.getElementById('ticket-phone').value;
    const quantity = document.getElementById('ticket-quantity').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    // Simulate payment processing
    showToast('Processing payment... ⏳');

    setTimeout(() => {
        // Close modal
        closeBuyTicketModal();

        // Show success
        showToast(`Ticket purchased successfully! 🎫 Confirmation sent to ${email}`);

        // Auto-RSVP
        const event = state.selectedEvent;
        if (event && !event.rsvp) {
            event.rsvp = true;
            event.attendeeCount++;
        }

        // Reset form
        document.getElementById('ticket-purchase-form').reset();
        ticketQuantity = 1;
    }, 2000);
}

// ==================== ATTENDEES LIST ====================
function viewAttendeesList() {
    const event = state.selectedEvent;
    if (!event) return;

    // Update stats
    document.getElementById('attendees-going').textContent = event.attendeeCount;
    document.getElementById('attendees-interested').textContent = Math.floor(event.attendeeCount * 0.3);
    document.getElementById('attendees-capacity').textContent = event.capacity;

    // Generate attendees list
    const listContainer = document.getElementById('attendees-full-list');
    if (event.attendees && event.attendees.length > 0) {
        listContainer.innerHTML = event.attendees.map((img, index) => `
            <div class="attendee-list-item">
                <img src="${img}" alt="Attendee">
                <div class="attendee-list-info">
                    <div class="attendee-list-name">Attendee ${index + 1}</div>
                    <div class="attendee-list-status">Going</div>
                </div>
            </div>
        `).join('');
    } else {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No attendees yet</p>';
    }

    // Show modal
    const modal = document.getElementById('attendees-list-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeAttendeesModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('attendees-list-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// ==================== HOST CONTROLS ====================
function editEvent() {
    showToast('Edit event feature coming soon! 🔧');
}

function sendMessageToAll() {
    const event = state.selectedEvent;
    if (!event) return;

    showToast(`Message will be sent to ${event.attendeeCount} attendees 📧`);
}

function cancelEvent() {
    const event = state.selectedEvent;
    if (!event) return;

    if (confirm('Are you sure you want to cancel this event? All attendees will be notified.')) {
        // Remove event
        const index = state.events.findIndex(e => e.id === event.id);
        if (index > -1) {
            state.events.splice(index, 1);
        }

        // Close modals
        closeEventDetail();
        closeAttendeesModal();

        // Refresh events
        renderEvents();

        showToast('Event cancelled. Attendees have been notified. 📢');
    }
}

function showSupabaseWarning() {
    if (document.getElementById('supabase-offline-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'supabase-offline-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#f59e0b;color:#1a1a2e;text-align:center;padding:10px 40px 10px 16px;font-size:14px;font-weight:600;';
    banner.innerHTML = '⚠️ Database is paused. Some features are unavailable. <a href="https://supabase.com/dashboard" target="_blank" style="color:#1a1a2e;text-decoration:underline;margin-left:8px;">Restore project</a> <button onclick="this.parentElement.remove()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:18px;cursor:pointer;font-weight:bold;">&times;</button>';
    document.body.appendChild(banner);
}

function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--gray-800);
        color: var(--white);
        padding: 12px 24px;
        border-radius: var(--radius-lg);
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add slideUp animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
`;
document.head.appendChild(toastStyle);

// ==================== WALLET FUNCTIONS ====================
function renderWallet() {
    // Update balance display
    const balanceEl = document.getElementById('wallet-balance');
    const navBalanceEl = document.getElementById('wallet-balance-nav');
    if (balanceEl) {
        balanceEl.textContent = `R${state.wallet.balance.toFixed(2)}`;
    }
    if (navBalanceEl) {
        navBalanceEl.textContent = `R${state.wallet.balance.toFixed(0)}`;
    }

    // Render transactions
    const transactionsContainer = document.getElementById('wallet-transactions');
    if (transactionsContainer) {
        const recentTransactions = state.wallet.transactions.slice(0, 5);
        if (recentTransactions.length === 0) {
            transactionsContainer.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No transactions yet</p>';
        } else {
            transactionsContainer.innerHTML = recentTransactions.map(tx => createTransactionItem(tx)).join('');
        }
    }

    // Render payment methods
    const paymentMethodsContainer = document.getElementById('wallet-payment-methods');
    if (paymentMethodsContainer) {
        paymentMethodsContainer.innerHTML = `
            <div class="payment-method-item">
                <div class="payment-method-info">
                    <span class="payment-method-icon"><i class="fab fa-cc-visa"></i></span>
                    <div class="payment-method-details">
                        <span>Visa ending in 4242</span>
                        <small>Expires 12/25</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline">Remove</button>
            </div>
        `;
    }
}

function createTransactionItem(tx) {
    const icons = { deposit: 'plus-circle', purchase: 'shopping-cart', refund: 'undo' };
    const amountClass = tx.amount > 0 ? 'positive' : 'negative';
    const sign = tx.amount > 0 ? '+' : '';
    const date = new Date(tx.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });

    return `
        <div class="transaction-item ${tx.type}-item">
            <div class="transaction-info">
                <div class="transaction-icon ${tx.type}">
                    <i class="fas fa-${icons[tx.type] || 'circle'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${tx.description}</h4>
                    <p>${date}</p>
                </div>
            </div>
            <span class="transaction-amount ${amountClass}">${sign}R${Math.abs(tx.amount).toFixed(2)}</span>
        </div>
    `;
}

function showDepositModal() {
    const modal = document.getElementById('deposit-modal');
    if (modal) modal.style.display = 'flex';
}

function closeDepositModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('deposit-modal');
        if (modal) modal.style.display = 'none';
    }
}

function setDepositAmount(amount) {
    document.getElementById('deposit-custom').value = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
}

function processDeposit(event) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById('deposit-custom').value) || 0;
    const method = document.getElementById('deposit-method').value;

    if (amount < 10) {
        showToast('Minimum deposit is R10');
        return;
    }

    // Simulate processing
    showToast('Processing deposit... ⏳');

    setTimeout(() => {
        state.wallet.balance += amount;
        state.wallet.transactions.unshift({
            id: Date.now(),
            type: 'deposit',
            amount: amount,
            description: `Deposit via ${method.charAt(0).toUpperCase() + method.slice(1)}`,
            date: new Date(),
            status: 'completed'
        });

        closeDepositModal();
        renderWallet();
        showToast(`R${amount.toFixed(2)} deposited successfully! 💰`);
    }, 1500);
}

function showWithdrawModal() {
    showToast('Withdrawal feature coming soon! 🔧');
}

function showBoostProfileModal() {
    showToast('Profile Boost: R50 for 1 hour of increased visibility 🚀');
}

function showSendGiftModal() {
    showToast('Send Gift feature coming soon! 🎁');
}

function showAddPaymentModal() {
    showToast('Add Payment Method feature coming soon! 💳');
}

function showTransactionHistory() {
    const modal = document.getElementById('transaction-history-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderTransactionHistory();
    }
}

function closeTransactionHistory(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('transaction-history-modal');
        if (modal) modal.style.display = 'none';
    }
}

function renderTransactionHistory() {
    const container = document.getElementById('transactions-full-list');
    if (!container) return;

    const typeFilter = document.getElementById('transaction-filter-type')?.value || 'all';
    let filtered = state.wallet.transactions;

    if (typeFilter !== 'all') {
        filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No transactions found</p>';
    } else {
        container.innerHTML = filtered.map(tx => createTransactionItem(tx)).join('');
    }
}

// ==================== ACTIVITY FEED FUNCTIONS ====================
function renderActivityFeed() {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    let filtered = [...state.activityFeed];

    // Filter by type
    const typeFilter = document.getElementById('activity-type-filter')?.value || 'all';
    if (typeFilter !== 'all') {
        filtered = filtered.filter(a => a.type === typeFilter);
    }

    // Filter by time
    const timeFilter = document.getElementById('activity-time-filter')?.value || 'all';
    if (timeFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const month = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        filtered = filtered.filter(a => {
            if (timeFilter === 'today') return a.date >= today;
            if (timeFilter === 'week') return a.date >= week;
            if (timeFilter === 'month') return a.date >= month;
            return true;
        });
    }

    // Sort by time (newest first)
    filtered.sort((a, b) => b.time - a.time);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><p style="color: var(--text-tertiary);">No activity to show</p></div>';
    } else {
        container.innerHTML = filtered.map(activity => createActivityItem(activity)).join('');
    }
}

function createActivityItem(activity) {
    const timeAgo = formatTimeAgo(activity.time);
    const isLiked = activity.liked || false;
    const likeCount = activity.likeCount || 0;

    return `
        <div class="activity-item" id="activity-${activity.id}">
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-header">
                    <span class="activity-title">${activity.title}</span>
                    <span class="activity-time">${timeAgo}</span>
                </div>
                <p class="activity-text">${activity.text}</p>
                <div class="activity-actions">
                    <button class="btn btn-sm ${isLiked ? 'btn-primary' : 'btn-outline'}" onclick="toggleActivityLike(${activity.id})">
                        <i class="fas fa-heart${isLiked ? 's' : ''}"></i> ${isLiked ? 'Liked' : 'Like'} ${likeCount > 0 ? `(${likeCount})` : ''}
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="commentOnActivity(${activity.id})">
                        <i class="fas fa-comment"></i> Comment
                    </button>
                </div>
            </div>
        </div>
    `;
}

function toggleActivityFilters() {
    const filters = document.getElementById('activity-filters');
    if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'grid' : 'none';
    }
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ==================== ACTIVITY LIKE FUNCTIONS ====================
function toggleActivityLike(activityId) {
    const activity = state.activityFeed.find(a => a.id === activityId);
    if (!activity) return;

    if (!activity.liked) {
        activity.liked = true;
        activity.likeCount = (activity.likeCount || 0) + 1;
        showToast('Activity liked! ❤️');
    } else {
        activity.liked = false;
        activity.likeCount = (activity.likeCount || 0) - 1;
        showToast('Like removed');
    }

    // Re-render to update UI
    renderActivityFeed();
}

function commentOnActivity(activityId) {
    const activity = state.activityFeed.find(a => a.id === activityId);
    if (activity) {
        const comment = prompt('Write your comment:');
        if (comment) {
            showToast('Comment posted! 💬');
        }
    }
}

// ==================== STREAMS FUNCTIONS ====================
function renderStreams() {
    var tab = state.streamsTab || 'all';

    // Filter streams by tab
    var filtered = state.streams.filter(function(s) {
        if (tab === 'all') return true;
        if (tab === 'webcam') return s.category === 'Webcam';
        return s.category.toLowerCase() === tab;
    });

    var liveStreams = filtered.filter(function(s) { return s.isLive; });
    var webcamStreams = state.streams.filter(function(s) { return s.category === 'Webcam' && s.isLive; });
    var regularLive = liveStreams.filter(function(s) { return s.category !== 'Webcam'; });

    // Show/hide webcam section based on tab
    var webcamSection = document.getElementById('webcam-section');
    if (webcamSection) {
        webcamSection.style.display = (tab === 'all' || tab === 'webcam') ? 'block' : 'none';
    }

    // Render featured stream
    var featuredContainer = document.getElementById('featured-stream');
    if (featuredContainer) {
        if (liveStreams.length > 0) {
            var featured = liveStreams[0];
            document.getElementById('featured-streamer-img').src = featured.streamer.image;
            document.getElementById('featured-streamer-name').textContent = featured.streamer.name;
            document.getElementById('featured-stream-title').textContent = featured.title;
            document.getElementById('featured-stream-category').textContent = featured.category;
            document.getElementById('featured-stream-likes').innerHTML = '<i class="fas fa-heart"></i> ' + featured.likes;
            document.getElementById('featured-viewers').innerHTML = '<i class="fas fa-eye"></i> ' + (featured.viewers / 1000).toFixed(1) + 'K';
            featuredContainer.style.display = 'flex';
        } else {
            featuredContainer.style.display = 'none';
        }
    }

    // Render live streams grid (non-webcam or filtered)
    var gridContainer = document.getElementById('live-streams-grid');
    if (gridContainer) {
        var streamsToShow = tab === 'webcam' ? [] : regularLive.slice(0, 6);
        if (streamsToShow.length === 0 && tab !== 'webcam') {
            gridContainer.innerHTML = '<p style="color: var(--text-tertiary); padding: var(--spacing-4);">No live streams in this category</p>';
        } else if (streamsToShow.length > 0) {
            gridContainer.innerHTML = streamsToShow.map(function(s) { return createStreamCard(s); }).join('');
        } else {
            gridContainer.innerHTML = '';
        }
    }

    // Render webcam grid
    var webcamGrid = document.getElementById('webcam-grid');
    if (webcamGrid) {
        if (webcamStreams.length === 0) {
            webcamGrid.innerHTML = '<p style="color: var(--text-tertiary); padding: var(--spacing-4);">No webcam streams live right now</p>';
        } else {
            webcamGrid.innerHTML = webcamStreams.map(function(s) { return createWebcamCard(s); }).join('');
        }
    }

    // Render upcoming streams
    var upcomingContainer = document.getElementById('upcoming-streams-list');
    if (upcomingContainer) {
        var upcoming = state.streams.filter(function(s) { return !s.isLive && s.scheduled; });
        if (upcoming.length === 0) {
            upcomingContainer.innerHTML = '<p style="color: var(--text-tertiary);">No upcoming streams scheduled</p>';
        } else {
            upcomingContainer.innerHTML = upcoming.map(function(s) { return createStreamListItem(s); }).join('');
        }
    }
}

function switchStreamsTab(tab) {
    state.streamsTab = tab;
    document.querySelectorAll('.streams-tab').forEach(function(t) {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
    renderStreams();
}

function createStreamCard(stream) {
    return '\
        <div class="stream-card" onclick="watchStream(' + stream.id + ')">\
            <div class="stream-card-image">\
                <img src="' + stream.thumbnail + '" alt="' + stream.title + '">\
                <span class="stream-card-badge">LIVE</span>\
                <span class="stream-card-viewers"><i class="fas fa-eye"></i> ' + (stream.viewers / 1000).toFixed(1) + 'K</span>\
            </div>\
            <div class="stream-card-info">\
                <h4>' + stream.title + '</h4>\
                <p>' + stream.streamer.name + '</p>\
            </div>\
        </div>';
}

function createWebcamCard(stream) {
    var badgeHtml = '<span class="stream-card-badge adult-badge">18+</span>';
    var priceHtml = stream.pricePerMin ? '<span class="webcam-price">R' + stream.pricePerMin + '/min</span>' : '';

    return '\
        <div class="stream-card webcam-card" onclick="watchCamShow(' + stream.id + ')">\
            <div class="stream-card-image">\
                <img src="' + stream.thumbnail + '" alt="' + stream.title + '">\
                ' + badgeHtml + '\
                <span class="stream-card-viewers"><i class="fas fa-eye"></i> ' + (stream.viewers / 1000).toFixed(1) + 'K</span>\
                ' + priceHtml + '\
            </div>\
            <div class="stream-card-info">\
                <h4>' + stream.title + '</h4>\
                <p>' + stream.streamer.name + '</p>\
                <div class="webcam-meta">\
                    ' + (stream.isGroupShow ? '<span class="webcam-tag">Group</span>' : '') + '\
                    ' + (stream.isCouple ? '<span class="webcam-tag">Couple</span>' : '') + '\
                    ' + (stream.ageVerified ? '<span class="webcam-tag verified">Verified</span>' : '') + '\
                </div>\
            </div>\
        </div>';
}

function createStreamListItem(stream) {
    var scheduledDate = new Date(stream.scheduled);
    var dateStr = scheduledDate.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' });
    var timeStr = scheduledDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

    return '\
        <div class="stream-list-item" onclick="remindForStream(' + stream.id + ')">\
            <img src="' + stream.thumbnail + '" alt="' + stream.title + '">\
            <div class="stream-list-info">\
                <h4>' + stream.title + '</h4>\
                <p>' + stream.streamer.name + '</p>\
                <div class="stream-list-meta">\
                    <span><i class="fas fa-calendar"></i> ' + dateStr + '</span>\
                    <span><i class="fas fa-clock"></i> ' + timeStr + '</span>\
                </div>\
            </div>\
            <button class="btn btn-sm btn-outline">\
                <i class="fas fa-bell"></i> Remind\
            </button>\
        </div>';
}

function watchStream(streamId) {
    var stream = state.streams.find(function(s) { return s.id === streamId; });
    if (stream) {
        showToast('Watching: ' + stream.title + ' 📺');
    }
}

function watchCamShow(streamId) {
    var stream = state.streams.find(function(s) { return s.id === streamId; });
    if (!stream) return;

    if (stream.isAdult) {
        var modal = document.getElementById('age-verify-modal');
        if (modal) {
            state.pendingCamStream = stream;
            modal.style.display = 'flex';
        }
        return;
    }
    showToast('Watching: ' + stream.title + ' 📹');
}

function confirmAdult() {
    closeAgeVerifyModal();
    var stream = state.pendingCamStream;
    if (stream) {
        state.pendingCamStream = null;
        showToast('Joined ' + stream.streamer.name + '\'s cam show 🔞');
    }
}

function closeAgeVerifyModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('age-verify-modal');
        if (modal) modal.style.display = 'none';
        state.pendingCamStream = null;
    }
}

function startStream() {
    if (!state.currentUser) {
        showToast('Please login to start streaming 🔐');
        showLogin();
        return;
    }
    showToast('Starting your live stream... 📹');
}

function showCamHostModal() {
    if (!state.currentUser) {
        showToast('Please login to host a cam show 🔐');
        showLogin();
        return;
    }
    var modal = document.getElementById('cam-host-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCamHostModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('cam-host-modal');
        if (modal) modal.style.display = 'none';
    }
}

function startCamShow() {
    var title = document.getElementById('cam-show-title').value.trim();
    var type = document.getElementById('cam-show-type').value;
    var price = document.getElementById('cam-price').value;
    var description = document.getElementById('cam-description').value.trim();

    if (!title) {
        showToast('Please enter a show title');
        return;
    }

    closeCamHostModal();
    document.getElementById('cam-show-title').value = '';
    document.getElementById('cam-description').value = '';

    var newStream = {
        id: Date.now(),
        title: title + (type === 'private' ? ' 🔒' : type === 'group' ? ' 👥' : ''),
        streamer: {
            id: state.currentUser.id || 999,
            name: state.currentUser.name || 'You',
            image: state.currentUser.image || 'https://picsum.photos/seed/default/100/100'
        },
        viewers: 0,
        likes: 0,
        category: 'Webcam',
        isLive: true,
        isAdult: true,
        pricePerMin: parseInt(price) || 15,
        ageVerified: document.getElementById('cam-age-verified').value === 'yes',
        isGroupShow: type === 'group',
        thumbnail: state.currentUser.image || 'https://picsum.photos/seed/default/400/300'
    };

    state.streams.unshift(newStream);
    StreamsDB.create({
        title: newStream.title,
        category: newStream.category,
        streamer_id: state.currentUser?.id || 'guest',
        is_live: true,
        viewers: 0,
        likes: 0
    });
    renderStreams();
    showToast('Your cam show is now live! 🎥');
}

function likeStream(streamId) {
    showToast('Stream liked! ❤️');
}

function remindForStream(streamId) {
    showToast('Reminder set! We\'ll notify you before the stream 🔔');
}

// ==================== CONTENT FUNCTIONS ====================
function renderContent() {
    const container = document.getElementById('content-grid');
    if (!container) return;

    let filtered = [...state.content];

    // Filter by tab
    if (state.contentTab === 'videos') {
        filtered = filtered.filter(c => c.type === 'video');
    } else if (state.contentTab === 'photos') {
        filtered = filtered.filter(c => c.type === 'photo');
    } else if (state.contentTab === 'popular') {
        filtered.sort((a, b) => b.likes - a.likes);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => b.date - a.date);

    container.innerHTML = filtered.map(item => createContentCard(item)).join('');
}

function createContentCard(item) {
    return `
        <div class="content-card" onclick="openContentDetail(${item.id})">
            <div class="content-card-media">
                <img src="${item.media}" alt="${item.caption}">
                <span class="content-card-type">${item.type === 'video' ? '🎬 Video' : '📸 Photo'}</span>
            </div>
            <div class="content-card-info">
                <p class="content-card-caption">${item.caption}</p>
                <div class="content-card-stats">
                    <span><i class="fas fa-heart"></i> ${item.likes}</span>
                    <span><i class="fas fa-eye"></i> ${item.views}</span>
                    <span><i class="fas fa-comment"></i> ${item.comments}</span>
                </div>
            </div>
        </div>
    `;
}

function switchContentTab(tab) {
    state.contentTab = tab;
    document.querySelectorAll('.content-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
    renderContent();
}

function showUploadContentModal() {
    if (!state.currentUser) {
        showToast('Please login to upload content 🔐');
        showLogin();
        return;
    }
    const modal = document.getElementById('upload-content-modal');
    if (modal) modal.style.display = 'flex';
}

function closeUploadContentModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('upload-content-modal');
        if (modal) modal.style.display = 'none';
    }
}

function uploadContent(event) {
    event.preventDefault();
    showToast('Content uploaded successfully! 🎉');
    closeUploadContentModal();
}

function openContentDetail(contentId) {
    const content = state.content.find(c => c.id === contentId);
    if (!content) return;

    currentContentId = contentId;
    
    // Initialize comments for this content if not exists
    if (!comments[currentContentId]) {
        comments[currentContentId] = [];
    }

    document.getElementById('content-detail-media').innerHTML = content.type === 'video'
        ? `<video src="${content.media}" controls></video>`
        : `<img src="${content.media}" alt="${content.caption}">`;

    document.getElementById('content-creator-img').src = content.creator.image;
    document.getElementById('content-creator-name').textContent = content.creator.name;
    document.getElementById('content-creator-type').textContent = content.creator.type;
    document.getElementById('content-caption').textContent = content.caption;
    document.getElementById('content-likes').innerHTML = `<i class="fas fa-heart"></i> ${content.likes}`;
    document.getElementById('content-views').innerHTML = `<i class="fas fa-eye"></i> ${content.views}`;
    document.getElementById('content-comments').innerHTML = `<i class="fas fa-comment"></i> ${content.comments}`;

    // Hide comment section by default
    const commentSection = document.querySelector('.comment-section');
    if (commentSection) {
        commentSection.style.display = 'none';
    }

    const modal = document.getElementById('content-detail-modal');
    if (modal) modal.style.display = 'flex';
}

function closeContentDetail(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('content-detail-modal');
        if (modal) modal.style.display = 'none';
    }
}

function likeContent() { showToast('Content liked! ❤️'); }
function shareContent() { showToast('Content shared! 📤'); }
function followCreator() { showToast('Following creator! ✓'); }

// ==================== COMMENT FUNCTIONS ====================
let currentContentId = null;
let comments = {}; // Store comments by content ID

function showCommentBox() {
    const commentSection = document.querySelector('.comment-section');
    if (commentSection) {
        commentSection.style.display = 'block';
        const textarea = document.getElementById('comment-textarea');
        if (textarea) {
            textarea.value = '';
            textarea.focus();
        }
        renderComments();
    }
}

function hideCommentBox() {
    const commentSection = document.querySelector('.comment-section');
    if (commentSection) {
        commentSection.style.display = 'none';
    }
}

function submitComment() {
    const textarea = document.getElementById('comment-textarea');
    const commentText = textarea?.value.trim();
    
    if (!commentText) {
        showToast('Please write a comment first! ✏️');
        return;
    }
    
    // Get current user or use default
    const currentUser = state.currentUser || { name: 'You', image: 'https://i.pravatar.cc/200?u=You' };
    
    // Add comment
    if (!currentContentId) {
        currentContentId = Date.now();
    }
    
    if (!comments[currentContentId]) {
        comments[currentContentId] = [];
    }
    
    const newComment = {
        id: Date.now(),
        author: currentUser.name || 'Anonymous',
        avatar: currentUser.image || 'https://i.pravatar.cc/200?u=You',
        text: commentText,
        time: new Date(),
        likes: 0
    };
    
    comments[currentContentId].push(newComment);
    
    // Clear textarea
    if (textarea) {
        textarea.value = '';
    }
    
    // Re-render comments
    renderComments();
    
    // Update comment count
    updateCommentCount();
    
    showToast('Comment posted! ✓');
}

function renderComments() {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    const contentComments = comments[currentContentId] || [];
    
    if (contentComments.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-comments">
                <i class="fas fa-comments"></i>
                <p>No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = contentComments.map(comment => {
        const timeAgo = getTimeAgo(comment.time);
        return `
            <div class="comment-item">
                <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <p class="comment-text">${comment.text}</p>
                    <div class="comment-actions">
                        <span class="comment-action" onclick="likeComment(${comment.id})">
                            <i class="fas fa-heart"></i> ${comment.likes || 0}
                        </span>
                        <span class="comment-action">Reply</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateCommentCount() {
    const commentCountEl = document.getElementById('content-comments');
    if (commentCountEl) {
        const count = comments[currentContentId]?.length || 0;
        commentCountEl.innerHTML = `<i class="fas fa-comment"></i> ${count}`;
    }
}

function likeComment(commentId) {
    const comment = comments[currentContentId]?.find(c => c.id === commentId);
    if (comment) {
        comment.likes = (comment.likes || 0) + 1;
        renderComments();
        showToast('Comment liked! ❤️');
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ==================== FORUM FUNCTIONS ====================
let currentForumType = 'user'; // 'user' or 'provider'
let isAdmin = true; // Set to true to show admin panel (in real app, check user role)

function renderForum() {
    renderForumCategories();
    renderProviderForumCategories();
    renderForumPosts();
    renderProviderForumPosts();
    updateAdminPanel();
    
    // Show admin button if admin
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn && (isAdmin || state.currentUser?.isAdmin || state.currentUser?.role === 'admin')) {
        adminBtn.style.display = 'flex';
    }
}

function switchForumType(type) {
    currentForumType = type;
    
    // Update tabs
    document.querySelectorAll('.forum-type-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    // Show/hide sections
    const userSection = document.getElementById('user-forums-section');
    const providerSection = document.getElementById('provider-forums-section');
    
    if (type === 'user') {
        userSection.style.display = 'block';
        providerSection.style.display = 'none';
    } else {
        // Check if user has provider access
        if (!hasProviderAccess()) {
            showProviderAccessModal();
            // Switch back to user tab
            document.querySelectorAll('.forum-type-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.type === 'user');
            });
            userSection.style.display = 'block';
            providerSection.style.display = 'none';
            currentForumType = 'user';
            return;
        }
        userSection.style.display = 'none';
        providerSection.style.display = 'block';
    }
}

function hasProviderAccess() {
    // In real app, check user's subscription status
    // For demo, check if user is a provider or has purchased access
    // Admin has access to everything
    if (state.currentUser?.isAdmin || state.currentUser?.role === 'admin') return true;
    return state.currentUser?.accountType === 'provider' || state.currentUser?.hasProviderAccess;
}

function renderForumCategories() {
    const container = document.getElementById('forum-categories');
    if (!container) return;

    container.innerHTML = state.forumCategories.map(cat => `
        <div class="forum-category" onclick="filterForumByCategory('${cat.id}')">
            <div class="forum-category-icon" style="color: ${cat.color}">
                <i class="fas fa-${cat.icon}"></i>
            </div>
            <h4>${cat.name}</h4>
            <p>${cat.description}</p>
        </div>
    `).join('');
}

function renderProviderForumCategories() {
    const container = document.getElementById('provider-forum-categories');
    if (!container) return;

    container.innerHTML = state.providerForumCategories.map(cat => `
        <div class="forum-category" onclick="filterProviderForumByCategory('${cat.id}')">
            <div class="forum-category-icon" style="color: ${cat.color}">
                <i class="fas fa-${cat.icon}"></i>
            </div>
            <h4>${cat.name}</h4>
            <p>${cat.description}</p>
        </div>
    `).join('');
}

function renderForumPosts() {
    const container = document.getElementById('forum-posts');
    if (!container) return;

    // Only show approved user posts
    let filtered = state.forumPosts.filter(p => p.status === 'approved' && p.type === 'user');
    const sortBy = document.getElementById('forum-sort')?.value || 'latest';

    if (sortBy === 'latest') {
        filtered.sort((a, b) => b.date - a.date);
    } else if (sortBy === 'popular') {
        filtered.sort((a, b) => b.votes - a.votes);
    } else if (sortBy === 'unanswered') {
        filtered = filtered.filter(p => !p.isAnswered);
    }

    container.innerHTML = filtered.map(post => createForumPostItem(post)).join('');
}

function renderProviderForumPosts() {
    const container = document.getElementById('provider-forum-posts');
    if (!container) return;

    // Only show approved provider posts
    let filtered = state.providerForumPosts.filter(p => p.status === 'approved' && p.type === 'provider');
    const sortBy = document.getElementById('provider-forum-sort')?.value || 'latest';

    if (sortBy === 'latest') {
        filtered.sort((a, b) => b.date - a.date);
    } else if (sortBy === 'popular') {
        filtered.sort((a, b) => b.votes - a.votes);
    } else if (sortBy === 'unanswered') {
        filtered = filtered.filter(p => !p.isAnswered);
    }

    container.innerHTML = filtered.map(post => createProviderForumPostItem(post)).join('');
}

function createForumPostItem(post) {
    const category = state.forumCategories.find(c => c.id === post.category);
    const timeAgo = formatTimeAgo(post.date);

    return `
        <div class="forum-post-item" onclick="openForumPost(${post.id})">
            <div class="forum-post-votes">
                <span class="vote-count">${post.votes}</span>
                <span class="vote-label">votes</span>
            </div>
            <div class="forum-post-content">
                <div class="forum-post-header">
                    <div class="forum-post-author">
                        <img src="${post.author.image}" alt="${post.author.name}">
                        <span>${post.author.name}</span>
                    </div>
                    <span class="forum-post-category" style="background: ${category?.color}20; color: ${category?.color}">${category?.name}</span>
                    <span style="margin-left: auto; color: var(--text-tertiary); font-size: 0.75rem;">${timeAgo}</span>
                </div>
                <h4 class="forum-post-title">${post.title}</h4>
                <p class="forum-post-preview">${post.content.substring(0, 150)}...</p>
                <div class="forum-post-meta">
                    <span><i class="fas fa-comment"></i> ${post.replies} replies</span>
                    <span><i class="fas fa-eye"></i> ${post.views} views</span>
                    ${post.isAnswered ? '<span><i class="fas fa-check-circle" style="color: var(--success)"></i> Answered</span>' : ''}
                </div>
            </div>
        </div>
    `;
}

function createProviderForumPostItem(post) {
    const category = state.providerForumCategories.find(c => c.id === post.category);
    const timeAgo = formatTimeAgo(post.date);

    return `
        <div class="forum-post-item" onclick="openProviderForumPost(${post.id})">
            <div class="forum-post-votes">
                <span class="vote-count">${post.votes}</span>
                <span class="vote-label">votes</span>
            </div>
            <div class="forum-post-content">
                <div class="forum-post-header">
                    <div class="forum-post-author">
                        <img src="${post.author.image}" alt="${post.author.name}">
                        <span>${post.author.name}</span>
                        ${post.author.type === 'provider' ? '<span class="status-badge provider-only"><i class="fas fa-crown"></i> Provider</span>' : ''}
                    </div>
                    <span class="forum-post-category" style="background: ${category?.color}20; color: ${category?.color}">${category?.name}</span>
                    <span style="margin-left: auto; color: var(--text-tertiary); font-size: 0.75rem;">${timeAgo}</span>
                </div>
                <h4 class="forum-post-title">${post.title}</h4>
                <p class="forum-post-preview">${post.content.substring(0, 150)}...</p>
                <div class="forum-post-meta">
                    <span><i class="fas fa-comment"></i> ${post.replies} replies</span>
                    <span><i class="fas fa-eye"></i> ${post.views} views</span>
                    ${post.isAnswered ? '<span><i class="fas fa-check-circle" style="color: var(--success)"></i> Answered</span>' : ''}
                </div>
            </div>
        </div>
    `;
}

function filterForumByCategory(categoryId) {
    const container = document.getElementById('forum-posts');
    if (!container) return;

    const filtered = state.forumPosts.filter(p => p.category === categoryId && p.status === 'approved' && p.type === 'user');
    container.innerHTML = filtered.length === 0
        ? '<p style="color: var(--text-tertiary); padding: 2rem;">No posts in this category yet</p>'
        : filtered.map(post => createForumPostItem(post)).join('');
}

function filterProviderForumByCategory(categoryId) {
    const container = document.getElementById('provider-forum-posts');
    if (!container) return;

    const filtered = state.providerForumPosts.filter(p => p.category === categoryId && p.status === 'approved' && p.type === 'provider');
    container.innerHTML = filtered.length === 0
        ? '<p style="color: var(--text-tertiary); padding: 2rem;">No posts in this category yet</p>'
        : filtered.map(post => createProviderForumPostItem(post)).join('');
}

function openForumPost(postId) {
    const post = state.forumPosts.find(p => p.id === postId);
    if (post) {
        post.views++;
        showForumPostDetail(post, 'user');
    }
}

function openProviderForumPost(postId) {
    const post = state.providerForumPosts.find(p => p.id === postId);
    if (post) {
        post.views++;
        showForumPostDetail(post, 'provider');
    }
}

function showForumPostDetail(post, forumType) {
    // Create modal dynamically
    const modalHTML = `
        <div id="forum-post-detail-modal" class="modal-overlay" style="display: flex;" onclick="closeForumPostDetail(event)">
            <div class="modal-content forum-post-detail-content">
                <div class="modal-header">
                    <h2><i class="fas fa-${forumType === 'provider' ? 'crown' : 'users'}"></i> ${forumType === 'provider' ? 'Provider' : 'User'} Forum</h2>
                    <button class="modal-close" onclick="closeForumPostDetail()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="forum-post-detail">
                        <div class="forum-post-main">
                            <div class="forum-post-votes-large">
                                <button class="vote-btn ${hasUserVoted(post.id, 'up') ? 'voted' : ''}" onclick="votePost(${post.id}, 'up', '${forumType}')">
                                    <i class="fas fa-chevron-up"></i>
                                </button>
                                <span class="vote-count-large" id="vote-count-${post.id}">${post.votes}</span>
                                <button class="vote-btn ${hasUserVoted(post.id, 'down') ? 'voted' : ''}" onclick="votePost(${post.id}, 'down', '${forumType}')">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                            <div class="forum-post-detail-content">
                                <div class="forum-post-detail-header">
                                    <div class="forum-post-author">
                                        <img src="${post.author.image}" alt="${post.author.name}">
                                        <div class="forum-post-author-info">
                                            <span class="author-name">${post.author.name}</span>
                                            <span class="post-date">${formatTimeAgo(post.date)}</span>
                                        </div>
                                    </div>
                                    <span class="status-badge ${post.status}">${post.status}</span>
                                </div>
                                <h1 class="forum-post-detail-title">${post.title}</h1>
                                <div class="forum-post-detail-body">${post.content.replace(/\n/g, '<br>')}</div>
                                <div class="forum-post-stats">
                                    <span><i class="fas fa-eye"></i> ${post.views} views</span>
                                    <span><i class="fas fa-comment"></i> ${post.replies} replies</span>
                                    ${post.isAnswered ? '<span class="answered-badge"><i class="fas fa-check-circle"></i> Solved</span>' : ''}
                                </div>
                                <div class="forum-post-actions">
                                    <button class="btn btn-outline btn-sm" onclick="toggleEmojiPicker('post-${post.id}')">
                                        <i class="fas fa-smile"></i> React
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="shareForumPost(${post.id})">
                                        <i class="fas fa-share"></i> Share
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="reportPost(${post.id})">
                                        <i class="fas fa-flag"></i> Report
                                    </button>
                                </div>
                                <div id="emoji-picker-post-${post.id}" class="emoji-picker" style="display: none;">
                                    ${getEmojiPickerHTML('post', post.id)}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Replies Section -->
                        <div class="forum-replies-section">
                            <h3><i class="fas fa-comments"></i> Replies (${getRepliesCount(post.id)})</h3>
                            <div class="reply-input-box">
                                <textarea id="reply-content-${post.id}" placeholder="Write your reply..." rows="3"></textarea>
                                <div class="reply-input-actions">
                                    <button class="btn btn-sm btn-outline" onclick="toggleEmojiPicker('reply-${post.id}')">
                                        <i class="fas fa-smile"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="submitReply(${post.id}, '${forumType}')">
                                        <i class="fas fa-paper-plane"></i> Post Reply
                                    </button>
                                </div>
                                <div id="emoji-picker-reply-${post.id}" class="emoji-picker" style="display: none;">
                                    ${getEmojiPickerHTML('reply', post.id)}
                                </div>
                            </div>
                            <div class="replies-list" id="replies-list-${post.id}">
                                ${renderReplies(post.id)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('forum-post-detail-modal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeForumPostDetail(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('forum-post-detail-modal');
        if (modal) modal.remove();
    }
}

function getEmojiPickerHTML(type, id) {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];
    return `
        <div class="emoji-grid">
            ${emojis.map(emoji => `
                <button class="emoji-btn" onclick="addEmojiReaction('${type}', ${id}, '${emoji}')">${emoji}</button>
            `).join('')}
        </div>
    `;
}

function toggleEmojiPicker(id) {
    const picker = document.getElementById(`emoji-picker-${id}`);
    if (picker) {
        picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    }
}

function addEmojiReaction(type, id, emoji) {
    // Store reaction (in real app, send to server)
    showToast(`Reaction added: ${emoji}`);
    toggleEmojiPicker(`${type}-${id}`);
}

function getRepliesCount(postId) {
    return state.forumReplies[postId]?.length || 0;
}

function renderReplies(postId) {
    const replies = state.forumReplies[postId] || [];
    if (replies.length === 0) {
        return '<div class="no-replies"><p>No replies yet. Be the first to reply!</p></div>';
    }
    
    return replies.map(reply => `
        <div class="reply-item">
            <div class="reply-author">
                <img src="${reply.author.image}" alt="${reply.author.name}">
                <div class="reply-author-info">
                    <span class="reply-author-name">${reply.author.name}</span>
                    <span class="reply-date">${formatTimeAgo(reply.date)}</span>
                </div>
            </div>
            <div class="reply-content">${reply.content.replace(/\n/g, '<br>')}</div>
            <div class="reply-actions">
                <button class="btn btn-sm btn-ghost" onclick="addEmojiReaction('reply-${reply.id}', null, '👍')">
                    <i class="fas fa-thumbs-up"></i> ${reply.votes || 0}
                </button>
                <button class="btn btn-sm btn-ghost" onclick="replyToReply(${reply.id})">
                    <i class="fas fa-reply"></i> Reply
                </button>
            </div>
        </div>
    `).join('');
}

function submitReply(postId, forumType) {
    const textarea = document.getElementById(`reply-content-${postId}`);
    const content = textarea?.value.trim();
    
    if (!content) {
        showToast('Please write a reply first! ✏️');
        return;
    }
    
    const reply = {
        id: Date.now(),
        postId: postId,
        content: content,
        author: {
            id: state.currentUser?.id || 999,
            name: state.currentUser?.name || 'Anonymous',
            image: state.currentUser?.avatar || 'https://picsum.photos/seed/img47/400/300'
        },
        date: new Date(),
        votes: 0
    };
    
    if (!state.forumReplies[postId]) {
        state.forumReplies[postId] = [];
    }
    
    state.forumReplies[postId].push(reply);
    
    // Update post reply count
    const postArray = forumType === 'provider' ? state.providerForumPosts : state.forumPosts;
    const post = postArray.find(p => p.id === postId);
    if (post) {
        post.replies++;
    }
    
    textarea.value = '';
    document.getElementById(`replies-list-${postId}`).innerHTML = renderReplies(postId);
    showToast('Reply posted! ✓');
}

function votePost(postId, direction, forumType) {
    const voteKey = `${postId}_${direction}`;
    
    if (state.forumVotes[voteKey]) {
        // Remove vote
        state.forumVotes[voteKey] = false;
    } else {
        // Add vote (remove opposite vote first)
        const oppositeKey = `${postId}_${direction === 'up' ? 'down' : 'up'}`;
        state.forumVotes[oppositeKey] = false;
        state.forumVotes[voteKey] = true;
    }
    
    // Recalculate votes
    const upVote = state.forumVotes[`${postId}_up`] ? 1 : 0;
    const downVote = state.forumVotes[`${postId}_down`] ? 1 : 0;
    
    const postArray = forumType === 'provider' ? state.providerForumPosts : state.forumPosts;
    const post = postArray.find(p => p.id === postId);
    if (post) {
        post.votes = upVote - downVote;
        document.getElementById(`vote-count-${postId}`).textContent = post.votes;
    }
    
    // Update button states
    document.querySelectorAll(`#vote-count-${postId}`).forEach(btn => {
        btn.classList.toggle('voted', state.forumVotes[`${postId}_up`]);
    });
}

function hasUserVoted(postId, direction) {
    return !!state.forumVotes[`${postId}_${direction}`];
}

function shareForumPost(postId) {
    const post = state.forumPosts.find(p => p.id === postId) || state.providerForumPosts.find(p => p.id === postId);
    if (post) {
        const url = `${window.location.origin}/forum/post/${postId}`;
        navigator.clipboard?.writeText(url);
        showToast('Link copied to clipboard! 📋');
    }
}

function reportPost(postId) {
    const reason = prompt('Please enter the reason for reporting this post:');
    if (reason) {
        state.adminData.reports.push({
            id: Date.now(),
            type: 'post',
            postId: postId,
            reason: reason,
            date: new Date(),
            status: 'pending'
        });
        showToast('Report submitted. Thank you for helping keep our community safe! ✓');
    }
}

function replyToReply(replyId) {
    showToast('Reply to reply feature - coming soon! 🔜');
}

function showNewPostModal() {
    if (!state.currentUser) {
        showToast('Please login to create a post 🔐');
        showLogin();
        return;
    }
    
    // Check if trying to post in provider forum without access
    const providerRadio = document.querySelector('input[name="forum-type"][value="provider"]');
    if (providerRadio && providerRadio.checked && !hasProviderAccess()) {
        showToast('Provider forum access required 🔒');
        showProviderAccessModal();
        return;
    }
    
    updateCategoryOptions();
    
    const modal = document.getElementById('new-post-modal');
    if (modal) modal.style.display = 'flex';
}

function updateCategoryOptions() {
    const forumType = document.querySelector('input[name="forum-type"]:checked')?.value || 'user';
    const categorySelect = document.getElementById('post-category');
    
    if (!categorySelect) return;
    
    const categories = forumType === 'user' ? state.forumCategories : state.providerForumCategories;
    
    categorySelect.innerHTML = `
        <option value="">Select Category</option>
        ${categories.map(cat => `
            <option value="${cat.id}">${cat.name}</option>
        `).join('')}
    `;
}

function closeNewPostModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('new-post-modal');
        if (modal) modal.style.display = 'none';
    }
}

function createForumPost(event) {
    event.preventDefault();

    const category = document.getElementById('post-category').value;
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const forumType = document.querySelector('input[name="forum-type"]:checked')?.value || 'user';
    const tags = document.getElementById('post-tags')?.value.split(',').map(t => t.trim()).filter(t => t) || [];
    const anonymous = document.getElementById('post-anonymous')?.checked || false;

    const newPost = {
        id: Date.now(),
        category,
        title,
        content,
        tags,
        anonymous,
        author: anonymous ? {
            id: 'anonymous',
            name: 'Anonymous User',
            image: 'https://picsum.photos/seed/AnonymousUser/400/300'
        } : {
            id: state.currentUser?.id || 999,
            name: state.currentUser?.name || 'You',
            image: state.currentUser?.avatar || 'https://picsum.photos/seed/img47/400/300'
        },
        votes: 0,
        replies: 0,
        views: 0,
        date: new Date(),
        isAnswered: false,
        status: 'pending', // Requires admin approval
        type: forumType
    };

    // Add to appropriate array based on forum type
    if (forumType === 'provider') {
        state.providerForumPosts.unshift(newPost);
    } else {
        state.forumPosts.unshift(newPost);
    }
    ForumDB.createPost({
        category: newPost.category,
        title: newPost.title,
        content: newPost.content,
        author_id: state.currentUser?.id || 'guest',
        status: newPost.status || 'pending',
        post_type: forumType
    });

    pendingApprovalPosts.push(newPost);
    logActivity
    logActivity({
        type: ActivityType.FORUM_POST,
        action: `Created forum post: "${title.substring(0, 50)}..."`,
        details: {
            title: title,
            category: category,
            forumType: forumType,
            tags: tags,
            anonymous: anonymous
        }
    });

    closeNewPostModal();
    updateAdminPanel();

    // Show success message
    showToast('Post submitted for admin approval! ✓ You will be notified once it is approved.');
}

// ==================== ADMIN PANEL FUNCTIONS ====================
function showAdminPanel() {
    const modal = document.getElementById('admin-panel-modal');
    if (modal) {
        modal.style.display = 'flex';
        updateAdminPanel();
    }
}

function closeAdminPanel(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('admin-panel-modal');
        if (modal) modal.style.display = 'none';
    }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    event.target.closest('.admin-tab').classList.add('active');
    
    document.getElementById('pending-posts').style.display = tab === 'pending' ? 'block' : 'none';
    document.getElementById('approved-posts').style.display = tab === 'approved' ? 'block' : 'none';
    document.getElementById('rejected-posts').style.display = tab === 'rejected' ? 'block' : 'none';
}

function updateAdminPanel() {
    const pendingCount = pendingApprovalPosts.filter(p => p.status === 'pending').length;
    const countEl = document.getElementById('pending-count');
    if (countEl) {
        countEl.textContent = pendingCount;
        countEl.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
    
    renderAdminPosts('pending');
    renderAdminPosts('approved');
    renderAdminPosts('rejected');
}

function renderAdminPosts(status) {
    const container = document.getElementById(`${status}-posts`);
    if (!container) return;
    
    const filtered = pendingApprovalPosts.filter(p => p.status === status);
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-tertiary);">
            <i class="fas fa-${status === 'pending' ? 'clock' : status === 'approved' ? 'check-circle' : 'times-circle'}" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>No ${status} posts</p>
        </div>`;
        return;
    }
    
    container.innerHTML = filtered.map(post => `
        <div class="admin-post-item">
            <div class="admin-post-header">
                <div class="admin-post-info">
                    <h4>${post.title}</h4>
                    <p>by ${post.author.name} • ${formatTimeAgo(post.date)}</p>
                </div>
                ${status === 'pending' ? `
                <div class="admin-post-actions">
                    <button class="btn btn-sm btn-success" onclick="approvePost(${post.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectPost(${post.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
                ` : ''}
            </div>
            <div class="admin-post-full">
                <p>${post.content}</p>
                <div class="admin-post-meta">
                    <span><i class="fas fa-folder"></i> ${post.category}</span>
                    <span><i class="fas fa-user"></i> ${post.type === 'provider' ? 'Provider Forum' : 'User Forum'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== PROVIDER ACCESS FUNCTIONS ====================
function showProviderAccessModal() {
    const modal = document.getElementById('provider-access-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeProviderAccessModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('provider-access-modal');
        if (modal) modal.style.display = 'none';
    }
}

function purchaseProviderAccess(plan) {
    if (!state.currentUser) {
        state.currentUser = {
            id: 'provider_' + Date.now(),
            name: 'Service Provider',
            email: 'provider@koitus.app',
            age: 30,
            location: 'South Africa',
            accountType: 'provider',
            hasProviderAccess: true,
            isLoggedIn: true,
            avatar: 'https://i.pravatar.cc/80?u=provider',
            bio: 'Service Provider on Koitus — offering professional services to the community.',
            interests: ['Business', 'Networking', 'Professional Development'],
            photos: ['https://i.pravatar.cc/400?u=provider'],
            online: true,
            verified: true,
            profile: {
                providerType: 'general',
                bio: 'Service Provider on Koitus — offering professional services to the community.'
            }
        };
        state.isLoggedIn = true;
        saveUserData();
        showMainApp();
        updateNavVisibility();
        if (state.socket && state.socket.connected) joinPlatform();
    } else {
        state.currentUser.hasProviderAccess = true;
        state.currentUser.accountType = 'provider';
    }
    closeProviderAccessModal();
    switchView('discover');
    showToast('Provider access granted! ✓');
}

// ==================== STORE MANAGEMENT ====================
function initStoreData() {
    if (state.store.products.length === 0) {
        // Copy products from this vendor into store
        var vendorProducts = state.products.filter(function(p) {
            return p.seller && p.seller.id === (state.currentUser ? state.currentUser.id : null);
        });
        if (vendorProducts.length === 0 && state.products.length > 0) {
            // If no matching products, take first 3 as sample store products
            state.store.products = state.products.slice(0, 3).map(function(p) {
                return { ...p, status: 'active' };
            });
        } else {
            state.store.products = vendorProducts.map(function(p) {
                return { ...p, status: 'active' };
            });
        }
    }
    if (state.store.orders.length === 0) {
        state.store.orders = [
            { id: 1001, product: 'Luxury Lingerie Set', customer: 'Jessica', date: new Date(Date.now() - 1*86400000), amount: 850, status: 'pending', quantity: 1 },
            { id: 1002, product: 'Handmade Jewelry Collection', customer: 'Michael', date: new Date(Date.now() - 3*86400000), amount: 650, status: 'shipped', quantity: 2 },
            { id: 1003, product: 'Professional Photo Shoot', customer: 'Thando', date: new Date(Date.now() - 7*86400000), amount: 2500, status: 'delivered', quantity: 1 },
            { id: 1004, product: 'Custom Dance Choreography', customer: 'Zanele', date: new Date(Date.now() - 2*86400000), amount: 1500, status: 'pending', quantity: 1 },
            { id: 1005, product: 'Luxury Lingerie Set', customer: 'Priya', date: new Date(Date.now() - 10*86400000), amount: 850, status: 'delivered', quantity: 1 },
            { id: 1006, product: 'Handmade Jewelry Collection', customer: 'Sarah', date: new Date(Date.now() - 14*86400000), amount: 1300, status: 'cancelled', quantity: 2 }
        ];
    }
    if (state.store.earnings.length === 0) {
        state.store.earnings = [
            { id: 1, amount: 850, date: new Date(Date.now() - 1*86400000), source: 'Luxury Lingerie Set', type: 'sale' },
            { id: 2, amount: 1300, date: new Date(Date.now() - 3*86400000), source: 'Handmade Jewelry Collection', type: 'sale' },
            { id: 3, amount: 2500, date: new Date(Date.now() - 7*86400000), source: 'Professional Photo Shoot', type: 'sale' },
            { id: 4, amount: 1500, date: new Date(Date.now() - 2*86400000), source: 'Custom Dance Choreography', type: 'sale' },
            { id: 5, amount: 850, date: new Date(Date.now() - 10*86400000), source: 'Luxury Lingerie Set', type: 'sale' }
        ];
    }
    if (state.store.reviews.length === 0) {
        state.store.reviews = [
            { id: 1, customer: 'Jessica', rating: 5, text: 'Absolutely gorgeous! Fit perfectly and arrived quickly.', date: new Date(Date.now() - 2*86400000), product: 'Luxury Lingerie Set' },
            { id: 2, customer: 'Michael', rating: 4, text: 'Beautiful jewelry, great craftsmanship. Would buy again!', date: new Date(Date.now() - 4*86400000), product: 'Handmade Jewelry Collection' },
            { id: 3, customer: 'Thando', rating: 5, text: 'Sarah was amazing! The photos came out better than expected.', date: new Date(Date.now() - 8*86400000), product: 'Professional Photo Shoot' },
            { id: 4, customer: 'Zanele', rating: 3, text: 'Good but could have been better. Arrived a bit late.', date: new Date(Date.now() - 3*86400000), product: 'Custom Dance Choreography' }
        ];
    }
}

function renderStore() {
    if (!state.currentUser) {
        showToast('Please login to access your store');
        return;
    }
    initStoreData();
    updateStoreStats();
    renderStoreProducts();
    renderStoreOrders();
    renderStoreEarnings();
    renderStoreReviews();
    
    // Update nav visibility
    updateNavVisibility();
}

function updateNavVisibility() {
    if (!state.currentUser) return;

    var providerTypes = ['provider','creator','dancer','model','escort','promoter','studio','venue','club','vendor','seller','advertiser','webcammer'];
    var userType = state.currentUser.type || state.currentUser.accountType || '';
    var isProvider = providerTypes.indexOf(userType) > -1 || state.currentUser.accountType === 'provider';
    var isAdminUser = state.currentUser?.isAdmin || state.currentUser?.role === 'admin';
    var hasStore = userType === 'vendor' || userType === 'seller' || userType === 'provider' || isAdminUser;

    // Show/hide store nav item
    var navStore = document.getElementById('nav-store');
    if (navStore) {
        navStore.style.display = hasStore ? 'flex' : 'none';
    }

    // Show/hide provider portal nav item
    var navPortal = document.getElementById('nav-provider-portal');
    if (navPortal) {
        navPortal.style.display = (isProvider || isAdminUser) ? 'flex' : 'none';
    }
}

function updateStoreStats() {
    document.getElementById('store-total-products').textContent = state.store.products.length;
    document.getElementById('store-total-orders').textContent = state.store.orders.length;
    
    var totalEarnings = state.store.earnings.reduce(function(sum, e) { return sum + e.amount; }, 0);
    document.getElementById('store-total-earnings').textContent = 'R' + totalEarnings;
    
    var avgRating = state.store.reviews.length > 0
        ? (state.store.reviews.reduce(function(sum, r) { return sum + r.rating; }, 0) / state.store.reviews.length).toFixed(1)
        : '0.0';
    document.getElementById('store-avg-rating').textContent = avgRating;
    document.getElementById('store-orders-count').textContent = state.store.orders.filter(function(o) { return o.status === 'pending'; }).length;
}

function switchStoreTab(tab) {
    state.store.tab = tab;
    document.querySelectorAll('.store-tab').forEach(function(t) {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
    document.querySelectorAll('.store-tab-content').forEach(function(c) {
        c.style.display = 'none';
    });
    var target = document.getElementById('store-' + tab);
    if (target) target.style.display = 'block';
}

function renderStoreProducts() {
    var container = document.getElementById('store-products-list');
    if (!container) return;

    var filter = document.getElementById('store-product-filter');
    var filterVal = filter ? filter.value : 'all';
    var searchQuery = document.getElementById('store-search');
    var query = searchQuery ? searchQuery.value.toLowerCase() : '';

    var filtered = state.store.products.filter(function(p) {
        if (filterVal !== 'all' && p.status !== filterVal) return false;
        if (query && p.name.toLowerCase().indexOf(query) === -1) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '\
            <div class="store-empty">\
                <i class="fas fa-box-open"></i>\
                <h3>No Products Found</h3>\
                <p>Add your first product to start selling!</p>\
                <button class="btn btn-primary" onclick="showAddProductModal()">\
                    <i class="fas fa-plus"></i> Add Product\
                </button>\
            </div>';
        return;
    }

    container.innerHTML = filtered.map(function(p) {
        var statusColor = p.status === 'active' ? 'var(--success)' : p.status === 'draft' ? 'var(--text-muted)' : 'var(--error)';
        return '\
            <div class="store-product-item">\
                <div class="store-product-image">\
                    <img src="' + (p.images ? p.images[0] : 'https://picsum.photos/seed/' + p.id + '/100/100') + '" alt="' + p.name + '">\
                </div>\
                <div class="store-product-info">\
                    <h4>' + p.name + '</h4>\
                    <span class="store-product-category">' + p.category + '</span>\
                    <div class="store-product-meta">\
                        <span><i class="fas fa-shopping-cart"></i> ' + (p.sold || 0) + ' sold</span>\
                        <span><i class="fas fa-star"></i> ' + (p.rating || 0) + '</span>\
                        <span><i class="fas fa-box"></i> ' + (p.stock || 0) + ' in stock</span>\
                    </div>\
                </div>\
                <div class="store-product-price">\
                    <span class="price-current">R' + p.price + '</span>\
                    ' + (p.originalPrice ? '<span class="price-original">R' + p.originalPrice + '</span>' : '') + '\
                </div>\
                <div class="store-product-status" style="color:' + statusColor + '">' + (p.status || 'active') + '</div>\
                <div class="store-product-actions">\
                    <button class="btn btn-icon btn-sm" onclick="editStoreProduct(' + p.id + ')" title="Edit"><i class="fas fa-edit"></i></button>\
                    <button class="btn btn-icon btn-sm" onclick="deleteStoreProduct(' + p.id + ')" title="Delete" style="color:var(--error)"><i class="fas fa-trash"></i></button>\
                    <button class="btn btn-icon btn-sm" onclick="toggleProductStatus(' + p.id + ')" title="Toggle Status"><i class="fas ' + (p.status === 'active' ? 'fa-pause' : 'fa-play') + '"></i></button>\
                </div>\
            </div>';
    }).join('');
}

function searchStoreProducts() {
    renderStoreProducts();
}

function editStoreProduct(id) {
    var product = state.store.products.find(function(p) { return p.id === id; });
    if (!product) { showToast('Product not found'); return; }

    document.getElementById('edit-product-id').value = id;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-price').value = product.price || '';
    document.getElementById('product-original-price').value = product.originalPrice || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-stock').value = product.stock || 999;
    document.getElementById('product-featured').checked = !!product.isFeatured;

    document.getElementById('add-product-modal-title').textContent = 'Edit Product';
    document.getElementById('add-product-submit-btn').innerHTML = '<i class=\"fas fa-save\"></i> Save Changes';

    var modal = document.getElementById('add-product-modal');
    if (modal) modal.style.display = 'flex';
}

function deleteStoreProduct(id) {
    if (!confirm('Delete this product?')) return;
    state.store.products = state.store.products.filter(function(p) { return p.id !== id; });
    state.products = state.products.filter(function(p) { return p.id !== id; });
    renderStoreProducts();
    updateStoreStats();
    showToast('Product deleted');
}

function toggleProductStatus(id) {
    var product = state.store.products.find(function(p) { return p.id === id; });
    if (product) {
        product.status = product.status === 'active' ? 'draft' : 'active';
        renderStoreProducts();
    }
}

function renderStoreOrders() {
    var container = document.getElementById('store-orders-list');
    if (!container) return;

    var filter = state.store.orderFilter || 'all';
    var filtered = filter === 'all' ? state.store.orders : state.store.orders.filter(function(o) { return o.status === filter; });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="store-empty"><i class="fas fa-truck"></i><h3>No Orders</h3><p>' + (filter === 'all' ? 'You haven\'t received any orders yet' : 'No ' + filter + ' orders') + '</p></div>';
        return;
    }

    container.innerHTML = filtered.map(function(o) {
        var statusColor = o.status === 'delivered' ? 'var(--success)' : o.status === 'shipped' ? '#3b82f6' : o.status === 'cancelled' ? 'var(--error)' : '#f59e0b';
        return '\
            <div class="store-order-item">\
                <div class="store-order-header">\
                    <span class="store-order-id">#' + o.id + '</span>\
                    <span class="store-order-status" style="color:' + statusColor + '">' + o.status.charAt(0).toUpperCase() + o.status.slice(1) + '</span>\
                </div>\
                <div class="store-order-body">\
                    <div class="store-order-product">' + o.product + '</div>\
                    <div class="store-order-customer"><i class="fas fa-user"></i> ' + o.customer + '</div>\
                    <div class="store-order-qty">Qty: ' + o.quantity + '</div>\
                    <div class="store-order-amount">R' + (o.amount * o.quantity) + '</div>\
                    <div class="store-order-date">' + o.date.toLocaleDateString() + '</div>\
                </div>\
                <div class="store-order-actions">\
                    ' + (o.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="updateOrderStatus(' + o.id + ',\'shipped\')"><i class="fas fa-shipping-fast"></i> Ship</button>' : '') + '\
                    ' + (o.status === 'shipped' ? '<button class="btn btn-sm btn-primary" onclick="updateOrderStatus(' + o.id + ',\'delivered\')"><i class="fas fa-check"></i> Confirm Delivery</button>' : '') + '\
                    ' + (o.status === 'pending' ? '<button class="btn btn-sm btn-ghost" onclick="updateOrderStatus(' + o.id + ',\'cancelled\')" style="color:var(--error)"><i class="fas fa-times"></i></button>' : '') + '\
                </div>\
            </div>';
    }).join('');
}

function filterStoreOrders(filter) {
    state.store.orderFilter = filter;
    document.querySelectorAll('.order-filter-btn').forEach(function(b) {
        b.classList.remove('active');
        if (b.dataset.filter === filter) b.classList.add('active');
    });
    renderStoreOrders();
}

function updateOrderStatus(orderId, newStatus) {
    var order = state.store.orders.find(function(o) { return o.id === orderId; });
    if (order) {
        order.status = newStatus;
        renderStoreOrders();
        updateStoreStats();
        showToast('Order updated to ' + newStatus + ' ✓');
    }
}

function renderStoreEarnings() {
    var earnings = state.store.earnings;
    
    var today = earnings.filter(function(e) {
        return e.date.toDateString() === new Date().toDateString();
    }).reduce(function(s, e) { return s + e.amount; }, 0);
    
    var weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var thisWeek = earnings.filter(function(e) {
        return e.date >= weekStart;
    }).reduce(function(s, e) { return s + e.amount; }, 0);
    
    var monthStart = new Date();
    monthStart.setDate(1);
    var thisMonth = earnings.filter(function(e) {
        return e.date >= monthStart;
    }).reduce(function(s, e) { return s + e.amount; }, 0);
    
    var total = earnings.reduce(function(s, e) { return s + e.amount; }, 0);
    
    document.getElementById('earnings-today').textContent = 'R' + today;
    document.getElementById('earnings-week').textContent = 'R' + thisWeek;
    document.getElementById('earnings-month').textContent = 'R' + thisMonth;
    document.getElementById('earnings-total').textContent = 'R' + total;
    
    var listContainer = document.getElementById('earnings-transactions');
    if (listContainer) {
        if (earnings.length === 0) {
            listContainer.innerHTML = '<div class="store-empty"><i class="fas fa-chart-line"></i><h3>No Earnings Yet</h3></div>';
        } else {
            listContainer.innerHTML = earnings.sort(function(a, b) { return b.date - a.date; }).map(function(e) {
                return '\
                    <div class="earnings-transaction">\
                        <div class="earnings-tx-icon"><i class="fas fa-arrow-down" style="color:var(--success)"></i></div>\
                        <div class="earnings-tx-info">\
                            <span class="earnings-tx-source">' + e.source + '</span>\
                            <span class="earnings-tx-date">' + e.date.toLocaleDateString() + '</span>\
                        </div>\
                        <span class="earnings-tx-amount" style="color:var(--success)">+R' + e.amount + '</span>\
                    </div>';
            }).join('');
        }
    }
}

function renderStoreReviews() {
    var container = document.getElementById('store-reviews-list');
    if (!container) return;
    
    if (state.store.reviews.length === 0) {
        container.innerHTML = '<div class="store-empty"><i class="fas fa-comments"></i><h3>No Reviews Yet</h3></div>';
        return;
    }
    
    container.innerHTML = state.store.reviews.map(function(r) {
        var stars = '';
        for (var i = 0; i < 5; i++) {
            stars += '<i class="fas fa-star" style="color:' + (i < r.rating ? '#f59e0b' : 'var(--border-light)') + '"></i>';
        }
        return '\
            <div class="store-review-item">\
                <div class="store-review-header">\
                    <strong>' + r.customer + '</strong>\
                    <span class="store-review-stars">' + stars + '</span>\
                    <span class="store-review-date">' + r.date.toLocaleDateString() + '</span>\
                </div>\
                <p class="store-review-product">on <em>' + r.product + '</em></p>\
                <p class="store-review-text">"' + r.text + '"</p>\
            </div>';
    }).join('');
}

// ==================== PRODUCTS FUNCTIONS ====================
function renderProducts() {
    const container = document.getElementById('products-grid');
    const emptyState = document.getElementById('products-empty-state');
    if (!container) return;

    let filtered = [...state.products];

    // Filter by tab
    if (state.productsTab === 'featured') {
        filtered = filtered.filter(p => p.isFeatured);
    } else if (state.productsTab === 'services') {
        filtered = filtered.filter(p => ['photography', 'dance', 'fitness', 'events'].includes(p.category));
    } else if (state.productsTab === 'digital') {
        filtered = filtered.filter(p => ['music', 'photography'].includes(p.category));
    }

    // Filter by category
    const categoryFilter = document.getElementById('product-category-filter')?.value || 'all';
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Filter by price
    const priceFilter = document.getElementById('product-price-filter')?.value || 'all';
    if (priceFilter !== 'all') {
        filtered = filtered.filter(p => {
            if (priceFilter === '0-500') return p.price < 500;
            if (priceFilter === '500-1000') return p.price >= 500 && p.price < 1000;
            if (priceFilter === '1000-2000') return p.price >= 1000 && p.price < 2000;
            if (priceFilter === '2000+') return p.price >= 2000;
            return true;
        });
    }

    // Sort
    const sortFilter = document.getElementById('product-sort-filter')?.value || 'featured';
    if (sortFilter === 'featured') {
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    } else if (sortFilter === 'newest') {
        filtered.sort((a, b) => b.date - a.date);
    } else if (sortFilter === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortFilter === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortFilter === 'popular') {
        filtered.sort((a, b) => b.sold - a.sold);
    }

    if (filtered.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        container.style.display = 'grid';
        emptyState.style.display = 'none';
        container.innerHTML = filtered.map(product => createProductCard(product)).join('');
    }
}

function createProductCard(product) {
    const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

    return `
        <div class="product-card" onclick="openProductDetail(${product.id})">
            <div class="product-card-image">
                <img src="${product.images[0]}" alt="${product.name}">
                ${product.isFeatured ? '<span class="product-card-badge">Featured</span>' : ''}
                <span class="product-card-sold">${product.sold} sold</span>
            </div>
            <div class="product-card-info">
                <div class="product-card-seller">
                    <img src="${product.seller.image}" alt="${product.seller.name}">
                    <span>${product.seller.name}</span>
                </div>
                <h4 class="product-card-name">${product.name}</h4>
                <div class="product-card-price">
                    <span class="current">R${product.price}</span>
                    ${product.originalPrice ? `<span class="original">R${product.originalPrice}</span>` : ''}
                    ${discount > 0 ? `<span style="color: var(--error); font-size: 0.75rem;">-${discount}%</span>` : ''}
                </div>
                <div class="product-card-stats">
                    <span><i class="fas fa-star" style="color: #f59e0b"></i> ${product.rating}</span>
                    <span><i class="fas fa-comment"></i> ${product.reviews}</span>
                    ${product.stock < 20 && product.stock !== 999 ? `<span style="color: var(--error);"><i class="fas fa-exclamation"></i> Low stock</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function switchProductsTab(tab) {
    state.productsTab = tab;
    document.querySelectorAll('.products-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
    renderProducts();
}

function toggleProductFilters() {
    const filters = document.getElementById('product-filters');
    if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'grid' : 'none';
    }
}

function showAddProductModal() {
    if (!state.currentUser) {
        showToast('Please login to sell products 🔐');
        showLogin();
        return;
    }
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAddProductModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('add-product-modal');
        if (modal) modal.style.display = 'none';
    }
    document.getElementById('edit-product-id').value = '';
    document.getElementById('add-product-modal-title').textContent = 'Sell a Product';
    document.getElementById('add-product-submit-btn').innerHTML = '<i class="fas fa-plus"></i> List Product';
}

function addProduct(event) {
    event.preventDefault();

    const editId = document.getElementById('edit-product-id').value;
    const name = document.getElementById('product-name').value;
    const category = document.getElementById('product-category').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const originalPrice = parseFloat(document.getElementById('product-original-price').value) || null;
    const description = document.getElementById('product-description').value;
    const stock = parseInt(document.getElementById('product-stock').value) || 999;
    const isFeatured = document.getElementById('product-featured').checked;

    if (editId) {
        var existing = state.store.products.find(function(p) { return p.id === parseInt(editId); });
        if (existing) {
            existing.name = name;
            existing.category = category;
            existing.price = price;
            existing.originalPrice = originalPrice;
            existing.description = description;
            existing.stock = stock;
            existing.isFeatured = isFeatured;
        }
        var globalProduct = state.products.find(function(p) { return p.id === parseInt(editId); });
        if (globalProduct) {
            globalProduct.name = name;
            globalProduct.category = category;
            globalProduct.price = price;
            globalProduct.originalPrice = originalPrice;
            globalProduct.description = description;
            globalProduct.stock = stock;
            globalProduct.isFeatured = isFeatured;
        }
        closeAddProductModal();
        renderStoreProducts();
        renderProducts();
        showToast('Product updated successfully! ✏️');
        return;
    }

    const newProduct = {
        id: Date.now(),
        name,
        category,
        price,
        originalPrice,
        description,
        stock,
        isFeatured,
        seller: {
            id: state.currentUser.id,
            name: state.currentUser.name,
            image: state.currentUser.avatar || 'https://picsum.photos/seed/img47/400/300'
        },
        images: ['https://picsum.photos/seed/img50/400/300'],
        rating: 0,
        reviews: 0,
        sold: 0,
        date: new Date()
    };

    state.products.unshift(newProduct);
    state.store.products.unshift(newProduct);
    ProductDB.create({
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        category: newProduct.category,
        image: newProduct.images?.[0] || '',
        seller_id: state.currentUser?.id || 'guest',
        is_featured: newProduct.isFeatured || false,
        status: 'active'
    });
    renderProducts();
    renderStoreProducts();
    updateStoreStats();
    closeAddProductModal();
    showToast('Product listed successfully! 📦');
}

function openProductDetail(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    state.selectedProduct = product;

    document.getElementById('detail-product-image').src = product.images[0];
    document.getElementById('detail-product-badge').style.display = product.isFeatured ? 'block' : 'none';
    document.getElementById('detail-seller-image').src = product.seller.image;
    document.getElementById('detail-seller-name').textContent = product.seller.name;
    document.getElementById('detail-seller-rating').innerHTML = `<i class="fas fa-star"></i> ${product.rating} (${product.reviews} reviews)`;
    document.getElementById('detail-product-name').textContent = product.name;
    document.getElementById('detail-product-price').textContent = `R${product.price}`;
    if (product.originalPrice) {
        document.getElementById('detail-product-original-price').textContent = `R${product.originalPrice}`;
        document.getElementById('detail-product-original-price').style.display = 'inline';
    } else {
        document.getElementById('detail-product-original-price').style.display = 'none';
    }
    document.getElementById('detail-product-rating').textContent = `${product.rating} (${product.reviews} reviews)`;
    document.getElementById('detail-product-sold').textContent = product.sold;
    document.getElementById('detail-product-stock').textContent = product.stock === 999 ? 'Unlimited' : `${product.stock} left`;
    document.getElementById('detail-product-description').textContent = product.description;

    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'flex';
}

function closeProductDetail(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('product-detail-modal');
        if (modal) modal.style.display = 'none';
    }
}

function purchaseProduct() {
    const product = state.selectedProduct;
    if (!product) return;

    if (!state.currentUser) {
        showToast('Please login to purchase 🔐');
        showLogin();
        return;
    }

    if (state.wallet.balance < product.price) {
        showToast('Insufficient wallet balance. Please deposit funds. 💰');
        showDepositModal();
        return;
    }

    if (confirm(`Purchase ${product.name} for R${product.price}?`)) {
        state.wallet.balance -= product.price;
        product.sold++;
        if (product.stock !== 999) product.stock--;

        state.wallet.transactions.unshift({
            id: Date.now(),
            type: 'purchase',
            amount: -product.price,
            description: `Purchased: ${product.name}`,
            date: new Date(),
            status: 'completed'
        });

        closeProductDetail();
        renderProducts();
        renderWallet();
        showToast(`Purchase successful! 🛍️`);
    }
}

function addToWishlist() {
    showToast('Added to wishlist! ❤️');
}

function shareProduct() {
    const product = state.selectedProduct;
    if (product) {
        navigator.clipboard.writeText(`Check out: ${product.name} - R${product.price} on Koitus Marketplace!`);
        showToast('Product link copied! 📋');
    }
}

function contactSeller() {
    const product = state.selectedProduct;
    if (product) {
        showToast(`Opening chat with ${product.seller.name}... 💬`);
    }
}

// ==================== FUN & GAMES ====================
function renderGames() {
    // Games are rendered as static HTML in index.html
}

// ==================== FANTASY REQUESTS ====================
function showFantasyRequestForm() {
    var modal = document.getElementById('fantasy-request-modal');
    if (modal) modal.style.display = 'flex';
}

function closeFantasyRequestModal(e) {
    if (e && e.target !== e.currentTarget) return;
    var modal = document.getElementById('fantasy-request-modal');
    if (modal) modal.style.display = 'none';
}

function submitFantasyRequest(e) {
    e.preventDefault();
    var type = document.getElementById('fantasy-type').value;
    var title = document.getElementById('fantasy-title').value.trim();
    var description = document.getElementById('fantasy-description').value.trim();
    var details = document.getElementById('fantasy-details').value.trim();
    
    if (!type || !title || !description) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    var request = {
        id: 'fr-' + Date.now(),
        type: type,
        title: title,
        description: description,
        details: details,
        user: state.currentUser ? state.currentUser.name : 'Anonymous',
        userId: state.currentUser ? state.currentUser.id : null,
        date: new Date().toISOString(),
        status: 'pending'
    };
    
    if (!state.adminData.fantasyRequests) {
        state.adminData.fantasyRequests = [];
    }
    state.adminData.fantasyRequests.unshift(request);
    
    // Also add to recharge requests for admin visibility
    if (!state.adminData.rechargeRequests) state.adminData.rechargeRequests = [];
    state.adminData.rechargeRequests.unshift({
        id: 'fr-notif-' + Date.now(),
        type: 'fantasy',
        request: request,
        date: new Date(),
        status: 'pending'
    });
    
    document.getElementById('fantasy-type').value = '';
    document.getElementById('fantasy-title').value = '';
    document.getElementById('fantasy-description').value = '';
    document.getElementById('fantasy-details').value = '';
    
    closeFantasyRequestModal();
    showToast('Your fantasy request has been sent to the admin team! ✨');
}

// ==================== STORIES ====================
function renderStories() {
    var container = document.getElementById('stories-container');
    if (!container) return;
    
    var stories = state.stories || [];
    
    if (stories.length === 0) {
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
    
    container.innerHTML = '\
        <div class="stories-categories scroll-x">\
            <button class="story-cat-btn active" onclick="filterStories(\'all\')">All</button>\
            <button class="story-cat-btn" onclick="filterStories(\'ebook\')">E-Books</button>\
            <button class="story-cat-btn" onclick="filterStories(\'story\')">Stories</button>\
            <button class="story-cat-btn" onclick="filterStories(\'poem\')">Poems</button>\
            <button class="story-cat-btn" onclick="filterStories(\'blog\')">Blog Posts</button>\
            <button class="story-cat-btn" onclick="filterStories(\'article\')">Articles</button>\
            <button class="story-cat-btn" onclick="filterStories(\'puff\')">Puff Pieces</button>\
            <button class="story-cat-btn" onclick="filterStories(\'pdf\')">PDFs</button>\
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

function filterStories(category) {
    state.storiesFilter = category;
    document.querySelectorAll('.story-cat-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === category || 
            (category === 'all' && btn.textContent === 'All'));
    });
    renderStories();
}

function openStory(storyId) {
    var story = state.stories ? state.stories.find(function(s) { return s.id === storyId; }) : null;
    if (!story) {
        showToast('Story not found');
        return;
    }
    state.selectedStory = story;
    var container = document.getElementById('stories-container');
    if (!container) return;
    container.innerHTML = '\
        <button class="btn btn-ghost" onclick="renderStories()" style="margin-bottom:var(--spacing-4)">\
            <i class="fas fa-arrow-left"></i> Back\
        </button>\
        <div class="story-detail">\
            <div class="story-detail-header">\
                <span class="story-type-badge">' + story.type + '</span>\
                <h1>' + story.title + '</h1>\
                <div class="story-meta">\
                    <span><i class="fas fa-user"></i> ' + story.author + '</span>\
                    <span><i class="fas fa-calendar"></i> ' + story.date + '</span>\
                    <span><i class="fas fa-heart"></i> ' + (story.likes || 0) + ' likes</span>\
                </div>\
            </div>\
            <div class="story-detail-image">\
                <img src="' + (story.image || "https://picsum.photos/seed/" + story.id + "/800/400") + '" alt="' + story.title + '">\
            </div>\
            <div class="story-detail-content">' + story.content + '</div>\
            <div class="story-actions">\
                <button class="btn btn-primary" onclick="likeStory(\'' + story.id + '\')">\
                    <i class="fas fa-heart"></i> Like (' + (story.likes || 0) + ')\
                </button>\
                <button class="btn btn-ghost" onclick="showToast(\'Share coming soon!\')">\
                    <i class="fas fa-share"></i> Share\
                </button>\
            </div>\
        </div>';
}

function likeStory(storyId) {
    var story = state.stories ? state.stories.find(function(s) { return s.id === storyId; }) : null;
    if (story) {
        story.likes = (story.likes || 0) + 1;
        openStory(storyId);
    }
}

function showCreateStoryModal() {
    showToast('Story creation coming soon!');
}

// ==================== EMOJI SYSTEM FOR CHAT ====================
const emojiList = ['😀', '😁', '😂', '🤣', '😍', '😘', '😜', '🤪', '😎', '🤗', '🤭', '😇', '🤔', '😏', '😴', '🤤', '😋', '🙄', '😤', '😡', '🤬', '😢', '😭', '😨', '😱', '👍', '👎', '👏', '🙌', '👋', '🤝', '❤️', '🔥', '✨', '🎉', '💯', '💕', '💔', '💋', '🌹', '🍾', '🍷', '🍺', '🎵', '🚗', '🏠', '💰', '🎁', '📍', '⭐', '🥰', '😳', '😅', '🤩', '😈', '👻', '💀', '🎃', '🌈', '🌻', '🍀', '🎯', '🏆', '🥇', '🎮', '💎', '🔮', '📸', '☕', '🍕'];

function parseEmoji(text) {
    return text;
}

function toggleChatEmojiPicker() {
    const picker = document.getElementById('chat-emoji-picker');
    if (picker) {
        const isVisible = picker.style.display === 'block';
        picker.style.display = isVisible ? 'none' : 'block';
        if (isVisible) {
            clearEmojiPickerTimer();
        } else {
            startEmojiPickerTimer();
        }
    }
}

function startEmojiPickerTimer() {
    clearEmojiPickerTimer();
    state.emojiPickerTimer = setTimeout(function() {
        var picker = document.getElementById('chat-emoji-picker');
        if (picker && picker.style.display === 'block') {
            picker.style.display = 'none';
        }
    }, 10000);
}

function clearEmojiPickerTimer() {
    if (state.emojiPickerTimer) {
        clearTimeout(state.emojiPickerTimer);
        state.emojiPickerTimer = null;
    }
}

function initChatEmojiPicker() {
    const picker = document.getElementById('chat-emoji-picker');
    if (!picker) return;
    
    let html = '<div class="emoji-picker-content"><div class="emoji-grid">';
    emojiList.forEach(emoji => {
        const parsed = parseEmoji(emoji);
        html += `<button class="emoji-btn" onclick="insertEmoji('${emoji}')">${parsed}</button>`;
    });
    html += '</div></div>';
    picker.innerHTML = html;
}

function insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    if (input) {
        input.value += emoji;
        input.focus();
    }
    clearEmojiPickerTimer();
    const picker = document.getElementById('chat-emoji-picker');
    if (picker) picker.style.display = 'none';
}

var pricingAnnual = false;

function togglePricingPeriod() {
    pricingAnnual = !pricingAnnual;
    var btn = document.getElementById('pricing-toggle-btn');
    if (btn) {
        btn.innerHTML = pricingAnnual
            ? '<i class="fas fa-calendar-alt"></i> Switch to Monthly'
            : '<i class="fas fa-calendar-alt"></i> Switch to Annual';
    }
    renderPricing();
}

function renderPricing() {
    var container = document.getElementById('pricing-container');
    if (!container) return;

    var priceSuffix = pricingAnnual ? '/yr' : '/mo';

    function planCard(plan) {
        var priceVal = pricingAnnual ? plan.annualPrice : plan.price;
        var displayPrice = priceVal === 0 ? 'Free' : 'R' + priceVal;
        return '\
            <div class="pricing-card' + (plan.highlight ? ' pricing-card-highlighted' : '') + '">\
                ' + (plan.highlight ? '<div class="pricing-badge">Most Popular</div>' : '') + '\
                <div class="pricing-card-header">\
                    <div class="pricing-icon" style="background:' + plan.color + '20;color:' + plan.color + '">\
                        <i class="fas ' + plan.icon + '"></i>\
                    </div>\
                    <h3>' + plan.name + '</h3>\
                    <div class="pricing-amount">\
                        <span class="pricing-price">' + displayPrice + '</span>\
                        <span class="pricing-period">' + (priceVal === 0 ? '' : priceSuffix) + '</span>\
                    </div>\
                </div>\
                <div class="pricing-features">\
                    ' + plan.features.map(function(f) {
                        return '<div class="pricing-feature"><i class="fas fa-check"></i> ' + f + '</div>';
                    }).join('') + '\
                </div>\
                <button class="btn ' + plan.ctaClass + ' btn-block" onclick="showToast(\'' + plan.name + ' upgrade coming soon!\')">\
                    ' + plan.cta + '\
                </button>\
            </div>';
    }

    var html = '';

    // Users section
    html += '<div class="pricing-section-header"><h2><i class="fas fa-user"></i> Users</h2><p>Plans for browsing, connecting, and dating</p></div>';
    html += '<div class="pricing-grid">';
    var userPlans = [
        {
            name: 'Free', price: 0, annualPrice: 0, icon: 'fa-user', color: '#6b7280',
            features: ['Basic profile', 'Browse users', 'Send 10 messages/day', 'Standard matching'],
            cta: 'Current Plan', ctaClass: 'btn-outline', highlight: false
        },
        {
            name: 'Premium', price: 149, annualPrice: 1199, icon: 'fa-crown', color: '#f59e0b',
            features: ['Unlimited messages', 'Advanced filters', 'See who liked you', 'Read receipts', 'Ad-free experience', 'Priority support'],
            cta: 'Get Premium', ctaClass: 'btn-primary', highlight: true
        },
        {
            name: 'VIP', price: 449, annualPrice: 3999, icon: 'fa-gem', color: '#8b5cf6',
            features: ['Everything in Premium', 'Profile boost', 'Incognito mode', 'Verified badge', 'Early access to features', 'Dedicated account manager'],
            cta: 'Go VIP', ctaClass: 'btn-success', highlight: false
        }
    ];
    userPlans.forEach(function(p) { html += planCard(p); });
    html += '</div>';

    // Service Providers section
    html += '<div class="pricing-section-header" style="margin-top:var(--spacing-8)"><h2><i class="fas fa-briefcase"></i> Service Providers</h2><p>Plans for content creators, models, dancers, escorts, promoters, studios</p></div>';
    html += '<div class="pricing-grid">';
    var providerPlans = [
        {
            name: 'Starter', price: 299, annualPrice: 2999, icon: 'fa-rocket', color: '#3b82f6',
            features: ['Service profile', 'Offer up to 5 services', 'Basic analytics', 'Standard visibility'],
            cta: 'Get Started', ctaClass: 'btn-outline', highlight: false
        },
        {
            name: 'Professional', price: 599, annualPrice: 5999, icon: 'fa-star', color: '#8b5cf6',
            features: ['Enhanced profile', 'Unlimited services', 'Full analytics', 'Priority visibility', 'Promotional tools', 'Direct bookings'],
            cta: 'Go Pro', ctaClass: 'btn-primary', highlight: true
        },
        {
            name: 'Elite', price: 999, annualPrice: 9999, icon: 'fa-crown', color: '#f59e0b',
            features: ['Everything in Professional', 'Featured listing', 'Dedicated support', 'Verified badge', 'API access', 'Revenue insights'],
            cta: 'Go Elite', ctaClass: 'btn-success', highlight: false
        }
    ];
    providerPlans.forEach(function(p) { html += planCard(p); });
    html += '</div>';

    // Venue / Club Owners section
    html += '<div class="pricing-section-header" style="margin-top:var(--spacing-8)"><h2><i class="fas fa-map-pin"></i> Venue / Club Owners</h2><p>Plans for venues, clubs, and event spaces</p></div>';
    html += '<div class="pricing-grid">';
    var venuePlans = [
        {
            name: 'Venue Basic', price: 499, annualPrice: 4999, icon: 'fa-building', color: '#14b8a6',
            features: ['Venue profile page', 'Post events', 'Basic event analytics', 'Standard support'],
            cta: 'Get Basic', ctaClass: 'btn-outline', highlight: false
        },
        {
            name: 'Venue Plus', price: 899, annualPrice: 8999, icon: 'fa-door-open', color: '#a855f7',
            features: ['Featured venue listing', 'Unlimited events', 'Ticket integration', 'Promotional boosts', 'Full analytics', 'Priority support'],
            cta: 'Get Plus', ctaClass: 'btn-primary', highlight: true
        },
        {
            name: 'Venue Pro', price: 1499, annualPrice: 14999, icon: 'fa-gem', color: '#ef4444',
            features: ['Everything in Plus', 'Homepage spotlight', 'Dedicated account manager', 'Cross-promotion', 'API access', 'Custom branding'],
            cta: 'Go Pro', ctaClass: 'btn-success', highlight: false
        }
    ];
    venuePlans.forEach(function(p) { html += planCard(p); });
    html += '</div>';

    container.innerHTML = html;
}

// ==================== PERSONALS CLASSIFIEDS ====================
function renderPersonals() {
    var container = document.getElementById('personals-grid');
    var emptyState = document.getElementById('personals-empty-state');
    if (!container) return;

    var filtered = [...state.personals];

    // Filter by tab
    if (state.personalsFilter !== 'all') {
        filtered = filtered.filter(function(a) { return a.type === state.personalsFilter; });
    }

    // Filter by type dropdown
    var typeFilter = document.getElementById('personals-type-filter');
    if (typeFilter) {
        var tv = typeFilter.value;
        if (tv !== 'all') {
            filtered = filtered.filter(function(a) { return a.type === tv; });
        }
    }

    // Filter by location
    var locFilter = document.getElementById('personals-location-filter');
    if (locFilter) {
        var lv = locFilter.value;
        if (lv !== 'all') {
            filtered = filtered.filter(function(a) { return a.location.toLowerCase() === lv; });
        }
    }

    // Sort
    var sortFilter = document.getElementById('personals-sort-filter');
    if (sortFilter) {
        var sv = sortFilter.value;
        if (sv === 'popular') {
            filtered.sort(function(a, b) { return b.responses - a.responses; });
        } else {
            filtered.sort(function(a, b) { return b.date - a.date; });
        }
    }

    if (filtered.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = filtered.map(function(ad) { return createPersonalsCard(ad); }).join('');
    }
}

function createPersonalsCard(ad) {
    var typeLabels = { dating: 'Dating', friendship: 'Friendship', casual: 'Casual', travel: 'Travel' };
    var typeLabel = typeLabels[ad.type] || ad.type;
    var timeAgo = getTimeAgo(ad.date);

    return '\
        <div class="personals-card">\
            <div class="personals-card-type ' + ad.type + '">' + typeLabel + '</div>\
            <div class="personals-card-body">\
                <div class="personals-card-header">\
                    <img src="' + ad.postedBy.image + '" alt="' + ad.postedBy.name + '" class="personals-card-avatar">\
                    <div class="personals-card-user">\
                        <span class="personals-card-name">' + ad.postedBy.name + '</span>\
                        <span class="personals-card-age">' + ad.postedBy.age + ' yrs</span>\
                    </div>\
                    <span class="personals-card-time">' + timeAgo + '</span>\
                </div>\
                <h3 class="personals-card-title">' + ad.title + '</h3>\
                <p class="personals-card-desc">' + ad.description + '</p>\
                <div class="personals-card-meta">\
                    <span><i class="fas fa-map-marker-alt"></i> ' + ad.location + '</span>\
                    <span><i class="fas fa-arrows-alt-h"></i> ' + ad.ageRange + '</span>\
                    <span><i class="fas fa-users"></i> ' + ad.responses + ' responses</span>\
                </div>\
                <div class="personals-card-actions">\
                    <button class="btn btn-primary btn-sm" onclick="showToast(\'Response feature coming soon!\')">\
                        <i class="fas fa-paper-plane"></i> Respond\
                    </button>\
                    <button class="btn btn-outline btn-sm" onclick="showToast(\'Saved!\')">\
                        <i class="fas fa-bookmark"></i> Save\
                    </button>\
                </div>\
            </div>\
        </div>';
}

function getTimeAgo(date) {
    var diff = Date.now() - date;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    return days + 'd ago';
}

function switchPersonalsTab(tab) {
    state.personalsFilter = tab;
    document.querySelectorAll('.personals-tab').forEach(function(t) {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
    renderPersonals();
}

function togglePersonalsFilters() {
    var filters = document.getElementById('personals-filters');
    if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'flex' : 'none';
    }
}

function showPostPersonalsModal() {
    var modal = document.getElementById('post-personals-modal');
    if (modal) modal.style.display = 'flex';
}

function closePostPersonalsModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('post-personals-modal');
        if (modal) modal.style.display = 'none';
    }
}

function submitPersonalsAd(event) {
    event.preventDefault();
    var type = document.getElementById('personals-type').value;
    var title = document.getElementById('personals-title').value.trim();
    var description = document.getElementById('personals-description').value.trim();
    var location = document.getElementById('personals-location').value.trim();
    var ageMin = document.getElementById('personals-age-min').value;
    var ageMax = document.getElementById('personals-age-max').value;

    if (!type || !title || !description || !location) {
        showToast('Please fill in all required fields');
        return;
    }

    var ageRange = (ageMin || '18') + '-' + (ageMax || '99');

    var ad = {
        id: Date.now(),
        title: title,
        postedBy: {
            id: state.currentUser?.id || 99,
            name: state.currentUser?.name || 'You',
            age: state.currentUser?.age || 25,
            image: state.currentUser?.image || 'https://picsum.photos/seed/default/100/100'
        },
        lookingFor: document.querySelector('#personals-type option[value="' + type + '"]')?.text || type,
        description: description,
        location: location,
        ageRange: ageRange,
        type: type === 'friendship' || type === 'activity' ? 'friendship' : type === 'travel' ? 'friendship' : type === 'dating' ? 'dating' : 'casual',
        date: new Date(),
        responses: 0
    };

    state.personals.unshift(ad);
    PersonalsDB.create({
        type: ad.type,
        title: ad.title,
        description: ad.description,
        location: ad.location,
        author_id: state.currentUser?.id || 'guest'
    });
    closePostPersonalsModal();
    document.getElementById('post-personals-form').reset();
    renderPersonals();
    showToast('Your ad has been posted! ✓');
}

// ==================== WALLET RECHARGE REQUEST ====================
function showRechargeRequestModal() {
    const modal = document.getElementById('recharge-request-modal');
    if (modal) modal.style.display = 'flex';
}

function closeRechargeRequestModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('recharge-request-modal');
        if (modal) modal.style.display = 'none';
    }
}

function submitRechargeRequest(e) {
    e.preventDefault();
    
    const amount = document.getElementById('recharge-amount').value;
    const method = document.getElementById('recharge-method').value;
    const reference = document.getElementById('recharge-reference').value;
    const notes = document.getElementById('recharge-notes').value;
    
    if (!amount || !method) {
        showToast('Please fill in all required fields! ⚠️');
        return;
    }
    
    const request = {
        id: Date.now(),
        userId: state.currentUser?.id || 999,
        userName: state.currentUser?.name || 'User',
        amount: parseFloat(amount),
        method: method,
        reference: reference,
        notes: notes,
        date: new Date(),
        status: 'pending'
    };
    
    // Add to admin data
    state.adminData.rechargeRequests = state.adminData.rechargeRequests || [];
    state.adminData.rechargeRequests.push(request);
    
    closeRechargeRequestModal();
    showToast('Recharge request submitted! Admin will process it soon. ✓');
    
    // In real app, send to server
    console.log('Recharge request:', request);
}

// ==================== PROFILE EDITING ====================
function editProfile() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        // Pre-fill with current user data
        if (state.currentUser) {
            document.getElementById('edit-name').value = state.currentUser.name || '';
            document.getElementById('edit-age').value = state.currentUser.age || '';
            document.getElementById('edit-bio').value = state.currentUser.bio || '';
            document.getElementById('edit-location').value = state.currentUser.location || '';
            document.getElementById('edit-interests').value = state.currentUser.interests?.join(', ') || '';
        }
        modal.style.display = 'flex';
    }
}

function closeEditProfileModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) modal.style.display = 'none';
    }
}

function saveProfileChanges(e) {
    e.preventDefault();

    const name = document.getElementById('edit-name').value;
    const age = document.getElementById('edit-age').value;
    const bio = document.getElementById('edit-bio').value;
    const location = document.getElementById('edit-location').value;
    const interests = document.getElementById('edit-interests').value.split(',').map(i => i.trim()).filter(i => i);

    // Store old values for logging
    const oldProfile = { ...state.currentUser };

    // Update current user
    if (state.currentUser) {
        state.currentUser.name = name;
        state.currentUser.age = parseInt(age);
        state.currentUser.bio = bio;
        state.currentUser.location = location;
        state.currentUser.interests = interests;
        state.currentUser.avatar = state.currentUser.avatar || 'https://picsum.photos/seed/img47/400/300';
    }

    // Log activity
    logActivity({
        type: ActivityType.PROFILE_UPDATE,
        action: `Updated profile: ${name}`,
        details: {
            changes: { name, age, bio, location, interests },
            oldValues: oldProfile
        }
    });

    // Save to localStorage
    saveUserData();

    // Update profile view
    document.getElementById('my-profile-name').textContent = `${name}, ${age}`;
    document.getElementById('my-profile-bio').textContent = bio || 'Add a bio to tell people about yourself...';

    // Render interests
    const interestsContainer = document.getElementById('my-profile-interests');
    if (interestsContainer) {
        interestsContainer.innerHTML = interests.map(interest => `
            <span class="interest-tag">${interest}</span>
        `).join('');
    }

    closeEditProfileModal();
    showToast('Profile updated successfully! ✓');

    // Re-render users if needed
    renderUsers();
}

function uploadProfilePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (state.currentUser) {
                    state.currentUser.avatar = event.target.result;
                }
                showToast('Photo uploaded! ✓');
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// ==================== COMPREHENSIVE ADMIN PANEL ====================
let currentAdminSection = 'analytics';

// Admin section titles
const adminSectionTitles = {
    analytics: 'Analytics Dashboard',
    users: 'User Management',
    orders: 'Orders & Transactions',
    forum: 'Forum & Topics',
    content: 'Content Management',
    products: 'Products & Marketplace',
    events: 'Events Management',
    reports: 'Reports & Moderation',
    activity: 'Activity Logs',
    messages: 'Messages Overview',
    settings: 'System Settings'
};

// Admin section subtitles
const adminSectionSubtitles = {
    analytics: 'Overview of your platform performance',
    users: 'Manage user accounts and permissions',
    orders: 'Track transactions and revenue',
    forum: 'Moderate discussions and topics',
    content: 'Manage user-generated content',
    products: 'Oversee marketplace listings',
    events: 'Manage events and bookings',
    reports: 'Review reports and take action',
    activity: 'Monitor all user activity on the platform',
    messages: 'Monitor platform messaging',
    settings: 'Configure system settings'
};

function showAdminDashboard() {
    console.log('🛡️ Opening admin dashboard...');
    const modal = document.getElementById('admin-dashboard-modal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('✅ Admin dashboard modal displayed');
        loadAdminSection('analytics');
    } else {
        console.error('❌ Admin dashboard modal not found!');
        showToast('Admin dashboard not available. Please refresh the page.');
    }
}

function closeAdminDashboard() {
    const modal = document.getElementById('admin-dashboard-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function switchAdminSection(section) {
    currentAdminSection = section;
    
    // Update active nav button
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    // Update page title
    const titleEl = document.getElementById('admin-page-title');
    const subtitleEl = document.querySelector('.admin-subtitle');
    if (titleEl) titleEl.textContent = adminSectionTitles[section] || section;
    if (subtitleEl) subtitleEl.textContent = adminSectionSubtitles[section] || '';
    
    // Load section content
    loadAdminSection(section);
}

function refreshAdminData() {
    showToast('Refreshing data... 🔄');
    loadAdminSection(currentAdminSection);
}

function loadAdminSection(section) {
    const container = document.getElementById('admin-content-body');
    if (!container) return;
    
    switch(section) {
        case 'analytics':
            container.innerHTML = renderAdminAnalytics();
            break;
        case 'users':
            container.innerHTML = renderAdminUsers();
            break;
        case 'orders':
            container.innerHTML = renderAdminOrders();
            break;
        case 'forum':
            container.innerHTML = renderAdminForum();
            break;
        case 'content':
            container.innerHTML = renderAdminContent();
            break;
        case 'products':
            container.innerHTML = renderAdminProducts();
            break;
        case 'events':
            container.innerHTML = renderAdminEvents();
            break;
        case 'reports':
            container.innerHTML = renderAdminReports();
            break;
        case 'activity':
            container.innerHTML = renderAdminActivityLogs();
            break;
        case 'messages':
            container.innerHTML = renderAdminMessages();
            break;
        case 'settings':
            container.innerHTML = renderAdminSettings();
            break;
        default:
            container.innerHTML = renderAdminAnalytics();
    }
}

// ==================== ANALYTICS SECTION ====================
function renderAdminAnalytics() {
    const totalUsers = state.profiles.length;
    const totalMatches = state.matches.length;
    const totalMessages = state.conversations.reduce((sum, c) => sum + c.messages.length, 0);
    const totalRevenue = state.wallet.balance;
    
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${totalUsers.toLocaleString()}</h3>
                        <p>Total Users</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                </div>
                <div class="stat-change positive"><i class="fas fa-arrow-up"></i> 12% from last week</div>
            </div>
            
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${totalMatches.toLocaleString()}</h3>
                        <p>Total Matches</p>
                    </div>
                    <div class="stat-icon pink"><i class="fas fa-heart"></i></div>
                </div>
                <div class="stat-change positive"><i class="fas fa-arrow-up"></i> 8% from last week</div>
            </div>
            
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${totalMessages.toLocaleString()}</h3>
                        <p>Messages Sent</p>
                    </div>
                    <div class="stat-icon purple"><i class="fas fa-comment"></i></div>
                </div>
                <div class="stat-change positive"><i class="fas fa-arrow-up"></i> 23% from last week</div>
            </div>
            
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>R${totalRevenue.toLocaleString()}</h3>
                        <p>Total Revenue</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-coins"></i></div>
                </div>
                <div class="stat-change positive"><i class="fas fa-arrow-up"></i> 15% from last week</div>
            </div>
            
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.events.length.toLocaleString()}</h3>
                        <p>Active Events</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-calendar"></i></div>
                </div>
                <div class="stat-change positive"><i class="fas fa-arrow-up"></i> 5% from last week</div>
            </div>
            
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.products.length.toLocaleString()}</h3>
                        <p>Products Listed</p>
                    </div>
                    <div class="stat-icon purple"><i class="fas fa-store"></i></div>
                </div>
                <div class="stat-change positive"><i class="fas fa-arrow-up"></i> 18% from last week</div>
            </div>
        </div>
        
        <div class="admin-charts-row">
            <div class="admin-chart-card">
                <div class="chart-header">
                    <h3>User Growth Overview</h3>
                    <select class="btn btn-sm btn-outline">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                        <option>Last 90 days</option>
                    </select>
                </div>
                <div class="chart-placeholder">
                    <div style="text-align: center;">
                        <i class="fas fa-chart-area" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>User growth chart would render here</p>
                        <small>Integrate with Chart.js or similar library</small>
                    </div>
                </div>
            </div>
            
            <div class="admin-chart-card">
                <div class="chart-header">
                    <h3>Revenue Breakdown</h3>
                </div>
                <div class="chart-placeholder">
                    <div style="text-align: center;">
                        <i class="fas fa-chart-pie" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>Revenue pie chart would render here</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="admin-section">
            <h2><i class="fas fa-clock"></i> Recent Activity</h2>
            <div class="activity-list">
                <div class="activity-item">
                    <div class="activity-icon blue"><i class="fas fa-user-plus"></i></div>
                    <div class="activity-content">
                        <div class="activity-title">New user registered</div>
                        <div class="activity-time">2 minutes ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon pink"><i class="fas fa-heart"></i></div>
                    <div class="activity-content">
                        <div class="activity-title">New match created</div>
                        <div class="activity-time">5 minutes ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon green"><i class="fas fa-shopping-cart"></i></div>
                    <div class="activity-content">
                        <div class="activity-title">Product purchased</div>
                        <div class="activity-time">12 minutes ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon orange"><i class="fas fa-calendar-check"></i></div>
                    <div class="activity-content">
                        <div class="activity-title">Event ticket booked</div>
                        <div class="activity-time">25 minutes ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon red"><i class="fas fa-flag"></i></div>
                    <div class="activity-content">
                        <div class="activity-title">New report submitted</div>
                        <div class="activity-time">1 hour ago</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== USERS SECTION ====================
function renderAdminUsers() {
    return `
        <div class="admin-data-table">
            <div class="table-header">
                <h3>All Users</h3>
                <div style="display: flex; gap: var(--spacing-2);">
                    <input type="text" id="admin-user-search" placeholder="Search users..." 
                        style="padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-light); border-radius: var(--radius);"
                        onkeyup="filterAdminUsers()">
                    <button class="btn btn-primary btn-sm" onclick="showAddUserModal()">
                        <i class="fas fa-plus"></i> Add User
                    </button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="admin-users-body">
                    ${state.profiles.slice(0, 50).map(profile => `
                        <tr>
                            <td>
                                <div class="user-cell">
                                    <img src="${profile.image}" alt="${profile.name}">
                                    <div class="user-cell-info">
                                        <span class="user-cell-name">${profile.name}</span>
                                    </div>
                                </div>
                            </td>
                            <td>user${profile.id}@example.com</td>
                            <td>${profile.accountType || 'customer'}</td>
                            <td><span class="status-badge active">Active</span></td>
                            <td>${formatTimeAgo(profile.date || new Date())}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-action" onclick="viewAdminUserProfile(${profile.id})" title="View"><i class="fas fa-eye"></i></button>
                                    <button class="btn-action" onclick="editAdminUserProfile(${profile.id})" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn-action danger" onclick="banAdminUser(${profile.id})" title="Ban"><i class="fas fa-ban"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showAddUserModal() {
    const modalHTML = `
        <div id="add-user-modal" class="modal-overlay" style="display: flex;" onclick="closeAddUserModal(event)">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-user-plus"></i> Add New User</h2>
                    <button class="modal-close" onclick="closeAddUserModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="add-user-form" onsubmit="createAdminUser(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="new-user-name">Full Name *</label>
                                <input type="text" id="new-user-name" required placeholder="John Doe">
                            </div>
                            <div class="form-group">
                                <label for="new-user-email">Email Address *</label>
                                <input type="email" id="new-user-email" required placeholder="john@example.com">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="new-user-password">Password *</label>
                                <input type="password" id="new-user-password" required placeholder="Create password" minlength="8">
                            </div>
                            <div class="form-group">
                                <label for="new-user-age">Age *</label>
                                <input type="number" id="new-user-age" required placeholder="25" min="18" max="100">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="new-user-gender">Gender</label>
                            <select id="new-user-gender">
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non-binary">Non-binary</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="new-user-location">Location</label>
                            <input type="text" id="new-user-location" placeholder="City, Country">
                        </div>
                        
                        <div class="form-group">
                            <label for="new-user-account-type">Account Type *</label>
                            <select id="new-user-account-type" required onchange="toggleProviderFields()">
                                <option value="customer">User</option>
                                <option value="provider">Service Provider</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="new-user-bio">Bio</label>
                            <textarea id="new-user-bio" rows="3" placeholder="Tell us about yourself..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="new-user-interests">Interests (comma separated)</label>
                            <input type="text" id="new-user-interests" placeholder="Music, Travel, Food">
                        </div>
                        
                        <div class="form-info" style="padding: var(--spacing-3); background: var(--bg-tertiary); border-radius: var(--radius-lg); margin-bottom: var(--spacing-4);">
                            <i class="fas fa-info-circle" style="color: var(--primary);"></i>
                            <span style="color: var(--text-secondary); font-size: 0.875rem;">
                                User will receive login credentials via email (simulated). Password must be at least 6 characters.
                            </span>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeAddUserModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-user-plus"></i> Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAddUserModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('add-user-modal');
        if (modal) modal.remove();
    }
}

function createAdminUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const age = parseInt(document.getElementById('new-user-age').value);
    const gender = document.getElementById('new-user-gender').value;
    const location = document.getElementById('new-user-location').value;
    const accountType = document.getElementById('new-user-account-type').value;
    const bio = document.getElementById('new-user-bio').value;
    const interests = document.getElementById('new-user-interests').value.split(',').map(i => i.trim()).filter(i => i);
    
    // Check if email already exists
    const existingUser = state.profiles.find(p => p.email === email);
    if (existingUser) {
        showToast('Email already registered! ⚠️');
        return;
    }
    
    // Create new user via Supabase auth (passwords are hashed server-side)
    if (typeof AuthDB !== 'undefined' && getSupabase()) {
        AuthDB.signUp(email, password, { name, age, gender, location: location || 'Johannesburg, South Africa', accountType, bio: bio || 'Just joined Koitus!', interests: interests.length > 0 ? interests : ['Music', 'Travel'], verified: true }).then(function(result) {
            if (result.error) {
                showToast('Error creating user: ' + result.error.message);
                return;
            }
            showToast('User created successfully! ✓');
            renderAdminUsers();
            closeCreateUserModal();
        });
        return;
    }

    // Local fallback (no password stored)
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        age: age,
        gender: gender,
        location: location || 'Johannesburg, South Africa',
        accountType: accountType,
        bio: bio || 'Just joined Koitus!',
        interests: interests.length > 0 ? interests : ['Music', 'Travel'],
        image: 'https://i.pravatar.cc/400?u=AdminUser',
        date: new Date(),
        online: false,
        verified: true
    };
    
    // Add to profiles
    state.profiles.unshift(newUser);
    
    // Log activity
    logActivity({
        type: ActivityType.ADMIN_ACTION,
        level: ActivityLevel.CRITICAL,
        action: `Admin created new user: ${email}`,
        details: {
            createdUser: { name, email, accountType },
            adminId: state.currentUser?.id
        }
    });
    
    // Save data
    saveUserData();
    
    // Close modal
    closeAddUserModal();
    
    // Refresh user list
    switchAdminSection('users');
    
    showToast(`User "${name}" created successfully! ✓ Login credentials sent to ${email}`);
}

function filterAdminUsers() {
    const search = document.getElementById('admin-user-search')?.value.toLowerCase() || '';
    const tbody = document.getElementById('admin-users-body');
    
    if (!tbody) return;
    
    const filtered = state.profiles.slice(0, 50).filter(profile => 
        profile.name.toLowerCase().includes(search) ||
        profile.email.toLowerCase().includes(search) ||
        (profile.accountType || '').toLowerCase().includes(search)
    );
    
    tbody.innerHTML = filtered.map(profile => `
        <tr>
            <td>
                <div class="user-cell">
                    <img src="${profile.image}" alt="${profile.name}">
                    <div class="user-cell-info">
                        <span class="user-cell-name">${profile.name}</span>
                    </div>
                </div>
            </td>
            <td>${profile.email || `user${profile.id}@example.com`}</td>
            <td>${profile.accountType || 'customer'}</td>
            <td><span class="status-badge ${profile.verified ? 'approved' : 'active'}">${profile.verified ? 'Verified' : 'Active'}</span></td>
            <td>${formatTimeAgo(profile.date || new Date())}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action" onclick="viewAdminUserProfile(${profile.id})" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn-action" onclick="editAdminUserProfile(${profile.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-action danger" onclick="banAdminUser(${profile.id})" title="Ban"><i class="fas fa-ban"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewAdminUserProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) {
        showToast('User not found');
        return;
    }
    
    showToast(`Viewing profile: ${user.name}`);
    console.log('👤 User Details:', user);
}

function editAdminUserProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) {
        showToast('User not found');
        return;
    }
    
    showToast(`Edit user: ${user.name} - Feature coming soon`);
}

function banAdminUser(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) {
        showToast('User not found');
        return;
    }
    
    if (confirm(`Are you sure you want to ban ${user.name}? This will prevent them from logging in.`)) {
        user.banned = true;
        user.status = 'banned';
        
        // Log activity
        logActivity({
            type: ActivityType.ADMIN_ACTION,
            level: ActivityLevel.CRITICAL,
            action: `Admin banned user: ${user.email}`,
            details: {
                bannedUser: { id: userId, name: user.name, email: user.email },
                adminId: state.currentUser?.id
            }
        });
        
        saveUserData();
        switchAdminSection('users');
        showToast(`User "${user.name}" has been banned`);
    }
}

// ==================== ORDERS SECTION ====================
function renderAdminOrders() {
    const rechargeRequests = state.adminData.rechargeRequests || [];
    
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>R${state.wallet.balance.toLocaleString()}</h3>
                        <p>Total Revenue</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-coins"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${rechargeRequests.length}</h3>
                        <p>Recharge Requests</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-wallet"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${(state.wallet.transactions || []).length}</h3>
                        <p>Transactions</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-exchange-alt"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3>Recharge Requests</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rechargeRequests.length === 0 ? `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: var(--spacing-8); color: var(--text-tertiary);">
                                No recharge requests yet
                            </td>
                        </tr>
                    ` : rechargeRequests.map(request => `
                        <tr>
                            <td>${request.userName || 'User'}</td>
                            <td>R${request.amount}</td>
                            <td>${request.method}</td>
                            <td>${request.reference || '-'}</td>
                            <td>${formatTimeAgo(request.date)}</td>
                            <td><span class="status-badge ${request.status}">${request.status}</span></td>
                            <td>
                                <div class="action-buttons">
                                    ${request.status === 'pending' ? `
                                        <button class="btn-action success" onclick="approveRecharge(${request.id})" title="Approve"><i class="fas fa-check"></i></button>
                                        <button class="btn-action danger" onclick="rejectRecharge(${request.id})" title="Reject"><i class="fas fa-times"></i></button>
                                    ` : '-'}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== FORUM SECTION ====================
function renderAdminForum() {
    const allPosts = [...(state.forumPosts || []), ...(state.providerForumPosts || [])];
    const pendingPosts = allPosts.filter(p => p.status === 'pending');
    
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${allPosts.length}</h3>
                        <p>Total Topics</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-comments"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${pendingPosts.length}</h3>
                        <p>Pending Approval</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${allPosts.filter(p => p.type === 'provider').length}</h3>
                        <p>Provider Topics</p>
                    </div>
                    <div class="stat-icon purple"><i class="fas fa-crown"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3>Forum Topics</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Topic</th>
                        <th>Author</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Replies</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allPosts.slice(0, 10).map(post => `
                        <tr>
                            <td style="max-width: 300px;">
                                <div style="font-weight: 600; color: var(--text-primary);">${post.title}</div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">
                                    ${post.content?.substring(0, 80) || ''}...
                                </div>
                            </td>
                            <td>${post.author?.name || 'Unknown'}</td>
                            <td>${post.category}</td>
                            <td><span class="status-badge ${post.type === 'provider' ? 'pending' : 'active'}">${post.type}</span></td>
                            <td><span class="status-badge ${post.status}">${post.status}</span></td>
                            <td>${post.replies || 0}</td>
                            <td>
                                <div class="action-buttons">
                                    ${post.status === 'pending' ? `
                                        <button class="btn-action success" onclick="approvePost(${post.id})" title="Approve"><i class="fas fa-check"></i></button>
                                        <button class="btn-action danger" onclick="rejectPost(${post.id})" title="Reject"><i class="fas fa-times"></i></button>
                                    ` : `
                                        <button class="btn-action" title="View"><i class="fas fa-eye"></i></button>
                                        <button class="btn-action danger" title="Delete"><i class="fas fa-trash"></i></button>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== CONTENT SECTION ====================
function renderAdminContent() {
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.content.length}</h3>
                        <p>Total Content</p>
                    </div>
                    <div class="stat-icon purple"><i class="fas fa-photo-video"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.content.filter(c => c.type === 'video').length}</h3>
                        <p>Videos</p>
                    </div>
                    <div class="stat-icon red"><i class="fas fa-video"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.content.filter(c => c.type === 'photo').length}</h3>
                        <p>Photos</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-image"></i></div>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-6);">
            ${state.content.slice(0, 12).map(item => `
                <div class="admin-content-card" style="background: var(--bg-primary); border-radius: var(--radius-xl); border: 1px solid var(--border-light); overflow: hidden;">
                    <div style="position: relative;">
                        ${item.type === 'video' ? '<div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.7); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;"><i class="fas fa-video"></i> Video</div>' : '<div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.7); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;"><i class="fas fa-image"></i> Photo</div>'}
                        <div style="height: 160px; background: var(--bg-secondary);">
                            ${item.type === 'video' ? `<video src="${item.media}" style="width: 100%; height: 100%; object-fit: cover;"></video>` : `<img src="${item.media}" alt="${item.caption}" style="width: 100%; height: 100%; object-fit: cover;">`}
                        </div>
                    </div>
                    <div style="padding: var(--spacing-4);">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-2);">${item.creator?.name}</div>
                        <div style="display: flex; gap: var(--spacing-4); font-size: 0.875rem; color: var(--text-tertiary); margin-bottom: var(--spacing-4);">
                            <span><i class="fas fa-heart"></i> ${item.likes}</span>
                            <span><i class="fas fa-eye"></i> ${item.views}</span>
                        </div>
                        <button class="btn btn-sm btn-danger btn-block" onclick="deleteAdminContent(${item.id})">
                            <i class="fas fa-trash"></i> Remove Content
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==================== PRODUCTS SECTION ====================
function renderAdminProducts() {
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.products.length}</h3>
                        <p>Total Products</p>
                    </div>
                    <div class="stat-icon purple"><i class="fas fa-store"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.products.filter(p => p.isFeatured).length}</h3>
                        <p>Featured</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-star"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.products.reduce((sum, p) => sum + p.sold, 0)}</h3>
                        <p>Total Sold</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-shopping-bag"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3>Products</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Seller</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Sold</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.products.map(product => `
                        <tr>
                            <td>
                                <div style="font-weight: 600; color: var(--text-primary);">${product.name}</div>
                            </td>
                            <td>${product.seller?.name || 'Unknown'}</td>
                            <td style="font-weight: 600; color: var(--primary);">R${product.price}</td>
                            <td>${product.category}</td>
                            <td>${product.stock}</td>
                            <td>${product.sold || 0}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-action" title="View"><i class="fas fa-eye"></i></button>
                                    <button class="btn-action" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn-action danger" title="Remove" onclick="deleteAdminProduct(${product.id})"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== EVENTS SECTION ====================
function renderAdminEvents() {
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.events.length}</h3>
                        <p>Total Events</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-calendar"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.events.filter(e => !e.isPast).length}</h3>
                        <p>Upcoming</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-clock"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.events.reduce((sum, e) => sum + e.attendeeCount, 0)}</h3>
                        <p>Total Attendees</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3>Events</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Host</th>
                        <th>Date</th>
                        <th>Location</th>
                        <th>Attendees</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.events.map(event => `
                        <tr>
                            <td style="font-weight: 600; color: var(--text-primary);">${event.name}</td>
                            <td>${event.host?.name || 'Unknown'}</td>
                            <td>${event.date}</td>
                            <td>${event.location}</td>
                            <td>${event.attendeeCount}/${event.capacity}</td>
                            <td><span class="status-badge ${event.isPast ? 'inactive' : 'active'}">${event.isPast ? 'Past' : 'Upcoming'}</span></td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-action" title="View"><i class="fas fa-eye"></i></button>
                                    <button class="btn-action danger" title="Cancel" onclick="cancelAdminEvent(${event.id})"><i class="fas fa-times"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== REPORTS SECTION ====================
function renderAdminReports() {
    const reports = state.adminData.reports || [];
    
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${reports.length}</h3>
                        <p>Total Reports</p>
                    </div>
                    <div class="stat-icon red"><i class="fas fa-flag"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${reports.filter(r => r.status === 'pending').length}</h3>
                        <p>Pending</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${reports.filter(r => r.status === 'resolved').length}</h3>
                        <p>Resolved</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3>Reports</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Reason</th>
                        <th>Reported By</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.length === 0 ? `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: var(--spacing-8); color: var(--text-tertiary);">
                                No reports yet
                            </td>
                        </tr>
                    ` : reports.map(report => `
                        <tr>
                            <td><span class="status-badge pending">${report.type}</span></td>
                            <td style="max-width: 300px;">${report.reason}</td>
                            <td>User #${report.userId || 'Unknown'}</td>
                            <td>${formatTimeAgo(report.date)}</td>
                            <td><span class="status-badge ${report.status}">${report.status}</span></td>
                            <td>
                                <div class="action-buttons">
                                    ${report.status === 'pending' ? `
                                        <button class="btn-action success" onclick="resolveReport(${report.id})" title="Resolve"><i class="fas fa-check"></i></button>
                                    ` : '-'}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== MESSAGES SECTION ====================
function renderAdminMessages() {
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.conversations.length}</h3>
                        <p>Active Chats</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-comments"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.conversations.reduce((sum, c) => sum + c.messages.length, 0)}</h3>
                        <p>Total Messages</p>
                    </div>
                    <div class="stat-icon purple"><i class="fas fa-envelope"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${state.onlineUsers?.size || 0}</h3>
                        <p>Online Users</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-signal"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3>Recent Conversations</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Users</th>
                        <th>Last Message</th>
                        <th>Messages</th>
                        <th>Last Activity</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.conversations.slice(0, 10).map(conv => `
                        <tr>
                            <td>
                                <div class="user-cell">
                                    <img src="${conv.avatar}" alt="${conv.name}">
                                    <div class="user-cell-info">
                                        <span class="user-cell-name">${conv.name}</span>
                                    </div>
                                </div>
                            </td>
                            <td style="max-width: 300px;">
                                ${conv.messages[conv.messages.length - 1]?.text?.substring(0, 50) || 'No messages'}...
                            </td>
                            <td>${conv.messages.length}</td>
                            <td>${formatTimeAgo(new Date())}</td>
                            <td><span class="status-badge ${conv.online ? 'active' : 'inactive'}">${conv.online ? 'Online' : 'Offline'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== SETTINGS SECTION ====================
function renderAdminSettings() {
    return `
        <div class="admin-section">
            <h2><i class="fas fa-cog"></i> General Settings</h2>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">Maintenance Mode</div>
                        <div style="font-size: 0.875rem; color: var(--text-tertiary);">Disable user access during maintenance</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">New Registrations</div>
                        <div style="font-size: 0.875rem; color: var(--text-tertiary);">Allow new users to sign up</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">Email Verification</div>
                        <div style="font-size: 0.875rem; color: var(--text-tertiary);">Require email verification for new accounts</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="admin-section">
            <h2><i class="fas fa-database"></i> Data Management</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-4);">
                <button class="btn btn-outline" onclick="showToast('Cache cleared! ✓')">
                    <i class="fas fa-broom"></i> Clear Cache
                </button>
                <button class="btn btn-outline" onclick="showToast('Logs exported! 📥')">
                    <i class="fas fa-download"></i> Export Logs
                </button>
                <button class="btn btn-outline" onclick="showToast('Backup created! 💾')">
                    <i class="fas fa-save"></i> Create Backup
                </button>
                <button class="btn btn-danger" onclick="showToast('Warning: This action requires confirmation!')">
                    <i class="fas fa-trash"></i> Reset All Data
                </button>
            </div>
        </div>
        
        <div class="admin-section">
            <h2><i class="fas fa-info-circle"></i> System Information</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-4);">
                <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--spacing-1);">Version</div>
                    <div style="font-weight: 600; color: var(--text-primary);">2.0.0</div>
                </div>
                <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--spacing-1);">Last Backup</div>
                    <div style="font-weight: 600; color: var(--text-primary);">Today, 02:00 AM</div>
                </div>
                <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--spacing-1);">Server Status</div>
                    <div style="font-weight: 600; color: var(--success);"><i class="fas fa-check-circle"></i> Online</div>
                </div>
                <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--spacing-1);">Database</div>
                    <div style="font-weight: 600; color: var(--success);"><i class="fas fa-check-circle"></i> Connected</div>
                </div>
            </div>
        </div>
    `;
}

// ==================== ACTIVITY LOGS SECTION ====================
function renderAdminActivityLogs() {
    const logs = state.adminData.activityLogs || [];
    const recentLogs = logs.slice(0, 50);
    
    return `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${logs.length}</h3>
                        <p>Total Activities</p>
                    </div>
                    <div class="stat-icon blue"><i class="fas fa-history"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${logs.filter(l => l.type === 'login').length}</h3>
                        <p>Logins Today</p>
                    </div>
                    <div class="stat-icon green"><i class="fas fa-sign-in-alt"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${logs.filter(l => l.level === 'warning').length}</h3>
                        <p>Warnings</p>
                    </div>
                    <div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-body">
                        <h3>${logs.filter(l => l.level === 'critical').length}</h3>
                        <p>Critical</p>
                    </div>
                    <div class="stat-icon red"><i class="fas fa-radiation"></i></div>
                </div>
            </div>
        </div>
        
        <div class="admin-data-table">
            <div class="table-header">
                <h3><i class="fas fa-history"></i> Recent Activity Logs</h3>
                <div style="display: flex; gap: var(--spacing-2);">
                    <input type="text" id="activity-log-search" placeholder="Search logs..." 
                        style="padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-light); border-radius: var(--radius);"
                        onkeyup="filterActivityLogs()">
                    <select id="activity-log-filter" onchange="filterActivityLogs()" 
                        style="padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-light); border-radius: var(--radius);">
                        <option value="all">All Types</option>
                        <option value="login">Logins</option>
                        <option value="signup">Signups</option>
                        <option value="profile_update">Profile Updates</option>
                        <option value="gallery_upload">Gallery Uploads</option>
                        <option value="forum_post">Forum Posts</option>
                        <option value="club_create">Club Creation</option>
                        <option value="message_sent">Messages</option>
                        <option value="admin_action">Admin Actions</option>
                    </select>
                    <button class="btn btn-sm btn-outline" onclick="exportActivityLogs()">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Activity Type</th>
                        <th>Action</th>
                        <th>Level</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody id="activity-logs-body">
                    ${recentLogs.length === 0 ? `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: var(--spacing-8); color: var(--text-tertiary);">
                                No activity logs yet. User actions will appear here.
                            </td>
                        </tr>
                    ` : recentLogs.map(log => `
                        <tr class="activity-log-row level-${log.level}">
                            <td>
                                <span class="log-timestamp">${formatTimeAgo(log.timestamp)}</span>
                                <div style="font-size: 0.625rem; color: var(--text-tertiary);">${new Date(log.timestamp).toLocaleDateString()}</div>
                            </td>
                            <td>
                                <div class="user-cell">
                                    <div class="user-cell-info">
                                        <span class="user-cell-name">${log.userName}</span>
                                        <span class="user-cell-email">${log.userEmail || 'N/A'}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${getActivityTypeClass(log.type)}">${log.type}</span>
                            </td>
                            <td style="max-width: 300px;">
                                ${log.action}
                            </td>
                            <td>
                                <span class="status-badge ${getActivityLevelClass(log.level)}">${log.level}</span>
                            </td>
                            <td>
                                <button class="btn-action" onclick="viewLogDetails(${log.id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="admin-section" style="margin-top: var(--spacing-6);">
            <h2><i class="fas fa-info-circle"></i> About Activity Logging</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-4);">
                <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <h4 style="margin-bottom: var(--spacing-2);">📊 What's Tracked</h4>
                    <ul style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.8;">
                        <li>User logins and signups</li>
                        <li>Profile updates and gallery changes</li>
                        <li>Forum posts and replies</li>
                        <li>Club creation and membership</li>
                        <li>Messages and matches</li>
                        <li>Product and event actions</li>
                        <li>Wallet transactions</li>
                        <li>Admin actions</li>
                    </ul>
                </div>
                <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <h4 style="margin-bottom: var(--spacing-2);">🔒 Data Retention</h4>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.8;">
                        Activity logs are stored locally and automatically managed:
                    </p>
                    <ul style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.8;">
                        <li>Maximum 1000 logs kept</li>
                        <li>Oldest logs removed automatically</li>
                        <li>Export feature for backup</li>
                        <li>Session tracking enabled</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function filterActivityLogs() {
    const search = document.getElementById('activity-log-search')?.value || '';
    const filter = document.getElementById('activity-log-filter')?.value || 'all';
    
    const filters = {};
    if (search) filters.search = search;
    if (filter !== 'all') filters.type = filter;
    
    const tbody = document.getElementById('activity-logs-body');
    if (tbody) {
        tbody.innerHTML = renderActivityLogs(filters);
    }
}

function exportActivityLogs() {
    const logs = state.adminData.activityLogs || [];
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `koitus-activity-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showToast('Activity logs exported! 📥');
}

// ==================== END OF ADMIN SECTION FUNCTIONS ====================

// ==================== ACTIVITY LOGGING SYSTEM ====================
const ActivityType = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    SIGNUP: 'signup',
    PROFILE_UPDATE: 'profile_update',
    GALLERY_UPLOAD: 'gallery_upload',
    GALLERY_DELETE: 'gallery_delete',
    FORUM_POST: 'forum_post',
    FORUM_REPLY: 'forum_reply',
    FORUM_VOTE: 'forum_vote',
    CLUB_CREATE: 'club_create',
    CLUB_JOIN: 'club_join',
    CLUB_LEAVE: 'club_leave',
    MESSAGE_SENT: 'message_sent',
    MATCH_CREATED: 'match_created',
    EVENT_CREATE: 'event_create',
    EVENT_JOIN: 'event_join',
    PRODUCT_CREATE: 'product_create',
    PRODUCT_PURCHASE: 'product_purchase',
    CONTENT_UPLOAD: 'content_upload',
    WALLET_DEPOSIT: 'wallet_deposit',
    WALLET_WITHDRAW: 'wallet_withdraw',
    REPORT_SUBMIT: 'report_submit',
    ADMIN_ACTION: 'admin_action',
    EVENT_UPDATE: 'event_update',
    EVENT_DELETE: 'event_delete',
    PRODUCT_UPDATE: 'product_update',
    PRODUCT_DELETE: 'product_delete',
    CLUB_UPDATE: 'club_update',
    CLUB_DELETE: 'club_delete',
    FORUM_UPDATE: 'forum_update',
    FORUM_DELETE: 'forum_delete',
    CONTENT_DELETE: 'content_delete',
    MESSAGE_DELETE: 'message_delete'
};

const ActivityLevel = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

function logActivity(activity) {
    const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        userId: activity.userId || state.currentUser?.id || 'anonymous',
        userName: activity.userName || state.currentUser?.name || 'Anonymous',
        userEmail: activity.userEmail || state.currentUser?.email || '',
        type: activity.type,
        level: activity.level || ActivityLevel.INFO,
        action: activity.action,
        details: activity.details || {},
        ipAddress: activity.ipAddress || 'N/A',
        userAgent: activity.userAgent || navigator.userAgent,
        session: activity.session || getSessionId()
    };
    
    // Add to activity logs
    state.adminData.activityLogs.unshift(logEntry);
    
    // Keep only last 1000 logs to prevent memory issues
    if (state.adminData.activityLogs.length > 1000) {
        state.adminData.activityLogs = state.adminData.activityLogs.slice(0, 1000);
    }
    
    // Save to localStorage
    saveUserData();
    
    // Log to console in development
    console.log(`📝 [${logEntry.type.toUpperCase()}] ${logEntry.userName}: ${logEntry.action}`);
    
    return logEntry;
}

function getSessionId() {
    let sessionId = sessionStorage.getItem('koitus_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('koitus_session_id', sessionId);
    }
    return sessionId;
}

function getActivityLogs(filters = {}) {
    let logs = [...state.adminData.activityLogs];
    
    // Filter by type
    if (filters.type) {
        logs = logs.filter(log => log.type === filters.type);
    }
    
    // Filter by user
    if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
    }
    
    // Filter by level
    if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
    }
    
    // Filter by date range
    if (filters.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }
    
    // Filter by search term
    if (filters.search) {
        const search = filters.search.toLowerCase();
        logs = logs.filter(log => 
            log.userName.toLowerCase().includes(search) ||
            log.action.toLowerCase().includes(search) ||
            log.type.toLowerCase().includes(search)
        );
    }
    
    return logs;
}

function renderActivityLogs(filters = {}) {
    const logs = getActivityLogs(filters);
    return logs.map(log => `
        <tr class="activity-log-row level-${log.level}">
            <td>
                <span class="log-timestamp">${formatTimeAgo(log.timestamp)}</span>
            </td>
            <td>
                <div class="user-cell">
                    <div class="user-cell-info">
                        <span class="user-cell-name">${log.userName}</span>
                        <span class="user-cell-email">${log.userEmail || 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="status-badge ${getActivityTypeClass(log.type)}">${log.type}</span>
            </td>
            <td style="max-width: 400px;">
                ${log.action}
            </td>
            <td>
                <span class="status-badge ${getActivityLevelClass(log.level)}">${log.level}</span>
            </td>
            <td>
                <button class="btn-action" onclick="viewLogDetails(${log.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getActivityTypeClass(type) {
    const criticalTypes = ['login', 'logout', 'admin_action'];
    const warningTypes = ['report_submit', 'club_leave', 'gallery_delete'];
    
    if (criticalTypes.includes(type)) return 'pending';
    if (warningTypes.includes(type)) return 'rejected';
    return 'active';
}

function getActivityLevelClass(level) {
    switch(level) {
        case ActivityLevel.CRITICAL: return 'rejected';
        case ActivityLevel.WARNING: return 'pending';
        default: return 'active';
    }
}

function viewLogDetails(logId) {
    const log = state.adminData.activityLogs.find(l => l.id === logId);
    if (!log) return;
    
    const details = `
        <div style="padding: var(--spacing-4);">
            <h4>Activity Log Details</h4>
            <table style="width: 100%; margin-top: var(--spacing-4);">
                <tr><td><strong>ID:</strong></td><td>${log.id}</td></tr>
                <tr><td><strong>Time:</strong></td><td>${new Date(log.timestamp).toLocaleString()}</td></tr>
                <tr><td><strong>User:</strong></td><td>${log.userName} (${log.userEmail})</td></tr>
                <tr><td><strong>Type:</strong></td><td>${log.type}</td></tr>
                <tr><td><strong>Level:</strong></td><td>${log.level}</td></tr>
                <tr><td><strong>Action:</strong></td><td>${log.action}</td></tr>
                <tr><td><strong>IP Address:</strong></td><td>${log.ipAddress}</td></tr>
                <tr><td><strong>Session:</strong></td><td>${log.session}</td></tr>
                <tr><td><strong>Details:</strong></td><td><pre style="background: var(--bg-secondary); padding: var(--spacing-2); border-radius: var(--radius);">${JSON.stringify(log.details, null, 2)}</pre></td></tr>
            </table>
        </div>
    `;
    
    showToast('Log details opened in console');
    console.log('📋 Log Details:', log);
}

// Clubs system is below

// ==================== PROFILE GALLERY SYSTEM ====================
let selectedGalleryIndex = 0;
let galleryFilesToUpload = [];

function renderProfileGallery() {
    const container = document.getElementById('profile-gallery');
    const countEl = document.getElementById('gallery-count');
    if (!container) return;
    
    const gallery = state.currentUser?.gallery || [];
    const maxGallery = 5;
    
    // Update count
    if (countEl) {
        countEl.textContent = `${gallery.length}/${maxGallery}`;
    }
    
    // Clear container except add button
    container.innerHTML = '';
    
    // Add gallery items
    gallery.forEach((item, index) => {
        const itemHTML = `
            <div class="gallery-item" onclick="openGalleryViewer(${index})">
                ${item.type === 'video' ? `
                    <video src="${item.url}" muted></video>
                    <span class="gallery-item-type"><i class="fas fa-video"></i></span>
                ` : `
                    <img src="${item.url}" alt="Gallery photo ${index + 1}">
                    <span class="gallery-item-type"><i class="fas fa-image"></i></span>
                `}
                <div class="gallery-item-overlay">
                    <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); setAsProfilePhoto(${index})" title="Set as profile">
                        <i class="fas fa-user-circle"></i>
                    </button>
                    <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); deleteGalleryItem(${index})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    });
    
    // Add button if gallery not full
    if (gallery.length < maxGallery) {
        const addHTML = `
            <div class="gallery-item add-gallery-item" onclick="showGalleryUploadModal()">
                <i class="fas fa-camera"></i>
                <span>Add Media</span>
                <small>Photos & Videos</small>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', addHTML);
    }
}

function showGalleryUploadModal() {
    if (!state.currentUser) {
        showToast('Please login to upload media 🔐');
        showLogin();
        return;
    }
    
    const gallery = state.currentUser?.gallery || [];
    if (gallery.length >= 5) {
        showToast('Gallery is full! Maximum 5 items allowed.');
        return;
    }
    
    galleryFilesToUpload = [];
    document.getElementById('gallery-upload-preview').innerHTML = '';
    document.getElementById('gallery-upload-progress').style.display = 'none';
    document.getElementById('gallery-upload-btn').disabled = true;
    document.getElementById('current-gallery-count').textContent = gallery.length;
    
    const modal = document.getElementById('gallery-upload-modal');
    if (modal) modal.style.display = 'flex';
}

function closeGalleryUploadModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('gallery-upload-modal');
        if (modal) modal.style.display = 'none';
    }
}

function handleGalleryFileSelect(event) {
    const files = event.target.files;
    const gallery = state.currentUser?.gallery || [];
    const availableSlots = 5 - gallery.length;
    
    for (let i = 0; i < files.length && i < availableSlots; i++) {
        const file = files[i];
        
        // Validate file
        if (file.size > 10 * 1024 * 1024) {
            showToast(`${file.name} is too large. Max 10MB.`);
            continue;
        }
        
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            showToast(`${file.name} is not a valid image or video`);
            continue;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            galleryFilesToUpload.push({
                file: file,
                url: e.target.result,
                type: isImage ? 'image' : 'video'
            });
            renderUploadPreview();
        };
        reader.readAsDataURL(file);
    }
}

function renderUploadPreview() {
    const preview = document.getElementById('gallery-upload-preview');
    preview.innerHTML = galleryFilesToUpload.map((item, index) => `
        <div class="upload-preview-item">
            ${item.type === 'video' ? 
                `<video src="${item.url}"></video>` : 
                `<img src="${item.url}">`
            }
            <button class="remove-preview" onclick="removePreviewItem(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    const uploadBtn = document.getElementById('gallery-upload-btn');
    if (uploadBtn) {
        uploadBtn.disabled = galleryFilesToUpload.length === 0;
    }
}

function removePreviewItem(index) {
    galleryFilesToUpload.splice(index, 1);
    renderUploadPreview();
}

function uploadGalleryFiles() {
    if (galleryFilesToUpload.length === 0) return;
    
    const progress = document.getElementById('gallery-upload-progress');
    const progressFill = document.getElementById('gallery-progress-fill');
    const progressText = document.getElementById('gallery-progress-text');
    
    progress.style.display = 'block';
    
    // Simulate upload progress
    let progressValue = 0;
    const interval = setInterval(() => {
        progressValue += 10;
        progressFill.style.width = `${progressValue}%`;
        progressText.textContent = `Uploading... ${progressValue}%`;
        
        if (progressValue >= 100) {
            clearInterval(interval);
            completeUpload();
        }
    }, 2000);
}

function completeUpload() {
    if (!state.currentUser) return;

    // Initialize gallery if not exists
    if (!state.currentUser.gallery) {
        state.currentUser.gallery = [];
    }

    // Add uploaded files to gallery
    const uploadedItems = [];
    galleryFilesToUpload.forEach(item => {
        if (state.currentUser.gallery.length < 5) {
            const galleryItem = {
                id: Date.now() + Math.random(),
                url: item.url,
                type: item.type,
                uploadedAt: new Date()
            };
            state.currentUser.gallery.push(galleryItem);
            uploadedItems.push(galleryItem);
        }
    });

    // Log activity
    if (uploadedItems.length > 0) {
        logActivity({
            type: ActivityType.GALLERY_UPLOAD,
            action: `Uploaded ${uploadedItems.length} media item(s) to gallery`,
            details: { count: uploadedItems.length, types: uploadedItems.map(i => i.type) }
        });
    }

    // Save to localStorage
    saveUserData();

    // Close modal and refresh gallery
    closeGalleryUploadModal();
    renderProfileGallery();

    showToast(`✓ ${galleryFilesToUpload.length} media item(s) uploaded successfully!`);
    galleryFilesToUpload = [];
}

function openGalleryViewer(index) {
    const gallery = state.currentUser?.gallery || [];
    if (gallery.length === 0) return;
    
    selectedGalleryIndex = index;
    const item = gallery[index];
    
    // Set media
    const mediaContainer = document.getElementById('gallery-viewer-media');
    if (item.type === 'video') {
        mediaContainer.innerHTML = `<video src="${item.url}" controls autoplay></video>`;
    } else {
        mediaContainer.innerHTML = `<img src="${item.url}" alt="Gallery image">`;
    }
    
    // Set info
    document.getElementById('gallery-viewer-title').textContent = `${item.type === 'video' ? 'Video' : 'Photo'} ${index + 1}`;
    document.getElementById('gallery-viewer-date').textContent = `Uploaded ${formatTimeAgo(item.uploadedAt || new Date())}`;
    
    // Render thumbnails
    const thumbnails = document.getElementById('gallery-viewer-thumbnails');
    thumbnails.innerHTML = gallery.map((thumb, i) => `
        <div class="thumbnail ${i === index ? 'active' : ''}" onclick="openGalleryViewer(${i})">
            ${thumb.type === 'video' ? 
                `<video src="${thumb.url}"></video>` : 
                `<img src="${thumb.url}">`
            }
        </div>
    `).join('');
    
    // Show modal
    const modal = document.getElementById('gallery-viewer-modal');
    if (modal) modal.style.display = 'flex';
}

function closeGalleryViewer(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('gallery-viewer-modal');
        if (modal) modal.style.display = 'none';
    }
}

function navigateGallery(direction) {
    const gallery = state.currentUser?.gallery || [];
    let newIndex = selectedGalleryIndex + direction;
    
    if (newIndex < 0) newIndex = gallery.length - 1;
    if (newIndex >= gallery.length) newIndex = 0;
    
    openGalleryViewer(newIndex);
}

function deleteGalleryItem(index = selectedGalleryIndex) {
    if (!state.currentUser?.gallery) return;

    if (confirm('Are you sure you want to delete this item?')) {
        const deletedItem = state.currentUser.gallery[index];
        state.currentUser.gallery.splice(index, 1);
        
        // Log activity
        logActivity({
            type: ActivityType.GALLERY_DELETE,
            level: ActivityLevel.WARNING,
            action: `Deleted ${deletedItem?.type || 'media'} from gallery`,
            details: { itemType: deletedItem?.type }
        });
        
        saveUserData();

        const gallery = state.currentUser.gallery;
        if (gallery.length === 0) {
            closeGalleryViewer();
        } else {
            const newIndex = index >= gallery.length ? gallery.length - 1 : index;
            openGalleryViewer(newIndex);
        }

        renderProfileGallery();
        showToast('Item deleted from gallery');
    }
}

function setAsProfilePhoto(index = selectedGalleryIndex) {
    const gallery = state.currentUser?.gallery;
    if (!gallery || !gallery[index]) return;

    if (gallery[index].type === 'video') {
        showToast('Cannot set video as profile photo. Please select an image.');
        return;
    }

    const oldAvatar = state.currentUser.avatar;
    state.currentUser.avatar = gallery[index].url;
    
    // Log activity
    logActivity({
        type: ActivityType.PROFILE_UPDATE,
        action: 'Changed profile photo from gallery',
        details: { oldAvatar: oldAvatar, newAvatar: gallery[index].url }
    });
    
    saveUserData();

    // Update profile UI
    const profileImg = document.querySelector('.profile-page-avatar img');
    if (profileImg) {
        profileImg.src = gallery[index].url;
    }

    showToast('Profile photo updated! ✓');
    closeGalleryViewer();
}

// Clubs system is below

// ==================== CLUBS SYSTEM ====================
let currentClubFilter = 'all';
let selectedClubId = null;

function renderClubs(filter = 'all') {
    const container = document.getElementById('clubs-grid');
    const emptyState = document.getElementById('clubs-empty-state');
    if (!container) return;
    
    currentClubFilter = filter;
    
    // Update category buttons
    document.querySelectorAll('.club-category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === filter);
    });
    
    // Filter clubs
    let filtered = state.clubs;
    if (filter !== 'all') {
        filtered = state.clubs.filter(club => club.category === filter);
    }
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    
    container.innerHTML = filtered.map(club => `
        <div class="club-card" onclick="openClubDetail(${club.id})">
            <div class="club-card-image">
                <img src="${club.image}" alt="${club.name}">
                ${club.isPrivate ? '<span class="club-card-badge"><i class="fas fa-lock"></i> Private</span>' : ''}
            </div>
            <div class="club-card-content">
                <h3 class="club-card-name">${club.name}</h3>
                <p class="club-card-description">${club.description}</p>
                <div class="club-card-meta">
                    <div class="club-members-count">
                        <div class="club-members-avatars">
                            ${club.members.slice(0, 4).map(img => `<img src="${img}" alt="Member">`).join('')}
                            ${club.members.length > 4 ? `<span style="font-size: 0.625rem; color: var(--text-tertiary);">+${club.members.length - 4}</span>` : ''}
                        </div>
                        <span>${club.memberCount}/${club.maxMembers}</span>
                    </div>
                    <span class="club-card-action">View Club →</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterClubs(category) {
    renderClubs(category);
}

function showCreateClubModal() {
    if (!state.currentUser) {
        showToast('Please login to create a club 🔐');
        showLogin();
        return;
    }
    const modal = document.getElementById('create-club-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateClubModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('create-club-modal');
        if (modal) modal.style.display = 'none';
    }
}

function createClub(event) {
    event.preventDefault();

    const name = document.getElementById('club-name').value;
    const category = document.getElementById('club-category').value;
    const description = document.getElementById('club-description').value;
    const maxMembers = parseInt(document.getElementById('club-max-members').value) || 50;
    const joinFee = parseInt(document.getElementById('club-join-fee').value) || 0;
    const isPrivate = document.querySelector('input[name="club-privacy"]:checked')?.value === 'private';
    const tags = document.getElementById('club-tags')?.value.split(',').map(t => t.trim()).filter(t => t) || [];

    const newClub = {
        id: Date.now(),
        name,
        category,
        description,
        creator: {
            id: state.currentUser.id,
            name: state.currentUser.name,
            image: state.currentUser.avatar
        },
        members: [state.currentUser.avatar],
        memberCount: 1,
        maxMembers,
        isPrivate,
        tags,
        createdAt: new Date(),
        activityLevel: 'new',
        joinFee: joinFee > 0 ? joinFee : undefined,
        image: 'https://picsum.photos/seed/club/400/300'
    };

    state.clubs.unshift(newClub);
    state.userClubs.push(newClub.id);
    ClubsDB.create({
        name: newClub.name,
        description: newClub.description,
        category: newClub.category,
        image: newClub.image,
        member_count: 1
    });
    logActivity
    logActivity({
        type: ActivityType.CLUB_CREATE,
        action: `Created club: "${name}"`,
        details: {
            clubName: name,
            category: category,
            isPrivate: isPrivate,
            joinFee: joinFee,
            maxMembers: maxMembers
        }
    });

    closeCreateClubModal();
    renderClubs();
    showToast('Club created successfully! 🎉 Start inviting members!');
}

function openClubDetail(clubId) {
    const club = state.clubs.find(c => c.id === clubId);
    if (!club) return;
    
    selectedClubId = clubId;
    
    // Populate modal
    document.getElementById('club-detail-image').src = club.image;
    document.getElementById('club-detail-name').textContent = club.name;
    document.getElementById('club-detail-category').textContent = club.category.charAt(0).toUpperCase() + club.category.slice(1);
    document.getElementById('club-detail-description').textContent = club.description;
    document.getElementById('club-detail-members').textContent = `${club.memberCount}/${club.maxMembers}`;
    document.getElementById('club-detail-creator').textContent = club.creator.name;
    document.getElementById('club-detail-activity').textContent = club.activityLevel.replace('-', ' ').toUpperCase();
    
    // Tags
    const tagsContainer = document.getElementById('club-detail-tags');
    tagsContainer.innerHTML = (club.tags || []).map(tag => `<span class="interest-tag">${tag}</span>`).join('');
    
    // Members
    const membersList = document.getElementById('club-members-list');
    membersList.innerHTML = club.members.slice(0, 12).map((img, i) => `
        <div class="club-member-avatar">
            <img src="${img}" alt="Member ${i + 1}">
        </div>
    `).join('');
    
    // Update join button
    const isMember = club.members.includes(state.currentUser?.avatar);
    const joinBtn = document.getElementById('club-join-btn');
    if (isMember) {
        joinBtn.innerHTML = '<i class="fas fa-check"></i> Member';
        joinBtn.classList.remove('btn-primary');
        joinBtn.classList.add('btn-outline');
    } else {
        joinBtn.innerHTML = `<i class="fas fa-user-plus"></i> ${club.isPrivate ? 'Request to Join' : 'Join Club'}`;
        joinBtn.classList.add('btn-primary');
        joinBtn.classList.remove('btn-outline');
    }
    
    const modal = document.getElementById('club-detail-modal');
    if (modal) modal.style.display = 'flex';
}

function closeClubDetail(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('club-detail-modal');
        if (modal) modal.style.display = 'none';
        selectedClubId = null;
    }
}

function toggleClubMembership() {
    if (!state.currentUser) {
        showToast('Please login to join clubs 🔐');
        showLogin();
        return;
    }

    const club = state.clubs.find(c => c.id === selectedClubId);
    if (!club) return;

    const isMember = club.members.includes(state.currentUser.avatar);

    if (isMember) {
        // Leave club
        if (confirm('Are you sure you want to leave this club?')) {
            club.members = club.members.filter(m => m !== state.currentUser.avatar);
            club.memberCount--;

            // Log activity
            logActivity({
                type: ActivityType.CLUB_LEAVE,
                level: ActivityLevel.WARNING,
                action: `Left club: "${club.name}"`,
                details: { clubName: club.name, clubId: club.id }
            });

            showToast('You left the club');
        }
    } else {
        // Join club
        if (club.memberCount >= club.maxMembers) {
            showToast('This club is full! 😔');
            return;
        }

        if (club.joinFee && club.joinFee > 0) {
            if (state.wallet.balance < club.joinFee) {
                showToast(`Insufficient funds. Join fee: R${club.joinFee}`);
                showRechargeRequestModal();
                return;
            }
            if (confirm(`Join fee: R${club.joinFee}. Proceed?`)) {
                state.wallet.balance -= club.joinFee;
                renderWallet();
            } else {
                return;
            }
        }

        club.members.push(state.currentUser.avatar);
        club.memberCount++;

        // Log activity
        logActivity({
            type: ActivityType.CLUB_JOIN,
            action: `Joined club: "${club.name}"`,
            details: {
                clubName: club.name,
                clubId: club.id,
                isPrivate: club.isPrivate,
                joinFee: club.joinFee || 0
            }
        });

        showToast(club.isPrivate ? 'Join request sent! Waiting for approval...' : 'Welcome to the club! 🎉');
    }

    // Refresh modal and grid
    openClubDetail(selectedClubId);
    renderClubs(currentClubFilter);
}

function showMyClubs() {
    if (!state.currentUser) {
        showToast('Please login to view your clubs 🔐');
        showLogin();
        return;
    }
    
    const myClubs = state.clubs.filter(club => club.members.includes(state.currentUser.avatar));
    
    if (myClubs.length === 0) {
        showToast('You are not a member of any clubs yet. Browse and join one!');
        switchView('clubs');
        return;
    }
    
    // Show my clubs in a modal or filter view
    showToast(`You're a member of ${myClubs.length} club(s)`);
    // Could open a dedicated "My Clubs" view
}

// Storage and cache utilities are below

// ==================== STORAGE & CACHE UTILITIES ====================

// Save user data to localStorage
function saveUserData() {
    try {
        if (state.currentUser) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.currentUser));
            // Also sync to Supabase if connected
            var sb = getSupabase();
            if (sb && state.currentUser.id && !state.currentUser.id.startsWith('local_')) {
                ProfileDB.upsert(state.currentUser);
            }
        }
        localStorage.setItem(STORAGE_KEYS.HAS_REGISTERED, 'true');
        localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(state.wallet));
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(state.userProfiles));
        console.log('💾 User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Load user data from localStorage
function loadUserData() {
    try {
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const savedWallet = localStorage.getItem(STORAGE_KEYS.WALLET);
        const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
        const hasRegistered = localStorage.getItem(STORAGE_KEYS.HAS_REGISTERED);
        
        if (savedUser) {
            state.currentUser = JSON.parse(savedUser);
            state.isLoggedIn = true;
            
            // Restore admin state if admin
            if (state.currentUser.isAdmin || state.currentUser.role === 'admin') {
                state.isAdmin = true;
                // Show admin features after a short delay (DOM needs to be ready)
                setTimeout(() => {
                    showAdminFeatures();
                }, 100);
            }
        }
        
        if (savedWallet) {
            state.wallet = JSON.parse(savedWallet);
        }
        
        if (savedProfiles) {
            state.userProfiles = JSON.parse(savedProfiles);
        }
        
        // Load reviews and call history
        const savedReviews = localStorage.getItem('koitus_reviews');
        if (savedReviews) {
            try { state.reviews = JSON.parse(savedReviews); } catch(e) { state.reviews = []; }
        } else {
            state.reviews = [];
        }
        const savedCallHistory = localStorage.getItem('koitus_call_history');
        if (savedCallHistory) {
            try { state.callHistory = JSON.parse(savedCallHistory); } catch(e) { state.callHistory = []; }
        } else {
            state.callHistory = [];
        }
        
        return !!hasRegistered;
    } catch (error) {
        console.error('Error loading user data:', error);
        return false;
    }
}

// Clear all cache and logout
function clearCacheAndLogout() {
    try {
        Object.values(STORAGE_KEYS).forEach(function(key) {
            localStorage.removeItem(key);
        });
        state.currentUser = null;
        state.isLoggedIn = false;
        state.isAdmin = false;
        state.currentChat = null;
        state.matches = [];
        state.conversations = [];
        state.wallet.balance = 0;
        state.wallet.transactions = [];
        state.reviews = [];
        state.callHistory = [];
        localStorage.removeItem('koitus_reviews');
        localStorage.removeItem('koitus_call_history');
        AuthDB.signOut();
        console.log('🗑️ Cache cleared and user logged out');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// Clear specific cache items (without logging out)
function clearCache(keepUser = true) {
    try {
        if (!keepUser) {
            localStorage.removeItem(STORAGE_KEYS.USER);
            state.currentUser = null;
            state.isLoggedIn = false;
        }
        
        // Clear temporary data
        localStorage.removeItem('koitus_temp');
        localStorage.removeItem('koitus_draft');
        
        console.log('🗑️ Cache cleared');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// ==================== COMPREHENSIVE PROFILE SYSTEM ====================

// Get comprehensive profile template
function getProfileTemplate() {
    return {
        // Basic Info
        id: null,
        name: '',
        age: null,
        gender: '',
        location: '',
        coordinates: { lat: -26.1076, lng: 28.0567 },
        
        // Profile Details
        bio: '',
        headline: '', // Tagline
        relationshipStatus: 'single',
        lookingFor: '',
        accountType: 'customer', // customer or provider
        profileType: 'guest',
        
        // Physical Attributes
        height: '',
        bodyType: '',
        ethnicity: '',
        hairColor: '',
        eyeColor: '',
        
        // Lifestyle
        smoking: '',
        drinking: '',
        diet: '',
        religion: '',
        education: '',
        occupation: '',
        income: '',
        
        // Preferences
        ageRange: { min: 18, max: 35 },
        distanceRange: 25,
        interestedIn: [],
        
        // Photos
        photos: [],
        avatar: '',
        verified: false,
        
        // Contact & Social
        email: '',
        phone: '',
        socialLinks: {
            instagram: '',
            twitter: '',
            facebook: '',
            website: ''
        },
        
        // Interests & Hobbies
        interests: [],
        hobbies: [],
        favorites: {
            music: '',
            movies: '',
            books: '',
            food: ''
        },
        
        // About Sections
        aboutMe: '',
        lookingForIn: '',
        turnOns: '',
        turnOffs: '',
        fantasies: '',
        
        // Settings
        isPrivate: false,
        showOnlineStatus: true,
        showDistance: true,
        allowMessages: 'everyone', // everyone, matches, none
        notifications: {
            email: true,
            push: true,
            sms: false
        },
        
        // Stats
        views: 0,
        likes: 0,
        matches: 0,
        profileCompleteness: 0,
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date()
    };
}

// Calculate profile completeness
function calculateProfileCompleteness(profile) {
    const fields = [
        'name', 'age', 'gender', 'location', 'bio', 'headline',
        'relationshipStatus', 'lookingFor', 'accountType', 'profileType',
        'height', 'bodyType', 'smoking', 'drinking', 'education',
        'occupation', 'interestedIn', 'avatar', 'interests', 'aboutMe'
    ];
    
    const filledFields = fields.filter(field => {
        const value = profile[field];
        if (Array.isArray(value)) return value.length > 0;
        return value && value.toString().trim() !== '';
    });
    
    return Math.round((filledFields.length / fields.length) * 100);
}

// Save comprehensive profile
function saveComprehensiveProfile(profileData) {
    try {
        if (!state.currentUser) {
            showToast('Please login to save profile 🔐');
            return false;
        }
        
        // Merge with existing profile
        const existingProfile = state.userProfiles[state.currentUser.id] || getProfileTemplate();
        
        const updatedProfile = {
            ...existingProfile,
            ...profileData,
            id: state.currentUser.id,
            updatedAt: new Date(),
            profileCompleteness: calculateProfileCompleteness({ ...existingProfile, ...profileData })
        };
        
        // Update userProfiles
        state.userProfiles[state.currentUser.id] = updatedProfile;
        
        // Update currentUser
        state.currentUser = {
            ...state.currentUser,
            ...profileData,
            profileCompleteness: updatedProfile.profileCompleteness
        };
        
        // Save to localStorage
        saveUserData();
        
        // Update UI
        updateProfileUI(updatedProfile);
        
        showToast('Profile saved successfully! ✓');
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Error saving profile. Please try again.');
        return false;
    }
}

// Get user profile
function getUserProfile(userId = null) {
    const id = userId || state.currentUser?.id;
    if (!id) return null;
    return state.userProfiles[id] || null;
}

// Update profile UI
function updateProfileUI(profile) {
    // Update profile view
    const nameEl = document.getElementById('my-profile-name');
    const bioEl = document.getElementById('my-profile-bio');
    const interestsEl = document.getElementById('my-profile-interests');
    
    if (nameEl) {
        nameEl.textContent = `${profile.name || 'Your Name'}, ${profile.age || ''}`;
    }
    
    if (bioEl) {
        bioEl.textContent = profile.bio || profile.aboutMe || 'Add a bio to tell people about yourself...';
    }
    
    if (interestsEl) {
        interestsEl.innerHTML = (profile.interests || []).map(interest => `
            <span class="interest-tag">${interest}</span>
        `).join('');
    }
    
    // Update completeness badge if exists
    const completenessEl = document.querySelector('.profile-completeness');
    if (completenessEl && profile.profileCompleteness) {
        completenessEl.textContent = `${profile.profileCompleteness}% Complete`;
    }
}

// ==================== ENHANCED PROFILE EDITING ====================

// Enhanced edit profile with all fields
function editProfile() {
    if (!state.currentUser) {
        showToast('Please login to edit profile 🔐');
        showLogin();
        return;
    }
    
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) {
        // If comprehensive modal doesn't exist, show basic one
        showBasicEditProfile();
        return;
    }
    
    // Get existing profile data
    const profile = getUserProfile() || state.currentUser;
    
    // Pre-fill all fields
    fillProfileForm(profile);
    
    modal.style.display = 'flex';
}

// Fill profile form with data
function fillProfileForm(profile) {
    // Basic Info
    setFieldValue('edit-name', profile.name);
    setFieldValue('edit-age', profile.age);
    setFieldValue('edit-gender', profile.gender);
    setFieldValue('edit-location', profile.location);
    setFieldValue('edit-headline', profile.headline);
    
    // Profile Details
    setFieldValue('edit-bio', profile.bio);
    setFieldValue('edit-about-me', profile.aboutMe);
    setFieldValue('edit-looking-for', profile.lookingFor);
    setFieldValue('edit-relationship-status', profile.relationshipStatus);
    
    // Physical Attributes
    setFieldValue('edit-height', profile.height);
    setFieldValue('edit-body-type', profile.bodyType);
    
    // Lifestyle
    setFieldValue('edit-smoking', profile.smoking);
    setFieldValue('edit-drinking', profile.drinking);
    setFieldValue('edit-education', profile.education);
    setFieldValue('edit-occupation', profile.occupation);
    
    // Contact
    setFieldValue('edit-email', profile.email);
    setFieldValue('edit-phone', profile.phone);
    
    // Interests
    setFieldValue('edit-interests', (profile.interests || []).join(', '));
    
    // Preferences
    setFieldValue('edit-interested-in', (profile.interestedIn || []).join(', '));
    
    // Social Links
    setFieldValue('edit-instagram', profile.socialLinks?.instagram);
    setFieldValue('edit-twitter', profile.socialLinks?.twitter);
    setFieldValue('edit-website', profile.socialLinks?.website);
    
    // Account Type
    setFieldValue('edit-account-type', profile.accountType);
    setFieldValue('edit-profile-type', profile.profileType);
}

// Set field value safely
function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value !== undefined && value !== null) {
        field.value = value;
    }
}

// Show basic edit profile (fallback)
function showBasicEditProfile() {
    const profile = getUserProfile() || state.currentUser;
    
    const modalHTML = `
        <div id="basic-edit-profile-modal" class="modal-overlay" style="display: flex;" onclick="closeBasicEditProfile(event)">
            <div class="modal-content edit-profile-modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Edit Profile</h2>
                    <button class="modal-close" onclick="closeBasicEditProfile()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="edit-profile-form" onsubmit="saveProfileChanges(event)">
                        <div class="profile-photo-upload">
                            <div class="current-photo" onclick="uploadProfilePhoto()">
                                <img src="${profile.avatar || 'https://i.pravatar.cc/200?u=You'}" alt="Profile Photo">
                                <div class="upload-overlay">
                                    <i class="fas fa-camera"></i>
                                </div>
                            </div>
                            <p class="upload-hint">Click to change photo</p>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-name">Full Name *</label>
                                <input type="text" id="edit-name" required placeholder="Your Name" value="${profile.name || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-age">Age *</label>
                                <input type="number" id="edit-age" required placeholder="25" min="18" max="100" value="${profile.age || ''}">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-gender">Gender</label>
                            <select id="edit-gender">
                                <option value="">Select Gender</option>
                                <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Male</option>
                                <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Female</option>
                                <option value="non-binary" ${profile.gender === 'non-binary' ? 'selected' : ''}>Non-binary</option>
                                <option value="other" ${profile.gender === 'other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-country">Country</label>
                                <select id="edit-country" onchange="onCountryChange('edit-country','edit-state', profile.state || '')">
                                    <option value="">Select Country</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-state">State/Province</label>
                                <select id="edit-state">
                                    <option value="">N/A</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="edit-location">Location</label>
                            <input type="text" id="edit-location" placeholder="City, Country" value="${profile.location || ''}">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-account-type">Account Type</label>
                                <select id="edit-account-type" onchange="updateProfileTypeOptions()">
                                    <option value="customer" ${(profile.accountType || 'customer') === 'customer' ? 'selected' : ''}>User</option>
                                    <option value="provider" ${profile.accountType === 'provider' ? 'selected' : ''}>Service Provider</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-profile-type">Profile Type</label>
                                <select id="edit-profile-type">
                                    <option value="">Select Profile Type</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-headline">Headline</label>
                            <input type="text" id="edit-headline" placeholder="A catchy tagline" value="${profile.headline || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-bio">Bio</label>
                            <textarea id="edit-bio" rows="3" placeholder="Brief description about yourself">${profile.bio || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-about-me">About Me</label>
                            <textarea id="edit-about-me" rows="4" placeholder="Tell others about yourself...">${profile.aboutMe || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-looking-for">Looking For</label>
                            <textarea id="edit-looking-for" rows="2" placeholder="What are you looking for on Koitus?">${profile.lookingFor || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-height">Height (cm)</label>
                                <input type="number" id="edit-height" placeholder="170" value="${profile.height || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-body-type">Body Type</label>
                                <select id="edit-body-type">
                                    <option value="">Select</option>
                                    <option value="athletic" ${profile.bodyType === 'athletic' ? 'selected' : ''}>Athletic</option>
                                    <option value="average" ${profile.bodyType === 'average' ? 'selected' : ''}>Average</option>
                                    <option value="slim" ${profile.bodyType === 'slim' ? 'selected' : ''}>Slim</option>
                                    <option value="curvy" ${profile.bodyType === 'curvy' ? 'selected' : ''}>Curvy</option>
                                    <option value="muscular" ${profile.bodyType === 'muscular' ? 'selected' : ''}>Muscular</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-interests">Interests (comma separated)</label>
                            <input type="text" id="edit-interests" placeholder="Hiking, Music, Travel, Food" value="${(profile.interests || []).join(', ')}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-occupation">Occupation</label>
                            <input type="text" id="edit-occupation" placeholder="Your profession" value="${profile.occupation || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-education">Education</label>
                            <select id="edit-education">
                                <option value="">Select Education Level</option>
                                <option value="high-school" ${profile.education === 'high-school' ? 'selected' : ''}>High School</option>
                                <option value="college" ${profile.education === 'college' ? 'selected' : ''}>College</option>
                                <option value="bachelor" ${profile.education === 'bachelor' ? 'selected' : ''}>Bachelor's Degree</option>
                                <option value="master" ${profile.education === 'master' ? 'selected' : ''}>Master's Degree</option>
                                <option value="phd" ${profile.education === 'phd' ? 'selected' : ''}>PhD</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-smoking">Smoking</label>
                            <select id="edit-smoking">
                                <option value="">Select</option>
                                <option value="never" ${profile.smoking === 'never' ? 'selected' : ''}>Never</option>
                                <option value="occasionally" ${profile.smoking === 'occasionally' ? 'selected' : ''}>Occasionally</option>
                                <option value="regularly" ${profile.smoking === 'regularly' ? 'selected' : ''}>Regularly</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-drinking">Drinking</label>
                            <select id="edit-drinking">
                                <option value="">Select</option>
                                <option value="never" ${profile.drinking === 'never' ? 'selected' : ''}>Never</option>
                                <option value="occasionally" ${profile.drinking === 'occasionally' ? 'selected' : ''}>Occasionally</option>
                                <option value="regularly" ${profile.drinking === 'regularly' ? 'selected' : ''}>Regularly</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-instagram">Instagram</label>
                            <input type="url" id="edit-instagram" placeholder="https://instagram.com/yourprofile" value="${profile.socialLinks?.instagram || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-website">Website</label>
                            <input type="url" id="edit-website" placeholder="https://yourwebsite.com" value="${profile.socialLinks?.website || ''}">
                        </div>
                        
                        <div class="profile-completeness-indicator" style="padding: var(--spacing-4); background: var(--bg-tertiary); border-radius: var(--radius-lg); margin-bottom: var(--spacing-4);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-2);">
                                <span style="font-weight: 600; color: var(--text-primary);">Profile Completeness</span>
                                <span id="completeness-value" style="color: var(--primary); font-weight: 700;">${profile.profileCompleteness || 0}%</span>
                            </div>
                            <div style="background: var(--bg-secondary); border-radius: var(--radius-full); height: 8px; overflow: hidden;">
                                <div id="completeness-bar" style="background: var(--primary-gradient); height: 100%; width: ${profile.profileCompleteness || 0}%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeBasicEditProfile()">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('basic-edit-profile-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize profile type dropdown
    updateProfileTypeOptions();
    var profileTypeSelect = document.getElementById('edit-profile-type');
    if (profileTypeSelect && profile.profileType) {
        profileTypeSelect.value = profile.profileType;
    }

    // Initialize country/state dropdowns
    populateCountrySelect('edit-country', profile.country || '');
    if (profile.country) {
        populateStateSelect('edit-country', 'edit-state', profile.state || '');
    }
}

function updateProfileTypeOptions() {
    var accountType = document.getElementById('edit-account-type')?.value;
    var profileTypeSelect = document.getElementById('edit-profile-type');
    if (!profileTypeSelect) return;
    
    var customerTypes = [
        { value: 'hunter', label: 'Hunter/Lion - Active pursuer' },
        { value: 'freak', label: 'Freak - Adventurous' },
        { value: 'lifestyler', label: 'Lifestyler - Lifestyle enthusiast' },
        { value: 'voyeur', label: 'Voyeur - Prefers watching' },
        { value: 'domintrix', label: 'Domintrix' },
        { value: 'vixen', label: 'Vixen' },
        { value: 'fetish-master', label: 'Fetish Master' },
        { value: 'casual', label: 'Casual' },
        { value: 'other', label: 'Other' }
    ];
    
    var providerTypes = [
        { value: 'creator', label: 'Creator' },
        { value: 'model', label: 'Model' },
        { value: 'dancer', label: 'Dancer' },
        { value: 'escort', label: 'Escort' },
        { value: 'promoter', label: 'Promoter' },
        { value: 'studio', label: 'Studio' },
        { value: 'venue', label: 'Venue' },
        { value: 'club', label: 'Club' }
    ];
    
    var types = accountType === 'provider' ? providerTypes : customerTypes;
    var currentValue = profileTypeSelect.value;
    
    profileTypeSelect.innerHTML = '<option value="">Select Profile Type</option>' +
        types.map(function(t) {
            return '<option value="' + t.value + '">' + t.label + '</option>';
        }).join('');
    
    if (currentValue) profileTypeSelect.value = currentValue;
}

function closeBasicEditProfile(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('basic-edit-profile-modal');
        if (modal) modal.remove();
    }
}

// Enhanced save profile changes
function saveProfileChanges(e) {
    e.preventDefault();
    
    const profileData = {
        // Basic Info
        name: document.getElementById('edit-name').value,
        age: parseInt(document.getElementById('edit-age').value) || null,
        gender: document.getElementById('edit-gender').value,
        location: document.getElementById('edit-location').value,
        
        // Profile Details
        headline: document.getElementById('edit-headline').value,
        bio: document.getElementById('edit-bio').value,
        aboutMe: document.getElementById('edit-about-me').value,
        lookingFor: document.getElementById('edit-looking-for').value,
        
        // Physical Attributes
        height: document.getElementById('edit-height').value,
        bodyType: document.getElementById('edit-body-type').value,
        
        // Lifestyle
        smoking: document.getElementById('edit-smoking').value,
        drinking: document.getElementById('edit-drinking').value,
        education: document.getElementById('edit-education').value,
        occupation: document.getElementById('edit-occupation').value,
        
        // Interests
        interests: document.getElementById('edit-interests').value.split(',').map(i => i.trim()).filter(i => i),
        
        // Social Links
        socialLinks: {
            instagram: document.getElementById('edit-instagram').value,
            twitter: document.getElementById('edit-twitter')?.value || '',
            website: document.getElementById('edit-website').value
        },
        
        // Account Type
        accountType: document.getElementById('edit-account-type')?.value || 'customer',
        profileType: document.getElementById('edit-profile-type')?.value || '',
        type: document.getElementById('edit-profile-type')?.value || document.getElementById('edit-account-type')?.value || 'customer',
        
        // Country & State
        country: document.getElementById('edit-country')?.value || '',
        state: document.getElementById('edit-state')?.value || ''
    };
    
    // Auto-generate location string from country/state
    var countryCode = profileData.country;
    var stateName = profileData.state;
    if (countryCode || stateName) {
        profileData.location = getLocationString(countryCode, stateName);
    }
    
    // Save comprehensive profile
    const success = saveComprehensiveProfile(profileData);
    
    if (success) {
        // Close modal
        const modal = document.getElementById('basic-edit-profile-modal') || document.getElementById('edit-profile-modal');
        if (modal) modal.style.display = 'none';
        
        // Update UI
        renderUsers();
        updateNavVisibility();
    }
}

// Upload profile photo
function uploadProfilePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB ⚠️');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                if (state.currentUser) {
                    state.currentUser.avatar = event.target.result;
                    saveUserData(); // Persist avatar change
                }
                showToast('Photo uploaded successfully! ✓');
                
                // Update UI immediately
                const img = document.querySelector('.current-photo img');
                if (img) img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// Logout function (explicit)
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearCacheAndLogout();
        window.location.reload();
    }
}

// ==================== COMPREHENSIVE CRUD OPERATIONS ====================
// All missing Create/Read/Update/Delete operations for every entity

// -------------------------------------------------------------------
// 1. EVENT CRUD
// -------------------------------------------------------------------

function editEvent(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) { showToast('Event not found'); return; }

    const modalHTML = `
        <div id="edit-event-modal" class="modal-overlay" style="display:flex;" onclick="closeEditEventModal(event)">
            <div class="modal-content event-modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Edit Event</h2>
                    <button class="modal-close" onclick="closeEditEventModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="edit-event-form" onsubmit="updateEvent(event, ${event.id})">
                        <div class="form-group">
                            <label for="edit-event-name">Event Name *</label>
                            <input type="text" id="edit-event-name" required value="${event.name.replace(/"/g,'&quot;')}">
                        </div>
                        <div class="form-group">
                            <label for="edit-event-type">Event Type *</label>
                            <select id="edit-event-type" required>
                                <option value="party" ${event.type==='party'?'selected':''}>Party</option>
                                <option value="social" ${event.type==='social'?'selected':''}>Social Meetup</option>
                                <option value="networking" ${event.type==='networking'?'selected':''}>Networking</option>
                                <option value="workshop" ${event.type==='workshop'?'selected':''}>Workshop</option>
                                <option value="concert" ${event.type==='concert'?'selected':''}>Concert & Show</option>
                                <option value="other" ${event.type==='other'?'selected':''}>Other</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-event-date">Date *</label>
                                <input type="date" id="edit-event-date" required value="${event.date}">
                            </div>
                            <div class="form-group">
                                <label for="edit-event-time">Time *</label>
                                <input type="time" id="edit-event-time" required value="${event.time}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-event-location">Location / Venue *</label>
                            <input type="text" id="edit-event-location" required value="${event.location.replace(/"/g,'&quot;')}">
                        </div>
                        <div class="form-group">
                            <label for="edit-event-description">Description *</label>
                            <textarea id="edit-event-description" required rows="4">${event.description.replace(/"/g,'&quot;')}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-event-price">Price (e.g. R150 or Free)</label>
                                <input type="text" id="edit-event-price" value="${event.price||'Free'}">
                            </div>
                            <div class="form-group">
                                <label for="edit-event-capacity">Max Capacity</label>
                                <input type="number" id="edit-event-capacity" value="${event.capacity||100}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="edit-event-private" ${event.isPrivate?'checked':''}> Private Event (Invite Only)</label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeEditEventModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditEventModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('edit-event-modal');
        if (modal) modal.remove();
    }
}

function updateEvent(event, eventId) {
    event.preventDefault();
    const ev = state.events.find(e => e.id === eventId);
    if (!ev) return;

    ev.name = document.getElementById('edit-event-name').value;
    ev.type = document.getElementById('edit-event-type').value;
    ev.date = document.getElementById('edit-event-date').value;
    ev.time = document.getElementById('edit-event-time').value;
    ev.location = document.getElementById('edit-event-location').value;
    ev.description = document.getElementById('edit-event-description').value;
    ev.price = document.getElementById('edit-event-price').value || 'Free';
    ev.capacity = parseInt(document.getElementById('edit-event-capacity').value) || 100;
    ev.isPrivate = document.getElementById('edit-event-private').checked;

    logActivity({
        type: ActivityType.EVENT_UPDATE,
        level: ActivityLevel.INFO,
        action: `Updated event: "${ev.name}"`,
        details: { eventId: ev.id, eventName: ev.name }
    });

    closeEditEventModal();
    renderEvents();
    saveUserData();
    showToast('Event updated successfully! ✓');
}

function deleteEvent(eventId) {
    const ev = state.events.find(e => e.id === eventId);
    if (!ev) return;
    if (!confirm(`Are you sure you want to delete "${ev.name}"? This cannot be undone.`)) return;

    state.events = state.events.filter(e => e.id !== eventId);

    logActivity({
        type: 'event_delete',
        level: 'critical',
        action: `Deleted event: "${ev.name}"`,
        details: { eventId, eventName: ev.name }
    });

    closeEventDetail();
    renderEvents();
    saveUserData();
    showToast('Event deleted permanently 🗑️');
}

function cancelEvent() {
    if (!state.selectedEvent) return;
    if (!confirm(`Cancel "${state.selectedEvent.name}"? Attendees will be notified.`)) return;
    state.selectedEvent.cancelled = true;
    showToast('Event cancelled. Attendees notified.');
    closeEventDetail();
    renderEvents();
    saveUserData();
}

// -------------------------------------------------------------------
// 2. PRODUCT CRUD
// -------------------------------------------------------------------

function editProduct(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) { showToast('Product not found'); return; }

    const modalHTML = `
        <div id="edit-product-modal" class="modal-overlay" style="display:flex;" onclick="closeEditProductModal(event)">
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Edit Product</h2>
                    <button class="modal-close" onclick="closeEditProductModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="edit-product-form" onsubmit="updateProduct(event, ${product.id})">
                        <div class="form-group">
                            <label for="edit-product-name">Product Name *</label>
                            <input type="text" id="edit-product-name" required value="${product.name.replace(/"/g,'&quot;')}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-product-category">Category *</label>
                                <select id="edit-product-category" required>
                                    ${['lingerie','photography','dance','jewelry','fitness','events','wellness','music'].map(c =>
                                        `<option value="${c}" ${product.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-product-price">Price (R) *</label>
                                <input type="number" id="edit-product-price" required step="0.01" value="${product.price}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-product-original-price">Original Price (for discount)</label>
                                <input type="number" id="edit-product-original-price" step="0.01" value="${product.originalPrice||''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-product-stock">Stock</label>
                                <input type="number" id="edit-product-stock" value="${product.stock}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-product-description">Description *</label>
                            <textarea id="edit-product-description" required rows="4">${product.description.replace(/"/g,'&quot;')}</textarea>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="edit-product-featured" ${product.isFeatured?'checked':''}> Featured Product</label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeEditProductModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditProductModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('edit-product-modal');
        if (modal) modal.remove();
    }
}

function updateProduct(event, productId) {
    event.preventDefault();
    const p = state.products.find(pr => pr.id === productId);
    if (!p) return;

    p.name = document.getElementById('edit-product-name').value;
    p.category = document.getElementById('edit-product-category').value;
    p.price = parseFloat(document.getElementById('edit-product-price').value);
    p.originalPrice = parseFloat(document.getElementById('edit-product-original-price').value) || null;
    p.stock = parseInt(document.getElementById('edit-product-stock').value) || 999;
    p.description = document.getElementById('edit-product-description').value;
    p.isFeatured = document.getElementById('edit-product-featured').checked;

    closeEditProductModal();
    renderProducts();
    saveUserData();
    showToast('Product updated! ✓');
}

function deleteProduct(productId) {
    const p = state.products.find(pr => pr.id === productId);
    if (!p) return;
    if (!confirm(`Delete "${p.name}" permanently?`)) return;
    state.products = state.products.filter(pr => pr.id !== productId);
    closeProductDetail();
    renderProducts();
    saveUserData();
    showToast('Product deleted 🗑️');
}

// -------------------------------------------------------------------
// 3. FORUM POST CRUD
// -------------------------------------------------------------------

function editForumPost(postId, forumType) {
    const posts = forumType === 'provider' ? state.providerForumPosts : state.forumPosts;
    const post = posts.find(p => p.id === postId);
    if (!post) { showToast('Post not found'); return; }

    const modalHTML = `
        <div id="edit-forum-post-modal" class="modal-overlay" style="display:flex;" onclick="closeEditForumPostModal(event)">
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Edit Forum Post</h2>
                    <button class="modal-close" onclick="closeEditForumPostModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="edit-forum-post-form" onsubmit="updateForumPost(event, ${postId}, '${forumType}')">
                        <div class="form-group">
                            <label for="edit-post-title">Title *</label>
                            <input type="text" id="edit-post-title" required value="${post.title.replace(/"/g,'&quot;')}">
                        </div>
                        <div class="form-group">
                            <label for="edit-post-category">Category *</label>
                            <select id="edit-post-category" required>
                                ${(forumType === 'provider'
                                    ? ['professional','services','marketing','networking','events','opportunities','collaboration']
                                    : ['general','dating','relationships','social','events','advice','introductions','discussions']
                                ).map(c =>
                                    `<option value="${c}" ${post.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-post-content">Content *</label>
                            <textarea id="edit-post-content" required rows="6">${post.content.replace(/"/g,'&quot;')}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="edit-post-tags">Tags (comma separated)</label>
                            <input type="text" id="edit-post-tags" value="${(post.tags||[]).join(', ')}">
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="edit-post-anonymous" ${post.isAnonymous?'checked':''}> Post Anonymously</label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeEditForumPostModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditForumPostModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('edit-forum-post-modal');
        if (modal) modal.remove();
    }
}

function updateForumPost(event, postId, forumType) {
    event.preventDefault();
    const posts = forumType === 'provider' ? state.providerForumPosts : state.forumPosts;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    post.title = document.getElementById('edit-post-title').value;
    post.category = document.getElementById('edit-post-category').value;
    post.content = document.getElementById('edit-post-content').value;
    post.tags = document.getElementById('edit-post-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    post.isAnonymous = document.getElementById('edit-post-anonymous').checked;
    post.editedAt = new Date().toISOString();

    closeEditForumPostModal();
    if (forumType === 'provider') renderProviderForumPosts(); else renderForumPosts();
    saveUserData();
    showToast('Post updated! ✓');
}

function deleteForumPost(postId, forumType) {
    if (!confirm('Delete this forum post permanently?')) return;
    if (forumType === 'provider') {
        state.providerForumPosts = state.providerForumPosts.filter(p => p.id !== postId);
        renderProviderForumPosts();
    } else {
        state.forumPosts = state.forumPosts.filter(p => p.id !== postId);
        renderForumPosts();
    }
    saveUserData();
    showToast('Post deleted 🗑️');
}

// Approve/reject posts from detail view
function approvePost(postId) {
    const post = [...state.forumPosts, ...state.providerForumPosts].find(p => p.id === postId);
    if (!post) return;
    post.status = 'approved';
    post.approvedAt = new Date().toISOString();
    loadAdminSection('forum');
    showToast('Post approved ✓');
}

function rejectPost(postId) {
    const post = [...state.forumPosts, ...state.providerForumPosts].find(p => p.id === postId);
    if (!post) return;
    if (confirm(`Reject "${post.title}"? It will be removed.`)) {
        state.forumPosts = state.forumPosts.filter(p => p.id !== postId);
        state.providerForumPosts = state.providerForumPosts.filter(p => p.id !== postId);
        loadAdminSection('forum');
        showToast('Post rejected and removed');
    }
}

// -------------------------------------------------------------------
// 4. CLUB CRUD
// -------------------------------------------------------------------

function editClub(clubId) {
    const club = state.clubs.find(c => c.id === clubId);
    if (!club) { showToast('Club not found'); return; }

    const modalHTML = `
        <div id="edit-club-modal" class="modal-overlay" style="display:flex;" onclick="closeEditClubModal(event)">
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Edit Club</h2>
                    <button class="modal-close" onclick="closeEditClubModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="edit-club-form" onsubmit="updateClub(event, ${club.id})">
                        <div class="form-group">
                            <label for="edit-club-name">Club Name *</label>
                            <input type="text" id="edit-club-name" required value="${club.name.replace(/"/g,'&quot;')}">
                        </div>
                        <div class="form-group">
                            <label for="edit-club-category">Category *</label>
                            <select id="edit-club-category" required>
                                ${['professional','adventure','luxury','creative','fitness'].map(c =>
                                    `<option value="${c}" ${club.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-club-description">Description *</label>
                            <textarea id="edit-club-description" required rows="4">${club.description.replace(/"/g,'&quot;')}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-club-max-members">Max Members</label>
                                <input type="number" id="edit-club-max-members" value="${club.maxMembers||100}">
                            </div>
                            <div class="form-group">
                                <label for="edit-club-join-fee">Join Fee (R)</label>
                                <input type="number" id="edit-club-join-fee" step="0.01" value="${club.joinFee||0}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-club-tags">Tags (comma separated)</label>
                            <input type="text" id="edit-club-tags" value="${(club.tags||[]).join(', ')}">
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="edit-club-private" ${club.isPrivate?'checked':''}> Private Club</label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeEditClubModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditClubModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('edit-club-modal');
        if (modal) modal.remove();
    }
}

function updateClub(event, clubId) {
    event.preventDefault();
    const club = state.clubs.find(c => c.id === clubId);
    if (!club) return;

    club.name = document.getElementById('edit-club-name').value;
    club.category = document.getElementById('edit-club-category').value;
    club.description = document.getElementById('edit-club-description').value;
    club.maxMembers = parseInt(document.getElementById('edit-club-max-members').value) || 100;
    club.joinFee = parseFloat(document.getElementById('edit-club-join-fee').value) || 0;
    club.tags = document.getElementById('edit-club-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    club.isPrivate = document.getElementById('edit-club-private').checked;

    closeEditClubModal();
    renderClubs(currentClubFilter || 'all');
    saveUserData();
    showToast('Club updated! ✓');
}

function deleteClub(clubId) {
    const club = state.clubs.find(c => c.id === clubId);
    if (!club) return;
    if (!confirm(`Delete club "${club.name}" permanently? All members will be removed.`)) return;

    state.clubs = state.clubs.filter(c => c.id !== clubId);
    closeClubDetail();
    renderClubs(currentClubFilter || 'all');
    saveUserData();
    showToast('Club deleted 🗑️');
}

// -------------------------------------------------------------------
// 5. CONTENT/MEDIA CRUD
// -------------------------------------------------------------------

function editContent(contentId) {
    const content = state.content.find(c => c.id === contentId);
    if (!content) { showToast('Content not found'); return; }

    const newCaption = prompt('Edit caption:', content.caption || '');
    if (newCaption === null) return;

    content.caption = newCaption.trim() || content.caption;
    content.editedAt = new Date().toISOString();
    renderContent();
    saveUserData();
    showToast('Caption updated ✓');
}

function deleteContent(contentId) {
    const content = state.content.find(c => c.id === contentId);
    if (!content) return;
    if (!confirm('Delete this content permanently?')) return;

    state.content = state.content.filter(c => c.id !== contentId);
    closeContentDetail();
    renderContent();
    saveUserData();
    showToast('Content deleted 🗑️');
}

function reportContent(contentId) {
    const content = state.content.find(c => c.id === contentId);
    if (!content) return;
    state.adminData.reports.push({
        id: Date.now(),
        type: 'content',
        contentId: contentId,
        reportedBy: state.currentUser?.id || 'anonymous',
        reason: prompt('Why are you reporting this content?'),
        date: new Date(),
        status: 'pending'
    });
    saveUserData();
    showToast('Content reported. Admin will review.');
}

// -------------------------------------------------------------------
// 6. MESSAGE CRUD
// -------------------------------------------------------------------

function deleteMessage(conversationId, messageId) {
    if (!confirm('Delete this message?')) return;
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) return;
    conv.messages = conv.messages.filter(m => m.id !== messageId);
    renderMessages();
    saveUserData();
    showToast('Message deleted');
}

function editMessage(conversationId, messageId) {
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) return;
    const msg = conv.messages.find(m => m.id === messageId);
    if (!msg) return;

    const newText = prompt('Edit message:', msg.text);
    if (newText === null || !newText.trim()) return;

    msg.text = newText.trim();
    msg.editedAt = new Date().toISOString();
    renderMessages();
    saveUserData();
    showToast('Message updated ✓');
}

function toggleChatMenu() {
    const menu = document.getElementById('chat-more-menu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', function(e) {
    const menu = document.getElementById('chat-more-menu');
    if (menu && !e.target.closest('.chat-more-menu') && !e.target.closest('.btn-icon')) {
        menu.style.display = 'none';
    }
});

function clearConversation(conversationId) {
    if (!confirm('Clear all messages in this conversation?')) return;
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) return;
    conv.messages = [];
    renderMessages();
    renderConversations();
    saveUserData();
    showToast('Conversation cleared');
}

// ==================== PROVIDER PORTAL ====================
var portalState = {
    section: 'dashboard',
    contentTab: 'all',
    storeTab: 'products',
    bookingTab: 'upcoming'
};

function renderProviderPortal() {
    var user = state.currentUser;
    if (!user) { switchView('discover'); showToast('Please log in first'); return; }
    if (!user.profile) {
        user.profile = {
            providerType: 'general',
            bio: user.bio || 'Service Provider'
        };
    }

    // Set profile summary
    document.getElementById('portal-avatar').src = user.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=6366f1&color=fff';
    document.getElementById('portal-name').textContent = user.name;

    var typeKey = user.accountType === 'provider' ? (user.profile.providerType || 'general') : (user.accountType || 'general');
    var pt = profileTypes[typeKey] || profileTypes.general;
    var typeBadge = document.getElementById('portal-type-badge');
    typeBadge.textContent = pt.label;
    typeBadge.style.background = pt.color + '22';
    typeBadge.style.color = pt.color;

    // Set date
    document.getElementById('portal-date').textContent = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    renderPortalDashboard();
    switchPortalSection(portalState.section);
}

function closeProviderPortal() {
    switchView('discover');
}

function switchPortalSection(section) {
    portalState.section = section;

    document.querySelectorAll('.portal-nav-item').forEach(function(el) {
        el.classList.toggle('active', el.dataset.section === section);
    });
    document.querySelectorAll('.portal-section').forEach(function(el) {
        el.classList.toggle('active', el.id === 'portal-' + section);
    });

    switch (section) {
        case 'dashboard': renderPortalDashboard(); break;
        case 'content': renderPortalContent(); break;
        case 'store': renderPortalStore(); break;
        case 'analytics': renderPortalAnalytics(); break;
        case 'bookings': renderPortalBookings(); break;
        case 'promotions': break;
        case 'monetization': renderPortalMonetization(); break;
        case 'messages': renderPortalMessages(); break;
        case 'settings': renderPortalSettings(); break;
    }
}

function renderPortalDashboard() {
    var user = state.currentUser;
    var stats = calculateProviderStats();

    document.getElementById('portal-stat-views').textContent = stats.views;
    document.getElementById('portal-stat-messages').textContent = stats.messages;
    document.getElementById('portal-stat-earnings').textContent = 'R' + stats.earnings;
    document.getElementById('portal-stat-listings').textContent = stats.listings;

    // Recent activity
    var activityHtml = '';
    var activities = state.activityFeed || [];
    var recent = activities.slice(-5).reverse();
    if (recent.length === 0) {
        var sampleActivities = [
            { icon: 'fa-user', text: 'Someone viewed your profile', time: '2 hours ago', color: 'var(--primary)' },
            { icon: 'fa-heart', text: 'You received a new like', time: '5 hours ago', color: 'var(--error)' },
            { icon: 'fa-comment', text: 'New message from a client', time: '1 day ago', color: 'var(--success)' }
        ];
        recent = sampleActivities;
    }
    activityHtml = recent.map(function(a) {
        return '<div class="portal-activity-item"><div class="portal-activity-icon" style="background:' + (a.color || 'var(--bg-tertiary)') + '22;color:' + (a.color || 'var(--text-secondary)') + '"><i class="fas ' + (a.icon || 'fa-circle') + '"></i></div><div class="portal-activity-info"><p>' + (a.text || '') + '</p><span>' + (a.time || '') + '</span></div></div>';
    }).join('');
    document.getElementById('portal-recent-activity').innerHTML = activityHtml;

    // Performance chart
    renderPortalMiniChart();
}

function renderPortalMiniChart() {
    var canvas = document.getElementById('portal-chart-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (window.portalChart) window.portalChart.destroy();

    var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var data = labels.map(function() { return Math.floor(Math.random() * 50) + 10; });

    if (typeof Chart !== 'undefined') {
        window.portalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Profile Views',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    } else {
        canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:0.85rem"><i class="fas fa-chart-line" style="margin-right:8px;opacity:0.5"></i>Chart library not loaded</div>';
    }
}

function calculateProviderStats() {
    var totalMessages = state.conversations ? state.conversations.reduce(function(sum, c) {
        return sum + (c.messages ? c.messages.length : 0);
    }, 0) : 0;
    var totalEarnings = state.store.earnings ? state.store.earnings.reduce(function(s, e) { return s + e.amount; }, 0) : 0;
    var totalListings = (state.store.products ? state.store.products.length : 0) + (state.content ? state.content.length : 0);

    return {
        views: Math.floor(Math.random() * 500) + 100,
        messages: totalMessages,
        earnings: totalEarnings,
        listings: totalListings
    };
}

function renderPortalContent() {
    var grid = document.getElementById('portal-content-grid');
    if (!grid) return;
    var tab = portalState.contentTab || 'all';
    var items = state.content || [];
    if (items.length === 0) {
        grid.innerHTML = '<div class="portal-empty-state"><i class="fas fa-camera" style="font-size:2rem;margin-bottom:var(--spacing-3);color:var(--text-muted)"></i><p>No content uploaded yet</p><button class="btn btn-primary btn-sm" onclick="showUploadContentModal()"><i class="fas fa-plus"></i> Upload Content</button></div>';
        return;
    }
    var filtered = tab === 'all' ? items : items.filter(function(i) { return i.type === tab; });
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="portal-empty-state">No ' + tab + ' content</div>';
        return;
    }
    grid.innerHTML = filtered.map(function(item) {
        return '\
        <div class="portal-content-item">\
            <div class="portal-content-thumb" style="background:linear-gradient(135deg,var(--primary),var(--secondary))">\
                <i class="fas fa-' + (item.type === 'video' ? 'video' : 'image') + '"></i>\
            </div>\
            <div class="portal-content-info">\
                <h5>' + (item.title || 'Untitled') + '</h5>\
                <span class="portal-content-meta">' + (item.views || 0) + ' views · ' + (item.likes || 0) + ' likes</span>\
            </div>\
            <button class="btn btn-icon btn-sm" onclick="editContent(' + (item.id || 0) + ')"><i class="fas fa-edit"></i></button>\
        </div>';
    }).join('');
}

function switchPortalContentTab(tab) {
    portalState.contentTab = tab;
    document.querySelectorAll('.portal-content-tab').forEach(function(el) {
        el.classList.toggle('active', el.dataset.ctab === tab);
    });
    renderPortalContent();
}

function renderPortalStore() {
    updatePortalStoreStats();
    switchPortalStoreTab(portalState.storeTab);
}

function updatePortalStoreStats() {
    var products = state.store.products || [];
    var orders = state.store.orders || [];
    var earnings = state.store.earnings || [];
    var reviews = state.store.reviews || [];

    document.getElementById('portal-store-products').textContent = products.length;
    document.getElementById('portal-store-orders').textContent = orders.length;
    var total = earnings.reduce(function(s, e) { return s + e.amount; }, 0);
    document.getElementById('portal-store-earnings').textContent = 'R' + total;
    var avgRating = reviews.length > 0 ? (reviews.reduce(function(s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1) : '0.0';
    document.getElementById('portal-store-rating').textContent = avgRating;
}

function switchPortalStoreTab(tab) {
    portalState.storeTab = tab;
    document.querySelectorAll('.portal-store-tab').forEach(function(el) {
        el.classList.toggle('active', el.dataset.stab === tab);
    });

    var container = document.getElementById('portal-store-content');
    if (!container) return;

    switch (tab) {
        case 'products':
            var products = state.store.products || [];
            if (products.length === 0) {
                container.innerHTML = '<div class="portal-empty-state">No products yet. <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">Add Product</button></div>';
            } else {
                container.innerHTML = products.map(function(p) {
                    var statusClass = p.status === 'active' ? 'success' : (p.status === 'draft' ? 'warning' : 'muted');
                    return '\
                    <div class="portal-store-item">\
                        <div class="portal-store-item-img" style="background:linear-gradient(135deg,var(--primary),var(--secondary))">\
                            <i class="fas fa-box"></i>\
                        </div>\
                        <div class="portal-store-item-info">\
                            <h5>' + (p.name || 'Product') + '</h5>\
                            <span class="portal-store-item-price">R' + (p.price || 0) + '</span>\
                            <span class="portal-store-item-status" style="color:var(--' + statusClass + ')">' + (p.status || 'draft') + '</span>\
                        </div>\
                        <div class="portal-store-item-actions">\
                            <button class="btn btn-icon btn-sm" onclick="editStoreProduct(' + p.id + ')"><i class="fas fa-edit"></i></button>\
                            <button class="btn btn-icon btn-sm" onclick="deleteStoreProduct(' + p.id + ')"><i class="fas fa-trash"></i></button>\
                        </div>\
                    </div>';
                }).join('');
            }
            break;
        case 'orders':
            var orders = state.store.orders || [];
            if (orders.length === 0) {
                container.innerHTML = '<div class="portal-empty-state">No orders yet</div>';
            } else {
                container.innerHTML = orders.map(function(o) {
                    var statusColor = o.status === 'delivered' ? 'var(--success)' : (o.status === 'pending' ? 'var(--warning)' : (o.status === 'shipped' ? 'var(--primary)' : 'var(--text-muted)'));
                    return '\
                    <div class="portal-store-item">\
                        <div class="portal-store-item-info">\
                            <h5>' + (o.product || 'Order #' + o.id) + '</h5>\
                            <span class="portal-store-item-customer"><i class="fas fa-user"></i> ' + (o.customer || 'Unknown') + '</span>\
                            <span class="portal-store-item-price">R' + (o.amount || 0) + ' x ' + (o.quantity || 1) + '</span>\
                            <span class="portal-store-item-status" style="color:' + statusColor + '">' + (o.status || 'pending') + '</span>\
                        </div>\
                        <div class="portal-store-item-actions">\
                            <select class="portal-order-status-select" onchange="updateOrderStatus(' + o.id + ', this.value)">\
                                <option value="pending"' + (o.status === 'pending' ? ' selected' : '') + '>Pending</option>\
                                <option value="shipped"' + (o.status === 'shipped' ? ' selected' : '') + '>Shipped</option>\
                                <option value="delivered"' + (o.status === 'delivered' ? ' selected' : '') + '>Delivered</option>\
                                <option value="cancelled"' + (o.status === 'cancelled' ? ' selected' : '') + '>Cancelled</option>\
                            </select>\
                        </div>\
                    </div>';
                }).join('');
            }
            break;
        case 'earnings':
            var earnings = state.store.earnings || [];
            var total = earnings.reduce(function(s, e) { return s + e.amount; }, 0);
            if (earnings.length === 0) {
                container.innerHTML = '<div class="portal-empty-state">No earnings yet</div>';
            } else {
                container.innerHTML = '\
                <div class="portal-earnings-summary">\
                    <div class="portal-earnings-total"><span>Total Earnings</span><strong>R' + total + '</strong></div>\
                </div>\
                <div class="portal-earnings-list">' +
                earnings.map(function(e) {
                    return '<div class="portal-earnings-item"><span>' + (e.description || 'Sale') + '</span><span class="portal-earnings-amount">+R' + e.amount + '</span><span class="portal-earnings-date">' + (e.date ? new Date(e.date).toLocaleDateString() : '') + '</span></div>';
                }).join('') + '</div>';
            }
            break;
        case 'reviews':
            var reviews = state.store.reviews || [];
            if (reviews.length === 0) {
                container.innerHTML = '<div class="portal-empty-state">No reviews yet</div>';
            } else {
                container.innerHTML = reviews.map(function(r) {
                    var stars = '';
                    for (var i = 0; i < 5; i++) {
                        stars += '<i class="fas fa-star" style="color:' + (i < r.rating ? 'var(--warning)' : 'var(--border-light)') + ';font-size:0.8rem"></i>';
                    }
                    return '\
                    <div class="portal-store-item">\
                        <div class="portal-store-item-info">\
                            <h5>' + (r.customer || 'Anonymous') + '</h5>\
                            <div>' + stars + '</div>\
                            <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px">' + (r.text || '') + '</p>\
                        </div>\
                    </div>';
                }).join('');
            }
            break;
    }
}

function searchPortalStore(value) {
    var q = value.toLowerCase().trim();
    var products = state.store.products || [];
    var filtered = q ? products.filter(function(p) { return (p.name || '').toLowerCase().indexOf(q) > -1; }) : products;
    var container = document.getElementById('portal-store-content');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="portal-empty-state">No products matching "' + q + '"</div>';
    } else {
        container.innerHTML = filtered.map(function(p) {
            return '\
            <div class="portal-store-item">\
                <div class="portal-store-item-img" style="background:linear-gradient(135deg,var(--primary),var(--secondary))">\
                    <i class="fas fa-box"></i>\
                </div>\
                <div class="portal-store-item-info">\
                    <h5>' + (p.name || 'Product') + '</h5>\
                    <span class="portal-store-item-price">R' + (p.price || 0) + '</span>\
                </div>\
                <div class="portal-store-item-actions">\
                    <button class="btn btn-icon btn-sm" onclick="editStoreProduct(' + p.id + ')"><i class="fas fa-edit"></i></button>\
                    <button class="btn btn-icon btn-sm" onclick="deleteStoreProduct(' + p.id + ')"><i class="fas fa-trash"></i></button>\
                </div>\
            </div>';
        }).join('');
    }
}

function renderPortalAnalytics() {
    if (typeof Chart === 'undefined') {
        var container = document.getElementById('portal-analytics-chart');
        if (container) container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-secondary);font-size:0.85rem"><i class="fas fa-chart-bar" style="margin-right:8px;opacity:0.5"></i>Chart library not loaded</div>';
        return;
    }
    var period = parseInt(document.getElementById('portal-analytics-period').value) || 30;
    var labels = [];
    for (var i = period - 1; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }));
    }

    var charts = [
        { id: 'analytics-views-chart', label: 'Views', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
        { id: 'analytics-messages-chart', label: 'Messages', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
        { id: 'analytics-earnings-chart', label: 'Earnings', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { id: 'analytics-engagement-chart', label: 'Engagement', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' }
    ];

    charts.forEach(function(c) {
        var canvas = document.getElementById(c.id);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (window[c.id]) window[c.id].destroy();

        var data = labels.map(function() { return Math.floor(Math.random() * 80) + 5; });

        window[c.id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: c.label,
                    data: data,
                    borderColor: c.color,
                    backgroundColor: c.bg,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 6 } },
                    y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8', maxTicksLimit: 4 } }
                }
            }
        });
    });
}

function renderPortalBookings() {
    var tab = portalState.bookingTab || 'upcoming';
    var list = document.getElementById('portal-bookings-list');
    if (!list) return;

    var events = state.events || [];
    var now = new Date();

    var filtered;
    if (tab === 'upcoming') {
        filtered = events.filter(function(e) { return new Date(e.date || e.startDate) > now; });
    } else if (tab === 'pending') {
        filtered = events.filter(function(e) { return e.status === 'pending' || e.rsvp === 'pending'; });
    } else {
        filtered = events.filter(function(e) { return new Date(e.date || e.startDate) <= now; });
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="portal-empty-state">No ' + tab + ' bookings</div>';
        return;
    }

    list.innerHTML = filtered.map(function(e) {
        var d = new Date(e.date || e.startDate || Date.now());
        return '\
        <div class="portal-booking-item">\
            <div class="portal-booking-date">\
                <span class="portal-booking-day">' + d.getDate() + '</span>\
                <span class="portal-booking-month">' + d.toLocaleDateString('en-ZA', { month: 'short' }) + '</span>\
            </div>\
            <div class="portal-booking-info">\
                <h5>' + (e.title || 'Event') + '</h5>\
                <p>' + (e.location || 'Online') + ' · ' + (e.rsvpCount || 0) + ' attending</p>\
            </div>\
            <button class="btn btn-sm btn-outline" onclick="viewAttendeesList(' + e.id + ')"><i class="fas fa-users"></i></button>\
        </div>';
    }).join('');
}

function switchPortalBookingTab(tab) {
    portalState.bookingTab = tab;
    document.querySelectorAll('.portal-booking-tab').forEach(function(el) {
        el.classList.toggle('active', el.dataset.btab === tab);
    });
    renderPortalBookings();
}

function renderPortalMessages() {
    var list = document.getElementById('portal-messages-list');
    if (!list) return;

    var conversations = state.conversations || [];
    if (conversations.length === 0) {
        list.innerHTML = '<div class="portal-empty-state">No conversations yet</div>';
        return;
    }

    list.innerHTML = conversations.map(function(c) {
        var lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : 'No messages yet';
        return '\
        <div class="portal-message-item" onclick="switchView(\'messages\');openChat(' + c.id + ')">\
            <img src="' + (c.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.name) + '&background=6366f1&color=fff') + '" alt="" class="portal-message-avatar">\
            <div class="portal-message-info">\
                <h5>' + c.name + '</h5>\
                <p>' + (typeof lastMsg === 'string' ? lastMsg.substring(0, 60) : '') + '</p>\
            </div>\
        </div>';
    }).join('');
}

function renderPortalSettings() {
    var user = state.currentUser;
    if (!user) return;

    var typeKey = user.accountType === 'provider' ? (user.profile.providerType || 'general') : (user.accountType || 'general');
    var pt = profileTypes[typeKey] || profileTypes.general;

    document.getElementById('portal-setting-type').innerHTML = '<span style="background:' + pt.color + '22;color:' + pt.color + ';padding:4px 12px;border-radius:20px;font-weight:600">' + pt.label + '</span>';
    document.getElementById('portal-setting-name').value = user.name || '';
    document.getElementById('portal-setting-bio').value = user.bio || user.profile?.bio || '';
    document.getElementById('portal-setting-email').value = user.email || '';
}

function savePortalSettings() {
    var user = state.currentUser;
    if (!user) return;

    user.name = document.getElementById('portal-setting-name').value || user.name;
    user.bio = document.getElementById('portal-setting-bio').value || user.bio;
    user.email = document.getElementById('portal-setting-email').value || user.email;
    if (user.profile) {
        user.profile.bio = user.bio;
    }

    saveUserData();
    showToast('Settings saved successfully!');
}

// ==================== PORTAL MONETIZATION ====================
function renderPortalMonetization() {
    if (!state.monetization) {
        state.monetization = {
            enabled: {},
            settings: {
                tips: { minAmount: 10, message: 'Buy me a coffee!' },
                ppv: { price: 25, previewDuration: 10 },
                subscription: { monthly: 49, yearly: 499 },
                privateShow: { pricePerMin: 15, freePreviewMin: 1 },
                affiliate: { rate: 15, code: '' },
                store: { shippingFee: 50, paymentMethod: 'all' }
            }
        };
    }

    var settings = state.monetization;
    var methods = ['tips','ppv','subscription','private-show','affiliate','store'];

    methods.forEach(function(m) {
        var checkbox = document.querySelector('.monetization-toggle[data-method="' + m + '"]');
        if (checkbox) checkbox.checked = !!settings.enabled[m];
        var details = document.getElementById('monetization-' + m.replace('-', '') + '-details');
        if (!details) details = document.getElementById('monetization-' + m + '-details');
        if (details) details.style.display = settings.enabled[m] ? 'block' : 'none';
    });

    // Restore input values
    var s = settings.settings;
    setFieldValue('monetization-tips-min', s.tips.minAmount);
    setFieldValue('monetization-tips-message', s.tips.message);
    setFieldValue('monetization-ppv-price', s.ppv.price);
    setFieldValue('monetization-ppv-preview', s.ppv.previewDuration);
    setFieldValue('monetization-sub-monthly', s.subscription.monthly);
    setFieldValue('monetization-sub-yearly', s.subscription.yearly);
    setFieldValue('monetization-private-price', s.privateShow.pricePerMin);
    setFieldValue('monetization-private-preview', s.privateShow.freePreviewMin);
    setFieldValue('monetization-affiliate-rate', s.affiliate.rate);
    setFieldValue('monetization-affiliate-code', s.affiliate.code);
    setFieldValue('monetization-store-shipping', s.store.shippingFee);
    setFieldValue('monetization-store-payment', s.store.paymentMethod);

    updateMonetizationSummary();

    var activeCount = Object.keys(settings.enabled).filter(function(k) { return settings.enabled[k]; }).length;
    document.getElementById('portal-monetization-status').innerHTML = activeCount > 0
        ? '<span style="background:rgba(34,197,94,0.12);color:var(--success);padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:600"><i class="fas fa-check-circle"></i> ' + activeCount + ' method(s) active</span>'
        : '<span style="background:rgba(239,68,68,0.12);color:var(--error);padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:600"><i class="fas fa-times-circle"></i> No methods active</span>';
}

function toggleMonetizationMethod(method, enabled) {
    if (!state.monetization) return;
    state.monetization.enabled[method] = enabled;
    var details = document.getElementById('monetization-' + method.replace('-', '') + '-details');
    if (!details) details = document.getElementById('monetization-' + method + '-details');
    if (details) details.style.display = enabled ? 'block' : 'none';
    updateMonetizationSummary();
}

function saveMonetizationSettings() {
    if (!state.monetization) return;
    var s = state.monetization.settings;

    s.tips.minAmount = parseInt(document.getElementById('monetization-tips-min')?.value) || 10;
    s.tips.message = document.getElementById('monetization-tips-message')?.value || 'Buy me a coffee!';
    s.ppv.price = parseInt(document.getElementById('monetization-ppv-price')?.value) || 25;
    s.ppv.previewDuration = parseInt(document.getElementById('monetization-ppv-preview')?.value) || 10;
    s.subscription.monthly = parseInt(document.getElementById('monetization-sub-monthly')?.value) || 49;
    s.subscription.yearly = parseInt(document.getElementById('monetization-sub-yearly')?.value) || 499;
    s.privateShow.pricePerMin = parseInt(document.getElementById('monetization-private-price')?.value) || 15;
    s.privateShow.freePreviewMin = parseInt(document.getElementById('monetization-private-preview')?.value) || 1;
    s.affiliate.rate = parseInt(document.getElementById('monetization-affiliate-rate')?.value) || 15;
    s.affiliate.code = document.getElementById('monetization-affiliate-code')?.value || '';
    s.store.shippingFee = parseInt(document.getElementById('monetization-store-shipping')?.value) || 50;
    s.store.paymentMethod = document.getElementById('monetization-store-payment')?.value || 'all';

    saveUserData();
    showToast('Monetization settings saved!');
    updateMonetizationSummary();
}

function updateMonetizationSummary() {
    if (!state.monetization) return;
    var activeCount = Object.keys(state.monetization.enabled).filter(function(k) { return state.monetization.enabled[k]; }).length;
    document.getElementById('monetization-active-methods').textContent = activeCount;
    document.getElementById('monetization-total-earned').textContent = Math.floor(Math.random() * 5000) + 100;
    document.getElementById('monetization-transactions').textContent = Math.floor(Math.random() * 50) + 5;
    document.getElementById('monetization-payout').textContent = 'R' + Math.floor(Math.random() * 2000) + 50;
}

// ==================== LIVE LOCATION SHARING ====================
function sendLiveLocation() {
    if (!state.currentChat) {
        showToast('Open a conversation first');
        return;
    }

    if (!navigator.geolocation) {
        showToast('Location sharing not supported in this browser');
        return;
    }

    showToast('Getting your location...');

    navigator.geolocation.getCurrentPosition(
        function(pos) {
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            var mapsUrl = 'https://www.google.com/maps?q=' + lat + ',' + lng;

            state.currentChat.messages.push({
                id: uuidv4(),
                text: '',
                sent: true,
                time: 'Now',
                delivered: true,
                read: false,
                location: { lat: lat, lng: lng, url: mapsUrl }
            });

            renderMessages();
            renderConversations();
            saveUserData();
            showToast('Location sent!');
        },
        function(err) {
            showToast('Could not get location: ' + (err.message || 'Unknown error'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

// ==================== BLOCK / DELETE CONVERSATION ====================
function toggleBlockUser(userId) {
    var idx = state.blockedUsers.indexOf(userId);
    if (idx > -1) {
        state.blockedUsers.splice(idx, 1);
        showToast('User unblocked');
    } else {
        if (!confirm('Block this user? They will not be able to send you messages.')) return;
        state.blockedUsers.push(userId);
        showToast('User blocked');
    }
    updateBlockButton();
    saveUserData();
}

function updateBlockButton() {
    var btn = document.getElementById('block-user-text');
    if (!btn || !state.currentChat) return;
    var isBlocked = state.blockedUsers.indexOf(state.currentChat.id) > -1;
    btn.textContent = isBlocked ? 'Unblock User' : 'Block User';
    var icon = document.querySelector('#block-user-btn i');
    if (icon) icon.className = isBlocked ? 'fas fa-check-circle' : 'fas fa-ban';
}

function isUserBlocked(userId) {
    return state.blockedUsers.indexOf(userId) > -1;
}

function deleteConversation(conversationId) {
    if (!confirm('Delete this entire conversation? This action cannot be undone.')) return;
    var idx = state.conversations.findIndex(c => c.id === conversationId);
    if (idx === -1) return;

    state.conversations.splice(idx, 1);

    if (state.currentChat && state.currentChat.id === conversationId) {
        state.currentChat = null;
        document.getElementById('chat-placeholder').style.display = 'flex';
        document.getElementById('chat-container').style.display = 'none';
    }

    renderConversations();
    saveUserData();
    showToast('Conversation deleted');
}

// ==================== VOICE RECORDING ====================
var voiceRecordingInterval = null;

function toggleVoiceRecording() {
    if (state.isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording not supported in this browser');
        return;
    }

    if (!state.currentChat) return;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        state.mediaRecorder = new MediaRecorder(stream);
        state.audioChunks = [];
        state.isRecording = true;
        state.recordingStartTime = Date.now();

        state.mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                state.audioChunks.push(e.data);
            }
        };

        state.mediaRecorder.onstop = function() {
            stream.getTracks().forEach(function(t) { t.stop(); });
        };

        state.mediaRecorder.start();

        // Show recording UI
        document.getElementById('voice-record-btn').style.display = 'none';
        document.getElementById('voice-recording-indicator').style.display = 'flex';
        document.getElementById('message-input').disabled = true;

        // Start timer
        var seconds = 0;
        voiceRecordingInterval = setInterval(function() {
            seconds++;
            var m = Math.floor(seconds / 60);
            var s = seconds % 60;
            document.getElementById('voice-recording-time').textContent = m + ':' + (s < 10 ? '0' : '') + s;
        }, 1000);

    }).catch(function(err) {
        showToast('Microphone access denied');
    });
}

function stopVoiceRecording() {
    if (!state.isRecording || !state.mediaRecorder) return;

    return new Promise(function(resolve) {
        state.mediaRecorder.onstop = function() {
            state.mediaRecorder.stream.getTracks().forEach(function(t) { t.stop(); });
            state.isRecording = false;

            clearInterval(voiceRecordingInterval);

            document.getElementById('voice-record-btn').style.display = '';
            document.getElementById('voice-recording-indicator').style.display = 'none';
            document.getElementById('message-input').disabled = false;

            resolve();
        };

        state.mediaRecorder.stop();
    });
}

function cancelVoiceRecording() {
    if (!state.isRecording) return;
    state.audioChunks = [];
    stopVoiceRecording().then(function() {
        showToast('Recording cancelled');
    });
}

function sendVoiceRecording() {
    if (!state.isRecording || state.audioChunks.length === 0 || !state.currentChat) return;

    var blob = new Blob(state.audioChunks, { type: 'audio/webm' });
    var reader = new FileReader();

    reader.onloadend = function() {
        var audioData = reader.result;
        var duration = Math.floor((Date.now() - state.recordingStartTime) / 1000);
        var minutes = Math.floor(duration / 60);
        var seconds = duration % 60;
        var durationStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        state.audioChunks = [];

        stopVoiceRecording().then(function() {
            state.currentChat.messages.push({
                id: uuidv4(),
                text: '',
                sent: true,
                time: 'Now',
                delivered: true,
                read: false,
                voiceNote: audioData,
                voiceDuration: durationStr
            });

            renderMessages();
            renderConversations();
            saveUserData();
            showToast('Voice note sent');
        });
    };

    reader.readAsDataURL(blob);
}

function playVoiceNote(vnId, btnElement) {
    var audioData = state.voiceNotesMap && state.voiceNotesMap[vnId];
    if (!audioData) {
        showToast('Voice note data not available');
        return;
    }

    if (state.activeAudio && !state.activeAudio.paused) {
        state.activeAudio.pause();
        var prevBtn = document.querySelector('.voice-note-btn.playing');
        if (prevBtn) prevBtn.classList.remove('playing');
    }

    var audio = new Audio(audioData);
    state.activeAudio = audio;

    btnElement.classList.add('playing');
    btnElement.innerHTML = '<i class="fas fa-pause"></i>';

    audio.onended = function() {
        btnElement.classList.remove('playing');
        btnElement.innerHTML = '<i class="fas fa-play"></i>';
        state.activeAudio = null;
    };

    audio.play().catch(function() {
        btnElement.classList.remove('playing');
        btnElement.innerHTML = '<i class="fas fa-play"></i>';
        showToast('Could not play voice note');
    });
}

// -------------------------------------------------------------------
// 7. ADMIN USER CRUD (full implementations)
// -------------------------------------------------------------------

function editAdminUserProfile(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) { showToast('User not found'); return; }

    const modalHTML = `
        <div id="edit-admin-user-modal" class="modal-overlay" style="display:flex;" onclick="closeEditAdminUserModal(event)">
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Edit User: ${user.name}</h2>
                    <button class="modal-close" onclick="closeEditAdminUserModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="edit-admin-user-form" onsubmit="saveAdminUserUpdate(event, ${userId})">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="euser-name">Full Name *</label>
                                <input type="text" id="euser-name" required value="${user.name.replace(/"/g,'&quot;')}">
                            </div>
                            <div class="form-group">
                                <label for="euser-email">Email *</label>
                                <input type="email" id="euser-email" required value="${user.email||''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="euser-age">Age</label>
                                <input type="number" id="euser-age" value="${user.age||25}" min="18" max="100">
                            </div>
                            <div class="form-group">
                                <label for="euser-gender">Gender</label>
                                <select id="euser-gender">
                                    <option value="">Select</option>
                                    <option value="male" ${user.gender==='male'?'selected':''}>Male</option>
                                    <option value="female" ${user.gender==='female'?'selected':''}>Female</option>
                                    <option value="non-binary" ${user.gender==='non-binary'?'selected':''}>Non-binary</option>
                                    <option value="other" ${user.gender==='other'?'selected':''}>Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="euser-location">Location</label>
                            <input type="text" id="euser-location" value="${(user.location||'').replace(/"/g,'&quot;')}">
                        </div>
                        <div class="form-group">
                            <label for="euser-account-type">Account Type</label>
                            <select id="euser-account-type">
                                <option value="customer" ${user.accountType==='customer'?'selected':''}>User</option>
                                <option value="provider" ${user.accountType==='provider'?'selected':''}>Service Provider</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="euser-bio">Bio</label>
                            <textarea id="euser-bio" rows="3">${(user.bio||'').replace(/"/g,'&quot;')}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="euser-interests">Interests (comma separated)</label>
                            <input type="text" id="euser-interests" value="${(user.interests||[]).join(', ')}">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <div style="display:flex;gap:10px;">
                                <label><input type="radio" name="euser-status" value="active" ${user.status!=='banned'?'checked':''}> Active</label>
                                <label><input type="radio" name="euser-status" value="banned" ${user.status==='banned'?'checked':''}> Banned</label>
                                <label><input type="radio" name="euser-status" value="suspended"> Suspended</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="euser-verified" ${user.verified!==false?'checked':''}> Verified</label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-ghost" onclick="closeEditAdminUserModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditAdminUserModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.getElementById('edit-admin-user-modal');
        if (modal) modal.remove();
    }
}

function saveAdminUserUpdate(event, userId) {
    event.preventDefault();
    const user = state.profiles.find(p => p.id === userId);
    if (!user) return;

    user.name = document.getElementById('euser-name').value;
    user.email = document.getElementById('euser-email').value;
    user.age = parseInt(document.getElementById('euser-age').value) || 25;
    user.gender = document.getElementById('euser-gender').value;
    user.location = document.getElementById('euser-location').value;
    user.accountType = document.getElementById('euser-account-type').value;
    user.bio = document.getElementById('euser-bio').value;
    user.interests = document.getElementById('euser-interests').value.split(',').map(i => i.trim()).filter(Boolean);
    user.status = document.querySelector('input[name="euser-status"]:checked')?.value || 'active';
    user.verified = document.getElementById('euser-verified').checked;

    logActivity({
        type: 'admin_action',
        level: 'critical',
        action: `Admin edited user: ${user.email}`,
        details: { editedUser: user.id, adminId: state.currentUser?.id }
    });

    closeEditAdminUserModal();
    switchAdminSection('users');
    saveUserData();
    showToast(`User "${user.name}" updated ✓`);
}

function unbanUser(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user || !confirm(`Unban ${user.name}?`)) return;
    user.banned = false;
    user.status = 'active';
    logActivity({ type: 'admin_action', level: 'warning', action: `Admin unbanned user: ${user.email}`, details: {} });
    switchAdminSection('users');
    saveUserData();
    showToast(`User "${user.name}" unbanned`);
}

function deleteUser(userId) {
    const user = state.profiles.find(p => p.id === userId);
    if (!user) return;
    if (!confirm(`PERMANENTLY DELETE user "${user.name}" (${user.email})? This cannot be undone!`)) return;
    state.profiles = state.profiles.filter(p => p.id !== userId);
    logActivity({ type: 'admin_action', level: 'critical', action: `Admin deleted user: ${user.email}`, details: {} });
    switchAdminSection('users');
    saveUserData();
    showToast('User permanently deleted');
}

// -------------------------------------------------------------------
// 8. ADD CRUD BUTTONS TO RENDERERS (patch existing functions)
// -------------------------------------------------------------------

// Enhance event detail with edit/delete for hosts
const origOpenEventDetail = openEventDetail;
openEventDetail = function(eventId) {
    origOpenEventDetail(eventId);
    const ev = state.events.find(e => e.id === eventId);
    if (!ev) return;

    // Add edit/delete to host actions
    const hostActions = document.getElementById('detail-host-actions');
    if (hostActions) {
        const grid = hostActions.querySelector('.host-actions-grid');
        if (grid) {
            // Check if our buttons already exist
            const existingEdit = grid.querySelector('.crud-edit-event');
            const existingDelete = grid.querySelector('.crud-delete-event');
            if (!existingEdit) {
                grid.insertAdjacentHTML('beforeend',
                    `<button class="btn btn-outline btn-sm crud-edit-event" onclick="editEvent(${eventId})"><i class="fas fa-edit"></i> Edit Details</button>`
                );
            }
            if (!existingDelete) {
                grid.insertAdjacentHTML('beforeend',
                    `<button class="btn btn-danger btn-sm crud-delete-event" onclick="deleteEvent(${eventId})"><i class="fas fa-trash"></i> Delete</button>`
                );
            }
        }
    }
};

// Enhance club detail with edit/delete for creator
const origOpenClubDetail = openClubDetail;
openClubDetail = function(clubId) {
    origOpenClubDetail(clubId);
    const club = state.clubs.find(c => c.id === clubId);
    if (!club) return;

    const isCreator = state.currentUser && club.creator && club.creator.id === state.currentUser.id;
    const actionsDiv = document.querySelector('.club-actions');
    if (!actionsDiv) return;

    // Show creator-only actions
    let creatorActions = actionsDiv.querySelector('.club-creator-actions');
    if (!creatorActions) {
        creatorActions = document.createElement('div');
        creatorActions.className = 'club-creator-actions';
        creatorActions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        actionsDiv.appendChild(creatorActions);
    }

    creatorActions.style.display = isCreator ? 'flex' : 'none';
    if (isCreator) {
        creatorActions.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="editClub(${clubId})"><i class="fas fa-edit"></i> Edit Club</button>
            <button class="btn btn-danger btn-sm" onclick="deleteClub(${clubId})"><i class="fas fa-trash"></i> Delete Club</button>
        `;
    }
};

// Enhance forum posts with edit/delete for authors
const origCreateForumPostItem = createForumPostItem;
createForumPostItem = function(post) {
    let html = origCreateForumPostItem(post);
    if (!state.currentUser || !post.author) return html;

    const isAuthor = post.author.id === state.currentUser.id || post.author.name === state.currentUser.name;
    if (isAuthor) {
        const btnHTML = `<div style="display:flex;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);">
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();editForumPost(${post.id},'user')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="event.stopPropagation();deleteForumPost(${post.id},'user')"><i class="fas fa-trash"></i></button>
            </div>`;
        const lastDiv = html.lastIndexOf('</div>');
        if (lastDiv !== -1) {
            html = html.substring(0, lastDiv) + btnHTML + '</div>';
        }
    }
    return html;
};

// Enhance provider forum posts with edit/delete for authors
const origCreateProviderForumPostItem = createProviderForumPostItem;
createProviderForumPostItem = function(post) {
    let html = origCreateProviderForumPostItem(post);
    if (!state.currentUser || !post.author) return html;

    const isAuthor = post.author.id === state.currentUser.id || post.author.name === state.currentUser.name;
    if (isAuthor) {
        const btnHTML = `<div style="display:flex;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);">
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();editForumPost(${post.id},'provider')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="event.stopPropagation();deleteForumPost(${post.id},'provider')"><i class="fas fa-trash"></i></button>
            </div>`;
        const lastDiv = html.lastIndexOf('</div>');
        if (lastDiv !== -1) {
            html = html.substring(0, lastDiv) + btnHTML + '</div>';
        }
    }
    return html;
};

// Enhance product detail with edit/delete for sellers
const origOpenProductDetail = openProductDetail;
openProductDetail = function(productId) {
    origOpenProductDetail(productId);
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const isSeller = state.currentUser && product.seller && product.seller.id === state.currentUser.id;
    const actionsDiv = document.querySelector('.product-detail-actions') || document.querySelector('.modal-content.product-detail-modal-content .modal-body .product-actions, .product-detail-info .product-detail-actions');
    if (!actionsDiv) return;

    let sellerActions = actionsDiv.querySelector('.product-seller-actions');
    if (!sellerActions) {
        sellerActions = document.createElement('div');
        sellerActions.className = 'product-seller-actions';
        sellerActions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        actionsDiv.appendChild(sellerActions);
    }

    sellerActions.style.display = isSeller ? 'flex' : 'none';
    if (isSeller) {
        sellerActions.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="editProduct(${productId})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct(${productId})"><i class="fas fa-trash"></i> Delete</button>
        `;
    }
};

// Patch renderMessages for message CRUD
const origRenderMessages = renderMessages;
renderMessages = function() {
    origRenderMessages();
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer || !state.currentChat) return;

    const sentMessages = messagesContainer.querySelectorAll('.message.sent');
    sentMessages.forEach(msgEl => {
        const msgId = msgEl.dataset.msgId;
        if (!msgId) return;
        const existingActions = msgEl.querySelector('.message-crud-actions');
        if (existingActions) return;

        const content = msgEl.querySelector('.message-content');
        if (!content) return;

        const actions = document.createElement('div');
        actions.className = 'message-crud-actions';
        actions.style.cssText = 'display:flex;gap:4px;margin-top:4px;';
        actions.innerHTML = `
            <button class="btn btn-sm btn-ghost" style="font-size:0.7rem;padding:2px 6px;" onclick="event.stopPropagation();editMessage('${state.currentChat.id}','${msgId}')"><i class="fas fa-pen"></i></button>
            <button class="btn btn-sm btn-ghost" style="font-size:0.7rem;padding:2px 6px;color:var(--error);" onclick="event.stopPropagation();deleteMessage('${state.currentChat.id}','${msgId}')"><i class="fas fa-trash"></i></button>
        `;
        content.appendChild(actions);
    });
};

// Enhance content detail with edit/delete for owners
const origOpenContentDetail = openContentDetail;
openContentDetail = function(contentId) {
    origOpenContentDetail(contentId);
    const content = state.content.find(c => c.id === contentId);
    if (!content) return;
    const isOwner = state.currentUser && (content.userId === state.currentUser.id || content.authorId === state.currentUser.id);
    const detailActions = document.querySelector('.content-actions');
    if (!detailActions) return;

    let ownerActions = detailActions.querySelector('.content-owner-actions');
    if (!ownerActions) {
        ownerActions = document.createElement('div');
        ownerActions.className = 'content-owner-actions';
        ownerActions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        detailActions.appendChild(ownerActions);
    }

    ownerActions.style.display = isOwner ? 'flex' : 'none';
    if (isOwner) {
        ownerActions.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="editContent(${contentId})"><i class="fas fa-edit"></i> Edit Caption</button>
            <button class="btn btn-danger btn-sm" onclick="deleteContent(${contentId})"><i class="fas fa-trash"></i> Delete</button>
        `;
    }
};

// Enhance admin users table with full CRUD actions
const origRenderAdminUsers = renderAdminUsers;
renderAdminUsers = function() {
    const base = origRenderAdminUsers ? origRenderAdminUsers() : '';
    // Replace the edit action stub button with a real edit button
    return base.replace(
        /<button class="btn-action" onclick="editAdminUserProfile\((\d+)\)" title="Edit"><i class="fas fa-edit"><\/i><\/button>/g,
        '<button class="btn-action" onclick="editAdminUserProfile($1)" title="Edit"><i class="fas fa-edit"></i></button>'
    ).replace(
        /<button class="btn-action danger" onclick="banAdminUser\((\d+)\)" title="Ban"><i class="fas fa-ban"><\/i><\/button>/g,
        function(match, id) {
            const user = state.profiles.find(p => p.id == id);
            if (user && user.status === 'banned') {
                return `<button class="btn-action success" onclick="unbanUser(${id})" title="Unban"><i class="fas fa-check-circle"></i></button>`;
            }
            return match;
        }
    ).replace(
        /(<button class="btn-action danger" onclick="banAdminUser\((\d+)\)" title="Ban"><i class="fas fa-ban"><\/i><\/button>)/g,
        '$1<button class="btn-action danger" onclick="deleteUser($2)" title="Delete"><i class="fas fa-trash"></i></button>'
    );
};

function showAdminPosts(status) {
    const container = document.getElementById('admin-posts-container');
    if (!container) return;
    const allPosts = [...state.forumPosts, ...state.providerForumPosts].filter(p => !status || p.status === status);
    container.innerHTML = allPosts.map(p => `
        <div style="padding:12px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;">
            <div>
                <strong>${p.title}</strong> <span class="status-badge ${p.status}">${p.status}</span>
                <div style="font-size:0.8rem;color:var(--text-tertiary)">by ${p.author?.name||'Unknown'}</div>
            </div>
            <div style="display:flex;gap:4px;">
                ${p.status === 'pending'
                    ? `<button class="btn btn-sm btn-success" onclick="approvePost(${p.id})"><i class="fas fa-check"></i></button>
                       <button class="btn btn-sm btn-danger" onclick="rejectPost(${p.id})"><i class="fas fa-times"></i></button>`
                    : `<button class="btn btn-sm btn-ghost" onclick="editForumPost(${p.id},'${p.type||'user'}')"><i class="fas fa-edit"></i></button>
                       <button class="btn btn-sm btn-danger" onclick="deleteForumPost(${p.id},'${p.type||'user'}')"><i class="fas fa-trash"></i></button>`}
            </div>
        </div>
    `).join('');
}

// currentClubFilter already declared with let above

// ==================== PARTICLE BACKGROUND SYSTEM ====================
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.speedY = (Math.random() - 0.5) * 0.8;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.color = Math.random() > 0.5 ? 
                `rgba(220, 20, 60, ${this.opacity})` : 
                `rgba(30, 58, 95, ${this.opacity})`;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || 
                this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    const count = Math.min(80, Math.floor(canvas.width / 12));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    function connect() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(220, 20, 60, ${0.08 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        connect();
        animId = requestAnimationFrame(animate);
    }
    animate();

    // Stop animation when leaving landing page
    const observer = new MutationObserver(() => {
        const landing = document.getElementById('landing-page');
        if (!landing || !landing.classList.contains('active')) {
            cancelAnimationFrame(animId);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { 
        attributes: true, 
        subtree: true,
        attributeFilter: ['class'] 
    });
}

// ==================== CHART RENDERING ====================
let chartInstances = {};

function renderMiniChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:0.75rem;opacity:0.7">Chart unavailable</div>';
        return;
    }
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }
    const ctx = canvas.getContext('2d');
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
            datasets: [{
                data: data.values || [10,20,15,30,25,40,35],
                borderColor: color || '#DC143C',
                backgroundColor: (color || '#DC143C') + '20',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            },
            elements: { point: { radius: 0 } }
        }
    });
}

function initProfileCharts() {
    // Activity chart
    renderMiniChart('activity-chart', {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        values: [12, 19, 15, 27, 22, 35, 28]
    }, '#DC143C');
    
    // Messages chart
    renderMiniChart('messages-chart', {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        values: [5, 8, 12, 7, 15, 20, 18]
    }, '#4A90D9');
}

// Call init on page load
document.addEventListener('DOMContentLoaded', initParticles);

// ==================== LOCATION SELECTOR HELPERS ====================

function populateCountrySelect(selectId, selectedCode) {
    var select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Country</option>';
    locationData.countries.forEach(function(c) {
        var code = c[0], name = c[1];
        select.innerHTML += '<option value="' + code + '"' + (code === selectedCode ? ' selected' : '') + '>' + name + '</option>';
    });
}

function populateStateSelect(countrySelectId, stateSelectId, selectedState) {
    var countryCode = document.getElementById(countrySelectId)?.value;
    var stateSelect = document.getElementById(stateSelectId);
    if (!stateSelect) return;
    var states = locationData.getStates(countryCode);
    stateSelect.innerHTML = '<option value="">Select State/Province</option>';
    if (states.length === 0) {
        stateSelect.innerHTML = '<option value="">N/A</option>';
        stateSelect.disabled = true;
        return;
    }
    stateSelect.disabled = false;
    states.forEach(function(s) {
        stateSelect.innerHTML += '<option value="' + s + '"' + (s === selectedState ? ' selected' : '') + '>' + s + '</option>';
    });
}

function onCountryChange(countrySelectId, stateSelectId, selectedState) {
    populateStateSelect(countrySelectId, stateSelectId, selectedState);
}

function getLocationString(countryCode, state) {
    var countryName = locationData.getCountryName(countryCode) || '';
    if (state && state !== 'N/A') return state + ', ' + countryName;
    return countryName || '';
}

// ==================== IP GEOLOCATION ====================

function detectUserRegion() {
    // Check if already detected
    if (state.userRegion) return;
    
    fetch('https://ipapi.co/json/')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            state.userRegion = {
                ip: data.ip,
                country: data.country_code,
                countryName: data.country_name,
                state: data.region,
                city: data.city,
                lat: data.latitude,
                lng: data.longitude
            };
            state.userLocation = { lat: data.latitude, lng: data.longitude };
            console.log('🌍 Region detected:', state.userRegion.countryName, '-', state.userRegion.state);
            // Update directory filter to show local listings
            filterDirectory();
        })
        .catch(function() {
            console.log('🌍 Region detection unavailable (offline or blocked)');
        });
}

function getUserCountry() {
    return state.userRegion?.country || state.currentUser?.country || '';
}

function getUserState() {
    return state.userRegion?.state || state.currentUser?.state || '';
}

function isLocalListing(listing) {
    var userCountry = getUserCountry();
    if (!userCountry) return true; // Show all if no region data
    return listing.country === userCountry;
}

// ==================== BUSINESS DIRECTORY ====================

function renderDirectory() {
    var container = document.getElementById('directory-content');
    if (!container) return;

    var categoryFilter = state.directory.category || 'all';
    var countryFilter = state.directory.country || '';
    var searchQuery = state.directory.search || '';
    var listings = state.directory.listings;

    // Show local listings first if region detected
    var userCountry = getUserCountry();
    if (userCountry && !countryFilter) {
        countryFilter = userCountry;
    }

    var filtered = listings.filter(function(b) {
        var matchCategory = categoryFilter === 'all' || b.category === categoryFilter;
        var matchCountry = !countryFilter || b.country === countryFilter;
        var matchSearch = !searchQuery || 
            b.name.toLowerCase().indexOf(searchQuery.toLowerCase()) > -1 ||
            b.description.toLowerCase().indexOf(searchQuery.toLowerCase()) > -1 ||
            (b.location && b.location.toLowerCase().indexOf(searchQuery.toLowerCase()) > -1);
        return matchCategory && matchCountry && matchSearch;
    });

    var html = '';

    // Header with search and filter
    html += '<div class="directory-header">';
    html += '<div class="directory-search">';
    html += '<input type="text" id="directory-search-input" placeholder="Search businesses..." value="' + (searchQuery) + '" oninput="filterDirectory()">';
    html += '<select id="directory-category-filter" onchange="filterDirectory()">';
    html += '<option value="all">All Categories</option>';
    state.directory.categories.forEach(function(cat) {
        html += '<option value="' + cat + '"' + (categoryFilter === cat ? ' selected' : '') + '>' + cat + '</option>';
    });
    html += '</select>';
    html += '<select id="directory-country-filter" onchange="filterDirectory()">';
    html += '<option value="">' + (userCountry ? 'Local Listings' : 'All Countries') + '</option>';
    locationData.countries.forEach(function(c) {
        html += '<option value="' + c[0] + '"' + (countryFilter === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
    });
    html += '</select>';
    html += '</div>';
    html += '<div class="directory-count">' + filtered.length + ' business' + (filtered.length !== 1 ? 'es' : '') + ' listed</div>';
    html += '</div>';

    if (filtered.length === 0) {
        html += '<div class="directory-empty">';
        html += '<i class="fas fa-store-slash"></i>';
        html += '<h3>No businesses found</h3>';
        html += '<p>Be the first to list your business in the directory!</p>';
        html += '<button class="btn btn-primary" onclick="showSubmitBusinessModal()"><i class="fas fa-plus"></i> List Your Business</button>';
        html += '</div>';
    } else {
        html += '<div class="directory-grid">';
        filtered.forEach(function(biz) {
            var bannerColors = ['#6366f1', '#DC143C', '#f59e0b', '#14b8a6', '#8b5cf6', '#ef4444', '#0ea5e9', '#10b981'];
            var colorIndex = state.directory.listings.indexOf(biz) % bannerColors.length;
            var bannerColor = bannerColors[colorIndex];

            html += '<div class="directory-card">';
            html += '<div class="directory-card-banner" style="background:linear-gradient(135deg,' + bannerColor + ',' + bannerColor + '88)">';
            html += '<i class="fas fa-building"></i>';
            html += '<span class="card-badge">' + biz.category + '</span>';
            html += '</div>';
            html += '<div class="directory-card-body">';
            html += '<h3>' + biz.name + '</h3>';
            html += '<div class="business-type">' + biz.category + '</div>';
            html += '<div class="business-desc">' + biz.description + '</div>';
            html += '<div class="business-contact">';
            if (biz.location) html += '<span><i class="fas fa-map-marker-alt"></i> ' + biz.location + '</span>';
            if (biz.phone) html += '<span><i class="fas fa-phone"></i> ' + biz.phone + '</span>';
            if (biz.email) html += '<span><i class="fas fa-envelope"></i> ' + biz.email + '</span>';
            if (biz.website) html += '<span><i class="fas fa-globe"></i> <a href="' + biz.website + '" target="_blank" rel="noopener">' + biz.website + '</a></span>';
            html += '</div>';
            html += '</div>';
            html += '<div class="directory-card-footer">';
            html += '<button class="btn btn-primary btn-sm" onclick="showToast(\'Contact information shown above 📞\')"><i class="fas fa-info-circle"></i> Contact</button>';
            html += '<button class="btn btn-outline btn-sm" onclick="showToast(\'Report sent to moderators 🛡️\')"><i class="fas fa-flag"></i> Report</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function filterDirectory() {
    var searchInput = document.getElementById('directory-search-input');
    var categoryFilter = document.getElementById('directory-category-filter');
    var countryFilter = document.getElementById('directory-country-filter');
    if (searchInput) state.directory.search = searchInput.value;
    if (categoryFilter) state.directory.category = categoryFilter.value;
    if (countryFilter) state.directory.country = countryFilter.value;
    renderDirectory();
}

function showSubmitBusinessModal() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'flex';

    var modalHTML = '<div id="business-modal" class="modal-overlay" style="display:flex;" onclick="closeBusinessModal(event)">';
    modalHTML += '<div class="modal-content business-form" onclick="event.stopPropagation()">';
    modalHTML += '<div class="modal-header">';
    modalHTML += '<h2><i class="fas fa-store"></i> List Your Business</h2>';
    modalHTML += '<button class="modal-close" onclick="closeBusinessModal()"><i class="fas fa-times"></i></button>';
    modalHTML += '</div>';
    modalHTML += '<div class="modal-body">';

    // Fee notice
    modalHTML += '<div class="fee-notice">';
    modalHTML += '<i class="fas fa-crown"></i>';
    modalHTML += '<h3>Premium Listing - R199/month</h3>';
    modalHTML += '<p>Get your business featured in our directory. One-time setup fee of R199, then R99/month.</p>';
    modalHTML += '</div>';

    modalHTML += '<form id="business-listing-form" onsubmit="submitBusinessListing(event)">';

    // Business name
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-name">Business Name *</label>';
    modalHTML += '<input type="text" id="biz-name" required placeholder="Your business name">';
    modalHTML += '</div>';

    // Category and country row
    modalHTML += '<div class="form-row">';
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-category">Category *</label>';
    modalHTML += '<select id="biz-category" required>';
    state.directory.categories.forEach(function(cat) {
        modalHTML += '<option value="' + cat + '">' + cat + '</option>';
    });
    modalHTML += '</select>';
    modalHTML += '</div>';
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-country">Country *</label>';
    modalHTML += '<select id="biz-country" required onchange="onCountryChange(\'biz-country\',\'biz-state\',\'\')">';
    modalHTML += '<option value="">Select Country</option>';
    modalHTML += '</select>';
    modalHTML += '</div>';
    modalHTML += '</div>';

    // State/province
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-state">State/Province</label>';
    modalHTML += '<select id="biz-state">';
    modalHTML += '<option value="">N/A</option>';
    modalHTML += '</select>';
    modalHTML += '</div>';

    // City/Area
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-location">City/Area *</label>';
    modalHTML += '<input type="text" id="biz-location" required placeholder="City, Area">';
    modalHTML += '</div>';

    // Description
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-description">Description *</label>';
    modalHTML += '<textarea id="biz-description" required rows="3" placeholder="Describe your business..."></textarea>';
    modalHTML += '</div>';

    // Contact row
    modalHTML += '<div class="form-row">';
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-phone">Phone</label>';
    modalHTML += '<input type="text" id="biz-phone" placeholder="+27 XX XXX XXXX">';
    modalHTML += '</div>';
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-email">Email</label>';
    modalHTML += '<input type="email" id="biz-email" placeholder="business@example.com">';
    modalHTML += '</div>';
    modalHTML += '</div>';

    // Website
    modalHTML += '<div class="form-group">';
    modalHTML += '<label for="biz-website">Website</label>';
    modalHTML += '<input type="url" id="biz-website" placeholder="https://yourbusiness.com">';
    modalHTML += '</div>';

    modalHTML += '<div class="modal-actions">';
    modalHTML += '<button type="button" class="btn btn-ghost" onclick="closeBusinessModal()">Cancel</button>';
    modalHTML += '<button type="submit" class="btn btn-primary"><i class="fas fa-credit-card"></i> Pay &amp; List - R199</button>';
    modalHTML += '</div>';

    modalHTML += '</form>';
    modalHTML += '</div>';
    modalHTML += '</div>';
    modalHTML += '</div>';

    // Remove existing modal
    var existing = document.getElementById('business-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate country dropdown for business modal
    var countrySelect = document.getElementById('biz-country');
    if (countrySelect) {
        locationData.countries.forEach(function(c) {
            countrySelect.innerHTML += '<option value="' + c[0] + '">' + c[1] + '</option>';
        });
    }
}

function closeBusinessModal(event) {
    if (!event || event.target === event.currentTarget) {
        var modal = document.getElementById('business-modal');
        if (modal) modal.remove();
        var overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.style.display = 'none';
    }
}

function submitBusinessListing(event) {
    event.preventDefault();

    var name = document.getElementById('biz-name').value;
    var category = document.getElementById('biz-category').value;
    var countryCode = document.getElementById('biz-country')?.value || '';
    var stateName = document.getElementById('biz-state')?.value || '';
    var cityArea = document.getElementById('biz-location').value;
    var description = document.getElementById('biz-description').value;
    var phone = document.getElementById('biz-phone').value;
    var email = document.getElementById('biz-email').value;
    var website = document.getElementById('biz-website').value;

    var locationParts = [];
    if (cityArea) locationParts.push(cityArea);
    if (stateName && stateName !== 'N/A') locationParts.push(stateName);
    var countryName = locationData.getCountryName(countryCode);
    if (countryName) locationParts.push(countryName);
    var location = locationParts.join(', ') || 'Unknown';

    var listing = {
        id: uuidv4(),
        name: name,
        category: category,
        location: location,
        country: countryCode,
        state: stateName,
        city: cityArea,
        description: description,
        phone: phone,
        email: email,
        website: website,
        owner_id: state.currentUser ? state.currentUser.id : 'guest',
        status: 'active',
        owner: state.currentUser ? state.currentUser.id : 'guest',
        createdAt: new Date(),
        featured: false
    };

    showToast('Processing payment of R199... 💳');
    setTimeout(function() {
        DirectoryDB.create(listing).then(function() {
            closeBusinessModal();
            renderDirectory();
            showToast('Business listed successfully! Welcome to the directory 🎉');
        });
    }, 1500);
}

function saveDirectoryData() {
    try {
        localStorage.setItem('koitus_directory', JSON.stringify(state.directory.listings));
    } catch (e) {
        console.error('Error saving directory data:', e);
    }
}

function loadDirectoryData() {
    try {
        var data = localStorage.getItem('koitus_directory');
        if (data) {
            state.directory.listings = JSON.parse(data);
        }
    } catch (e) {
        console.error('Error loading directory data:', e);
    }
    // Also load from Supabase
    DirectoryDB.getAll().then(function(listings) {
        if (listings && listings.length > 0) {
            state.directory.listings = listings;
            renderDirectory();
        }
    });
}

// Load directory data on init
loadDirectoryData();

console.log('💬 Koitus - Connect. Match. Chat.');
console.log('🚀 Ready to find your perfect connection!');
console.log('🔌 Real-time messaging enabled');
console.log('📹 WebRTC video calls enabled');
console.log('📋 Full CRUD operations loaded');

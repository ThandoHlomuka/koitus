# 💬 Koitus - Connect. Match. Chat.

A modern, feature-rich chat and dating application that helps people find meaningful connections.

---

## ✨ Features

### 🎨 Design
- **Modern UI/UX**: Beautiful gradient design with smooth animations
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Dark Mode**: Toggle between light and dark themes
- **Smooth Animations**: Swipe effects, transitions, and micro-interactions

### 🔐 Authentication
- **Login/Signup**: Email-based authentication
- **Social Login**: Google, Facebook, Apple integration (UI ready)
- **Session Management**: Persistent login with localStorage
- **Secure**: Password requirements and validation

### 💕 Discovery & Matching
- **Swipe Interface**: Tinder-like swipe left/right/super like
- **Smart Profiles**: Detailed user profiles with interests and bio
- **Filter System**: Age range, distance, and gender filters
- **Match Notifications**: Real-time match alerts with popup
- **Super Like**: Stand out with premium likes

### 💬 Messaging
- **Real-Time Chat**: Instant messaging with typing indicators
- **Conversation List**: All your matches in one place
- **Message History**: Persistent chat history
- **Online Status**: See who's online now
- **Auto Replies**: Simulated responses for demo

### 🤖 AI Ice Breakers
- **Smart Suggestions**: AI-powered conversation starters
- **Profile-Based**: Suggestions based on user interests
- **One-Click Send**: Use suggestions instantly
- **Never Run Out**: Always have something to say

### 🔔 Notifications
- **Match Alerts**: Get notified when you match
- **New Messages**: Never miss a conversation
- **Profile Likes**: See who liked you
- **System Updates**: App announcements
- **Unread Counters**: Badge counts on nav items

### 👤 Profile Management
- **Customizable Profile**: Edit bio, interests, photos
- **Profile Stats**: View matches, likes, completion
- **Photo Gallery**: Upload and manage photos
- **Premium Upgrade**: Koitus Gold features

### ⚙️ Settings
- **Account Settings**: Edit profile, change password
- **Privacy Controls**: Manage your visibility
- **Preferences**: Notifications, location, dark mode
- **Support**: Help center, contact us
- **Delete Account**: Full account removal option

---

## 🚀 Quick Start

1. **Open the app**: Double-click `index.html` in your browser
2. **Create Account**: Click "Get Started" or "Sign Up"
3. **Start Matching**: Browse profiles and swipe right to like
4. **Chat**: When you match, start a conversation!

---

## 📁 Project Structure

```
Koitus/
├── index.html          # Main application (1100+ lines)
├── styles.css          # Complete styling (1400+ lines)
├── script.js           # All functionality (900+ lines)
└── README.md           # This file
```

---

## 🎨 Color Palette

### Primary
- `#6366f1` - Indigo (main brand color)
- `#8b5cf6` - Violet (gradient)
- `#ec4899` - Pink (gradient accent)

### Secondary
- `#22c55e` - Success/Green
- `#ef4444` - Error/Red
- `#f59e0b` - Warning/Amber
- `#3b82f6` - Info/Blue

### Neutrals
- Full gray scale from `#f9fafb` to `#111827`

---

## 🌐 Views/Pages

### Landing Page
- Hero section with animated stats
- Features showcase
- How it works (3 steps)
- Testimonials
- CTA section
- Footer with links

### Authentication
- Login modal
- Signup modal
- Social auth options
- Form validation

### Main App
1. **Discover** - Browse and swipe profiles
2. **Matches** - View all your matches
3. **Messages** - Chat with matches
4. **Notifications** - Activity feed
5. **Profile** - Your profile management
6. **Settings** - App preferences

---

## 🎯 Key Features Explained

### Swipe System
- **Left Swipe**: Pass (keyboard: ←)
- **Right Swipe**: Like (keyboard: →)
- **Up Swipe**: Super Like (keyboard: ↑)
- **Match Chance**: 50% on right swipe, 100% on super like

### AI Ice Breakers
Access via the magic wand icon in chat. Suggestions include:
- Interest-based questions
- Photo compliments
- Open-ended conversation starters
- Fun hypothetical questions

### Match System
When you match:
1. Animated popup appears
2. Notification added to feed
3. Match added to matches list
4. Conversation started automatically

---

## 🔧 Customization

### Update Sample Data
Edit `script.js` - `sampleProfiles` array:
```javascript
const sampleProfiles = [
    {
        id: 1,
        name: 'Name',
        age: 25,
        location: 'City, distance',
        bio: 'Your bio here...',
        interests: ['Interest1', 'Interest2'],
        image: 'image_url'
    }
];
```

### Update Colors
Edit `styles.css` - `:root` variables:
```css
:root {
    --primary: #6366f1;
    --primary-gradient: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
    // ... more colors
}
```

### Update Ice Breakers
Edit `script.js` - `iceBreakers` array:
```javascript
const iceBreakers = [
    "Your custom ice breaker here?",
    // ... more suggestions
];
```

---

## 📱 Responsive Breakpoints

- **Desktop**: > 1024px (full sidebar + main content)
- **Tablet**: 768px - 1024px (adjusted layout)
- **Mobile**: < 768px (hidden sidebar, stacked layout)
- **Small Mobile**: < 480px (single column)

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← | Swipe Left (Pass) |
| → | Swipe Right (Like) |
| ↑ | Super Like |
| Enter | Send Message |

---

## 💡 Best Practices

### Performance
- Minimal external dependencies (only Font Awesome & Google Fonts)
- Efficient DOM manipulation
- CSS animations over JS
- Lazy loading ready

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance

### Security
- Input validation on forms
- XSS prevention (textContent vs innerHTML)
- Secure localStorage usage
- Password requirements

---

## 🔮 Future Enhancements

- [ ] Real backend integration (Node.js/Python)
- [ ] WebSocket for real-time chat
- [ ] Image upload functionality
- [ ] Video/Voice calls
- [ ] Location-based matching
- [ ] Advanced AI matching algorithm
- [ ] Payment integration for Premium
- [ ] Push notifications
- [ ] Mobile app (React Native/Flutter)
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Profile verification system
- [ ] Block/Report users
- [ ] Chat export feature
- [ ] Date planning integration

---

## 📊 Tech Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with variables, animations
- **JavaScript (ES6+)**: Vanilla JS, no frameworks
- **Font Awesome**: Icon library
- **Google Fonts**: Plus Jakarta Sans

---

## 🌍 Localization Ready

The app is designed for easy localization:
- All text in JavaScript objects
- Date/time formatting ready
- RTL support in CSS
- Unicode emoji support

---

## 📞 Contact

**Koitus Team**
- 📧 hello@koitus.app
- 🌐 www.koitus.app

---

## 📜 License

Proprietary - Koitus Team

---

## 🙏 Credits

**Developed by**: Koitus Team  
**Design Inspiration**: Modern dating apps (Tinder, Bumble, Hinge)  
**Icons**: Font Awesome  
**Fonts**: Google Fonts (Plus Jakarta Sans)

---

## 🎉 Demo Credentials

Use any email/password to sign up. This is a demo app with simulated authentication.

---

*Last Updated: March 28, 2026*

---

<div align="center">

### 💬 **Koitus - Connect. Match. Chat.**

Made with ❤️ for people seeking genuine connections

**Version 1.0.0**

</div>

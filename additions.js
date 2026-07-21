// ==================== COMMENT SYSTEM ====================
// Add to state object: comments: {}, streamChatMessages: [], streamViewerInterval: null

function getComments(entityType, entityId) {
    var key = entityType + '_' + entityId;
    if (!state.comments) state.comments = {};
    if (!state.comments[key]) state.comments[key] = [];
    return state.comments[key];
}

function addComment(entityType, entityId, text, parentId) {
    if (!text || !text.trim()) {
        showToast('Comment cannot be empty');
        return;
    }
    if (!state.currentUser) {
        showToast('Please log in to comment');
        return;
    }
    var comments = getComments(entityType, entityId);
    var comment = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        entityType: entityType,
        entityId: entityId,
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        userImage: state.currentUser.image || sampleProfiles[0].image,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        likes: [],
        parentId: parentId || null,
        edited: false
    };
    comments.push(comment);
    renderComments(entityType, entityId);
    showToast('Comment added');
}

function updateComment(commentId, newText) {
    if (!newText || !newText.trim()) {
        showToast('Comment cannot be empty');
        return;
    }
    var allComments = state.comments || {};
    var keys = Object.keys(allComments);
    for (var i = 0; i < keys.length; i++) {
        var arr = allComments[keys[i]];
        for (var j = 0; j < arr.length; j++) {
            if (arr[j].id === commentId) {
                if (arr[j].userId !== (state.currentUser ? state.currentUser.id : null)) {
                    showToast('You can only edit your own comments');
                    return;
                }
                arr[j].text = newText.trim();
                arr[j].edited = true;
                renderComments(arr[j].entityType, arr[j].entityId);
                showToast('Comment updated');
                return;
            }
        }
    }
}

function deleteComment(commentId) {
    var allComments = state.comments || {};
    var keys = Object.keys(allComments);
    for (var i = 0; i < keys.length; i++) {
        var arr = allComments[keys[i]];
        for (var j = 0; j < arr.length; j++) {
            if (arr[j].id === commentId) {
                if (arr[j].userId !== (state.currentUser ? state.currentUser.id : null)) {
                    showToast('You can only delete your own comments');
                    return;
                }
                var et = arr[j].entityType;
                var eid = arr[j].entityId;
                // Remove comment and all its replies
                removeCommentAndReplies(keys[i], commentId);
                renderComments(et, eid);
                showToast('Comment deleted');
                return;
            }
        }
    }
}

function removeCommentAndReplies(key, commentId) {
    var arr = state.comments[key] || [];
    // Collect all reply ids to remove
    var toRemove = [commentId];
    var found = true;
    while (found) {
        found = false;
        for (var i = 0; i < arr.length; i++) {
            if (toRemove.indexOf(arr[i].parentId) !== -1 && toRemove.indexOf(arr[i].id) === -1) {
                toRemove.push(arr[i].id);
                found = true;
            }
        }
    }
    state.comments[key] = arr.filter(function(c) {
        return toRemove.indexOf(c.id) === -1;
    });
}

function likeComment(commentId) {
    if (!state.currentUser) {
        showToast('Please log in to like');
        return;
    }
    var allComments = state.comments || {};
    var keys = Object.keys(allComments);
    for (var i = 0; i < keys.length; i++) {
        var arr = allComments[keys[i]];
        for (var j = 0; j < arr.length; j++) {
            if (arr[j].id === commentId) {
                var idx = arr[j].likes.indexOf(state.currentUser.id);
                if (idx === -1) {
                    arr[j].likes.push(state.currentUser.id);
                } else {
                    arr[j].likes.splice(idx, 1);
                }
                renderComments(arr[j].entityType, arr[j].entityId);
                return;
            }
        }
    }
}

function renderComments(entityType, entityId) {
    var container = document.getElementById(entityType + '-' + entityId + '-comments');
    if (!container) return;
    var comments = getComments(entityType, entityId);
    var topLevel = comments.filter(function(c) { return !c.parentId; });
    var totalCount = comments.length;

    var html = '<div class="comments-section">';
    html += '<div class="comments-header">Comments (' + totalCount + ')</div>';
    html += '<div class="comment-input-box">';
    html += '<textarea id="comment-input-' + entityType + '-' + entityId + '" placeholder="Write a comment..." rows="2"></textarea>';
    html += '<button class="btn btn-primary btn-sm" onclick="submitComment(\'' + entityType + '\', \'' + entityId + '\')"><i class="fas fa-paper-plane"></i> Post</button>';
    html += '</div>';
    html += '<div class="comments-list">';
    for (var i = 0; i < topLevel.length; i++) {
        html += createCommentHTML(topLevel[i], 0, entityType, entityId, comments);
    }
    if (topLevel.length === 0) {
        html += '<p style="color:var(--text-tertiary);text-align:center;padding:var(--spacing-4);">No comments yet. Be the first!</p>';
    }
    html += '</div>';
    html += '</div>';
    container.innerHTML = html;
}

function createCommentHTML(comment, depth, entityType, entityId, allComments) {
    var maxIndent = 5;
    var indent = Math.min(depth, maxIndent);
    var marginLeft = indent * 24;
    var isOwn = state.currentUser && comment.userId === state.currentUser.id;
    var hasLiked = state.currentUser && comment.likes.indexOf(state.currentUser.id) !== -1;
    var replyCount = allComments.filter(function(c) { return c.parentId === comment.id; }).length;

    var html = '<div class="comment-item" style="margin-left:' + marginLeft + 'px;">';
    html += '<div class="comment-avatar">';
    html += '<img src="' + comment.userImage + '" alt="' + comment.userName + '">';
    html += '</div>';
    html += '<div class="comment-body">';
    html += '<div class="comment-meta">';
    html += '<span class="comment-name">' + comment.userName + '</span>';
    html += '<span class="comment-time">' + getTimeAgo(comment.timestamp) + '</span>';
    if (comment.edited) {
        html += '<span class="comment-edited">(edited)</span>';
    }
    html += '</div>';
    html += '<div class="comment-text">' + escapeHTML(comment.text) + '</div>';
    html += '<div class="comment-actions">';
    html += '<button class="comment-action-btn ' + (hasLiked ? 'liked' : '') + '" onclick="likeComment(\'' + comment.id + '\')">';
    html += '<i class="fas fa-heart"></i> ' + (comment.likes.length > 0 ? comment.likes.length : '');
    html += '</button>';
    html += '<button class="comment-action-btn" onclick="toggleReplyForm(\'' + entityType + '\', \'' + entityId + '\', \'' + comment.id + '\')">';
    html += '<i class="fas fa-reply"></i> Reply';
    if (replyCount > 0) {
        html += ' (' + replyCount + ')';
    }
    html += '</button>';
    if (isOwn) {
        html += '<button class="comment-action-btn" onclick="startEditComment(\'' + comment.id + '\', \'' + entityType + '\', \'' + entityId + '\')">';
        html += '<i class="fas fa-edit"></i> Edit';
        html += '</button>';
        html += '<button class="comment-action-btn comment-action-delete" onclick="deleteComment(\'' + comment.id + '\')">';
        html += '<i class="fas fa-trash"></i> Delete';
        html += '</button>';
    }
    html += '</div>';
    // Reply form placeholder
    html += '<div id="reply-form-' + comment.id + '" style="display:none;"></div>';
    // Nested replies
    var replies = allComments.filter(function(c) { return c.parentId === comment.id; });
    if (replies.length > 0) {
        html += '<div class="comment-replies">';
        for (var i = 0; i < replies.length; i++) {
            html += createCommentHTML(replies[i], depth + 1, entityType, entityId, allComments);
        }
        html += '</div>';
    }
    html += '</div>';
    html += '</div>';
    return html;
}

function submitComment(entityType, entityId) {
    var input = document.getElementById('comment-input-' + entityType + '-' + entityId);
    if (input && input.value.trim()) {
        addComment(entityType, entityId, input.value.trim(), null);
    }
}

function toggleReplyForm(entityType, entityId, commentId) {
    var formContainer = document.getElementById('reply-form-' + commentId);
    if (!formContainer) return;
    if (formContainer.style.display === 'none' || formContainer.innerHTML === '') {
        formContainer.style.display = 'block';
        formContainer.innerHTML = '<div class="comment-reply-form">' +
            '<textarea id="reply-input-' + commentId + '" placeholder="Write a reply..." rows="2"></textarea>' +
            '<div class="comment-reply-form-actions">' +
            '<button class="btn btn-primary btn-sm" onclick="submitReply(\'' + entityType + '\', \'' + entityId + '\', \'' + commentId + '\')"><i class="fas fa-paper-plane"></i> Reply</button>' +
            '<button class="btn btn-outline btn-sm" onclick="cancelReply(\'' + commentId + '\')">Cancel</button>' +
            '</div></div>';
    } else {
        formContainer.style.display = 'none';
    }
}

function cancelReply(commentId) {
    var formContainer = document.getElementById('reply-form-' + commentId);
    if (formContainer) {
        formContainer.style.display = 'none';
        formContainer.innerHTML = '';
    }
}

function submitReply(entityType, entityId, parentId) {
    var input = document.getElementById('reply-input-' + parentId);
    if (input && input.value.trim()) {
        addComment(entityType, entityId, input.value.trim(), parentId);
    }
}

function startEditComment(commentId, entityType, entityId) {
    var allComments = state.comments || {};
    var key = entityType + '_' + entityId;
    var arr = allComments[key] || [];
    var comment = null;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === commentId) {
            comment = arr[i];
            break;
        }
    }
    if (!comment) return;

    var commentEl = document.querySelector('[data-comment-id="' + commentId + '"] .comment-text');
    if (!commentEl) {
        // Fallback: find the text element in the rendered tree
        var items = document.querySelectorAll('.comment-item');
        // We'll use a simple approach: replace text with edit form inline
    }

    // Create edit form
    var key2 = entityType + '_' + entityId;
    var comments = state.comments[key2] || [];
    var container = document.getElementById(entityType + '-' + entityId + '-comments');
    if (!container) return;

    // Re-render with edit mode
    renderComments(entityType, entityId);

    // After re-render, find and replace the comment text with edit form
    setTimeout(function() {
        var allItems = container.querySelectorAll('.comment-item');
        for (var i = 0; i < allItems.length; i++) {
            var actionsEl = allItems[i].querySelector('.comment-actions');
            if (!actionsEl) continue;
            var editBtn = actionsEl.querySelector('[onclick*="startEditComment"]');
            if (!editBtn) continue;
            // Check if this is the right comment by checking the onclick attribute
            if (editBtn.getAttribute('onclick').indexOf(commentId) !== -1) {
                var textEl = allItems[i].querySelector('.comment-text');
                if (textEl) {
                    var editHTML = '<div class="comment-edit-form">' +
                        '<textarea id="edit-input-' + commentId + '" rows="2">' + escapeHTML(comment.text) + '</textarea>' +
                        '<div class="comment-reply-form-actions">' +
                        '<button class="btn btn-primary btn-sm" onclick="saveEditComment(\'' + commentId + '\', \'' + entityType + '\', \'' + entityId + '\')"><i class="fas fa-check"></i> Save</button>' +
                        '<button class="btn btn-outline btn-sm" onclick="renderComments(\'' + entityType + '\', \'' + entityId + '\')">Cancel</button>' +
                        '</div></div>';
                    textEl.innerHTML = editHTML;
                }
                break;
            }
        }
    }, 50);
}

function saveEditComment(commentId, entityType, entityId) {
    var input = document.getElementById('edit-input-' + commentId);
    if (input && input.value.trim()) {
        updateComment(commentId, input.value.trim());
    }
}

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ==================== STREAM VIEWER MODAL ====================

function openStreamViewer(streamId) {
    var stream = state.streams.find(function(s) { return s.id === streamId; });
    if (!stream) {
        showToast('Stream not found');
        return;
    }

    var modal = document.getElementById('stream-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'stream-viewer-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    var viewerCount = stream.viewers || Math.floor(Math.random() * 5000) + 100;

    modal.innerHTML = '\
        <div class="stream-viewer-container">\
            <button class="stream-viewer-close" onclick="closeStreamViewer()"><i class="fas fa-times"></i></button>\
            <div class="stream-viewer-main">\
                <div class="stream-viewer-player">\
                    <div class="stream-video-area">\
                        <div class="stream-video-placeholder">\
                            <i class="fas fa-play-circle"></i>\
                            <p>' + stream.title + '</p>\
                        </div>\
                        <div class="stream-video-overlay">\
                            <span class="stream-live-badge"><span class="live-dot"></span> LIVE</span>\
                            <span class="stream-viewer-count" id="stream-viewer-count"><i class="fas fa-eye"></i> ' + formatViewerCount(viewerCount) + '</span>\
                        </div>\
                    </div>\
                    <div class="stream-viewer-info">\
                        <img src="' + stream.streamer.image + '" alt="' + stream.streamer.name + '" class="stream-viewer-avatar">\
                        <div class="stream-viewer-details">\
                            <h3>' + stream.streamer.name + '</h3>\
                            <span class="stream-viewer-category">' + stream.category + '</span>\
                        </div>\
                        <div class="stream-viewer-actions">\
                            <button class="stream-action-btn" id="stream-like-btn" onclick="likeStream(\'' + stream.id + '\')"><i class="fas fa-heart"></i> <span>' + formatViewerCount(stream.likes || 0) + '</span></button>\
                            <button class="stream-action-btn" onclick="followStreamer(\'' + stream.streamer.name + '\')"><i class="fas fa-user-plus"></i> Follow</button>\
                            <button class="stream-action-btn" onclick="shareStream(\'' + stream.title + '\')"><i class="fas fa-share"></i> Share</button>\
                            <button class="stream-action-btn stream-action-tip" onclick="openStreamGiftPanel(\'' + streamId + '\')"><i class="fas fa-gift"></i> Gift</button>\
                            <button class="stream-action-btn stream-action-tip" onclick="openStreamTipPanel(\'' + streamId + '\')"><i class="fas fa-hand-holding-usd"></i> Tip</button>\
                            <button class="stream-action-btn stream-action-report" onclick="reportStream(\'' + streamId + '\')"><i class="fas fa-flag"></i></button>\
                        </div>\
                    </div>\
                    <div class="stream-comments-section">\
                        <div class="stream-comments-header"><i class="fas fa-comments"></i> Live Chat</div>\
                        <div class="stream-chat-messages" id="stream-chat-messages"></div>\
                        <div class="stream-chat-input">\
                            <input type="text" id="stream-chat-input" placeholder="Say something..." onkeypress="if(event.key===\'Enter\')sendStreamChat()">\
                            <button class="btn btn-primary btn-sm" onclick="sendStreamChat()"><i class="fas fa-paper-plane"></i></button>\
                        </div>\
                    </div>\
                </div>\
            </div>\
        </div>';

    modal.style.display = 'flex';
    modal.onclick = function(e) {
        if (e.target === modal) closeStreamViewer();
    };

    // Simulate viewer count
    if (state.streamViewerInterval) clearInterval(state.streamViewerInterval);
    state.streamViewerInterval = setInterval(function() {
        viewerCount += Math.floor(Math.random() * 20) - 5;
        if (viewerCount < 50) viewerCount = 50;
        var countEl = document.getElementById('stream-viewer-count');
        if (countEl) {
            countEl.innerHTML = '<i class="fas fa-eye"></i> ' + formatViewerCount(viewerCount);
        }
    }, 3000);

    // Init chat
    state.streamChatMessages = [];
    renderStreamChat();
    simulateStreamChat(stream);
}

function closeStreamViewer() {
    var modal = document.getElementById('stream-viewer-modal');
    if (modal) modal.remove();
    if (state.streamViewerInterval) {
        clearInterval(state.streamViewerInterval);
        state.streamViewerInterval = null;
    }
}

function sendStreamChat() {
    var input = document.getElementById('stream-chat-input');
    if (!input || !input.value.trim()) return;
    if (!state.currentUser) {
        showToast('Please log in to chat');
        return;
    }
    var msg = {
        id: Date.now(),
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        userImage: state.currentUser.image || sampleProfiles[0].image,
        text: input.value.trim(),
        timestamp: new Date().toISOString(),
        isOwn: true
    };
    if (!state.streamChatMessages) state.streamChatMessages = [];
    state.streamChatMessages.push(msg);
    input.value = '';
    renderStreamChat();
}

function renderStreamChat() {
    var container = document.getElementById('stream-chat-messages');
    if (!container) return;
    var messages = state.streamChatMessages || [];
    var html = '';
    for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        html += '<div class="stream-chat-msg ' + (m.isOwn ? 'own' : '') + '">';
        html += '<img src="' + m.userImage + '" class="stream-chat-avatar" alt="' + m.userName + '">';
        html += '<div class="stream-chat-msg-body">';
        html += '<span class="stream-chat-name">' + m.userName + '</span>';
        html += '<span class="stream-chat-text">' + escapeHTML(m.text) + '</span>';
        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function simulateStreamChat(stream) {
    var chatNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Charlie'];
    var chatMessages = [
        'This is amazing! 🔥',
        'Love this stream!',
        'Hey everyone!',
        'First time here, loving it',
        'What camera are you using?',
        'You look great today!',
        'Keep it up! 💪',
        'How long have you been streaming?',
        'Can you do a shoutout?',
        'This is so entertaining',
        'Hi from Cape Town! 🇿🇦',
        'Love from Joburg!',
        'What category is this?',
        'Just joined, what did I miss?',
        'Incredible content as always'
    ];
    var chatInterval = setInterval(function() {
        var modal = document.getElementById('stream-viewer-modal');
        if (!modal) {
            clearInterval(chatInterval);
            return;
        }
        var name = chatNames[Math.floor(Math.random() * chatNames.length)];
        var text = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        var profileIdx = Math.floor(Math.random() * sampleProfiles.length);
        var msg = {
            id: Date.now(),
            userId: -Math.floor(Math.random() * 1000),
            userName: name,
            userImage: sampleProfiles[profileIdx].image,
            text: text,
            timestamp: new Date().toISOString(),
            isOwn: false
        };
        if (!state.streamChatMessages) state.streamChatMessages = [];
        state.streamChatMessages.push(msg);
        // Keep last 50 messages
        if (state.streamChatMessages.length > 50) {
            state.streamChatMessages = state.streamChatMessages.slice(-50);
        }
        renderStreamChat();
    }, 2000 + Math.random() * 3000);
    state.streamChatInterval = chatInterval;
}

function formatViewerCount(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function followStreamer(name) {
    showToast('Now following ' + name + '!');
}

function shareStream(title) {
    if (navigator.share) {
        navigator.share({ title: title, text: 'Check out this stream: ' + title, url: window.location.href });
    } else {
        showToast('Link copied to clipboard!');
    }
}

function reportStream(streamId) {
    showToast('Stream reported. Thank you for your feedback.');
}

function openStreamGiftPanel(streamId) {
    var stream = state.streams.find(function(s) { return s.id === streamId; });
    var streamerName = stream ? stream.streamer.name : 'Streamer';
    var gifts = [
        { name: 'Rose', price: 5, emoji: '🌹' },
        { name: 'Heart', price: 10, emoji: '❤️' },
        { name: 'Fire', price: 25, emoji: '🔥' },
        { name: 'Diamond', price: 50, emoji: '💎' },
        { name: 'Crown', price: 100, emoji: '👑' },
        { name: 'Rocket', price: 250, emoji: '🚀' }
    ];

    var existing = document.getElementById('stream-gift-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'stream-gift-panel';
    panel.className = 'modal-overlay';
    var html = '<div class="gift-panel-inner">';
    html += '<div class="gift-panel-header"><h3>Send a Gift to ' + streamerName + '</h3>';
    html += '<span class="gift-panel-balance">Balance: R' + (state.wallet.balance || 0).toFixed(2) + '</span></div>';
    html += '<div class="gift-grid">';
    for (var i = 0; i < gifts.length; i++) {
        html += '<div class="gift-item" onclick="sendStreamGift(\'' + streamId + '\', \'' + gifts[i].name + '\', ' + gifts[i].price + ', \'' + gifts[i].emoji + '\')">';
        html += '<span class="gift-emoji">' + gifts[i].emoji + '</span>';
        html += '<span class="gift-name">' + gifts[i].name + '</span>';
        html += '<span class="gift-price">R' + gifts[i].price + '</span>';
        html += '</div>';
    }
    html += '</div></div>';
    panel.innerHTML = html;
    panel.onclick = function(e) { if (e.target === panel) panel.remove(); };
    document.body.appendChild(panel);
}

function sendStreamGift(streamId, name, price, emoji) {
    if (state.wallet.balance < price) {
        showToast('Insufficient balance. You need R' + price.toFixed(2) + ' but have R' + (state.wallet.balance || 0).toFixed(2));
        return;
    }
    state.wallet.balance -= price;
    state.wallet.transactions.unshift({
        id: Date.now(),
        type: 'gift_sent',
        amount: -price,
        description: 'Stream gift: ' + name + ' ' + emoji,
        date: new Date().toISOString(),
        userId: state.currentUser ? state.currentUser.id : null
    });
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(state.wallet));
    var panel = document.getElementById('stream-gift-panel');
    if (panel) panel.remove();
    showToast(emoji + ' ' + name + ' sent! -R' + price.toFixed(2));
}

function openStreamTipPanel(streamId) {
    var stream = state.streams.find(function(s) { return s.id === streamId; });
    var streamerName = stream ? stream.streamer.name : 'Streamer';
    var tips = [10, 25, 50, 100, 250, 500];

    var existing = document.getElementById('stream-tip-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'stream-tip-panel';
    panel.className = 'modal-overlay';
    var html = '<div class="gift-panel-inner">';
    html += '<div class="gift-panel-header"><h3>Tip ' + streamerName + '</h3>';
    html += '<span class="gift-panel-balance">Balance: R' + (state.wallet.balance || 0).toFixed(2) + '</span></div>';
    html += '<div class="gift-grid">';
    for (var i = 0; i < tips.length; i++) {
        html += '<div class="gift-item" onclick="sendStreamTip(\'' + streamId + '\', ' + tips[i] + ')">';
        html += '<span class="gift-emoji">💰</span>';
        html += '<span class="gift-name">R' + tips[i] + '</span>';
        html += '<span class="gift-price">Tip</span>';
        html += '</div>';
    }
    html += '</div></div>';
    panel.innerHTML = html;
    panel.onclick = function(e) { if (e.target === panel) panel.remove(); };
    document.body.appendChild(panel);
}

function sendStreamTip(streamId, amount) {
    if (state.wallet.balance < amount) {
        showToast('Insufficient balance. You need R' + amount.toFixed(2) + ' but have R' + (state.wallet.balance || 0).toFixed(2));
        return;
    }
    state.wallet.balance -= amount;
    state.wallet.transactions.unshift({
        id: Date.now(),
        type: 'tip_sent',
        amount: -amount,
        description: 'Stream tip',
        date: new Date().toISOString(),
        userId: state.currentUser ? state.currentUser.id : null
    });
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(state.wallet));
    var panel = document.getElementById('stream-tip-panel');
    if (panel) panel.remove();
    showToast('💰 R' + amount + ' tip sent!');
}

// ==================== MEDIA PLAYER COMPONENT ====================

function createMediaPlayer(type, src, options) {
    options = options || {};
    var playerId = 'media-player-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    var autoplay = options.autoplay ? ' autoplay' : '';
    var loop = options.loop ? ' loop' : '';
    var posterAttr = options.poster ? ' poster="' + options.poster + '"' : '';
    var title = options.title || '';

    if (type === 'video') {
        return '\
        <div class="custom-media-player video-player" id="' + playerId + '" data-type="video">\
            <div class="media-video-wrapper">\
                <video id="' + playerId + '-video" src="' + src + '"' + posterAttr + autoplay + loop + ' preload="metadata"></video>\
                <div class="media-play-overlay" id="' + playerId + '-overlay" onclick="playMedia(\'' + playerId + '\')">\
                    ' + (options.poster ? '<img src="' + options.poster + '" class="media-poster-img">' : '') + '\
                    <div class="media-play-btn-large"><i class="fas fa-play"></i></div>\
                </div>\
                <div class="media-title-bar">' + title + '</div>\
            </div>\
            <div class="media-controls">\
                <button class="media-ctrl-btn" onclick="playMedia(\'' + playerId + '\')" id="' + playerId + '-playbtn"><i class="fas fa-play"></i></button>\
                <div class="media-progress-container" onclick="seekMedia(event, \'' + playerId + '\')">\
                    <div class="media-progress-bar" id="' + playerId + '-progress"></div>\
                    <div class="media-progress-thumb" id="' + playerId + '-thumb"></div>\
                </div>\
                <span class="media-time" id="' + playerId + '-time">00:00 / 00:00</span>\
                <button class="media-ctrl-btn" onclick="toggleMute(\'' + playerId + '\')" id="' + playerId + '-mutebtn"><i class="fas fa-volume-up"></i></button>\
                <div class="media-volume-slider">\
                    <input type="range" min="0" max="100" value="100" class="media-volume-range" onchange="setVolume(\'' + playerId + '\', this.value)">\
                </div>\
                <button class="media-ctrl-btn media-fullscreen-btn" onclick="toggleFullscreen(\'' + playerId + '\')"><i class="fas fa-expand"></i></button>\
            </div>\
        </div>';
    }

    if (type === 'audio') {
        return '\
        <div class="custom-media-player audio-player" id="' + playerId + '" data-type="audio">\
            <div class="audio-player-inner">\
                <div class="audio-waveform" id="' + playerId + '-waveform">\
                    <div class="audio-waveform-bars">\
                        ' + generateWaveformBars() + '\
                    </div>\
                </div>\
                <div class="audio-info">\
                    ' + (options.poster ? '<img src="' + options.poster + '" class="audio-thumb">' : '<div class="audio-thumb audio-thumb-placeholder"><i class="fas fa-music"></i></div>') + '\
                    <div class="audio-details">\
                        <span class="audio-title">' + title + '</span>\
                        <span class="audio-time" id="' + playerId + '-time">00:00 / 00:00</span>\
                    </div>\
                </div>\
                <audio id="' + playerId + '-audio" src="' + src + '"' + autoplay + loop + ' preload="metadata"></audio>\
                <div class="audio-controls">\
                    <button class="media-ctrl-btn audio-play-btn" onclick="playMedia(\'' + playerId + '\')" id="' + playerId + '-playbtn"><i class="fas fa-play"></i></button>\
                    <div class="media-progress-container audio-progress" onclick="seekMedia(event, \'' + playerId + '\')">\
                        <div class="media-progress-bar" id="' + playerId + '-progress"></div>\
                        <div class="media-progress-thumb" id="' + playerId + '-thumb"></div>\
                    </div>\
                    <button class="media-ctrl-btn" onclick="toggleMute(\'' + playerId + '\')" id="' + playerId + '-mutebtn"><i class="fas fa-volume-up"></i></button>\
                    <div class="media-volume-slider">\
                        <input type="range" min="0" max="100" value="100" class="media-volume-range" onchange="setVolume(\'' + playerId + '\', this.value)">\
                    </div>\
                </div>\
            </div>\
        </div>';
    }

    return '';
}

function generateWaveformBars() {
    var html = '';
    for (var i = 0; i < 40; i++) {
        var height = Math.floor(Math.random() * 60) + 10;
        html += '<div class="waveform-bar" style="height:' + height + '%;"></div>';
    }
    return html;
}

function playMedia(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    var mediaType = player.getAttribute('data-type');
    var mediaEl;
    var overlay;
    var playBtn;

    if (mediaType === 'video') {
        mediaEl = document.getElementById(playerId + '-video');
        overlay = document.getElementById(playerId + '-overlay');
        playBtn = document.getElementById(playerId + '-playbtn');
    } else {
        mediaEl = document.getElementById(playerId + '-audio');
        playBtn = document.getElementById(playerId + '-playbtn');
    }

    if (!mediaEl) return;

    if (mediaEl.paused) {
        mediaEl.play();
        if (overlay) overlay.style.display = 'none';
        if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        startMediaProgress(playerId);
    } else {
        mediaEl.pause();
        if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function startMediaProgress(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    var mediaType = player.getAttribute('data-type');
    var mediaEl = mediaType === 'video' ? document.getElementById(playerId + '-video') : document.getElementById(playerId + '-audio');
    if (!mediaEl) return;

    function updateProgress() {
        if (mediaEl.paused && mediaEl.currentTime === 0) return;
        var current = mediaEl.currentTime;
        var duration = mediaEl.duration || 0;
        var pct = duration > 0 ? (current / duration) * 100 : 0;

        var progressBar = document.getElementById(playerId + '-progress');
        var thumb = document.getElementById(playerId + '-thumb');
        var timeEl = document.getElementById(playerId + '-time');

        if (progressBar) progressBar.style.width = pct + '%';
        if (thumb) thumb.style.left = pct + '%';
        if (timeEl) timeEl.textContent = formatMediaTime(current) + ' / ' + formatMediaTime(duration);

        // Animate waveform for audio
        if (mediaType === 'audio' && !mediaEl.paused) {
            var bars = player.querySelectorAll('.waveform-bar');
            for (var i = 0; i < bars.length; i++) {
                var newHeight = Math.floor(Math.random() * 80) + 10;
                bars[i].style.height = newHeight + '%';
            }
        }

        if (!mediaEl.paused) {
            requestAnimationFrame(updateProgress);
        }
    }

    mediaEl.ontimeupdate = updateProgress;
    mediaEl.onended = function() {
        var playBtn = document.getElementById(playerId + '-playbtn');
        if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        var overlay = document.getElementById(playerId + '-overlay');
        if (overlay) overlay.style.display = 'flex';
    };
    updateProgress();
}

function seekMedia(event, playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    var mediaType = player.getAttribute('data-type');
    var mediaEl = mediaType === 'video' ? document.getElementById(playerId + '-video') : document.getElementById(playerId + '-audio');
    if (!mediaEl || !mediaEl.duration) return;

    var container = event.currentTarget;
    var rect = container.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var pct = x / rect.width;
    mediaEl.currentTime = pct * mediaEl.duration;
}

function toggleMute(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    var mediaType = player.getAttribute('data-type');
    var mediaEl = mediaType === 'video' ? document.getElementById(playerId + '-video') : document.getElementById(playerId + '-audio');
    var muteBtn = document.getElementById(playerId + '-mutebtn');
    if (!mediaEl) return;

    mediaEl.muted = !mediaEl.muted;
    if (muteBtn) {
        muteBtn.innerHTML = mediaEl.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    }
}

function setVolume(playerId, value) {
    var player = document.getElementById(playerId);
    if (!player) return;
    var mediaType = player.getAttribute('data-type');
    var mediaEl = mediaType === 'video' ? document.getElementById(playerId + '-video') : document.getElementById(playerId + '-audio');
    var muteBtn = document.getElementById(playerId + '-mutebtn');
    if (!mediaEl) return;

    mediaEl.volume = value / 100;
    mediaEl.muted = value == 0;
    if (muteBtn) {
        if (value == 0) {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (value < 50) {
            muteBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }
}

function toggleFullscreen(playerId) {
    var player = document.getElementById(playerId);
    if (!player) return;
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        player.requestFullscreen().catch(function() {});
    }
}

function formatMediaTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// --- 1. GLOBALS & FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBqUHe4ugD2eUFL2rdxQe6dszPVS6siBVI",
    authDomain: "pcgeeklives.firebaseapp.com",
    databaseURL: "https://pcgeeklives-default-rtdb.firebaseio.com",
    projectId: "pcgeeklives",
    storageBucket: "pcgeeklives.firebasestorage.app",
    messagingSenderId: "524615602290",
    appId: "1:524615602290:web:effbe3230dae2b9f4db2eb",
    measurementId: "G-2PK0B9N43K"
};

let db;
let channelsData = [];
let categoriesData = [];
let activeStreamId = 0;

// --- 2. GLOBAL UTILITIES ---

function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 600);
    }
}

function refreshUI() {
    if (document.getElementById('channels-list')) renderChannels();
    if (document.getElementById('admin-link-list')) {
        renderAdminList();
        renderCategoriesAdmin();
        updateCategoryDropdowns();
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? 'rgba(255, 51, 51, 0.9)' : 'rgba(0, 243, 255, 0.9)'};
        color: #fff;
        padding: 12px 25px;
        border-radius: 50px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 0 20px ${isError ? '#ff3333' : '#00f3ff'};
        animation: toast-in 0.3s ease-out;
        direction: rtl;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

// --- 3. RENDERING ENGINE ---

function getOrderedCategories() {
    return [...categoriesData].sort((a, b) => (a.order || 0) - (b.order || 0)).map(c => c.name);
}

function renderChannels() {
    const grid = document.getElementById('channels-list');
    if (!grid) return;
    if (channelsData.length === 0) {
        grid.innerHTML = `
            <div class="luxury-loading-wrap">
                <div class="premium-loader"></div>
                <div class="loading-msg">جاري تحميل قائمة القنوات...</div>
            </div>`;
        return;
    }

    const groups = {};
    channelsData.forEach(ch => {
        const cat = ch.category || "عام";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ch);
    });

    const orderedCats = getOrderedCategories();
    grid.innerHTML = '';

    orderedCats.forEach(cat => {
        if (groups[cat] && groups[cat].length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group collapsed';
            groupDiv.innerHTML = `
                <div class="category-header luxury-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span>${cat}</span><span class="header-arrow">▾</span>
                </div>
            `;
            const listDiv = document.createElement('div');
            listDiv.className = 'category-channels-list';
            groups[cat].forEach(ch => {
                const item = document.createElement('div');
                item.className = 'channel-item';
                item.innerHTML = `<div class="channel-name">${ch.name}</div><div class="play-icon">▶</div>`;
                item.onclick = () => playStream(ch.url, ch.name, ch.forceProtection, cat, ch.forceAudio, ch.subtitleUrl);
                listDiv.appendChild(item);
            });
            groupDiv.appendChild(listDiv);
            grid.appendChild(groupDiv);
        }
    });
}

function renderAdminList(filterQuery = "") {
    const container = document.getElementById('admin-link-list');
    if (!container) return;
    container.innerHTML = '';

    const groups = {};
    channelsData.forEach(ch => {
        if (filterQuery && !ch.name.toLowerCase().includes(filterQuery.toLowerCase())) return;
        const cat = ch.category || "عام";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ch);
    });

    const orderedCats = getOrderedCategories();
    orderedCats.forEach(cat => {
        const groupSection = document.createElement('div');
        groupSection.style.cssText = 'margin-bottom:15px; border:1px solid rgba(0,243,255,0.2); border-radius:10px; background:rgba(0,0,0,0.2); overflow:hidden;';

        const channelCount = groups[cat] ? groups[cat].length : 0;
        groupSection.innerHTML = `
            <div style="background:rgba(0,243,255,0.1); padding:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="let b=this.nextElementSibling; b.style.display=b.style.display==='none'?'block':'none'">
                <h3 style="margin:0; font-size:1.1rem; color:var(--primary-color);">📂 ${cat} (${channelCount})</h3>
                <span class="arrow">▼</span>
            </div>
            <div class="group-body" style="padding:15px; display:none; border-top:1px solid rgba(0,243,255,0.1);"></div>
        `;

        const body = groupSection.querySelector('.group-body');
        if (!groups[cat] || groups[cat].length === 0) {
            body.innerHTML = '<div style="text-align:center; color:#555; font-size:12px;">قائمة فارغة</div>';
        } else {
            groups[cat].forEach(link => {
                const div = document.createElement('div');
                div.className = 'admin-list-item';
                div.style.background = 'rgba(255,255,255,0.02)';
                div.style.marginBottom = '10px';
                div.style.padding = '10px';
                div.style.borderRadius = '8px';

                const safeId = String(link.id);
                div.innerHTML = `
                    <div class="admin-edit-row">
                        <div class="admin-inputs-group">
                            <div class="input-field">
                                <label>اسم القناة</label>
                                <input type="text" id="edit-name-${safeId}" value="${link.name}" class="form-control">
                            </div>
                            <div class="input-field">
                                <label>القسم</label>
                                <select id="edit-cat-${safeId}" class="form-control">
                                    ${orderedCats.map(c => `<option value="${c}" ${c === cat ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="input-field">
                                <label>رابط الفيديو/كود التضمين</label>
                                <input type="text" id="edit-url-${safeId}" value="${(link.url || '').replace(/"/g, '&quot;')}" class="form-control">
                            </div>
                        </div>
                        
                        <div class="admin-actions-vertical">
                            <label class="admin-check-label">
                                <input type="checkbox" id="edit-protection-${safeId}" ${link.forceProtection ? 'checked' : ''}> 🛡️ نظام الحماية
                            </label>
                            <label class="admin-check-label" style="color:var(--secondary-color);">
                                <input type="checkbox" id="edit-audio-${safeId}" ${link.forceAudio ? 'checked' : ''}> 🎵 مشغل موسيقي
                            </label>
                            <div class="admin-btn-stack">
                                <button class="btn btn-primary btn-save" onclick="window.updateChannelInfo('${safeId}')">💾 حفظ التعديلات</button>
                                <button class="btn btn-danger btn-delete" onclick="window.deleteChannel('${safeId}')">🗑️ حذف القناة</button>
                            </div>
                        </div>
                    </div>
                `;
                body.appendChild(div);
            });
        }
        container.appendChild(groupSection);
    });
}

function renderCategoriesAdmin() {
    const container = document.getElementById('categories-manage-list');
    if (!container) return;
    const sorted = [...categoriesData].sort((a, b) => (a.order || 0) - (b.order || 0));
    container.innerHTML = sorted.map((catObj) => `
        <div style="background:rgba(0,243,255,0.1); padding:10px; border-radius:10px; display:flex; align-items:center; gap:10px; border:1px solid rgba(0,243,255,0.3); width:100%;">
            <input type="number" value="${catObj.order || 0}" 
                style="width:50px; background:#000; color:#00f3ff; border:1px solid #333; border-radius:5px; text-align:center; padding:5px;"
                onchange="window.updateCategoryOrder('${catObj.id}', this.value)"
                title="رقم الترتيب">
            <span style="flex-grow:1; font-weight:bold;">${catObj.name}</span>
            <button onclick="window.editCategory('${catObj.id}', '${catObj.name}')" style="background:none; border:none; cursor:pointer;">✏️</button>
            <button onclick="window.deleteCategory('${catObj.id}')" style="background:none; border:none; color:#ff3333; cursor:pointer;">&times;</button>
        </div>
    `).join('');
}

function updateCategoryDropdowns() {
    const mainSelect = document.getElementById('link-category');
    if (mainSelect) {
        const ordered = getOrderedCategories();
        mainSelect.innerHTML = ordered.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

// --- 4. DATA OPERATIONS ---

function initApp() {
    setTimeout(hidePageLoader, 2000);
    if (typeof firebase === 'undefined') return;
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();

    let linksData = [];
    let channelsNodeData = [];

    db.ref('links').on('value', snap => {
        const data = snap.val();
        linksData = data ? Object.keys(data).map(k => ({ id: k, ...data[k], _node: 'links' })) : [];
        channelsData = [...linksData, ...channelsNodeData];
        requestAnimationFrame(refreshUI);
    });

    db.ref('channels').on('value', snap => {
        const data = snap.val();
        channelsNodeData = data ? Object.keys(data).map(k => ({ id: k, ...data[k], _node: 'channels' })) : [];
        channelsData = [...linksData, ...channelsNodeData];
        requestAnimationFrame(refreshUI);
    });

    db.ref('categories_ordered').on('value', snap => {
        const data = snap.val();
        if (data) categoriesData = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        requestAnimationFrame(refreshUI);
    });

    db.ref('visitor_count').on('value', s => {
        const el = document.getElementById('visitor-count');
        if (el) el.textContent = (s.val() || 0).toLocaleString();
    });

    if (!sessionStorage.getItem('counted_vfinal')) {
        db.ref('visitor_count').transaction(c => (c || 0) + 1);
        sessionStorage.setItem('counted_vfinal', 'true');
    }
}

// --- 6. ACTIONS ---

window.updateCategoryOrder = (id, newOrder) => {
    if (db && id) {
        db.ref('categories_ordered').child(id).update({ order: parseInt(newOrder) || 0 })
            .then(() => showToast("✅ تم تحديث الترتيب بنجاح"));
    }
};

window.addNewCategory = () => {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (name && db) {
        const maxOrder = categoriesData.length > 0 ? Math.max(...categoriesData.map(c => c.order || 0)) : -1;
        db.ref('categories_ordered').push({ name, order: maxOrder + 1 }).then(() => {
            input.value = '';
            showToast("✅ تم إضافة القسم بنجاح");
        });
    }
};

window.editCategory = (id, oldName) => {
    const newName = prompt("الاسم الجديد:", oldName);
    if (newName && newName.trim() !== "" && db) {
        db.ref('categories_ordered').child(id).update({ name: newName.trim() })
            .then(() => showToast("✅ تم تعديل الاسم بنجاح"));
    }
};

window.deleteCategory = (id) => {
    if (confirm("هل أنت متأكد من حذف هذا القسم؟") && db) {
        db.ref('categories_ordered').child(id).remove()
            .then(() => showToast("🗑️ تم حذف القسم بنجاح"));
    }
};

window.updateChannelInfo = (id) => {
    const name = document.getElementById(`edit-name-${id}`).value.trim();
    const url = document.getElementById(`edit-url-${id}`).value.trim();
    const cat = document.getElementById(`edit-cat-${id}`).value;
    const forceProtection = document.getElementById(`edit-protection-${id}`).checked;
    const forceAudio = document.getElementById(`edit-audio-${id}`).checked;

    const channel = channelsData.find(c => c.id === id);
    const node = (channel && channel._node) ? channel._node : 'channels';

    if (db) {
        showToast("💾 جاري حفظ التعديلات...");
        db.ref(node).child(id).update({ name, url, category: cat, forceProtection, forceAudio })
            .then(() => showToast("✅ تم حفظ التعديلات بنجاح"));
    }
};

window.deleteChannel = (id) => {
    if (confirm("هل أنت متأكد من حذف هذه القناة؟") && db) {
        const channel = channelsData.find(c => c.id === id);
        const node = (channel && channel._node) ? channel._node : 'channels';

        db.ref(node).child(id).remove()
            .then(() => showToast("🗑️ تم حذف القناة بنجاح"));
    }
};

function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function playStream(url, name, forceProtection, category, forceAudio = false, subtitleUrl = "") {
    activeStreamId++;
    const container = document.getElementById('video-container');
    const titleLabel = document.getElementById('now-playing-title');
    if (!container || !titleLabel) return;

    let rawInput = url.trim();
    const isHtmlEmbed = rawInput.startsWith('<');

    let srcUrl = rawInput;
    if (isHtmlEmbed) {
        const match = rawInput.match(/src\s*=\s*["']([^"']+)["']/i);
        if (match) srcUrl = match[1];
        else {
            const urlMatch = rawInput.match(/(https?:\/\/[^\s"']+)/);
            if (urlMatch) srcUrl = urlMatch[1];
        }
    }
    srcUrl = srcUrl.trim();

    // --- 1. ASPECT RATIO DETECTION ---
    let detectedRatio = 56.25; // Default 16:9

    // Extract from raw embed code (width/height attributes)
    const wMatch = rawInput.match(/width=["'](\d+)["']/i) || rawInput.match(/width:(\d+)px/i);
    const hMatch = rawInput.match(/height=["'](\d+)["']/i) || rawInput.match(/height:(\d+)px/i);

    if (wMatch && hMatch) {
        const w = parseInt(wMatch[1]);
        const h = parseInt(hMatch[1]);
        if (!isNaN(w) && !isNaN(h) && w > 0) detectedRatio = (h / w) * 100;
    }
    // Detect vertical platforms or specific URL markers
    else if (srcUrl.toLowerCase().includes('/shorts/') || srcUrl.toLowerCase().includes('tiktok.com')) {
        detectedRatio = 177.77; // 9:16
    }
    // Detect from Facebook URL parameters
    else if (srcUrl.includes('facebook.com') || srcUrl.includes('fb.watch')) {
        const searchPart = srcUrl.includes('?') ? srcUrl.split('?')[1] : "";
        const urlParams = new URLSearchParams(decodeURIComponent(searchPart));
        const w = parseInt(urlParams.get('width')) || parseInt(urlParams.get('w'));
        const h = parseInt(urlParams.get('height')) || parseInt(urlParams.get('h'));
        if (!isNaN(w) && !isNaN(h) && w > 0) detectedRatio = (h / w) * 100;
    }

    // Apply sane limits & final styling
    if (detectedRatio < 10) detectedRatio = 56.25;
    if (detectedRatio > 250) detectedRatio = 177.77;

    container.classList.remove('iframe-mode', 'audio-mode');
    container.style.height = "0";
    container.style.setProperty('padding-bottom', detectedRatio + '%', 'important');

    titleLabel.innerHTML = `
        <div class="playing-title-wrap">
            <span class="np-cat">${category}</span> ${name}
            <div class="player-action-btns">
                <button class="btn-external-player" onclick="window.open('${srcUrl}', '_blank')">فتح في نافذة مستقلة ▶</button>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="luxury-loading-wrap">
            <div class="premium-loader"></div>
            <div class="loading-msg">جاري فحص وتجهيز البث الآمن...</div>
        </div>`;

    const isMixedContent = window.location.protocol === 'https:' && srcUrl.startsWith('http:');
    if (forceProtection || isMixedContent) {
        container.innerHTML = `
            <div class="protection-warning">
                <div class="luxury-bg-glow"></div>
                <div class="protection-content-wrap" style="gap: 0;">
                    <div class="gold-shield-icon" style="filter: sepia(100%) saturate(1000%) hue-rotate(5deg) brightness(1.2) drop-shadow(0 0 10px rgba(212,175,55,0.7)); font-size: 45px; margin: 0 0 5px 0;">🛡️</div>
                    <div class="protection-title" style="font-size:14px; line-height:1.4; color:#D4AF37; text-shadow:0 0 8px rgba(212,175,55,0.4); font-weight:bold; margin: 0; padding:0;">
                        تم تفعيل نظام الحماية لمنع الموقع من الحظر<br>
                        <span style="font-size:11px; color:#ccc; font-weight:normal;">يمكنك الاستماع من السيرفر مباشرة</span>
                    </div>
                    <button class="btn-launch" style="padding:12px 50px; font-size:16px; background:linear-gradient(45deg, #FFD700, #D4AF37); color:#000; border:none; box-shadow:0 4px 15px rgba(212,175,55,0.5); font-weight:bold; border-radius:10px; cursor:pointer; margin-bottom: 20px; margin-top: 5px;" onclick="window.open('${srcUrl}', '_blank')">اضغط هنا</button>
                </div>
            </div>`;
        return;
    }

    // --- Audio/Video Platform Definitions ---
    const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv', 'facebook.com', 'instagram.com', 'tiktok.com', 'vidora.su'];
    const audioStreamingPlatforms = ['boomplay.com', 'soundcloud.com', 'spotify.com', 'anghami.com'];
    const isVideoPlatform = videoPlatforms.some(p => srcUrl.toLowerCase().includes(p));
    const isAudioPlatform = audioStreamingPlatforms.some(p => srcUrl.toLowerCase().includes(p));
    const isAudioExt = srcUrl.match(/\.(mp3|wav|aac|m4a|ogg|opus|flac)(\?.*)?$/i);
    const audioKeywords = ["اغاني", "موسيقى", "music", "audio", "radio", "راديو", "قرآن", "quran", "استماع"];
    const isAudioCat = audioKeywords.some(key => (category || "").toLowerCase().includes(key) || (name || "").toLowerCase().includes(key));

    // --- LOGIC: AUDIO HANDLER ---
    if (forceAudio || isAudioPlatform || (isAudioExt && !isVideoPlatform) || (isAudioCat && !isVideoPlatform)) {
        if (!(isVideoPlatform && !forceAudio)) {
            container.classList.add('audio-mode');
            container.style.paddingBottom = "0";
            container.style.height = "auto";
            container.style.minHeight = "450px";
            // ... (rest of audio logic from previous version, kept stable)
            if (isHtmlEmbed || isAudioPlatform) {
                let platformBadge = '🎵 مشغل صوتي';
                if (srcUrl.includes('boomplay.com')) platformBadge = '🎵 Powered by Boomplay';
                else if (srcUrl.includes('soundcloud.com')) platformBadge = '🎵 Powered by SoundCloud';
                else if (srcUrl.includes('spotify.com')) platformBadge = '🎵 Powered by Spotify';
                else if (srcUrl.includes('anghami.com')) platformBadge = '🎵 Powered by Anghami';

                let renderContent = rawInput;
                if (!isHtmlEmbed) {
                    renderContent = `<iframe src="${srcUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width: 100%; height: 420px; border-radius: 15px; box-shadow: 0 0 30px rgba(0, 243, 255, 0.3);"></iframe>`;
                }

                container.innerHTML = `
                    <div class="royal-audio-hub boomplay-mode" id="audio-wrapper">
                        <div class="royal-player-card">
                            <div class="royal-disk-section">
                                <div class="royal-aura-glow"></div>
                                <div class="royal-disk-container">
                                    <div class="royal-disk playing" id="audio-disk">
                                        <div class="royal-disk-center">
                                            <div class="jewel-spark"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="royal-visualizer">
                                    <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                                    <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                                </div>
                            </div>
                            
                            <div class="royal-info-section">
                                <h2 class="royal-track-name">${name}</h2>
                                <span class="royal-track-category">${category}</span>
                                <span class="boomplay-badge">${platformBadge}</span>
                            </div>

                            <div class="boomplay-iframe-container">
                                ${renderContent}
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            // 2. Direct Audio File Mode (MP3, M3U8 Audio, etc.)
            container.innerHTML = `
                <div class="royal-audio-hub" id="audio-wrapper">
                    <div class="royal-player-card">
                        <div class="royal-disk-section">
                            <div class="royal-aura-glow"></div>
                            <div class="royal-disk-container">
                                <div class="royal-disk" id="audio-disk">
                                    <div class="royal-disk-center">
                                        <div class="jewel-spark"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="royal-visualizer">
                                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                            </div>
                        </div>
                        
                        <div class="royal-info-section">
                            <h2 class="royal-track-name">${name}</h2>
                            <span class="royal-track-category">${category}</span>
                        </div>

                        <div class="royal-controls-section">
                            <div class="royal-progress-container" id="audio-seek-bar">
                                <div class="royal-progress-bar" id="audio-progress"></div>
                            </div>
                            <div class="royal-time-row">
                                <span id="curr-time">00:00</span>
                                <span id="total-time">00:00</span>
                            </div>
                            <div class="royal-main-actions">
                                <button class="royal-play-btn" id="audio-toggle-btn">
                                    <div class="royal-play-icon" id="audio-icon-state">▶</div>
                                </button>
                            </div>
                            <div class="royal-vol-row">
                                <span class="vol-icon">🔊</span>
                                <input type="range" class="royal-vol-slider" id="audio-vol-control" min="0" max="1" step="0.05" value="1">
                            </div>
                        </div>
                    </div>
                    
                    <audio id="main-audio-player" autoplay>
                        <source src="${srcUrl}" type="${isAudioExt ? 'audio/mpeg' : 'application/x-mpegURL'}">
                    </audio>
                </div>
            `;

            // Initialize Player Logic (Volume, Progress, HLS)
            const player = document.getElementById('main-audio-player');
            const wrapper = document.getElementById('audio-wrapper');
            const toggleBtn = document.getElementById('audio-toggle-btn');
            const iconState = document.getElementById('audio-icon-state');
            const prog = document.getElementById('audio-progress');
            const seekBar = document.getElementById('audio-seek-bar');
            const currTimeEl = document.getElementById('curr-time');
            const totalTimeEl = document.getElementById('total-time');
            const volSlider = document.getElementById('audio-vol-control');

            function formatTime(s) {
                if (isNaN(s) || !isFinite(s)) return "00:00";
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
            }

            if (srcUrl.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(srcUrl);
                hls.attachMedia(player);
                hls.on(Hls.Events.MANIFEST_PARSED, () => player.play().catch(() => { }));
            } else {
                player.src = srcUrl;
            }

            player.onplay = () => { wrapper.classList.add('playing'); iconState.textContent = '⏸'; };
            player.onpause = () => { wrapper.classList.remove('playing'); iconState.textContent = '▶'; };
            toggleBtn.onclick = () => { if (player.paused) player.play(); else player.pause(); };
            player.ontimeupdate = () => {
                if (player.duration) {
                    const p = (player.currentTime / player.duration) * 100;
                    prog.style.width = p + '%';
                }
                currTimeEl.textContent = formatTime(player.currentTime);
            };
            player.onloadedmetadata = () => { totalTimeEl.textContent = formatTime(player.duration); };
            seekBar.onclick = (e) => {
                const rect = seekBar.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                if (player.duration) player.currentTime = pos * player.duration;
            };
            volSlider.oninput = (e) => { player.volume = e.target.value; };
            player.play().catch(() => { console.log("Autoplay prevented"); });

            return;
        }
    }

    // --- LOGIC: VIDEO HANDLER ---
    const ytId = getYouTubeId(srcUrl);
    if (ytId) {
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&cc_load_policy=1&hl=ar&cc_lang_pref=ar&language=ar" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width: 100%; height: 100%; border: none; position: absolute; top:0; left:0;"></iframe>`;
        return;
    }

    if (srcUrl.includes('facebook.com') || srcUrl.includes('fb.watch')) {
        container.classList.add('iframe-mode');
        let fbUrl = srcUrl;
        if (!srcUrl.includes('facebook.com/plugins/video.php')) {
            fbUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(srcUrl)}&show_text=0&width=560&autoplay=1&allowfullscreen=true`;
        } else {
            if (!fbUrl.includes('autoplay=')) fbUrl += '&autoplay=1';
            if (!fbUrl.includes('show_text=')) fbUrl += '&show_text=0';
            if (!fbUrl.includes('allowfullscreen=')) fbUrl += '&allowfullscreen=true';
        }
        container.innerHTML = `
            <iframe 
                src="${fbUrl}" 
                scrolling="no" 
                frameborder="0" 
                style="width: 100%; height: 100%; border: none; overflow: hidden; position: absolute; top:0; left:0;" 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen" 
                webkit-playsinline 
                playsinline 
                allowfullscreen="true">
            </iframe>`;
        return;
    }

    if (srcUrl.includes('vidora.su')) {
        container.classList.add('iframe-mode');
        container.innerHTML = `<iframe src="${srcUrl}" allowfullscreen style="width: 100%; height: 100%; border: none; position: absolute; top:0; left:0;"></iframe>`;
        return;
    }

    if (isHtmlEmbed) {
        container.classList.add('iframe-mode');
        let processedContent = rawInput.replace(/allowfullscreen(="true")?/gi, '');
        if (processedContent.includes('<iframe')) {
            processedContent = processedContent.replace('<iframe', '<iframe webkit-playsinline playsinline style="width:100%;height:100%;position:absolute;top:0;left:0;"');
        }
        container.innerHTML = processedContent;
        return;
    }

    // Default HTML5/M3U8 Video
    const media = document.createElement('video');
    media.controls = true; media.autoplay = true;
    media.style.width = '100%'; media.style.height = '100%';
    media.style.backgroundColor = '#000';
    media.style.position = 'absolute'; media.style.top = '0'; media.style.left = '0';

    if (subtitleUrl) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'العربية';
        track.srclang = 'ar';
        track.src = subtitleUrl;
        track.default = true;
        media.appendChild(track);
    }

    media.onloadedmetadata = () => {
        if (media.videoWidth && media.videoHeight) {
            const r = (media.videoHeight / media.videoWidth) * 100;
            container.style.setProperty('padding-bottom', r + '%', 'important');
        }

        const tracks = media.textTracks;
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].language.startsWith('ar') || tracks[i].label.toLowerCase().includes('arabic') || tracks[i].label.toLowerCase().includes('عربي')) {
                tracks[i].mode = 'showing';
                showToast("✨ تم تفعيل الترجمة العربية تلقائياً");
            }
        }
    };

    media.onerror = () => {
        console.error("Video Error Detected. Redirecting to protection mode...");
        container.innerHTML = `
            <div class="protection-warning">
                <div class="luxury-bg-glow"></div>
                <div class="protection-content-wrap" style="gap: 0;">
                    <div class="gold-shield-icon" style="filter: sepia(100%) saturate(1000%) hue-rotate(5deg) brightness(1.2) drop-shadow(0 0 10px rgba(212,175,55,0.7)); font-size: 35px; margin: 0 0 5px 0;">🛡️</div>
                    <div class="protection-title" style="font-size:13px; line-height:1.3; color:#D4AF37; text-shadow:0 0 8px rgba(212,175,55,0.4); font-weight:bold; margin: 0; padding:0;">
                        تم تفعيل نظام الحماية لمنع الموقع من الحظر<br>
                        <span style="font-size:10px; color:#ccc; font-weight:normal;">يمكنك الاستماع من السيرفر مباشرة</span>
                    </div>
                    <button class="btn-launch" style="padding:10px 40px; font-size:15px; background:linear-gradient(45deg, #FFD700, #D4AF37); color:#000; border:none; box-shadow:0 4px 12px rgba(212,175,55,0.4); font-weight:bold; border-radius:8px; cursor:pointer; margin-bottom: 15px; margin-top: 5px;" onclick="window.open('${srcUrl}', '_blank')">اضغط هنا</button>
                </div>
            </div>`;
    };

    container.style.display = 'block';
    container.style.background = '#111';
    container.innerHTML = '';
    container.appendChild(media);

    if (srcUrl.includes('.m3u8') && typeof Hls !== 'undefined') {
        if (Hls.isSupported()) {
            const hls = new Hls({ autoStartLoad: true, startFragPrefetch: true, enableSubtitle: true });
            hls.loadSource(srcUrl);
            hls.attachMedia(media);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const subTracks = hls.subtitleTracks;
                const arIndex = subTracks.findIndex(t => t.lang.startsWith('ar') || t.name.toLowerCase().includes('arabic'));
                if (arIndex !== -1) hls.subtitleTrack = arIndex;
                media.play().catch(() => { });
            });
            hls.on(Hls.Events.ERROR, function (event, data) { if (data.fatal) { media.src = srcUrl; } });
        } else if (media.canPlayType('application/vnd.apple.mpegurl')) {
            media.src = srcUrl;
        }
    } else if ((srcUrl.includes('.ts') || srcUrl.includes('.flv')) && typeof mpegts !== 'undefined') {
        if (mpegts.getFeatureList().mseLivePlayback) {
            const player = mpegts.createPlayer({ type: srcUrl.includes('.flv') ? 'flv' : 'mse', url: srcUrl });
            player.attachMediaElement(media);
            player.load();
            player.play();
        } else {
            media.src = srcUrl;
        }
    } else {
        media.src = srcUrl;
    }
}

initApp();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('link-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const n = document.getElementById('link-name').value.trim();
            const u = document.getElementById('link-url').value.trim();
            const c = document.getElementById('link-category').value;
            const p = document.getElementById('link-protection').checked;
            const fa = document.getElementById('link-force-audio').checked;
            if (db && n && u) {
                db.ref('channels').push({ name: n, url: u, category: c, forceProtection: p, forceAudio: fa, timestamp: Date.now() })
                    .then(() => { form.reset(); showToast("✅ تم الإضافة"); });
            }
        };
    }
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(user => {
            const loginModal = document.getElementById('login-modal');
            const logoutBtn = document.getElementById('logout-btn');
            if (user) {
                if (loginModal) loginModal.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'block';
                refreshUI();
            } else {
                if (loginModal) loginModal.style.display = 'flex';
                if (logoutBtn) logoutBtn.style.display = 'none';
            }
        });

        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            const doLogin = () => {
                const email = document.getElementById('admin-user').value.trim();
                const pass = document.getElementById('admin-pass').value.trim();
                if (email && pass) {
                    showToast("جاري تسجيل الدخول...");
                    firebase.auth().signInWithEmailAndPassword(email, pass)
                        .catch(err => {
                            console.error(err);
                            // رسالة عربية سهلة للمستخدم بدلاً من أخطاء النظام التقنية
                            if (err.code === 'auth/user-not-found' ||
                                err.code === 'auth/wrong-password' ||
                                err.code === 'auth/invalid-email' ||
                                err.code === 'auth/invalid-login-credentials') {
                                showToast("❌ عذراً، خطأ في البريد الإلكتروني أو كلمة المرور", true);
                            } else {
                                showToast("❌ حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة لاحقاً", true);
                            }
                        });
                } else {
                    showToast("يرجى إدخال البريد الإلكتروني وكلمة المرور", true);
                }
            };
            loginBtn.onclick = doLogin;

            // Allow login on Enter key
            const inputs = [document.getElementById('admin-user'), document.getElementById('admin-pass')];
            inputs.forEach(input => {
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') doLogin();
                    });
                }
            });
        }
    }
});

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
let categoriesData = ["عام", "أفلام", "مسلسلات", "أغاني", "صور"];
let activeStreamId = 0;

const defaultChannels = [];

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

// --- 3. RENDERING ENGINE ---

function renderChannels() {
    const grid = document.getElementById('channels-list');
    if (!grid) return;

    // Fallback display if no data yet
    if (channelsData.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding:50px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%;">
                <div class="premium-loader"></div>
                <div style="margin-top:25px; width:100%; max-width:180px;">
                    <div style="color:#00f3ff; font-family:'Orbitron', sans-serif; font-size:10px; letter-spacing:4px; text-shadow:0 0 10px #00f3ff; margin-bottom:10px; font-weight:bold;">SYSTEM SCANNING</div>
                    <div style="width:100%; height:2px; background:rgba(0,243,255,0.1); position:relative; overflow:hidden; border-radius:10px;">
                        <div style="position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg, transparent, #00f3ff, transparent); animation: scanning-beam 1.5s infinite;"></div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const groups = {};
    channelsData.forEach(ch => {
        const cat = ch.category || "عام";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ch);
    });

    const fragment = document.createDocumentFragment();
    const allDisplayCats = [...new Set([...categoriesData, ...Object.keys(groups)])];

    allDisplayCats.forEach(cat => {
        if (groups[cat] && groups[cat].length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group collapsed'; // Collapsed by default

            // Header with toggle indicator
            groupDiv.innerHTML = `
                <div class="category-header luxury-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span>${cat}</span>
                    <span class="header-arrow">▾</span>
                </div>
            `;

            const listDiv = document.createElement('div');
            listDiv.className = 'category-channels-list';

            groups[cat].forEach(ch => {
                const item = document.createElement('div');
                item.className = 'channel-item';
                item.innerHTML = `<div class="channel-name">${ch.name}</div><div class="play-icon">▶</div>`;
                item.onclick = (e) => {
                    e.stopPropagation();
                    playStream(ch.url, ch.name, ch.forceProtection, cat);
                    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                };
                listDiv.appendChild(item);
            });

            groupDiv.appendChild(listDiv);
            fragment.appendChild(groupDiv);
        }
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
}

// Enhanced renderAdminList with Search Support
function renderAdminList(filterQuery = "") {
    const container = document.getElementById('admin-link-list');
    if (!container) return;
    container.innerHTML = '';

    // Filter data based on query
    let displayData = channelsData;
    if (filterQuery) {
        const lowerQ = filterQuery.toLowerCase();
        displayData = channelsData.filter(ch => ch.name.toLowerCase().includes(lowerQ));
    }

    // Group by category
    const groups = {};
    displayData.forEach(ch => {
        const cat = ch.category || "عام";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ch);
    });

    // Determine order: defined categories first, then any others found in data
    const allCats = [...new Set([...categoriesData, ...Object.keys(groups)])];

    if (allCats.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888;">لا توجد قنوات حالياً</div>';
        return;
    }

    allCats.forEach(cat => {
        if (!groups[cat] || groups[cat].length === 0) return;

        const groupSection = document.createElement('div');
        groupSection.style.marginBottom = '15px';
        groupSection.style.border = '1px solid rgba(0, 243, 255, 0.2)';
        groupSection.style.borderRadius = '10px';
        groupSection.style.background = 'rgba(0, 0, 0, 0.2)';
        groupSection.style.overflow = 'hidden'; // For animation

        // Header Container
        const headerDiv = document.createElement('div');
        headerDiv.style.background = 'rgba(0, 243, 255, 0.1)';
        headerDiv.style.padding = '15px';
        headerDiv.style.cursor = 'pointer';
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';

        const isExpanded = !!filterQuery; // Auto-expand if searching

        headerDiv.onclick = () => {
            const body = groupSection.querySelector('.group-body');
            const arrow = groupSection.querySelector('.arrow-icon');
            if (body.style.display === 'none') {
                body.style.display = 'block';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                body.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            }
        };

        // Header Text
        const title = document.createElement('h3');
        title.style.margin = '0';
        title.style.fontSize = '1.1rem';
        title.style.color = 'var(--primary-color)';
        title.innerHTML = `📂 ${cat} <span style="font-size:0.8em; color:#888; margin-right:5px;">(${groups[cat].length})</span>`;

        // Arrow Button
        const arrow = document.createElement('span');
        arrow.className = 'arrow-icon';
        arrow.textContent = '▼';
        arrow.style.transition = 'transform 0.3s ease';
        arrow.style.color = '#00f3ff';
        if (isExpanded) arrow.style.transform = 'rotate(180deg)';

        headerDiv.appendChild(title);
        headerDiv.appendChild(arrow);
        groupSection.appendChild(headerDiv);

        // Channels Container (Initially Hidden)
        const channelsContainer = document.createElement('div');
        channelsContainer.className = 'group-body';
        channelsContainer.style.padding = '15px';
        channelsContainer.style.display = isExpanded ? 'block' : 'none'; // Auto-expand logic
        channelsContainer.style.borderTop = '1px solid rgba(0, 243, 255, 0.1)';

        groups[cat].forEach(link => {
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.flexDirection = 'column';
            div.style.marginBottom = '15px';

            const safeId = String(link.id);
            const currentCat = link.category || "عام";
            let catOptions = categoriesData.map(c => `<option value="${c}" ${c === currentCat ? 'selected' : ''}>${c}</option>`).join('');

            const isProtected = link.forceProtection || false;
            div.innerHTML = `
                <div style="margin-bottom:15px; width: 100%;">
                    <label style="color:#00f3ff; font-size:13px; font-weight:bold; display:block; margin-bottom:5px;">القسم</label>
                    <select id="edit-cat-${safeId}" class="form-control" style="padding:8px; height:40px; font-size:14px; background:#000; color:#fff; width:100%; border:1px solid #333;">${catOptions}</select>
                </div>
                <div style="margin-bottom:15px; width: 100%;">
                    <label style="color:#00f3ff; font-size:13px; font-weight:bold; display:block; margin-bottom:5px;">الاسم</label>
                    <input type="text" id="edit-name-${safeId}" value="${link.name}" class="form-control" style="padding:10px; font-size:14px; height:40px; width:100%;">
                </div>
                <div style="margin-bottom:15px; width: 100%;">
                    <label style="color:#00f3ff; font-size:13px; font-weight:bold; display:block; margin-bottom:5px;">الرابط (URL / Iframe)</label>
                    <textarea id="edit-url-${safeId}" class="form-control" style="height:70px; padding:10px; font-size:13px; line-height:1.4; width:100%;">${link.url}</textarea>
                </div>
                <div style="margin-bottom:15px; width: 100%; display: flex; align-items: center; gap: 10px; background: rgba(0, 243, 255, 0.05); padding: 8px; border-radius: 5px;">
                    <input type="checkbox" id="edit-protection-${safeId}" ${isProtected ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <label for="edit-protection-${safeId}" style="color:#00f3ff; font-size:12px; cursor: pointer; margin: 0;">إظهار رسالة 'نظام الحماية' (Hide Video)</label>
                </div>
                <div style="display:flex; gap:10px; margin-top:10px; width:100%; justify-content: flex-end;">
                    <button class="btn btn-primary" style="padding:8px 20px; font-size:14px; min-width:120px;" onclick="window.updateChannelInfo('${safeId}')">💾 حفظ</button>
                    <button class="btn btn-danger" style="padding:8px 20px; font-size:14px; min-width:120px;" onclick="deleteChannel('${safeId}')">🗑️ مسح</button>
                </div>
            `;
            channelsContainer.appendChild(div);
        });

        groupSection.appendChild(channelsContainer);
        container.appendChild(groupSection);
    });
}

function renderCategoriesAdmin() {
    const container = document.getElementById('categories-manage-list');
    if (!container) return;
    container.innerHTML = categoriesData.map(cat => `
        <div style="background:rgba(0,243,255,0.1); padding:5px 10px; border-radius:20px; display:flex; align-items:center; gap:8px; border:1px solid var(--primary-color);">
            <span>${cat}</span>
            <button onclick="window.editCategory('${cat}')" style="background:none; border:none; cursor:pointer; font-size:14px; margin-left:5px;" title="تعديل الاسم">✏️</button>
            <button onclick="deleteCategory('${cat}')" style="background:none; border:none; color:#ff3333; cursor:pointer; font-weight:bold;" title="حذف القسم">&times;</button>
        </div>
    `).join('');
}

function updateCategoryDropdowns() {
    const mainSelect = document.getElementById('link-category');
    if (mainSelect) {
        const val = mainSelect.value;
        mainSelect.innerHTML = categoriesData.map(c => `<option value="${c}">${c}</option>`).join('');
        if (categoriesData.includes(val)) mainSelect.value = val;
    }
}

// --- 4. DATA OPERATIONS ---

function initApp() {
    // 1. Initial State (Hydrate from cache but DON'T hide loader yet)
    const cache = localStorage.getItem('channels_cache_v2');
    if (cache) {
        try {
            channelsData = JSON.parse(cache);
            requestAnimationFrame(refreshUI);
        } catch (e) { }
    } else {
        channelsData = defaultChannels;
        refreshUI();
    }

    // 2. TIMED REVEAL: Wait exactly 3 seconds to show off the luxury UI
    setTimeout(hidePageLoader, 3000);

    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();

            // Background-Only Sync: Keep the UI snappy while data streams in
            db.ref('channels').on('value', snap => {
                const data = snap.val();
                if (data) {
                    channelsData = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                    // Update cache for next visit
                    localStorage.setItem('channels_cache_v2', JSON.stringify(channelsData));
                } else {
                    channelsData = [];
                }

                requestAnimationFrame(() => {
                    refreshUI();
                });
            }, (error) => {
                console.error("Firebase Sync Error:", error);
            });

            db.ref('categories').on('value', snap => {
                const data = snap.val();
                if (data) {
                    categoriesData = Object.values(data);
                    requestAnimationFrame(refreshUI);
                }
            });

            db.ref('visitor_count').on('value', s => {
                const el = document.getElementById('visitor-count');
                const count = s.val() || 0;
                if (el) el.textContent = count.toLocaleString();
            });

            // Increment visitor
            if (!sessionStorage.getItem('counted_vfinal')) {
                db.ref('visitor_count').transaction(c => (c || 0) + 1);
                sessionStorage.setItem('counted_vfinal', 'true');
            }
        } else {
            console.error("Firebase SDK not found!");
            hidePageLoader();
        }
    } catch (e) {
        console.error("Init Error:", e);
        hidePageLoader();
    }
}

// --- 5. INTERACTION & MEDIA ---

function playStream(url, name, forceProtection = false, category = "") {
    activeStreamId++;
    const container = document.getElementById('video-container');
    const titleLabel = document.getElementById('now-playing-title');
    if (!container || !titleLabel) return;

    if (category) {
        titleLabel.innerHTML = `<div class="np-content"><span class="np-cat">${category}</span><span class="np-name">${name}</span></div>`;
    } else {
        titleLabel.textContent = name;
    }
    container.innerHTML = '<div class="loader-spinner" style="width:30px; height:30px;"></div>';
    const cleanUrl = url.trim();

    const addExternalButton = (targetUrl) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'external-btn-wrapper';
        wrapper.style.marginTop = '10px';

        let finalUrl = targetUrl;
        if (targetUrl.toLowerCase().startsWith('<iframe')) {
            const match = targetUrl.match(/src=["']([^"']+)["']/i);
            if (match) finalUrl = match[1];
            else return;
        }

        const btn = document.createElement('button');
        btn.className = 'btn-launch';
        btn.style.cssText = 'padding:5px 15px; font-size:12px; cursor:pointer;';
        btn.innerHTML = '🚀 فتح في نافذة مستقلة';
        btn.addEventListener('click', () => window.open(finalUrl, '_blank'));

        wrapper.appendChild(btn);
        titleLabel.appendChild(wrapper);
    };

    if (forceProtection) {
        // Create elements programmatically to avoid encoding issues
        const warningDiv = document.createElement('div');
        warningDiv.className = 'protection-warning';

        const heading = document.createElement('div');
        heading.className = 'protection-title';
        heading.innerHTML = `
            <span class="highlight-gold">نظام الحماية مفعل 🛡️</span>
            لمنع حظر الموقع 😊<br>
            للمشاهدة عبر السيرفر مباشرة🌹
        `;

        const launchBtn = document.createElement('button');
        launchBtn.className = 'btn-launch';
        launchBtn.textContent = 'اضغط هنا ❤️';
        launchBtn.onclick = () => {
            let finalUrl = cleanUrl;
            if (finalUrl.toLowerCase().startsWith('<iframe')) {
                const match = finalUrl.match(/src=["']([^"']+)["']/i);
                if (match) finalUrl = match[1];
            }
            window.open(finalUrl, '_blank');
        };

        warningDiv.appendChild(heading);
        warningDiv.appendChild(launchBtn);
        container.innerHTML = '';
        container.appendChild(warningDiv);

        addExternalButton(cleanUrl);
        return;
    }

    // 1. Iframe Code (Priority #1: If user pasted a full tag, use it immediately)
    if (cleanUrl.toLowerCase().startsWith('<iframe')) {
        let modifiedTag = cleanUrl;

        // Auto-fix Facebook posts to videos and strip fixed sizes
        if (modifiedTag.includes('plugins/post.php')) {
            modifiedTag = modifiedTag.replace('plugins/post.php', 'plugins/video.php');
        }

        container.innerHTML = modifiedTag;
        const ifr = container.querySelector('iframe');
        if (ifr) {
            // Force it to fill the container regardless of what it says inside the tag
            ifr.removeAttribute('width');
            ifr.removeAttribute('height');
            ifr.style.width = '100%';
            ifr.style.height = '100%';
            ifr.style.border = 'none';
            ifr.setAttribute('allowfullscreen', 'true');
            ifr.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');

            // If it's a FB link, ensure it has the correct parameters for video display
            let src = ifr.getAttribute('src');
            if (src && src.includes('facebook.com')) {
                if (!src.includes('show_text=0')) src += (src.includes('?') ? '&' : '?') + 'show_text=0';
                if (!src.includes('autoplay=1')) src += '&autoplay=1';
                if (!src.includes('mute=1')) src += '&mute=1'; // Essential for Autoplay
                ifr.setAttribute('src', src);
            }
        }
        addExternalButton(cleanUrl);
        return;
    }

    // 2. Facebook Standard Links & Reels (Final Compatibility)
    if (cleanUrl.match(/(?:facebook\.com|fb\.watch)/i)) {
        let normalized = cleanUrl.replace('m.facebook.com', 'www.facebook.com');

        // Remove tracking params that break embeds, but keep core video path
        if (normalized.includes('?mibextid')) normalized = normalized.split('?mibextid')[0];

        // High-compatibility Iframe route
        const encodedUrl = encodeURIComponent(normalized);
        const fbEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&autoplay=1&mute=1&container_width=800`;

        container.innerHTML = `
            <!-- Main Video -->
            <iframe src="${fbEmbedUrl}" style="width:100%; height:100%; border:none; z-index:1;" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
            
            <!-- Absolute Centered Overlay -->
            <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; pointer-events:none;">
                <div style="background: rgba(10, 25, 47, 0.95); border: 2px solid #00f3ff; padding: 30px; border-radius: 15px; text-align:center; width: 85%; max-width: 350px; box-shadow: 0 0 30px rgba(0,243,255,0.4);">
                    <div style="font-size: 40px; margin-bottom: 15px;">🛡️</div>
                    <h4 style="color: #00f3ff; margin-bottom: 10px; font-size: 18px; font-weight:bold;">نظام الحماية والخصوصية</h4>
                    <p style="font-size: 14px; color: #fff; line-height: 1.6; margin:0;">
                        إذا لم يعمل البث المباشر هنا، <br>
                        يرجى الضغط على زر <span style="color:#00f3ff; font-weight:bold;">"تشغيل عبر فيسبوك"</span> الموجود بالأسفل.
                    </p>
                </div>
            </div>
        `;

        // Specialized Button for Facebook App/External
        const btnWrapper = document.createElement('div');
        btnWrapper.style.cssText = 'text-align:center; margin-top:10px;';
        const fbBtn = document.createElement('button');
        fbBtn.className = 'btn-launch';
        fbBtn.style.cssText = 'background:#1877f2; color:#fff; padding:8px 18px; border-radius:8px; border:none; cursor:pointer; font-weight:bold;';
        fbBtn.innerHTML = '🔵 تشغيل عبر فيسبوك';
        fbBtn.onclick = () => window.open(cleanUrl, '_blank');
        btnWrapper.appendChild(fbBtn);
        titleLabel.appendChild(btnWrapper);

        addExternalButton(cleanUrl);
        return;
    }

    // 3. YouTube
    if (cleanUrl.match(/(?:youtube\.com|youtu\.be)/i)) {
        let vId = cleanUrl.includes('v=') ? cleanUrl.split('v=')[1].split('&')[0] : cleanUrl.split('/').pop();
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${vId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>`;
        addExternalButton(cleanUrl);
        return;
    }

    // 4. Smart Auto-Detection (Embed vs Direct Media)
    // Logic: If it has a known media file extension (.mp4, .m3u8, .mp3, etc), use the dedicated Native Player.
    // Otherwise, assume it is a generic embed link (like Vidora, Doodstream, or any website) and open it in an Iframe.

    const isAudio = cleanUrl.match(/\.(mp3|wav|aac|m4a|ogg)(\?.*)?$/i) || url.toLowerCase().includes('radio');
    const isDirectVideo = cleanUrl.match(/\.(m3u8|mpd|ts|mp4|webm|ogv|mov|mkv)(\?.*)?$/i);

    if (!isAudio && !isDirectVideo) {
        container.innerHTML = `<iframe src="${cleanUrl}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
        addExternalButton(cleanUrl);
        return;
    }

    // Native Media (HLS/DASH/MP4/Audio)
    const media = document.createElement(isAudio ? 'audio' : 'video');
    media.controls = true;
    media.autoplay = true;
    media.style.width = '100%';
    media.style.height = isAudio ? '45px' : '100%';
    if (!isAudio) media.setAttribute('playsinline', '');

    if (isAudio) {
        media.style.accentColor = "#00f3ff";
        container.innerHTML = `
            <div class="audio-experience-wrapper">
                <div class="audio-pulse audio-icon-large">🎵</div>
                <h3 class="audio-title-large">ألحانٌ عابرةٌ للحدود</h3>
                <p class="audio-subtitle-mini">"استمتع برحلة نغمية فريدة تأخذك لعالمٍ من الخيال"</p>
                <div id="audio-ui-container" class="audio-player-controls-container"></div>
            </div>
        `;
        container.querySelector('#audio-ui-container').appendChild(media);
    } else {
        container.innerHTML = '';
        container.appendChild(media);
    }

    // Load source
    if (cleanUrl.includes('.m3u8') && typeof Hls !== 'undefined') {
        const hls = new Hls(); hls.loadSource(cleanUrl); hls.attachMedia(media);
    } else if (cleanUrl.includes('.mpd') && typeof shaka !== 'undefined') {
        const p = new shaka.Player(media); p.load(cleanUrl);
    } else if (cleanUrl.includes('.ts') && typeof mpegjs !== 'undefined') {
        if (mpegjs.getFeatureList().mse) {
            const player = mpegjs.createPlayer({ type: 'mse', url: cleanUrl });
            player.attachMediaElement(media);
            player.load();
        }
    } else {
        media.src = cleanUrl;
    }

    // Explicitly call play to handle potential autoplay blocks
    media.play().catch(err => {
        console.warn("Autoplay blocked, user interaction required:", err);
        if (isAudio) {
            const playBtn = document.createElement('button');
            playBtn.innerHTML = "▶ تشغيل الصوت الآن";
            playBtn.className = "btn-launch";
            playBtn.style.marginTop = "10px";
            playBtn.onclick = () => media.play();
            container.querySelector('div').appendChild(playBtn);
        }
    });
    addExternalButton(cleanUrl);
}

// --- 6. ACTIONS (Admin) ---

window.updateChannelInfo = (id) => {
    const name = document.getElementById(`edit-name-${id}`).value.trim();
    const url = document.getElementById(`edit-url-${id}`).value.trim();
    const cat = document.getElementById(`edit-cat-${id}`).value;
    const forceProtection = document.getElementById(`edit-protection-${id}`).checked;
    if (db && id) db.ref('channels').child(id).update({ name, url, category: cat, forceProtection }).then(() => alert("✅ تم الحفظ بنجاح"));
};

window.deleteChannel = (id) => {
    if (!id || !confirm("⚠️ متأكد من مسح القناة؟")) return;
    if (db) {
        db.ref('channels').child(id).remove().then(() => {
            alert("✅ تم الحذف من السيرفر بنجاح!");
        }).catch(err => alert("❌ فشل الحذف: " + err.message));
    }
};

window.addNewCategory = () => {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (name && db) db.ref('categories').push(name).then(() => { alert("✅ تم الإضافة"); input.value = ''; });
};


window.editCategory = (oldName) => {
    if (!db) return;
    const newName = prompt("اكتب الاسم الجديد للقسم:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    const finalName = newName.trim();

    // 1. Update in 'categories'
    db.ref('categories').once('value', s => {
        const data = s.val();
        let found = false;
        // Search for the key(s) holding this category name
        for (let k in data) {
            if (data[k] === oldName) {
                db.ref('categories').child(k).set(finalName);
                found = true;
            }
        }

        if (found) {
            // 2. Update all channels that are using this category
            db.ref('channels').once('value', snap => {
                const channels = snap.val();
                if (channels) {
                    for (let key in channels) {
                        if (channels[key].category === oldName) {
                            db.ref('channels').child(key).update({ category: finalName });
                        }
                    }
                }
            });
            alert("✅ تم تعديل الاسم إلى " + finalName);
        } else {
            // Fallback for default hardcoded categories if not in DB, 
            // though usually they should be synced. 
            // If it's a hardcoded one (like 'عام' if not in DB), we might need to add it properly.
            // But assuming categoriesData comes from DB mostly.
        }
    });
};

window.deleteCategory = (name) => {
    if (name === "عام" || !db) return;
    if (confirm(`مسح قسم ${name}؟`)) {
        db.ref('categories').once('value', s => {
            const data = s.val();
            for (let k in data) if (data[k] === name) db.ref('categories').child(k).remove();
        });
    }
};

window.searchAdminChannels = () => {
    const input = document.getElementById('admin-search-input');
    if (input) {
        renderAdminList(input.value.trim());
    }
};

window.shareTo = (p) => {
    const url = window.location.href;
    if (p === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`, '_blank');
    else if (p === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    else if (p === 'copy') { navigator.clipboard.writeText(url).then(() => alert("✅ تم نسخ الرابط")); }
};

window.launchPopup = (u) => window.open(u, 'Player', 'width=1100,height=700');

// BOOTSTRAP
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
            const fileInput = document.getElementById('image-upload');

            let finalUrl = u;

            // Handle File Upload if present
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                if (file.size > 10 * 1024 * 1024) { // Increased to 10MB
                    alert("❌ حجم الملف كبير جداً! يرجى اختيار ملف أصغر من 10 ميجابايت لضمان سرعة الموقع.");
                    return;
                }
                const reader = new FileReader();
                finalUrl = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }

            if (!n || !finalUrl) {
                alert("⚠️ يرجى إدخال اسم القناة والرابط (أو اختيار ملف).");
                return;
            }

            if (db) {
                db.ref('channels').push({
                    name: n,
                    url: finalUrl,
                    category: c,
                    forceProtection: p,
                    timestamp: Date.now()
                }).then(() => {
                    alert("✅ تم إضافة القناة بنجاح!");
                    form.reset();
                }).catch(err => alert("❌ فشل الإضافة: " + err.message));
            }
        };
    }

    // --- Firebase Auth Logic (Secure) ---
    const lBtn = document.getElementById('login-btn');
    if (lBtn) {
        lBtn.onclick = async () => {
            const email = document.getElementById('admin-user').value.trim();
            const pass = document.getElementById('admin-pass').value.trim();

            if (!email || !pass) {
                alert("⚠️ يرجى إدخال البريد وكلمة السر");
                return;
            }

            try {
                lBtn.disabled = true;
                lBtn.textContent = "جاري التحقق...";
                await firebase.auth().signInWithEmailAndPassword(email, pass);
            } catch (err) {
                alert("❌ خطأ في بيانات الدخول: " + err.message);
            } finally {
                lBtn.disabled = false;
                lBtn.textContent = "تسجيل الدخول";
            }
        };
    }

    // Monitor Auth Status
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(user => {
            const loginModal = document.getElementById('login-modal');
            if (user) {
                if (loginModal) loginModal.style.display = 'none';
                refreshUI();
            } else {
                if (loginModal) loginModal.style.display = 'flex';
            }
        });
    }
});

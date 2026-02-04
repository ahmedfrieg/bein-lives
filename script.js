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

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes toast-in {
            from { bottom: -50px; opacity: 0; }
            to { bottom: 30px; opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- 3. RENDERING ENGINE ---

function renderChannels() {
    const grid = document.getElementById('channels-list');
    if (!grid) return;

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
    // Use categoriesData for order
    categoriesData.forEach(cat => {
        if (groups[cat] && groups[cat].length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group collapsed';
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

function renderAdminList(filterQuery = "") {
    const container = document.getElementById('admin-link-list');
    if (!container) return;
    container.innerHTML = '';

    let displayData = channelsData;
    if (filterQuery) {
        const lowerQ = filterQuery.toLowerCase();
        displayData = channelsData.filter(ch => ch.name.toLowerCase().includes(lowerQ));
    }

    const groups = {};
    displayData.forEach(ch => {
        const cat = ch.category || "عام";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ch);
    });

    // Use categoriesData for order in admin too
    categoriesData.forEach(cat => {
        const groupSection = document.createElement('div');
        groupSection.style.marginBottom = '15px';
        groupSection.style.border = '1px solid rgba(0, 243, 255, 0.2)';
        groupSection.style.borderRadius = '10px';
        groupSection.style.background = 'rgba(0, 0, 0, 0.2)';
        groupSection.style.overflow = 'hidden';

        const isExpanded = !!filterQuery;
        const channelCount = groups[cat] ? groups[cat].length : 0;

        const headerDiv = document.createElement('div');
        headerDiv.style.background = 'rgba(0, 243, 255, 0.1)';
        headerDiv.style.padding = '15px';
        headerDiv.style.cursor = 'pointer';
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';

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

        const title = document.createElement('h3');
        title.style.margin = '0';
        title.style.fontSize = '1.1rem';
        title.style.color = 'var(--primary-color)';
        title.innerHTML = `📂 ${cat} <span style="font-size:0.8em; color:#888; margin-right:5px;">(${channelCount})</span>`;

        const arrow = document.createElement('span');
        arrow.className = 'arrow-icon';
        arrow.textContent = '▼';
        arrow.style.transition = 'transform 0.3s ease';
        arrow.style.color = '#00f3ff';
        if (isExpanded) arrow.style.transform = 'rotate(180deg)';

        headerDiv.appendChild(title);
        headerDiv.appendChild(arrow);
        groupSection.appendChild(headerDiv);

        const channelsContainer = document.createElement('div');
        channelsContainer.className = 'group-body';
        channelsContainer.style.padding = '15px';
        channelsContainer.style.display = isExpanded ? 'block' : 'none';
        channelsContainer.style.borderTop = '1px solid rgba(0, 243, 255, 0.1)';

        if (!groups[cat] || groups[cat].length === 0) {
            channelsContainer.innerHTML = '<div style="text-align:center; color:#555; font-size:12px;">قائمة فارغة - أضف قنوات لهذا القسم</div>';
        } else {
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
                        <select id="edit-cat-${safeId}" class="form-control" style="background:#000; color:#fff; width:100%; border:1px solid #333;">${catOptions}</select>
                    </div>
                    <div style="margin-bottom:15px; width: 100%;">
                        <label style="color:#00f3ff; font-size:13px; font-weight:bold; display:block; margin-bottom:5px;">الاسم</label>
                        <input type="text" id="edit-name-${safeId}" value="${link.name}" class="form-control" style="width:100%;">
                    </div>
                    <div style="margin-bottom:15px; width: 100%;">
                        <label style="color:#00f3ff; font-size:13px; font-weight:bold; display:block; margin-bottom:5px;">الرابط (URL / Iframe)</label>
                        <textarea id="edit-url-${safeId}" class="form-control" style="height:70px; width:100%;">${link.url}</textarea>
                    </div>
                    <div style="margin-bottom:15px; width: 100%; display: flex; align-items: center; gap: 10px; background: rgba(0, 243, 255, 0.05); padding: 8px; border-radius: 5px;">
                        <input type="checkbox" id="edit-protection-${safeId}" ${isProtected ? 'checked' : ''}>
                        <label for="edit-protection-${safeId}" style="color:#00f3ff; font-size:12px; cursor: pointer; margin: 0;">نظام الحماية (فتح في نافذة مستقلة)</label>
                    </div>
                    <div style="display:flex; gap:10px; width:100%; justify-content: flex-end;">
                        <button class="btn btn-primary" onclick="window.updateChannelInfo('${safeId}')">💾 حفظ</button>
                        <button class="btn btn-danger" onclick="deleteChannel('${safeId}')">🗑️ مسح</button>
                    </div>
                `;
                channelsContainer.appendChild(div);
            });
        }
        groupSection.appendChild(channelsContainer);
        container.appendChild(groupSection);
    });
}

function renderCategoriesAdmin() {
    const container = document.getElementById('categories-manage-list');
    if (!container) return;
    container.innerHTML = categoriesData.map((cat, index) => `
        <div style="background:rgba(0,243,255,0.1); padding:8px 15px; border-radius:10px; display:flex; align-items:center; gap:10px; border:1px solid rgba(0,243,255,0.3); width:100%;">
            <div style="display:flex; flex-direction:column; gap:2px;">
                <button onclick="moveCategory(${index}, -1)" style="background:none; border:none; color:#00f3ff; cursor:pointer; font-size:12px;" title="تحريك لأعلى">▲</button>
                <button onclick="moveCategory(${index}, 1)" style="background:none; border:none; color:#00f3ff; cursor:pointer; font-size:12px;" title="تحريك لأسفل">▼</button>
            </div>
            <span style="flex-grow:1; font-weight:bold;">${cat}</span>
            <button onclick="window.editCategory('${cat}')" style="background:none; border:none; cursor:pointer;">✏️</button>
            <button onclick="deleteCategory('${cat}')" style="background:none; border:none; color:#ff3333; cursor:pointer;">&times;</button>
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
    setTimeout(hidePageLoader, 2000);

    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();

            // Support both old 'links' and new 'channels' nodes
            const fetchChannels = (nodeName) => {
                db.ref(nodeName).on('value', snap => {
                    const data = snap.val();
                    if (data) {
                        const formatted = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                        // Merge or replace based on logic (here we update global channelsData)
                        channelsData = formatted;
                        requestAnimationFrame(refreshUI);
                    }
                });
            };

            // Try reading from 'links' first to restore data, then 'channels'
            db.ref('links').once('value', s => {
                if (s.val()) fetchChannels('links');
                else fetchChannels('channels');
            });

            db.ref('categories').on('value', snap => {
                const data = snap.val();
                if (data) {
                    // If data is an object (from push), convert to array. If already array, use it.
                    categoriesData = Array.isArray(data) ? data : Object.values(data);
                    requestAnimationFrame(refreshUI);
                }
            });

            db.ref('visitor_count').on('value', s => {
                const el = document.getElementById('visitor-count');
                const count = s.val() || 0;
                if (el) el.textContent = count.toLocaleString();
            });

            if (!sessionStorage.getItem('counted_vfinal')) {
                db.ref('visitor_count').transaction(c => (c || 0) + 1);
                sessionStorage.setItem('counted_vfinal', 'true');
            }
        }
    } catch (e) {
        hidePageLoader();
    }
}

// --- 5. INTERACTION & MEDIA (Same as before but stable) ---

function playStream(url, name, forceProtection = false, category = "") {
    activeStreamId++;
    const container = document.getElementById('video-container');
    const titleLabel = document.getElementById('now-playing-title');
    if (!container || !titleLabel) return;
    titleLabel.innerHTML = category ? `<span class="np-cat">${category}</span> ${name}` : name;
    container.innerHTML = '<div class="premium-loader"></div>';
    const cleanUrl = url.trim();

    if (forceProtection) {
        container.innerHTML = `
            <div class="protection-warning">
                <div class="protection-title"><span class="highlight-gold">نظام الحماية مفعل 🛡️</span><br>للمشاهدة عبر السيرفر مباشرة🌹</div>
                <button class="btn-launch" onclick="window.open('${cleanUrl}', '_blank')">اضغط هنا ❤️</button>
            </div>
        `;
        return;
    }

    if (cleanUrl.toLowerCase().startsWith('<iframe')) {
        container.innerHTML = cleanUrl;
        const ifr = container.querySelector('iframe');
        if (ifr) { ifr.style.width = '100%'; ifr.style.height = '100%'; ifr.style.border = 'none'; }
        return;
    }

    const media = document.createElement(cleanUrl.match(/\.(mp3|wav|aac|m4a)(\?.*)?$/i) ? 'audio' : 'video');
    media.controls = true; media.autoplay = true; media.style.width = '100%'; media.style.height = '100%';
    container.innerHTML = ''; container.appendChild(media);

    if (cleanUrl.includes('.m3u8') && typeof Hls !== 'undefined') {
        const hls = new Hls(); hls.loadSource(cleanUrl); hls.attachMedia(media);
    } else if (cleanUrl.includes('.mpd') && typeof shaka !== 'undefined') {
        const p = new shaka.Player(media); p.load(cleanUrl);
    } else {
        media.src = cleanUrl;
    }
}

// --- 6. ACTIONS (Reorder Categories) ---

window.moveCategory = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categoriesData.length) return;

    // Swap elements
    const temp = categoriesData[index];
    categoriesData[index] = categoriesData[newIndex];
    categoriesData[newIndex] = temp;

    // Save the entire array back to Firebase
    if (db) db.ref('categories').set(categoriesData);
};

window.addNewCategory = () => {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (name && db) {
        const newCats = [...categoriesData, name];
        db.ref('categories').set(newCats).then(() => {
            input.value = '';
            showToast("✅ تم إضافة القسم بنجاح");
        });
    }
};

window.deleteCategory = (name) => {
    if (name === "عام" || !db) return;
    if (confirm(`مسح قسم ${name}؟`)) {
        const newCats = categoriesData.filter(c => c !== name);
        db.ref('categories').set(newCats);
    }
};

window.updateChannelInfo = (id) => {
    const name = document.getElementById(`edit-name-${id}`).value.trim();
    const url = document.getElementById(`edit-url-${id}`).value.trim();
    const cat = document.getElementById(`edit-cat-${id}`).value;
    const forceProtection = document.getElementById(`edit-protection-${id}`).checked;
    if (db && id) {
        // Update either in 'links' or 'channels' depending on where we found it
        db.ref('links').child(id).once('value', s => {
            const path = s.val() ? 'links' : 'channels';
            db.ref(path).child(id).update({ name, url, category: cat, forceProtection });
        });
    }
};

window.deleteChannel = (id) => {
    if (!id || !confirm("⚠️ مسح القناة؟")) return;
    if (db) {
        db.ref('links').child(id).remove();
        db.ref('channels').child(id).remove();
    }
};

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
            // Always push to 'channels' now
            if (db && n && u) {
                db.ref('channels').push({ name: n, url: u, category: c, forceProtection: p, timestamp: Date.now() })
                    .then(() => {
                        form.reset();
                        showToast("✅ تم إضافة القناة بنجاح");
                    });
            }
        };
    }

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

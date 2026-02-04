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
let categoriesData = []; // Storage: array of {id, name, order}
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
    style.innerHTML = `@keyframes toast-in { from { bottom: -50px; opacity: 0; } to { bottom: 30px; opacity: 1; } }`;
    document.head.appendChild(style);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- 3. RENDERING ENGINE ---

function getOrderedCategories() {
    return [...categoriesData].sort((a, b) => (a.order || 0) - (b.order || 0)).map(c => c.name);
}

function renderChannels() {
    const grid = document.getElementById('channels-list');
    if (!grid) return;
    if (channelsData.length === 0) {
        grid.innerHTML = '<div class="premium-loader"></div>';
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
                item.onclick = () => playStream(ch.url, ch.name, ch.forceProtection, cat);
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
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                        <input type="text" id="edit-name-${safeId}" value="${link.name}" class="form-control" placeholder="اسم القناة">
                        <select id="edit-cat-${safeId}" class="form-control" style="background:#000; color:#fff;">
                            ${orderedCats.map(c => `<option value="${c}" ${c === cat ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <textarea id="edit-url-${safeId}" class="form-control" style="height:50px; width:100%; margin-bottom:10px;">${link.url}</textarea>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:11px; color:#00f3ff;"><input type="checkbox" id="edit-protection-${safeId}" ${link.forceProtection ? 'checked' : ''}> حماية</label>
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-primary" style="padding:5px 15px;" onclick="window.updateChannelInfo('${safeId}')">حفظ</button>
                            <button class="btn btn-danger" style="padding:5px 15px;" onclick="window.deleteChannel('${safeId}')">حذف</button>
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

    db.ref('links').on('value', snap => {
        const data = snap.val();
        channelsData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        requestAnimationFrame(refreshUI);
    });
    db.ref('channels').on('value', snap => {
        const data = snap.val();
        if (data) {
            const formatted = Object.keys(data).map(k => ({ id: k, ...data[k] }));
            channelsData = [...channelsData, ...formatted];
            requestAnimationFrame(refreshUI);
        }
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
    if (db && id) db.ref('categories_ordered').child(id).update({ order: parseInt(newOrder) || 0 });
};

window.addNewCategory = () => {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (name && db) {
        const maxOrder = categoriesData.length > 0 ? Math.max(...categoriesData.map(c => c.order || 0)) : -1;
        db.ref('categories_ordered').push({ name, order: maxOrder + 1 }).then(() => {
            input.value = '';
            showToast("✅ تم إضافة القسم");
        });
    }
};

window.editCategory = (id, oldName) => {
    const newName = prompt("الاسم الجديد:", oldName);
    if (newName && newName.trim() !== "" && db) {
        db.ref('categories_ordered').child(id).update({ name: newName.trim() });
    }
};

window.deleteCategory = (id) => {
    if (confirm("مسح القسم؟") && db) db.ref('categories_ordered').child(id).remove();
};

window.updateChannelInfo = (id) => {
    const name = document.getElementById(`edit-name-${id}`).value.trim();
    const url = document.getElementById(`edit-url-${id}`).value.trim();
    const cat = document.getElementById(`edit-cat-${id}`).value;
    const forceProtection = document.getElementById(`edit-protection-${id}`).checked;
    if (db) {
        db.ref('links').child(id).once('value', s => {
            const node = s.val() ? 'links' : 'channels';
            db.ref(node).child(id).update({ name, url, category: cat, forceProtection });
            showToast("✅ تم الحفظ");
        });
    }
};

window.deleteChannel = (id) => {
    if (confirm("مسح؟") && db) {
        db.ref('links').child(id).remove();
        db.ref('channels').child(id).remove();
    }
};

function playStream(url, name, forceProtection, category) {
    activeStreamId++;
    const container = document.getElementById('video-container');
    const titleLabel = document.getElementById('now-playing-title');
    if (!container || !titleLabel) return;
    titleLabel.innerHTML = `<span class="np-cat">${category}</span> ${name}`;
    container.innerHTML = '<div class="premium-loader"></div>';
    const cleanUrl = url.trim();
    const isMixedContent = window.location.protocol === 'https:' && cleanUrl.startsWith('http:');
    if (forceProtection || isMixedContent) {
        container.innerHTML = `<div class="protection-warning" style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:20px; padding:30px; text-align:center; height:100%;"><div style="font-size:40px;">🛡️</div><div class="protection-title">نظام الحماية الذكي<br><span style="font-size:12px; color:#888;">يرجى فتح البث في نافذة مستقلة</span></div><button class="btn-launch" onclick="window.open('${cleanUrl}', '_blank')">▶ تشغيل الآن</button></div>`;
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
    } else { media.src = cleanUrl; }
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
            if (db && n && u) {
                db.ref('channels').push({ name: n, url: u, category: c, forceProtection: p, timestamp: Date.now() })
                    .then(() => { form.reset(); showToast("✅ تم الإضافة"); });
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

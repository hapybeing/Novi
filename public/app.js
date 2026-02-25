// --- DOM Elements ---
const searchInput = document.getElementById('globalSearch');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const homeView = document.getElementById('homeView');
const searchResultsView = document.getElementById('searchResultsView');
const trendingGrid = document.getElementById('trendingGrid');

// --- View Toggles ---
function showSearch() {
    homeView.style.display = 'none';
    searchResultsView.style.display = 'block';
}

function resetHome() {
    searchInput.value = '';
    homeView.style.display = 'block';
    searchResultsView.style.display = 'none';
    resultsGrid.innerHTML = '';
}

// --- Source Modules ---
const Sources = {
    MangaDex: async (query) => {
        try {
            const res = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=15&includes[]=cover_art&order[relevance]=desc`);
            const data = await res.json();
            return data.data.map(m => ({
                id: m.id,
                title: m.attributes.title.en || Object.values(m.attributes.title)[0],
                cover: m.relationships.find(r => r.type === 'cover_art') ? `https://uploads.mangadex.org/covers/${m.id}/${m.relationships.find(r => r.type === 'cover_art').attributes.fileName}.256.jpg` : '',
                source: 'MangaDex'
            }));
        } catch { return []; }
    },

    Manganato: async (query) => {
        try {
            const formatted = query.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const res = await fetch(`https://manganato.com/search/story/${formatted}`);
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');
            return Array.from(doc.querySelectorAll('.search-story-item')).map(item => {
                const a = item.querySelector('.item-title');
                return {
                    id: a.href.split('/').pop(),
                    title: a.textContent.trim(),
                    cover: item.querySelector('img').src,
                    source: 'Manganato'
                };
            });
        } catch { return []; }
    }
};

async function searchAllSources(query) {
    if (!query) return;
    showSearch();
    resultsGrid.innerHTML = `<div class="system-msg" style="color: var(--accent);">Sweeping sectors...</div>`;
    const results = await Promise.allSettled([Sources.MangaDex(query), Sources.Manganato(query)]);
    let master = [];
    results.forEach(r => { if (r.status === 'fulfilled') master = master.concat(r.value); });
    renderGrid(master, resultsGrid);
}

async function getTrending() {
    try {
        const res = await fetch('https://api.mangadex.org/manga?includes[]=cover_art&order[followedCount]=desc&limit=15&availableTranslatedLanguage[]=en');
        const data = await res.json();
        const trending = data.data.map(m => ({
            id: m.id,
            title: m.attributes.title.en || Object.values(m.attributes.title)[0],
            cover: `https://uploads.mangadex.org/covers/${m.id}/${m.relationships.find(r => r.type === 'cover_art').attributes.fileName}.256.jpg`,
            source: 'MangaDex'
        }));
        renderGrid(trending, trendingGrid, true);
    } catch (err) {
        trendingGrid.innerHTML = `<div class="system-msg" style="color: #ef4444;">API Error: ${err.message}</div>`;
    }
}

function renderGrid(library, container, hideSource = false) {
    if (library.length === 0) {
        container.innerHTML = `<div class="system-msg">No results found.</div>`;
        return;
    }
    container.innerHTML = library.map(item => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer;" 
             onclick="window.location.href='details.html?id=${item.id}&source=${item.source}'">
            <img src="${item.cover}" style="width: 100%; aspect-ratio: 2/3; object-fit: cover;" referrerpolicy="no-referrer">
            <div style="padding: 1rem;">
                <div style="font-size: 0.9rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</div>
                ${hideSource ? '' : `<div style="font-size: 0.7rem; color: var(--accent); margin-top: 0.5rem;">[ ${item.source} ]</div>`}
            </div>
        </div>
    `).join('');
}

searchBtn.addEventListener('click', () => searchAllSources(searchInput.value.trim()));
document.addEventListener('DOMContentLoaded', () => {
    const q = new URLSearchParams(window.location.search).get('search');
    q ? searchAllSources(q) : getTrending();
});

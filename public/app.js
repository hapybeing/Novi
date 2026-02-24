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

// --- Title Extractor (Forces English) ---
function getEnTitle(manga) {
    if (manga.attributes.title.en) return manga.attributes.title.en;
    if (manga.attributes.altTitles && manga.attributes.altTitles.length > 0) {
        const alt = manga.attributes.altTitles.find(t => t.en);
        if (alt) return alt.en;
    }
    return Object.values(manga.attributes.title)[0] || 'Unknown';
}

// --- Category Tag Dictionaries ---
const mdTags = {
    'Yaoi': '5920b825-4181-4a17-beeb-9918b0ff7a30',
    'Yuri': 'a3c67850-4684-404e-9b7f-c69850ee5da6',
    'Action': '391b0423-d847-456f-aff0-8b0cfc03066b',
    'Isekai': 'ace04997-f6bd-436e-b261-779182101046',
    'Fantasy': 'cdc58593-87dd-415e-bbc0-2ec27bf404cc'
};
const ckTags = {
    'Yaoi': 'boys-love',
    'Yuri': 'girls-love',
    'Action': 'action',
    'Isekai': 'isekai',
    'Fantasy': 'fantasy'
};

// --- Source Modules ---
const Sources = {
    MangaDex: async (query) => {
        try {
            let url = `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=15&includes[]=cover_art&order[relevance]=desc`;
            if (mdTags[query]) url = `https://api.mangadex.org/manga?includedTags[]=${mdTags[query]}&limit=15&includes[]=cover_art&order[followedCount]=desc&hasAvailableChapters=true`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error('Blocked');
            const data = await res.json();
            
            return data.data.map(manga => {
                const title = getEnTitle(manga);
                const coverRel = manga.relationships.find(r => r.type === 'cover_art');
                const coverUrl = coverRel ? `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg` : '';
                return { id: manga.id, title, cover: coverUrl, source: 'MangaDex' };
            });
        } catch (err) { return []; }
    },
    
    ComicK: async (query) => {
        try {
            let url = `https://api.comick.io/v1.0/search?q=${encodeURIComponent(query)}&limit=15`;
            if (ckTags[query]) url = `https://api.comick.io/v1.0/search?genres=${ckTags[query]}&limit=15&sort=follow`;
            
            // --- CLOUDFLARE SPOOFING HEADERS ---
            // Tricking the server into thinking this is a real Android Phone using Chrome
            const spoofHeaders = {
                "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
                "Referer": "https://comick.io/",
                "Origin": "https://comick.io"
            };
            
            const res = await fetch(url, { headers: spoofHeaders });
            if (!res.ok) throw new Error('Blocked');
            const data = await res.json();
            
            return data.map(manga => {
                const coverUrl = manga.md_covers && manga.md_covers[0] ? `https://meo.comick.pictures/${manga.md_covers[0].b2key}` : '';
                return { id: manga.hid, title: manga.title || 'Unknown', cover: coverUrl, source: 'ComicK' };
            });
        } catch (err) { return []; }
    }
};

// --- Core Functions ---
async function searchAllSources(query) {
    if (!query) return;
    if (!mdTags[query]) searchInput.value = query; 
    else searchInput.value = `[ Category: ${query} ]`;
    
    showSearch();
    resultsGrid.innerHTML = `<div class="system-msg" style="color: var(--accent);">Executing sweep for: ${query}...</div>`;
    
    const fetchPromises = [ Sources.MangaDex(query), Sources.ComicK(query) ];
    const results = await Promise.allSettled(fetchPromises);
    
    let masterLibrary = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') masterLibrary = masterLibrary.concat(result.value);
    });

    renderGrid(masterLibrary, resultsGrid);
}

// --- STABLE HOME SCREEN ---
async function getTrending() {
    try {
        const res = await fetch('https://api.mangadex.org/manga?includes[]=cover_art&order[followedCount]=desc&limit=15&hasAvailableChapters=true&availableTranslatedLanguage[]=en');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const trending = data.data.map(manga => {
            const title = getEnTitle(manga);
            const coverRel = manga.relationships.find(r => r.type === 'cover_art');
            const coverUrl = coverRel ? `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg` : '';
            return { id: manga.id, title, cover: coverUrl, source: 'MangaDex' };
        });

        // For the home screen, we still hide the sources to keep it looking clean and premium
        renderGrid(trending, trendingGrid, true);
    } catch (err) {
        trendingGrid.innerHTML = `<div class="system-msg" style="color: #ef4444;">API Error: ${err.message}</div>`;
    }
}

// --- UI Rendering ---
// Added a toggle so sources are hidden on the home screen, but VISIBLE in search results
function renderGrid(library, container, hideSource = false) {
    if (library.length === 0) {
        container.innerHTML = `<div class="system-msg" style="color: #ef4444;">Target evaded sweeps. No results found.</div>`;
        return;
    }

    container.innerHTML = library.map(item => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column;" 
             onclick="window.location.href='details.html?id=${item.id}&source=${item.source}'">
            <img src="${item.cover}" style="width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #222;" loading="lazy" referrerpolicy="no-referrer">
            <div style="padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 0.9rem; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; ${hideSource ? '' : 'margin-bottom: 0.5rem;'}">${item.title}</div>
                ${hideSource ? '' : `<div style="font-size: 0.7rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">[ ${item.source} ]</div>`}
            </div>
        </div>
    `).join('');
}

// --- Event Listeners ---
searchBtn.addEventListener('click', () => searchAllSources(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchAllSources(searchInput.value.trim()); });

// --- INITIALIZE APP (Checks for Auto-Search Router) ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const huntQuery = urlParams.get('search');
    if (huntQuery) {
        searchAllSources(huntQuery);
    } else {
        getTrending();
    }
});

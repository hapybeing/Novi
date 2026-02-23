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
                const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown';
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
            
            const res = await fetch(url);
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

// Netflix-Style Auto Load (SWITCHED TO COMICK)
async function getTrending() {
    try {
        const res = await fetch('https://api.comick.io/v1.0/search?limit=15&sort=follow');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const trending = data.map(manga => {
            const coverUrl = manga.md_covers && manga.md_covers[0] ? `https://meo.comick.pictures/${manga.md_covers[0].b2key}` : '';
            return { id: manga.hid, title: manga.title || 'Unknown', cover: coverUrl, source: 'ComicK' };
        });

        renderGrid(trending, trendingGrid);
    } catch (err) {
        trendingGrid.innerHTML = `<div class="system-msg" style="color: #ef4444;">API Error: ${err.message}</div>`;
    }
}

// --- UI Rendering ---
function renderGrid(library, container) {
    if (library.length === 0) {
        container.innerHTML = `<div class="system-msg" style="color: #ef4444;">No results found.</div>`;
        return;
    }

    container.innerHTML = library.map(item => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column;" 
             onclick="window.location.href='details.html?id=${item.id}&source=${item.source}'">
            <img src="${item.cover}" style="width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #222;" loading="lazy" referrerpolicy="no-referrer">
            <div style="padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 0.9rem; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.title}</div>
            </div>
        </div>
    `).join('');
}

// --- Event Listeners ---
searchBtn.addEventListener('click', () => searchAllSources(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchAllSources(searchInput.value.trim()); });
document.addEventListener('DOMContentLoaded', getTrending);

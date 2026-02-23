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
            // FIXED: Added order[relevance]=desc so MangaDex actually returns correct results
            const res = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=15&includes[]=cover_art&order[relevance]=desc`);
            if (!res.ok) throw new Error('MangaDex Blocked');
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
            const res = await fetch(`https://api.comick.io/v1.0/search?q=${encodeURIComponent(query)}&limit=15`);
            if (!res.ok) throw new Error('ComicK Blocked');
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
    searchInput.value = query; // Auto-fill the box if triggered by a category pill
    showSearch();
    resultsGrid.innerHTML = `<div class="system-msg" style="color: var(--accent);">Executing parallel sweep for: ${query}...</div>`;
    
    const fetchPromises = [ Sources.MangaDex(query), Sources.ComicK(query) ];
    const results = await Promise.allSettled(fetchPromises);
    
    let masterLibrary = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') masterLibrary = masterLibrary.concat(result.value);
    });

    renderGrid(masterLibrary, resultsGrid);
}

// Netflix-Style Auto Load
async function getTrending() {
    try {
        // Fetching top followed manga from MangaDex for the home screen
        const res = await fetch(`https://api.mangadex.org/manga?includes[]=cover_art&order[followedCount]=desc&limit=10&hasAvailableChapters=true`);
        const data = await res.json();
        
        const trending = data.data.map(manga => {
            const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown';
            const coverRel = manga.relationships.find(r => r.type === 'cover_art');
            const coverUrl = coverRel ? `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg` : '';
            return { id: manga.id, title, cover: coverUrl, source: 'MangaDex' };
        });

        renderGrid(trending, trendingGrid);
    } catch (err) {
        trendingGrid.innerHTML = `<div class="system-msg" style="color: #ef4444;">Failed to load trending data.</div>`;
    }
}

// --- UI Rendering ---
function renderGrid(library, container) {
    if (library.length === 0) {
        container.innerHTML = `<div class="system-msg" style="color: #ef4444;">Target evaded sweeps. No results found. (Note: ComicK may be blocked by browser CORS until wrapped in native app).</div>`;
        return;
    }

    container.innerHTML = library.map(item => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column;" 
             onclick="window.location.href='details.html?id=${item.id}&source=${item.source}'">
            
            <img src="${item.cover}" style="width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #222;" loading="lazy" referrerpolicy="no-referrer">
            
            <div style="padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="font-size: 0.9rem; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 0.5rem;">${item.title}</div>
                <div style="font-size: 0.7rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">[ ${item.source} ]</div>
            </div>
        </div>
    `).join('');
}

// --- Event Listeners ---
searchBtn.addEventListener('click', () => searchAllSources(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchAllSources(searchInput.value.trim()); });

// Initialize App
document.addEventListener('DOMContentLoaded', getTrending);

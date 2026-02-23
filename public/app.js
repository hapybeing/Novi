// --- DOM Elements ---
const searchInput = document.getElementById('globalSearch');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');

// --- Source Modules (The Plugins) ---
const Sources = {
    MangaDex: async (query) => {
        try {
            const res = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=10&includes[]=cover_art`);
            if (!res.ok) throw new Error('MangaDex Blocked');
            const data = await res.json();
            
            return data.data.map(manga => {
                const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown';
                const coverRel = manga.relationships.find(r => r.type === 'cover_art');
                const coverFile = coverRel ? coverRel.attributes.fileName : null;
                const coverUrl = coverFile ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFile}.256.jpg` : '';
                
                return { id: manga.id, title, cover: coverUrl, source: 'MangaDex' };
            });
        } catch (err) {
            console.error(err);
            return []; // Fail silently so it doesn't crash the other sources
        }
    },
    
    ComicK: async (query) => {
        try {
            const res = await fetch(`https://api.comick.io/v1.0/search?q=${encodeURIComponent(query)}&limit=10`);
            if (!res.ok) throw new Error('ComicK Blocked');
            const data = await res.json();
            
            return data.map(manga => {
                const coverUrl = manga.md_covers && manga.md_covers[0] ? `https://meo.comick.pictures/${manga.md_covers[0].b2key}` : '';
                return { id: manga.hid, title: manga.title || 'Unknown', cover: coverUrl, source: 'ComicK' };
            });
        } catch (err) {
            console.error(err);
            return [];
        }
    }
};

// --- The Core Resolver ---
async function searchAllSources(query) {
    resultsGrid.innerHTML = `<div class="system-msg" style="color: var(--accent);">Executing parallel sweep across libraries...</div>`;
    
    // Fire all plugins at the exact same time
    const fetchPromises = [
        Sources.MangaDex(query),
        Sources.ComicK(query)
    ];

    // Wait for all sweeps to finish
    const results = await Promise.allSettled(fetchPromises);
    
    // Merge the successful hits into one master array
    let masterLibrary = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            masterLibrary = masterLibrary.concat(result.value);
        }
    });

    renderResults(masterLibrary);
}

// --- UI Rendering ---
function renderResults(library) {
    if (library.length === 0) {
        resultsGrid.innerHTML = `<div class="system-msg" style="color: #ef4444;">Target evaded sweeps. No results found.</div>`;
        return;
    }

    resultsGrid.innerHTML = library.map(item => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer;" 
             onclick="window.location.href='details.html?id=${item.id}&source=${item.source}'">
            
            <img src="${item.cover}" style="width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #222;" loading="lazy" referrerpolicy="no-referrer">
            
            <div style="padding: 1rem;">
                <div style="font-size: 0.7rem; color: var(--accent); font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem;">[ ${item.source} ]</div>
                <div style="font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
            </div>
        </div>
    `).join('');
}

// --- Event Listeners ---
searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q) searchAllSources(q);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) searchAllSources(q);
    }
});

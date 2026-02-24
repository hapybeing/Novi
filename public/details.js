const detailsMain = document.getElementById('detailsMain');
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('id');
const source = urlParams.get('source');

async function loadDetails() {
    if (!targetId || !source) {
        detailsMain.innerHTML = `<div class="system-msg" style="color: #ef4444;">Error: Invalid routing.</div>`;
        return;
    }

    try {
        let manga = {};
        let chapters = [];

        if (source === 'MangaDex') {
            const infoReq = await fetch(`https://api.mangadex.org/manga/${targetId}?includes[]=cover_art`);
            const infoData = await infoReq.json();
            const mdData = infoData.data;
            
            // Force English Title extraction
            manga.title = mdData.attributes.title.en;
            if (!manga.title && mdData.attributes.altTitles) {
                const alt = mdData.attributes.altTitles.find(t => t.en);
                if (alt) manga.title = alt.en;
            }
            if (!manga.title) manga.title = Object.values(mdData.attributes.title)[0] || 'Unknown';

            manga.desc = mdData.attributes.description.en || 'No description available.';
            const coverRel = mdData.relationships.find(r => r.type === 'cover_art');
            manga.cover = coverRel ? `https://uploads.mangadex.org/covers/${targetId}/${coverRel.attributes.fileName}` : '';

            const chapReq = await fetch(`https://api.mangadex.org/manga/${targetId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=500`);
            const chapData = await chapReq.json();
            
            const uniqueChapters = new Map();
            chapData.data.forEach(c => {
                const chapKey = c.attributes.chapter || c.attributes.title || c.id; 
                let display = c.attributes.chapter ? `Ch. ${c.attributes.chapter}` : (c.attributes.title || 'Extra');
                if (!uniqueChapters.has(chapKey)) uniqueChapters.set(chapKey, { id: c.id, num: display });
            });
            chapters = Array.from(uniqueChapters.values());

        } else if (source === 'ComicK') {
            const infoReq = await fetch(`https://api.comick.io/comic/${targetId}`);
            const infoData = await infoReq.json();
            
            manga.title = infoData.comic.title;
            manga.desc = infoData.comic.desc || 'No description available.';
            manga.cover = infoData.comic.md_covers ? `https://meo.comick.pictures/${infoData.comic.md_covers[0].b2key}` : '';

            const chapReq = await fetch(`https://api.comick.io/comic/${targetId}/chapters?lang=en&limit=5000`);
            const chapData = await chapReq.json();
            
            const uniqueChapters = new Map();
            chapData.chapters.forEach(c => {
                const chapKey = c.chap || c.title || c.hid;
                let display = c.chap ? `Ch. ${c.chap}` : (c.title || 'Extra');
                if (!uniqueChapters.has(chapKey)) uniqueChapters.set(chapKey, { id: c.hid, num: display });
            });
            chapters = Array.from(uniqueChapters.values());
        }

        renderDetailsUI(manga, chapters);

    } catch (err) {
        detailsMain.innerHTML = `<div class="system-msg" style="color: #ef4444;">Connection failed.</div>`;
    }
}

function renderDetailsUI(manga, chapters) {
    let chaptersHTML = '';

    // If chapters exist, map them out.
    if (chapters.length > 0) {
        chaptersHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">` + 
            chapters.map(c => `
                <div style="background: var(--bg-surface); padding: 1rem; border: 1px solid var(--border); border-radius: 6px; text-align: center; cursor: pointer; transition: 0.2s;" 
                     onclick="window.location.href='reader.html?chapterId=${encodeURIComponent(c.id)}&source=${source}&mangaId=${targetId}'"
                     onmouseover="this.style.borderColor='var(--accent)'" 
                     onmouseout="this.style.borderColor='var(--border)'">
                    <div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.num}</div>
                </div>
            `).join('') + `</div>`;
    } else {
        // THE DMCA FALLBACK ROUTER
        chaptersHTML = `
            <div style="text-align: center; padding: 3rem 1rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px;">
                <div style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 1.1rem;">Target purged. No English chapters exist on this server.</div>
                <button onclick="window.location.href='index.html?search=${encodeURIComponent(manga.title)}'" 
                        style="background: var(--accent); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; transition: background 0.2s;"
                        onmouseover="this.style.backgroundColor='var(--accent-hover)'"
                        onmouseout="this.style.backgroundColor='var(--accent)'">
                    Hunt Alternative Sources
                </button>
            </div>
        `;
    }

    detailsMain.innerHTML = `
        <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 3rem;">
            <img src="${manga.cover}" style="width: 250px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" referrerpolicy="no-referrer">
            <div style="flex: 1; min-width: 300px;">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">${manga.title}</h1>
                <p style="color: var(--text-muted); line-height: 1.6; max-height: 200px; overflow-y: auto; margin-top: 1rem;">${manga.desc}</p>
            </div>
        </div>
        <h2 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Chapters (${chapters.length})</h2>
        ${chaptersHTML}
    `;
}

document.addEventListener('DOMContentLoaded', loadDetails);

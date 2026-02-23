const detailsMain = document.getElementById('detailsMain');
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('id');
const source = urlParams.get('source');

async function loadDetails() {
    if (!targetId || !source) {
        detailsMain.innerHTML = `<div class="system-msg" style="color: #ef4444;">Error: Invalid routing parameters.</div>`;
        return;
    }

    try {
        let manga = {};
        let chapters = [];

        if (source === 'MangaDex') {
            // 1. Fetch MangaDex Details
            const infoReq = await fetch(`https://api.mangadex.org/manga/${targetId}?includes[]=cover_art`);
            const infoData = await infoReq.json();
            const mdData = infoData.data;
            
            manga.title = mdData.attributes.title.en || Object.values(mdData.attributes.title)[0];
            manga.desc = mdData.attributes.description.en || 'No description available.';
            const coverRel = mdData.relationships.find(r => r.type === 'cover_art');
            manga.cover = coverRel ? `https://uploads.mangadex.org/covers/${targetId}/${coverRel.attributes.fileName}` : '';

            // 2. Fetch MangaDex Chapters
            const chapReq = await fetch(`https://api.mangadex.org/manga/${targetId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=100`);
            const chapData = await chapReq.json();
            chapters = chapData.data.map(c => ({
                id: c.id,
                num: c.attributes.chapter || 'Oneshot',
                title: c.attributes.title || `Chapter ${c.attributes.chapter}`
            }));

        } else if (source === 'ComicK') {
            // 1. Fetch ComicK Details
            const infoReq = await fetch(`https://api.comick.io/comic/${targetId}`);
            const infoData = await infoReq.json();
            
            manga.title = infoData.comic.title;
            manga.desc = infoData.comic.desc || 'No description available.';
            manga.cover = infoData.comic.md_covers ? `https://meo.comick.pictures/${infoData.comic.md_covers[0].b2key}` : '';

            // 2. Fetch ComicK Chapters
            const chapReq = await fetch(`https://api.comick.io/comic/${targetId}/chapters?lang=en&limit=100`);
            const chapData = await chapReq.json();
            chapters = chapData.chapters.map(c => ({
                id: c.hid,
                num: c.chap || 'Oneshot',
                title: c.title || `Chapter ${c.chap}`
            }));
        }

        renderDetailsUI(manga, chapters);

    } catch (err) {
        console.error(err);
        detailsMain.innerHTML = `<div class="system-msg" style="color: #ef4444;">Connection failed. Target server rejected the request.</div>`;
    }
}

function renderDetailsUI(manga, chapters) {
    detailsMain.innerHTML = `
        <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 3rem;">
            <img src="${manga.cover}" style="width: 250px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" referrerpolicy="no-referrer">
            <div style="flex: 1; min-width: 300px;">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">${manga.title}</h1>
                <span style="display: inline-block; background: var(--accent); color: white; padding: 0.2rem 0.8rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-bottom: 1.5rem; text-transform: uppercase;">Source: ${source}</span>
                <p style="color: var(--text-muted); line-height: 1.6; max-height: 200px; overflow-y: auto;">${manga.desc}</p>
            </div>
        </div>

        <h2 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Database Payload (${chapters.length} Chapters)</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
            ${chapters.length > 0 ? chapters.map(c => `
                <div style="background: var(--bg-surface); padding: 1rem; border: 1px solid var(--border); border-radius: 6px; text-align: center; cursor: pointer; transition: 0.2s;" 
                     onclick="window.location.href='reader.html?chapterId=${encodeURIComponent(c.id)}&source=${source}'"
                     onmouseover="this.style.borderColor='var(--accent)'" 
                     onmouseout="this.style.borderColor='var(--border)'">
                    <div style="font-weight: bold; font-size: 1.1rem;">Ch. ${c.num}</div>
                </div>
            `).join('') : '<div class="system-msg">No English chapters located in this database.</div>'}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', loadDetails);

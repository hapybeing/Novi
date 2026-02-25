const detailsMain = document.getElementById('detailsMain');
const params = new URLSearchParams(window.location.search);
const targetId = params.get('id');
const source = params.get('source');

async function loadDetails() {
    try {
        let manga = {}, chapters = [];
        if (source === 'MangaDex') {
            const res = await fetch(`https://api.mangadex.org/manga/${targetId}?includes[]=cover_art`);
            const data = (await res.json()).data;
            manga = {
                title: data.attributes.title.en || Object.values(data.attributes.title)[0],
                desc: data.attributes.description.en || 'No description.',
                cover: `https://uploads.mangadex.org/covers/${targetId}/${data.relationships.find(r => r.type === 'cover_art').attributes.fileName}`
            };
            const cRes = await fetch(`https://api.mangadex.org/manga/${targetId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=500`);
            chapters = (await cRes.json()).data.map(c => ({ 
                id: c.id, 
                num: c.attributes.chapter ? `Ch. ${c.attributes.chapter}` : (c.attributes.title || 'Extra') 
            }));
        } else {
            // Manganato Scraper
            let res = await fetch(`https://chapmanganato.to/${targetId}`);
            if (res.status === 404) res = await fetch(`https://manganato.com/${targetId}`); // Fallback domain
            if (res.status === 403) throw new Error('Shield Active');
            
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            manga = {
                title: doc.querySelector('.story-info-right h1')?.textContent.trim() || 'Unknown',
                desc: doc.querySelector('#panel-story-info-description')?.textContent.replace('Description :', '').trim() || '',
                cover: doc.querySelector('.info-image img')?.src || ''
            };
            doc.querySelectorAll('.row-content-chapter a').forEach(a => {
                chapters.push({ id: a.href.split('/').pop(), num: a.textContent.trim() });
            });
        }
        renderUI(manga, chapters);
    } catch (err) {
        let errorMsg = err.message === 'Shield Active' ? 'Cloudflare Shield Detected.' : 'Connection Severed.';
        let solveUrl = source === 'Manganato' ? `https://chapmanganato.to/${targetId}` : '';
        
        detailsMain.innerHTML = `
            <div style="text-align: center; padding: 5rem 1rem;">
                <div style="color: #ef4444; margin-bottom: 2rem; font-size: 1.2rem;">${errorMsg}</div>
                ${solveUrl ? `<button onclick="window.open('${solveUrl}', '_blank')" style="background: var(--accent); color: white; padding: 1rem 2rem; border-radius: 8px; border: none; font-weight: bold; cursor: pointer;">Break Shield (Solve Captcha)</button>` : ''}
            </div>
        `;
    }
}

function renderUI(manga, chapters) {
    let chaptersHTML = '';

    // RESTORED: The Fallback UI Logic
    if (chapters.length > 0) {
        chaptersHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">` + 
            chapters.map(c => `
                <div style="background: var(--bg-surface); padding: 1rem; border: 1px solid var(--border); border-radius: 6px; text-align: center; cursor: pointer;" 
                     onclick="window.location.href='reader.html?chapterId=${c.id}&source=${source}&mangaId=${targetId}'">
                    <div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.num}</div>
                </div>
            `).join('') + `</div>`;
    } else {
        chaptersHTML = `
            <div style="text-align: center; padding: 3rem 1rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px;">
                <div style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 1.1rem;">Target purged. No English chapters exist on this server.</div>
                <button onclick="window.location.href='index.html?search=${encodeURIComponent(manga.title)}'" 
                        style="background: var(--accent); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem;">
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
                <p style="color: var(--text-muted); line-height: 1.6; max-height: 200px; overflow-y: auto;">${manga.desc}</p>
            </div>
        </div>
        <h2 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Chapters (${chapters.length})</h2>
        ${chaptersHTML}
    `;
}

document.addEventListener('DOMContentLoaded', loadDetails);

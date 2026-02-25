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
            chapters = (await cRes.json()).data.map(c => ({ id: c.id, num: c.attributes.chapter || 'Extra' }));
        } else {
            // Manganato Scraper
            const res = await fetch(`https://chapmanganato.to/${targetId}`);
            if (res.status === 403) throw new Error('Shield Active');
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            manga = {
                title: doc.querySelector('.story-info-right h1')?.textContent.trim() || 'Unknown',
                desc: doc.querySelector('#panel-story-info-description')?.textContent.trim() || '',
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
                ${solveUrl ? `<button onclick="window.open('${solveUrl}', '_blank')" style="background: var(--accent); color: white; padding: 1rem 2rem; border-radius: 8px; border: none; font-weight: bold;">Break Shield (Solve Captcha)</button>` : ''}
            </div>
        `;
    }
}

function renderUI(manga, chapters) {
    detailsMain.innerHTML = `
        <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 3rem;">
            <img src="${manga.cover}" style="width: 250px; border-radius: 8px;" referrerpolicy="no-referrer">
            <div style="flex: 1;">
                <h1>${manga.title}</h1>
                <p style="color: var(--text-muted); margin-top: 1rem;">${manga.desc}</p>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
            ${chapters.map(c => `
                <div style="background: var(--bg-surface); padding: 1rem; border-radius: 6px; text-align: center; cursor: pointer;" 
                     onclick="window.location.href='reader.html?chapterId=${c.id}&source=${source}&mangaId=${targetId}'">
                    ${c.num}
                </div>
            `).join('')}
        </div>
    `;
}
document.addEventListener('DOMContentLoaded', loadDetails);

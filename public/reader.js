const readerMain = document.getElementById('readerMain');
const urlParams = new URLSearchParams(window.location.search);
const chapterId = urlParams.get('chapterId');
const source = urlParams.get('source');
const mangaId = urlParams.get('mangaId');

let allChapters = [];
let currentIndex = -1;

async function loadPages() {
    if (!chapterId || !source) {
        readerMain.innerHTML = `<div class="system-msg" style="color: #ef4444; margin-top: 5rem;">Error: Missing extraction parameters.</div>`;
        return;
    }

    try {
        let imageUrls = [];

        if (source === 'MangaDex') {
            const res = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`);
            if (!res.ok) throw new Error('Server rejected request');
            const data = await res.json();
            imageUrls = data.chapter.data.map(fileName => `${data.baseUrl}/data/${data.chapter.hash}/${fileName}`);
            
        } else if (source === 'Manganato') {
            // Manganato Reader Scraper
            let res = await fetch(`https://chapmanganato.to/${mangaId}/${chapterId}`);
            if (res.status === 403) throw new Error('Shield Active');
            if (res.status === 404) res = await fetch(`https://manganato.com/${mangaId}/${chapterId}`);
            
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');

            // Select all images inside the main reader container
            const imgNodes = doc.querySelectorAll('.container-chapter-reader img');
            imageUrls = Array.from(imgNodes).map(img => img.src);
        }

        renderImages(imageUrls);
        if (mangaId) fetchChapterList();

    } catch (err) {
        let msg = err.message === 'Shield Active' ? 'Cloudflare Blocked Extraction.' : 'Extraction Failed.';
        readerMain.innerHTML = `
            <div style="text-align: center; padding: 5rem 1rem;">
                <div style="color: #ef4444; margin-bottom: 2rem;">${msg}</div>
                ${source === 'Manganato' ? `<button onclick="window.open('https://chapmanganato.to/${mangaId}/${chapterId}', '_blank')" style="background: var(--accent); color: white; padding: 1rem 2rem; border-radius: 8px; border: none; font-weight: bold;">Break Shield</button>` : ''}
            </div>
        `;
    }
}

async function fetchChapterList() {
    try {
        if (source === 'MangaDex') {
            const req = await fetch(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=500`);
            const data = await req.json();
            const unique = new Map();
            data.data.forEach(c => {
                const chapKey = c.attributes.chapter || c.attributes.title || c.id;
                if (!unique.has(chapKey)) unique.set(chapKey, { id: c.id });
            });
            allChapters = Array.from(unique.values());
            
        } else if (source === 'Manganato') {
            let res = await fetch(`https://chapmanganato.to/${mangaId}`);
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const chapNodes = doc.querySelectorAll('.row-content-chapter a');
            chapNodes.forEach(node => {
                const cId = node.href.split('/').pop();
                allChapters.push({ id: cId });
            });
        }

        currentIndex = allChapters.findIndex(c => c.id === chapterId);
        updateNavButtons();
    } catch (e) { console.error("Nav load failed", e); }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Chapters are sorted newest to oldest.
    if (currentIndex > 0) {
        nextBtn.onclick = () => window.location.href = `reader.html?chapterId=${allChapters[currentIndex - 1].id}&source=${source}&mangaId=${mangaId}`;
        nextBtn.style.opacity = "1";
        nextBtn.style.pointerEvents = "auto";
    }
    if (currentIndex < allChapters.length - 1 && currentIndex !== -1) {
        prevBtn.onclick = () => window.location.href = `reader.html?chapterId=${allChapters[currentIndex + 1].id}&source=${source}&mangaId=${mangaId}`;
        prevBtn.style.opacity = "1";
        prevBtn.style.pointerEvents = "auto";
    }
}

function renderImages(urls) {
    if (urls.length === 0) {
        readerMain.innerHTML = `<div class="system-msg" style="margin-top: 5rem;">No pages found. (External link or Shielded)</div>`;
        return;
    }
    // Using no-referrer is mandatory for Manganato images to load natively
    readerMain.innerHTML = urls.map(url => `
        <img src="${url}" style="width: 100%; max-width: 800px; display: block; margin: 0 auto;" loading="lazy" referrerpolicy="no-referrer">
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadPages);

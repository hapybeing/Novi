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
        } else if (source === 'ComicK') {
            const res = await fetch(`https://api.comick.io/chapter/${chapterId}`);
            if (!res.ok) throw new Error('Server rejected request');
            const data = await res.json();
            if (data.chapter && data.chapter.images) {
                imageUrls = data.chapter.images.map(img => img.url);
            }
        }

        renderImages(imageUrls);
        
        // Fetch chapters in background for the Navigation Bar
        if (mangaId) fetchChapterList();

    } catch (err) {
        readerMain.innerHTML = `<div class="system-msg" style="color: #ef4444; margin-top: 5rem;">Extraction failed. Connection severed.</div>`;
    }
}

async function fetchChapterList() {
    try {
        if (source === 'MangaDex') {
            const req = await fetch(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=500`);
            const data = await req.json();
            const unique = new Map();
            data.data.forEach(c => {
                const chapNum = c.attributes.chapter || 'Oneshot';
                if (!unique.has(chapNum)) unique.set(chapNum, { id: c.id });
            });
            allChapters = Array.from(unique.values());
        } else if (source === 'ComicK') {
            const req = await fetch(`https://api.comick.io/comic/${mangaId}/chapters?lang=en&limit=5000`);
            const data = await req.json();
            const unique = new Map();
            data.chapters.forEach(c => {
                const chapNum = c.chap || 'Oneshot';
                if (!unique.has(chapNum)) unique.set(chapNum, { id: c.hid });
            });
            allChapters = Array.from(unique.values());
        }

        currentIndex = allChapters.findIndex(c => c.id === chapterId);
        updateNavButtons();
    } catch (e) { console.error("Nav load failed", e); }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Note: Chapters are sorted descending (latest chapter is at index 0)
    // So "Next Chapter" is index - 1, and "Previous Chapter" is index + 1
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
        readerMain.innerHTML = `<div class="system-msg" style="margin-top: 5rem;">No pages found.</div>`;
        return;
    }
    readerMain.innerHTML = urls.map(url => `
        <img src="${url}" style="width: 100%; max-width: 800px; display: block; margin: 0 auto;" loading="lazy" referrerpolicy="no-referrer">
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadPages);

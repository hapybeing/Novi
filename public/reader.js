const readerMain = document.getElementById('readerMain');
const urlParams = new URLSearchParams(window.location.search);
const chapterId = urlParams.get('chapterId');
const source = urlParams.get('source');

async function loadPages() {
    if (!chapterId || !source) {
        readerMain.innerHTML = `<div class="system-msg" style="color: #ef4444; margin-top: 5rem;">Error: Missing extraction parameters.</div>`;
        return;
    }

    try {
        let imageUrls = [];

        if (source === 'MangaDex') {
            // MangaDex requires hitting their "At-Home" server to get the image node
            const res = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`);
            if (!res.ok) throw new Error('MangaDex server rejected request');
            const data = await res.json();
            
            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;
            
            // Construct the final high-res URLs
            imageUrls = data.chapter.data.map(fileName => `${baseUrl}/data/${hash}/${fileName}`);

        } else if (source === 'ComicK') {
            // ComicK provides direct image URLs in the chapter payload
            const res = await fetch(`https://api.comick.io/chapter/${chapterId}`);
            if (!res.ok) throw new Error('ComicK server rejected request');
            const data = await res.json();
            
            if (data.chapter && data.chapter.images) {
                imageUrls = data.chapter.images.map(img => img.url);
            }
        }

        renderImages(imageUrls);

    } catch (err) {
        console.error(err);
        readerMain.innerHTML = `<div class="system-msg" style="color: #ef4444; margin-top: 5rem;">Extraction failed. Connection severed.</div>`;
    }
}

function renderImages(urls) {
    if (urls.length === 0) {
        readerMain.innerHTML = `<div class="system-msg" style="margin-top: 5rem;">No pages found in the payload.</div>`;
        return;
    }

    // Clear the loading message and map the images
    readerMain.innerHTML = urls.map(url => `
        <img src="${url}" 
             style="width: 100%; max-width: 800px; display: block; margin: 0 auto;" 
             loading="lazy" 
             referrerpolicy="no-referrer">
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadPages);

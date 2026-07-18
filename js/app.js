// Shared App Logic
const App = {
    timerInterval: null,

    init() {
        this.setupNavigation();
        
        const path = window.location.pathname;

        if (path.endsWith('login.html')) {
            this.initLogin();
            return;
        }

        // Check authentication for protected routes
        if (!this.checkAuth(path)) return;

        // Setup logout button
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            if (!isAdmin) {
                logoutBtn.parentElement.style.display = 'none';
            } else {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        }

        // Page specific initialization
        if (path.endsWith('/') || path.endsWith('index.html') || path.endsWith('contact.html')) {
            this.initLanding();
        } else if (path.endsWith('archive.html')) {
            this.initArchive();
        } else if (path.endsWith('bulletin.html')) {
            this.initBulletin();
        } else if (path.endsWith('pray.html')) {
            this.initPrayPage();
        }

        // Initialize Live stream indicator banner on all relevant pages
        this.initLiveBroadcast();
    },

    checkAuth(path) {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const protectedRoutes = ['bulletin.html'];
        
        const isProtected = protectedRoutes.some(route => path.endsWith(route));
        
        if (isProtected && !isAdmin) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    logout() {
        localStorage.removeItem('isAdmin');
        window.location.href = 'index.html';
    },

    initLogin() {
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const pwd = document.getElementById('password').value;
            if (pwd === 'media2026') {
                localStorage.setItem('isAdmin', 'true');
                window.location.href = 'archive.html';
            } else {
                document.getElementById('login-error').style.display = 'block';
            }
        });
    },

    setupNavigation() {
        const path = window.location.pathname;
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (path.endsWith(href)) {
                link.classList.add('active');
            }
        });
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },



    // --- Landing ---
    initLanding() {
        // Dynamic background blending for logo (remove white background)
        const logo = document.getElementById('hero-logo');
        if (logo) {
            const makeLogoTransparent = () => {
                const img = new Image();
                img.src = logo.src;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    try {
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imgData.data;
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            // If pixel is white or near white (e.g. RGB > 240)
                            if (r > 240 && g > 240 && b > 240) {
                                data[i + 3] = 0; // set alpha to 0 (transparent)
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                        logo.src = canvas.toDataURL();
                    } catch (err) {
                        console.error('Error processing logo transparency:', err);
                    }
                };
            };

            // If image is already loaded, process it immediately, else wait for load
            if (logo.complete) {
                makeLogoTransparent();
            } else {
                logo.addEventListener('load', makeLogoTransparent);
            }
        }
    },

    // --- Archive ---
    async initArchive() {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!isAdmin) {
            const newBtn = document.getElementById('btn-new-sermon');
            if (newBtn) newBtn.style.display = 'none';
        }

        const playerClose = document.getElementById('player-close');
        playerClose?.addEventListener('click', () => this.closeMediaPlayer());

        const modalOverlay = document.getElementById('player-modal-overlay');
        modalOverlay?.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeMediaPlayer();
            }
        });

        document.getElementById('btn-sync-now')?.addEventListener('click', () => {
            this.loadYoutubeArchive(true);
        });

        await this.loadYoutubeArchive(false);
    },

    async loadYoutubeArchive(force = false) {
        const statusEl = document.getElementById('youtube-archive-status');
        const listEl = document.getElementById('youtube-archive-list');
        if (!statusEl || !listEl) return;

        const cached = localStorage.getItem('youtubeArchiveVideos');
        const cachedTime = localStorage.getItem('youtubeArchiveFetchedAt');
        const now = Date.now();

        if (!force && cached && cachedTime && (now - parseInt(cachedTime, 10) < 3600000)) {
            const items = JSON.parse(cached);
            // If cached items are missing videoId (old format before thumbnail fix),
            // force a fresh fetch so thumbnails are built correctly.
            const needsRefresh = items && items.length && !items[0].videoId;
            if (items && items.length && !needsRefresh) {
                this.renderYoutubeArchive(items);
                statusEl.textContent = `Loaded ${items.length} recent videos from cache.`;
                return;
            }
        }

        statusEl.textContent = 'Loading latest YouTube sermons...';
        listEl.innerHTML = this.getLoadingSkeleton();

        try {
            // Use local Vercel API endpoint for YouTube videos
            const apiUrl = '/api/youtube';

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network response not ok');
            const data = await response.json();
            
            if (data.error) {
                console.warn('YouTube API error or unconfigured:', data.error);
                throw new Error(data.error);
            }
            
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid feed response');
            }

            // Limit to 6 items as requested
            const latestSix = data.items.slice(0, 6);

            const items = latestSix.map(item => {
                return {
                    title: item.title,
                    link: item.link,
                    videoId: item.videoId,
                    thumbnail: item.thumbnail,
                    published: item.published,
                    description: item.description || ''
                };
            });

            localStorage.setItem('youtubeArchiveVideos', JSON.stringify(items));
            localStorage.setItem('youtubeArchiveFetchedAt', now.toString());

            this.renderYoutubeArchive(items);
            statusEl.textContent = `Loaded ${items.length} recent videos from Streams of Joy Owerri.`;
        } catch (error) {
            console.error('Error loading YouTube archive:', error);
            if (cached) {
                const items = JSON.parse(cached);
                this.renderYoutubeArchive(items);
                statusEl.textContent = `Showing ${items.length} cached videos. The playlist preview above remains available.`;
            } else {
                this.renderYoutubeArchive(this.getYoutubeFallbackItems());
                statusEl.textContent = 'Showing the official playlist preview. Recent cards will refresh when the YouTube feed is available.';
            }
        }
    },

    renderYoutubeArchive(items) {
        const listEl = document.getElementById('youtube-archive-list');
        if (!listEl) return;

        if (!items || items.length === 0) {
            listEl.innerHTML = `<div style="padding: 2rem; color: var(--text-secondary);">No archived videos available from the channel.</div>`;
            return;
        }

        listEl.innerHTML = '';

        items.forEach(item => {
            // Build a reliable thumbnail URL from the video ID if we have one,
            // falling back to the stored thumbnail field.
            const ytId = item.videoId || this.getYouTubeId(item.link || '');
            const safeTitle = this.escapeHtml(item.title || 'Streams of Joy Owerri service');
            const safeLink = item.link || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : 'https://www.youtube.com/@streamsofjoyowerri');
            // Use an <img> tag instead of CSS background-image to avoid CSP/CORS blocks
            const thumbHtml = ytId
                ? `<img src="https://i.ytimg.com/vi/${ytId}/hqdefault.jpg" alt="${safeTitle}" class="youtube-archive-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://img.youtube.com/vi/${ytId}/0.jpg';">`
                : `<div class="youtube-archive-thumb-fallback"><i class="ti ti-brand-youtube"></i></div>`;

            const dateStr = item.published
                ? new Date(item.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';

            const card = document.createElement('div');
            card.className = 'youtube-archive-card';
            card.innerHTML = `
                <div class="youtube-archive-thumb">
                    ${thumbHtml}
                    <div class="youtube-thumb-play"><i class="ti ti-player-play-filled"></i></div>
                </div>
                <div class="youtube-archive-info">
                    <h3>${safeTitle}</h3>
                    <p>${dateStr || 'Official YouTube archive'}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                if (ytId) {
                    this.openYouTubePlayer(ytId, item.title, safeLink, dateStr);
                } else {
                    window.open(safeLink, '_blank', 'noopener,noreferrer');
                }
            });

            listEl.appendChild(card);
        });
    },

    getLoadingSkeleton() {
        const skeletonCard = () => `
            <div class="youtube-archive-card" style="pointer-events:none;">
                <div class="youtube-archive-thumb" style="background:var(--bg-color-lighter);">
                    <div style="width:100%;height:100%;background:linear-gradient(90deg,var(--bg-color-lighter) 25%,var(--bg-color) 50%,var(--bg-color-lighter) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
                </div>
                <div class="youtube-archive-info">
                    <div style="height:1.1rem;background:var(--border-color);border-radius:4px;width:80%;margin-bottom:0.65rem;"></div>
                    <div style="height:0.9rem;background:var(--border-color);border-radius:4px;width:50%;"></div>
                </div>
            </div>`;
        return Array(4).fill('').map(skeletonCard).join('');
    },

    getYoutubeFallbackItems() {
        return [
            {
                title: 'Streams of Joy Owerri YouTube Archive',
                link: 'https://www.youtube.com/@streamsofjoyowerri',
                videoId: '',
                published: '',
                description: 'Open the official channel archive on YouTube.'
            }
        ];
    },

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    openYouTubePlayer(ytId, title, ytUrl, dateStr) {
        const overlay = document.getElementById('player-modal-overlay');
        if (!overlay) { window.open(ytUrl, '_blank', 'noopener,noreferrer'); return; }

        const videoContainer = document.getElementById('video-player-container');
        const audioContainer = document.getElementById('audio-player-container');
        if (videoContainer) {
            videoContainer.style.display = 'block';
            videoContainer.innerHTML = `<iframe
                src="https://www.youtube.com/embed/${ytId}?autoplay=1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px;"
            ></iframe>`;
        }
        if (audioContainer) audioContainer.style.display = 'none';

        const badge = document.getElementById('player-badge');
        if (badge) { badge.textContent = 'Watch Video'; badge.className = 'badge primary'; }

        const titleEl = document.getElementById('player-title');
        if (titleEl) titleEl.textContent = title;

        const speakerEl = document.getElementById('player-speaker');
        if (speakerEl) speakerEl.innerHTML = '<i class="ti ti-brand-youtube"></i> YouTube';

        const dateEl = document.getElementById('player-date');
        if (dateEl) dateEl.innerHTML = `<i class="ti ti-calendar"></i> ${dateStr || ''}`;

        const serviceEl = document.getElementById('player-service');
        if (serviceEl) serviceEl.innerHTML = '';

        const descEl = document.getElementById('player-description');
        if (descEl) descEl.textContent = '';

        const linkContainer = document.getElementById('player-video-link-container');
        if (linkContainer) linkContainer.innerHTML = `<a href="${ytUrl}" target="_blank" rel="noopener noreferrer">Open on YouTube</a>`;

        overlay.classList.add('active');
    },

    async populateSeriesFilter() {
        const sermons = await window.SermonData.getSermons();
        const combined = [...(this.syncedSermons || []), ...sermons];
        const uniqueSeries = [...new Set(combined.map(s => s.series).filter(Boolean))];
        const seriesFilter = document.getElementById('series-filter');
        if (seriesFilter) {
            seriesFilter.innerHTML = '<option value="">All Series</option>';
            uniqueSeries.forEach(series => {
                const opt = document.createElement('option');
                opt.value = series;
                opt.textContent = series;
                seriesFilter.appendChild(opt);
            });
        }
    },

    async renderSermons() {
        const localSermons = await window.SermonData.getSermons();
        const combined = [...(this.syncedSermons || []), ...localSermons];
        
        const grid = document.getElementById('sermon-grid');
        if (!grid) return;

        const search = document.getElementById('search-input')?.value.toLowerCase() || '';
        const seriesFilter = document.getElementById('series-filter')?.value || '';
        const preacherFilter = document.getElementById('preacher-filter')?.value || '';
        const serviceFilter = document.getElementById('service-filter')?.value || '';
        const mediaType = this.mediaTypeFilter || 'all';
        const activeThemes = this.selectedThemes || [];

        // Filter
        const filtered = combined.filter(s => {
            const matchesSearch = !search || 
                                  s.title.toLowerCase().includes(search) || 
                                  s.speaker.toLowerCase().includes(search) ||
                                  (s.scripture && s.scripture.toLowerCase().includes(search)) ||
                                  (s.tags && s.tags.some(t => t.toLowerCase().includes(search))) ||
                                  (s.notes && s.notes.toLowerCase().includes(search));
            
            const matchesSeries = !seriesFilter || s.series === seriesFilter;
            const matchesPreacher = !preacherFilter || s.speaker_type === preacherFilter;
            const matchesService = !serviceFilter || s.service_category === serviceFilter;
            const matchesMedia = mediaType === 'all' || s.media_type === mediaType;
            const matchesThemes = activeThemes.length === 0 || 
                                  activeThemes.every(theme => s.tags && s.tags.some(t => t.toLowerCase() === theme.toLowerCase()));

            return matchesSearch && matchesSeries && matchesPreacher && matchesService && matchesMedia && matchesThemes;
        });

        // Stats
        const totalStat = document.getElementById('stat-total');
        if (totalStat) totalStat.textContent = combined.length;
        
        const seriesStat = document.getElementById('stat-series');
        if (seriesStat) seriesStat.textContent = new Set(combined.map(s => s.series).filter(Boolean)).size;
        
        const speakersStat = document.getElementById('stat-speakers');
        if (speakersStat) speakersStat.textContent = new Set(combined.map(s => s.speaker).filter(Boolean)).size;

        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
                    <i class="ti ti-archive" style="font-size: 3.5rem; margin-bottom: 1.5rem; display: block; color: var(--border-color);"></i>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No sermons found</h3>
                    <p style="font-size: 0.95rem;">Try modifying your search queries or filter categories.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(s => {
            const card = document.createElement('div');
            card.className = `card sermon-card format-${s.media_type}`;
            if (s.isSynced) {
                card.classList.add('live-broadcast-card');
            }
            
            card.innerHTML = `
                <div class="card-media-indicator">
                    <i class="ti ti-${s.media_type === 'video' ? 'video' : 'headphones'}"></i>
                </div>
                ${s.isSynced ? `<div class="live-badge">Live Stream</div>` : ''}
                <div class="title">${s.title}</div>
                <div class="meta">
                    <i class="ti ti-user"></i> ${s.speaker}
                </div>
                <div class="meta">
                    <i class="ti ti-calendar"></i> ${s.date}
                </div>
                ${s.service_category ? `<div class="meta"><i class="ti ti-clock"></i> ${s.service_category}</div>` : ''}
                ${s.series ? `<div class="meta"><i class="ti ti-books"></i> ${s.series}</div>` : ''}
                ${s.scripture ? `<div class="meta"><i class="ti ti-book"></i> ${s.scripture}</div>` : ''}
                <div class="tags">
                    ${(s.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.openMediaPlayer(s);
            });
            
            grid.appendChild(card);
        });
    },

    openMediaPlayer(sermon) {
        const overlay = document.getElementById('player-modal-overlay');
        if (!overlay) return;

        const videoContainer = document.getElementById('video-player-container');
        const audioContainer = document.getElementById('audio-player-container');
        videoContainer.innerHTML = '';
        audioContainer.style.display = 'none';

        // Clear active audio if running
        this.activeAudio = document.getElementById('sermon-audio-element');
        if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio.src = '';
        }

        const badge = document.getElementById('player-badge');
        if (badge) {
            badge.textContent = sermon.media_type === 'video' ? 'Watch Video' : 'Audio Podcast';
            badge.className = `badge ${sermon.media_type === 'video' ? 'primary' : 'support'}`;
        }
        
        document.getElementById('player-title').textContent = sermon.title;
        document.getElementById('player-speaker').innerHTML = `<i class="ti ti-user"></i> ${sermon.speaker}`;
        document.getElementById('player-date').innerHTML = `<i class="ti ti-calendar"></i> ${sermon.date}`;
        document.getElementById('player-service').innerHTML = `<i class="ti ti-clock"></i> ${sermon.service_category || 'N/A'}`;
        document.getElementById('player-description').textContent = sermon.notes || 'No sermon notes available.';

        const linkContainer = document.getElementById('player-video-link-container');
        if (linkContainer) {
            if (sermon.media_type === 'video' && sermon.media_url) {
                const ytId = this.getYouTubeId(sermon.media_url);
                const linkUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : sermon.media_url;
                linkContainer.innerHTML = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">Open video link</a>`;
            } else {
                linkContainer.innerHTML = '';
            }
        }

        if (sermon.media_type === 'video') {
            videoContainer.style.display = 'block';
            const ytId = this.getYouTubeId(sermon.media_url);
            if (ytId) {
                videoContainer.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                `;
            } else {
                videoContainer.innerHTML = `
                    <video src="${sermon.media_url}" controls autoplay style="width: 100%; display: block;"></video>
                `;
            }
        } else {
            videoContainer.style.display = 'none';
            audioContainer.style.display = 'block';
            
            document.getElementById('audio-title').textContent = sermon.title;
            document.getElementById('audio-preacher').textContent = sermon.speaker;
            
            if (this.activeAudio) {
                this.activeAudio.src = sermon.media_url;
                this.activeAudio.load();
                
                const playBtn = document.getElementById('btn-audio-play');
                const visualizer = document.getElementById('audio-visualizer');
                const slider = document.getElementById('audio-progress-slider');
                const currentTimeText = document.getElementById('audio-current-time');
                const durationText = document.getElementById('audio-duration');
                
                playBtn.innerHTML = '<i class="ti ti-player-play"></i>';
                visualizer.classList.remove('playing');
                slider.value = 0;
                currentTimeText.textContent = '00:00';
                durationText.textContent = '00:00';

                const newPlayBtn = playBtn.cloneNode(true);
                playBtn.parentNode.replaceChild(newPlayBtn, playBtn);

                newPlayBtn.addEventListener('click', () => {
                    if (this.activeAudio.paused) {
                        this.activeAudio.play()
                            .then(() => {
                                newPlayBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
                                visualizer.classList.add('playing');
                            })
                            .catch(err => console.error("Playback error:", err));
                    } else {
                        this.activeAudio.pause();
                        newPlayBtn.innerHTML = '<i class="ti ti-player-play"></i>';
                        visualizer.classList.remove('playing');
                    }
                });

                const rewindBtn = document.getElementById('btn-audio-rewind');
                const newRewind = rewindBtn.cloneNode(true);
                rewindBtn.parentNode.replaceChild(newRewind, rewindBtn);
                newRewind.addEventListener('click', () => {
                    this.activeAudio.currentTime = Math.max(0, this.activeAudio.currentTime - 10);
                });

                const forwardBtn = document.getElementById('btn-audio-forward');
                const newForward = forwardBtn.cloneNode(true);
                forwardBtn.parentNode.replaceChild(newForward, forwardBtn);
                newForward.addEventListener('click', () => {
                    this.activeAudio.currentTime = Math.min(this.activeAudio.duration || 0, this.activeAudio.currentTime + 10);
                });

                const onLoadedMetadata = () => {
                    durationText.textContent = this.formatTime(Math.floor(this.activeAudio.duration));
                };
                const onTimeUpdate = () => {
                    const current = this.activeAudio.currentTime;
                    const dur = this.activeAudio.duration || 0;
                    currentTimeText.textContent = this.formatTime(Math.floor(current));
                    if (dur > 0) {
                        slider.value = (current / dur) * 100;
                    }
                };
                const onEnded = () => {
                    newPlayBtn.innerHTML = '<i class="ti ti-player-play"></i>';
                    visualizer.classList.remove('playing');
                    slider.value = 0;
                    currentTimeText.textContent = '00:00';
                };

                this.activeAudio.onloadedmetadata = onLoadedMetadata;
                this.activeAudio.ontimeupdate = onTimeUpdate;
                this.activeAudio.onended = onEnded;

                const newSlider = slider.cloneNode(true);
                slider.parentNode.replaceChild(newSlider, slider);
                newSlider.addEventListener('input', (e) => {
                    const pct = e.target.value;
                    const dur = this.activeAudio.duration || 0;
                    if (dur > 0) {
                        this.activeAudio.currentTime = (pct / 100) * dur;
                    }
                });
            }
        }

        overlay.classList.add('active');
    },

    closeMediaPlayer() {
        const overlay = document.getElementById('player-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }

        const videoContainer = document.getElementById('video-player-container');
        if (videoContainer) {
            videoContainer.innerHTML = '';
        }

        if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio.src = '';
            this.activeAudio.onloadedmetadata = null;
            this.activeAudio.ontimeupdate = null;
            this.activeAudio.onended = null;
        }
        
        const visualizer = document.getElementById('audio-visualizer');
        if (visualizer) {
            visualizer.classList.remove('playing');
        }
    },

    getYouTubeId(url) {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : '';
    },

    // --- Upload ---
    initUpload() {
        document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const coreThemes = Array.from(document.querySelectorAll('input[name="core-themes"]:checked')).map(cb => cb.value);
            const additionalTags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
            const tags = [...new Set([...coreThemes, ...additionalTags])];
            
            const sermon = {
                title: document.getElementById('title').value,
                speaker: document.getElementById('speaker').value,
                speaker_type: document.getElementById('speaker-type').value,
                date: document.getElementById('date').value,
                series: document.getElementById('series').value,
                service_category: document.getElementById('service-category').value,
                scripture: document.getElementById('scripture').value,
                tags: tags,
                duration_minutes: parseInt(document.getElementById('duration').value, 10) || 0,
                media_type: document.querySelector('input[name="media-type"]:checked').value,
                media_url: document.getElementById('media_url').value,
                notes: document.getElementById('notes').value
            };
            
            await window.SermonData.saveSermon(sermon);
            alert('Sermon uploaded successfully!');
            window.location.href = 'archive.html';
        });
    },

    // --- Bulletin ---
    initBulletin() {
        const form = document.getElementById('bulletin-form');
        if (!form) return;

        form.addEventListener('input', () => this.updateBulletinPreview());
        this.updateBulletinPreview();

        document.getElementById('btn-export')?.addEventListener('click', () => this.exportBulletin());
    },

    async updateBulletinPreview() {
        const preview = document.getElementById('preview-content');
        if (!preview) return;

        const churchName = document.getElementById('church-name').value || 'Church Name';
        const date = document.getElementById('date').value || 'Date';
        const title = document.getElementById('sermon-title').value || 'Sermon Title';
        const preacher = document.getElementById('preacher').value || 'Preacher Name';
        const announcements = document.getElementById('announcements').value || 'No announcements.';

        const items = await window.ServiceData.getItems();
        const orderHtml = items.map(i => `<li>${i.name} - ${i.person || ''}</li>`).join('');

        preview.innerHTML = `
            <h1>${churchName}</h1>
            <p style="text-align:center">${date}</p>
            <hr>
            <h3>Order of Service</h3>
            <ul>${orderHtml || '<li>No items scheduled</li>'}</ul>
            <hr>
            <h3>Sermon</h3>
            <p><strong>${title}</strong></p>
            <p>By ${preacher}</p>
            <hr>
            <h3>Announcements</h3>
            <p style="white-space: pre-wrap;">${announcements}</p>
        `;
    },

    exportBulletin() {
        // Using jsPDF loaded from CDN
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a5'); // A5 format

        const churchName = document.getElementById('church-name').value || 'Church Name';
        
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        doc.text(churchName, 105, 20, { align: 'center' });
        
        // Simple export implementation (for complex layout, HTML2Canvas is typically used alongside jsPDF, 
        // but since no build tools are requested, we'll manually draw text)
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text(document.getElementById('date').value || '', 105, 30, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text('Order of Service', 15, 45);
        
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        
        let y = 55;
        // Need synchronous or pre-fetched data
        window.ServiceData.getItems().then(items => {
            items.forEach(item => {
                doc.text(`• ${item.name} ${item.person ? `- ${item.person}` : ''}`, 15, y);
                y += 8;
            });
            
            y += 10;
            doc.setFontSize(16);
            doc.setFont('times', 'bold');
            doc.text('Sermon', 15, y);
            y += 10;
            
            doc.setFontSize(14);
            doc.text(document.getElementById('sermon-title').value || '', 15, y);
            y += 8;
            doc.setFontSize(12);
            doc.setFont('times', 'italic');
            doc.text(`By ${document.getElementById('preacher').value || ''}`, 15, y);
            
            y += 15;
            doc.setFontSize(16);
            doc.setFont('times', 'bold');
            doc.text('Announcements', 15, y);
            y += 10;
            
            doc.setFontSize(12);
            doc.setFont('times', 'normal');
            const splitText = doc.splitTextToSize(document.getElementById('announcements').value || '', 120);
            doc.text(splitText, 15, y);
            
            doc.save('bulletin.pdf');
        });
    },

    // --- Live Broadcast banner (YouTube API) ---
    async initLiveBroadcast() {
        const banner = document.getElementById('live-banner');
        if (!banner) return;

        const checkYouTubeLive = async () => {
            // If no API key is set, hide the banner silently
            if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
                banner.classList.remove('live-on', 'live-off');
                return;
            }

            try {
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;
                const response = await fetch(url);

                if (!response.ok) throw new Error('YouTube API error');

                const data = await response.json();
                const liveItems = data.items || [];

                banner.classList.remove('live-on', 'live-off');

                if (liveItems.length > 0) {
                    // Channel IS live — get the video ID for a direct link
                    const videoId = liveItems[0].id.videoId;
                    const liveUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    banner.innerHTML = `
                        <span class="pulse-dot"></span>
                        <strong>🔴 LIVE NOW:</strong> Streams of Joy Owerri is broadcasting live on YouTube!
                        <a href="${liveUrl}" target="_blank" rel="noopener noreferrer">Watch Live <i class="ti ti-arrow-right"></i></a>
                    `;
                    banner.classList.add('live-on');
                } else {
                    // Channel is NOT live
                    const channelUrl = `https://www.youtube.com/@streamsofjoyowerri`;
                    banner.innerHTML = `
                        <span class="static-dot"></span>
                        <span>📺 Not Currently Live &mdash; Watch our latest service recordings on <a href="${channelUrl}" target="_blank" rel="noopener noreferrer">YouTube</a></span>
                    `;
                    banner.classList.add('live-off');
                }
            } catch (error) {
                // Silently fail if API is unavailable — don't break the page
                console.warn('Live status check failed:', error);
                banner.classList.remove('live-on', 'live-off');
            }
        };

        // Check immediately, then every 5 minutes
        await checkYouTubeLive();
        setInterval(checkYouTubeLive, 5 * 60 * 1000);
    },

    // --- Prayer & Testimony Submission ---
    initPrayPage() {
        const prayerForm = document.getElementById('prayer-form');
        const testimonyForm = document.getElementById('testimony-form');

        if (prayerForm) {
            prayerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('prayer-name').value;
                const email = document.getElementById('prayer-email').value;
                const category = document.getElementById('prayer-category').value;
                const request = document.getElementById('prayer-request').value;

                // Save to local storage mock database
                const submissions = JSON.parse(localStorage.getItem('prayerRequests') || '[]');
                submissions.push({ id: Date.now(), name, email, category, request, date: new Date().toISOString() });
                localStorage.setItem('prayerRequests', JSON.stringify(submissions));

                // Show success alert
                const msg = document.createElement('div');
                msg.className = 'success-message';
                msg.innerHTML = '<i class="ti ti-circle-check"></i> Thank you! Your prayer request has been received. Our prayer team is standing with you.';
                prayerForm.prepend(msg);

                // Reset form
                prayerForm.reset();

                // Clear success message after 5 seconds
                setTimeout(() => msg.remove(), 5000);
            });
        }

        if (testimonyForm) {
            testimonyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('testimony-name').value;
                const email = document.getElementById('testimony-email').value;
                const title = document.getElementById('testimony-title').value;
                const details = document.getElementById('testimony-details').value;

                // Save to local storage mock database
                const submissions = JSON.parse(localStorage.getItem('testimonies') || '[]');
                submissions.push({ id: Date.now(), name, email, title, details, date: new Date().toISOString() });
                localStorage.setItem('testimonies', JSON.stringify(submissions));

                // Show success alert
                const msg = document.createElement('div');
                msg.className = 'success-message';
                msg.innerHTML = '<i class="ti ti-circle-check"></i> Glory to God! Your testimony has been submitted. What God cannot do does not exist!';
                testimonyForm.prepend(msg);

                // Reset form
                testimonyForm.reset();

                // Clear success message after 5 seconds
                setTimeout(() => msg.remove(), 5000);
            });
        }
    },

};

document.addEventListener('DOMContentLoaded', () => App.init());

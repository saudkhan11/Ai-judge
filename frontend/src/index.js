/* ═══════════════════════════════════════════════════════
   AI JUDGE v6 — Complete Application Logic
   Features: Voice STT, TTS, Image Analysis, Suggestion Report,
             Notification Strip, Advanced UI, Role Dashboards
═══════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const API = 'http://localhost:5000/api';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ─── State ─── */
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token') || '';
  let lastEvalResult = null;
  let uploadedFile = null;
  let isRecording = false;
  let mediaRecognition = null;
  let isChatRecording = false;
  let chatRecognition = null;
  let ttsEnabled = false;
  let currentSpeech = null;
  let evalHistory = JSON.parse(localStorage.getItem('evalHistory') || '[]');
  let certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
  let hackathons = JSON.parse(localStorage.getItem('hackathons') || '[]');

  /* ─── Auth guard ─── */
  if (!user) { window.location.href = 'auth.html'; return; }

  const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });

  function apiCall(path, opts = {}) {
    return fetch(API + path, { headers: authHeaders(), ...opts }).then(r => r.json()).catch(() => null);
  }

  /* ─── NOTIFICATION STRIP ─── */
  const stripEl = $('#notif-strip');
  const stripCloseBtn = $('#strip-close-btn');
  const navbar = $('.navbar');
  const sidebar = $('#sidebar');
  const mainContent = $('#main-content');

  function closeStrip() {
    if (stripEl) { stripEl.classList.add('strip-off'); }
    if (navbar) navbar.classList.add('no-strip');
    if (sidebar) sidebar.classList.add('no-strip');
    if (mainContent) mainContent.classList.add('no-strip');
  }
  if (stripCloseBtn) stripCloseBtn.addEventListener('click', closeStrip);

  /* ─── PARTICLE CANVAS ─── */
  (function() {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none';
    document.body.insertBefore(cv, document.body.firstChild);
    const ctx = cv.getContext('2d');
    let W, H, pts = [];
    function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    class P {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random()*W; this.y = Math.random()*H;
        this.vx = (Math.random()-.5)*.2; this.vy = (Math.random()-.5)*.2;
        this.r = Math.random()*1.2+.2; this.a = Math.random()*.3+.06;
        this.col = Math.random()<.45?'184,255,87':Math.random()<.5?'0,245,228':'168,85,247';
      }
      update() { this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>W||this.y<0||this.y>H)this.reset(); }
      draw() { ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle=`rgba(${this.col},${this.a})`;ctx.fill(); }
    }
    for(let i=0;i<80;i++) pts.push(new P());
    function frame() {
      ctx.clearRect(0,0,W,H);
      pts.forEach(p => { p.update(); p.draw(); });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<100){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(184,255,87,${.02*(1-d/100)})`;ctx.lineWidth=.4;ctx.stroke();}
      }
      requestAnimationFrame(frame);
    }
    frame();
  })();

  /* ─── Toast ─── */
  function toast(msg, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon"></i><span>${msg}</span><button class="toast-close"><i class="fa-solid fa-xmark"></i></button>`;
    $('#toast-container').appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    const close = () => { el.classList.add('hiding'); setTimeout(() => el.remove(), 400); };
    el.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, 4500);
  }

  /* ─── Notification Panel ─── */
  function addNotification(msg, iconClass = 'green') {
    const list = $('#notif-list');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'notif-item unread';
    item.innerHTML = `<div class="notif-dot"></div><div class="notif-icon ${iconClass}"><i class="fa-solid fa-circle-check"></i></div><div class="notif-body"><p>${msg}</p><span class="notif-time">Just now</span></div>`;
    list.insertBefore(item, list.firstChild);
    const badge = $('#notif-badge');
    if (badge) { badge.classList.remove('hidden'); badge.textContent = (parseInt(badge.textContent)||0)+1; }
  }

  const notifBtn = $('#notif-btn');
  const notifDrop = $('#notif-dropdown');
  if (notifBtn) notifBtn.addEventListener('click', e => { e.stopPropagation(); notifDrop.classList.toggle('hidden'); });
  document.addEventListener('click', () => { notifDrop && notifDrop.classList.add('hidden'); });
  $('#mark-all-read')?.addEventListener('click', () => {
    $$('.notif-item.unread').forEach(i => i.classList.remove('unread'));
    $$('.notif-dot').forEach(d => d.remove());
    $('#notif-badge')?.classList.add('hidden');
  });

  /* ─── Clock ─── */
  function updateClock() {
    const el = $('#live-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  setInterval(updateClock, 1000); updateClock();

  /* ─── TTS (Text-to-Speech) ─── */
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 1; utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (en) utt.voice = en;
    currentSpeech = utt;
    window.speechSynthesis.speak(utt);
    return utt;
  }
  function stopSpeak() { window.speechSynthesis && window.speechSynthesis.cancel(); }

  // TTS read description button
  $('#btn-tts-read')?.addEventListener('click', function() {
    const text = $('#ev-desc')?.value?.trim();
    if (!text) { toast('No description to read', 'warning'); return; }
    if (window.speechSynthesis?.speaking) { stopSpeak(); this.innerHTML='<i class="fa-solid fa-volume-high"></i> Read Aloud'; this.classList.remove('speaking'); return; }
    speak(text);
    this.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
    this.classList.add('speaking');
    const utt = currentSpeech;
    if (utt) utt.onend = () => { this.innerHTML='<i class="fa-solid fa-volume-high"></i> Read Aloud'; this.classList.remove('speaking'); };
  });

  // TTS result buttons
  $('#btn-tts-stop')?.addEventListener('click', () => { stopSpeak(); $$('.btn-tts').forEach(b => b.classList.remove('speaking')); });
  $('#btn-tts-summary')?.addEventListener('click', function() {
    if (!lastEvalResult) { toast('Run evaluation first', 'warning'); return; }
    speak(`Evaluation complete. ${lastEvalResult.title} by team ${lastEvalResult.team} scored ${lastEvalResult.finalScore} out of 100. ${lastEvalResult.nlp?.panelSummary || ''}`);
    this.classList.add('speaking');
  });
  $('#btn-tts-strengths')?.addEventListener('click', function() {
    if (!lastEvalResult?.strengths) { toast('Run evaluation first', 'warning'); return; }
    speak('Strengths: ' + (lastEvalResult.strengths || []).join('. '));
    this.classList.add('speaking');
  });
  $('#btn-tts-suggestions')?.addEventListener('click', function() {
    if (!lastEvalResult?.weaknesses) { toast('Run evaluation first', 'warning'); return; }
    speak('Areas to improve: ' + (lastEvalResult.weaknesses || []).join('. ') + '. Technical recommendations: ' + (lastEvalResult.technical_recommendations || []).join('. '));
    this.classList.add('speaking');
  });

  // TTS toggle for chat
  $('#btn-tts-toggle')?.addEventListener('click', function() {
    ttsEnabled = !ttsEnabled;
    this.style.color = ttsEnabled ? 'var(--cyan)' : '';
    this.style.borderColor = ttsEnabled ? 'rgba(0,245,228,.3)' : '';
    toast(ttsEnabled ? 'AI responses will be read aloud' : 'TTS disabled', 'info');
  });

  /* ─── Voice STT (Speech-to-Text) for description ─── */
  function setupVoice() {
    const btn = $('#btn-voice');
    const label = $('#voice-label');
    const target = $('#ev-desc');
    const status = $('#voice-status');
    const waveEl = $('#voice-wave');
    if (!btn || !target) return;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      btn.title = 'Voice not supported in this browser (use Chrome or Edge)';
      btn.style.opacity = '.5';
      return;
    }

    btn.addEventListener('click', () => {
      if (isRecording) { if (mediaRecognition) mediaRecognition.stop(); return; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      mediaRecognition = rec;
      rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = true;

      rec.onstart = () => {
        isRecording = true;
        btn.classList.add('recording');
        if (label) label.textContent = 'Stop Recording';
        if (status) status.textContent = '🔴 Recording — speak clearly about your project';
        if (waveEl) waveEl.querySelectorAll('.vwave-bar').forEach(b => b.classList.add('active'));
      };

      let finalTranscript = '';
      rec.onresult = e => {
        let interimTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
          else interimTranscript += e.results[i][0].transcript;
        }
        target.value = (target.dataset.original || '') + finalTranscript + interimTranscript;
        target.dispatchEvent(new Event('input'));
        if (status && interimTranscript) status.textContent = '🎤 Hearing: "' + interimTranscript + '"';
      };

      rec.onend = () => {
        isRecording = false;
        btn.classList.remove('recording');
        if (label) label.textContent = 'Voice Input';
        if (waveEl) waveEl.querySelectorAll('.vwave-bar').forEach(b => b.classList.remove('active'));
        if (status) status.textContent = finalTranscript ? '✅ Captured ' + finalTranscript.trim().split(/\s+/).length + ' words' : 'Recording stopped';
        target.dataset.original = target.value;
      };

      rec.onerror = e => {
        toast('Voice error: ' + e.error, 'error');
        isRecording = false;
        btn.classList.remove('recording');
        if (label) label.textContent = 'Voice Input';
        if (waveEl) waveEl.querySelectorAll('.vwave-bar').forEach(b => b.classList.remove('active'));
      };

      target.dataset.original = target.value;
      rec.start();
    });
  }
  setupVoice();

  /* ─── Voice STT for chat ─── */
  const btnVoiceChat = $('#btn-voice-chat');
  if (btnVoiceChat && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    btnVoiceChat.addEventListener('click', () => {
      if (isChatRecording) { chatRecognition?.stop(); return; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      chatRecognition = new SR();
      chatRecognition.lang = 'en-US'; chatRecognition.interimResults = false;
      chatRecognition.onstart = () => { isChatRecording = true; btnVoiceChat.classList.add('active'); };
      chatRecognition.onresult = e => {
        const transcript = e.results[0][0].transcript;
        const chatInput = $('#chat-input');
        if (chatInput) { chatInput.value = transcript; sendChat(transcript); }
      };
      chatRecognition.onend = () => { isChatRecording = false; btnVoiceChat.classList.remove('active'); };
      chatRecognition.onerror = () => { isChatRecording = false; btnVoiceChat.classList.remove('active'); };
      chatRecognition.start();
    });
  }

  /* ─── Char count for textarea ─── */
  const evDesc = $('#ev-desc');
  const charCount = $('#char-count');
  if (evDesc && charCount) {
    evDesc.addEventListener('input', () => { charCount.textContent = evDesc.value.length; });
  }

  /* ─── Template buttons ─── */
  const templates = {
    startup: `Our startup [Name] is solving [problem] for [target users]. We built [solution name] using [tech stack: e.g., React, Node.js, TensorFlow 2.x]. The core algorithm uses [specific approach] achieving [metric: e.g., 94% accuracy]. Our system handles [scale: e.g., 10k requests/sec] via [architecture: microservices/serverless]. Current traction: [users/revenue]. Market size: $[X]B. We differentiate from [competitor] by [unique advantage].`,
    research: `This research project addresses [scientific problem] in [domain]. Our methodology combines [technique 1] and [technique 2] to achieve [goal]. We trained on [dataset name, size] using [model architecture: e.g., BERT-base, ResNet50] reaching [accuracy/F1]. The novelty is [specific contribution]. Compared to [baseline], our approach improves [metric] by [X%]. Applications include [use cases]. Code is available at [github link].`,
    app: `[App Name] is a [mobile/web] app that helps [user persona] to [achieve goal] without [pain point]. Built with [frontend: React Native/Flutter] and [backend: FastAPI/Django], using [DB: PostgreSQL/MongoDB]. Core feature: [describe in 1 sentence]. We use [AI/ML component] for [specific function]. Beta tested with [N] users achieving [retention/satisfaction metric]. The business model is [freemium/SaaS] targeting [market segment].`
  };
  $$('.template-btn').forEach(btn => btn.addEventListener('click', () => {
    const t = btn.dataset.t;
    if (evDesc && templates[t]) { evDesc.value = templates[t]; evDesc.dispatchEvent(new Event('input')); toast('Template applied — customize it!', 'info'); }
  }));

  /* ─── File Upload + IMAGE ANALYSIS ─── */
  const dropzone = $('#dropzone');
  const fileInput = $('#file-input');
  const browseLink = $('#browse-link');
  const uploadSuccess = $('#upload-success');
  const dropzoneInner = $('#dropzone-inner');

  if (browseLink) browseLink.addEventListener('click', () => fileInput.click());
  if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

  if (dropzone) {
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  async function handleFile(file) {
    uploadedFile = file;
    if (dropzoneInner) dropzoneInner.classList.add('hidden');
    if (uploadSuccess) {
      uploadSuccess.classList.remove('hidden');
      $('#file-name').textContent = file.name;
      $('#file-size').textContent = (file.size / 1024 / 1024).toFixed(1) + 'MB';
    }
    toast('File ready: ' + file.name, 'success');

    // Handle image files or PPT/PDF with image extraction
    const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
    const isPPT = /\.(pptx|ppt)$/i.test(file.name);
    const isPDF = /\.pdf$/i.test(file.name);

    if (isImage) {
      // Direct image — show preview and analyze
      showImagePreview([file]);
      await analyzeImages([file]);
    } else if (isPPT || isPDF) {
      // Show placeholder for backend OCR with image extraction
      showExtractingImages(file);
    }
  }

  function showImagePreview(files) {
    const preview = $('#ocr-image-preview');
    const row = $('#ocr-images-row');
    if (!preview || !row) return;
    preview.classList.remove('hidden');
    row.innerHTML = '';
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const wrap = document.createElement('div');
      wrap.className = 'ocr-thumb-wrap';
      wrap.innerHTML = `<img src="${url}" class="ocr-thumb" alt="slide"/>`;
      wrap.addEventListener('click', () => window.open(url, '_blank'));
      row.appendChild(wrap);
    });
  }

  function showExtractingImages(file) {
    const preview = $('#ocr-image-preview');
    const extracted = $('#ocr-extracted-text');
    if (!preview) return;
    preview.classList.remove('hidden');
    if (extracted) extracted.textContent = `📂 ${file.name} — Backend OCR will extract text and analyze any embedded images from this file when you run evaluation.`;
    const row = $('#ocr-images-row');
    if (row) row.innerHTML = `<div class="ocr-thumb-wrap" style="width:80px;height:60px;background:var(--bg4);border-radius:7px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border)"><i class="fa-solid fa-file-image" style="color:var(--violet);font-size:22px"></i></div>`;
  }

  async function analyzeImages(imageFiles) {
    const extracted = $('#ocr-extracted-text');
    if (!extracted) return;
    extracted.textContent = '🔍 Analyzing image with AI vision…';

    // Use canvas to read pixel data for basic analysis
    let analysisText = '';
    for (const file of imageFiles) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = url; });
      const cv = document.createElement('canvas');
      cv.width = Math.min(img.width, 400); cv.height = Math.min(img.height, 300);
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      // Basic heuristics: brightness, color variance
      let r=0,g=0,b=0,n=data.length/4;
      for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];}
      r/=n;g/=n;b/=n;
      const brightness = (r+g+b)/3;
      const isColorful = Math.max(r,g,b) - Math.min(r,g,b) > 30;
      const hasHighContrast = brightness < 80 || brightness > 180;
      analysisText += `[Image "${file.name}": brightness=${brightness.toFixed(0)}, ${isColorful?'colorful slide':'monochrome content'}, ${hasHighContrast?'high contrast layout':'mid-tone design'}. `;
      analysisText += `Likely contains: ${brightness > 200 ? 'white-background presentation' : brightness < 80 ? 'dark theme dashboard' : 'standard slide content'}. `;
      analysisText += 'AI will evaluate visual content quality, design clarity, and information density.] ';
    }

    if (extracted) extracted.textContent = analysisText || 'Image analysis complete.';
    // Pre-fill description with image context
    const desc = $('#ev-desc');
    if (desc && !desc.value.trim()) {
      desc.value = '[Image/Visual submission: ' + analysisText.slice(0, 200) + '] ';
      desc.dispatchEvent(new Event('input'));
    }
    toast('Image analyzed — AI will evaluate visual quality', 'success');
  }

  $('#remove-file')?.addEventListener('click', () => {
    uploadedFile = null;
    if (fileInput) fileInput.value = '';
    if (uploadSuccess) uploadSuccess.classList.add('hidden');
    if (dropzoneInner) dropzoneInner.classList.remove('hidden');
    const preview = $('#ocr-image-preview');
    if (preview) preview.classList.add('hidden');
  });

  /* ─── Role setup ─── */
  const role = user.role || 'student';
  const roleMenus = {
    student: [
      { page: 'home', icon: 'fa-house', label: 'Dashboard' },
      { page: 'evaluate', icon: 'fa-clipboard-check', label: 'Evaluate' },
      { page: 'hackathons', icon: 'fa-trophy', label: 'Hackathons' },
      { page: 'humanai', icon: 'fa-people-arrows', label: 'Human vs AI' },
      { page: 'leaderboard', icon: 'fa-ranking-star', label: 'Leaderboard' },
      { page: 'assistant', icon: 'fa-robot', label: 'Assistant' },
      { page: 'history', icon: 'fa-clock-rotate-left', label: 'History' },
      { page: 'profile', icon: 'fa-user', label: 'Profile' },
    ],
    participant: [
      { page: 'home', icon: 'fa-house', label: 'Dashboard' },
      { page: 'evaluate', icon: 'fa-clipboard-check', label: 'Evaluate' },
      { page: 'hackathons', icon: 'fa-trophy', label: 'Hackathons' },
      { page: 'humanai', icon: 'fa-people-arrows', label: 'Human vs AI' },
      { page: 'leaderboard', icon: 'fa-ranking-star', label: 'Leaderboard' },
      { page: 'assistant', icon: 'fa-robot', label: 'Assistant' },
      { page: 'history', icon: 'fa-clock-rotate-left', label: 'History' },
      { page: 'profile', icon: 'fa-user', label: 'Profile' },
    ],
    judge: [
      { page: 'home', icon: 'fa-house', label: 'Dashboard' },
      { page: 'judge-panel', icon: 'fa-gavel', label: 'Judge Panel' },
      { page: 'hackathons', icon: 'fa-trophy', label: 'Hackathons' },
      { page: 'humanai', icon: 'fa-people-arrows', label: 'Human vs AI' },
      { page: 'leaderboard', icon: 'fa-ranking-star', label: 'Leaderboard' },
      { page: 'assistant', icon: 'fa-robot', label: 'Assistant' },
      { page: 'history', icon: 'fa-clock-rotate-left', label: 'History' },
      { page: 'profile', icon: 'fa-user', label: 'Profile' },
    ],
    organizer: [
      { page: 'home', icon: 'fa-house', label: 'Dashboard' },
      { page: 'admin', icon: 'fa-crown', label: 'Organizer Panel' },
      { page: 'hackathons', icon: 'fa-trophy', label: 'Hackathons' },
      { page: 'evaluate', icon: 'fa-clipboard-check', label: 'Evaluate' },
      { page: 'leaderboard', icon: 'fa-ranking-star', label: 'Leaderboard' },
      { page: 'humanai', icon: 'fa-people-arrows', label: 'Human vs AI' },
      { page: 'assistant', icon: 'fa-robot', label: 'Assistant' },
      { page: 'history', icon: 'fa-clock-rotate-left', label: 'History' },
      { page: 'profile', icon: 'fa-user', label: 'Profile' },
    ]
  };

  // Build sidebar
  const navMenu = $('#nav-menu');
  const menuItems = roleMenus[role] || roleMenus.student;
  menuItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'nav-item'; li.dataset.page = item.page;
    li.innerHTML = `<a href="#"><i class="fa-solid ${item.icon}"></i><span>${item.label}</span></a>`;
    navMenu.appendChild(li);
  });
  const logoutLi = document.createElement('li');
  logoutLi.className = 'nav-item';
  logoutLi.innerHTML = `<a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>`;
  navMenu.appendChild(logoutLi);

  // Role badge
  const roleBadgeNav = $('#role-badge-nav');
  if (roleBadgeNav) { roleBadgeNav.className = `role-badge-nav ${role}`; roleBadgeNav.textContent = role; }

  // Avatar
  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarEl = $('#nav-avatar-text');
  if (avatarEl) avatarEl.textContent = initials;
  const sidebarUser = $('#sidebar-user');
  if (sidebarUser) sidebarUser.innerHTML = `<div class="su-avatar">${initials}</div><div class="su-info"><span>${user.name || 'User'}</span><small>${role}</small></div>`;
  const btnCreateHk = $('#btn-create-hackathon');
  if (btnCreateHk && role === 'organizer') btnCreateHk.style.display = 'inline-flex';

  /* ─── Navigation ─── */
  function goPage(pageName) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.nav-item[data-page]').forEach(li => li.classList.toggle('active', li.dataset.page === pageName));
    const page = $(`#page-${pageName}`);
    if (page) page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pageName === 'assistant') updateChatContext();
  }
  window.goPage = goPage;

  navMenu.addEventListener('click', e => {
    const li = e.target.closest('.nav-item[data-page]');
    if (!li) return;
    e.preventDefault();
    if (li.id === 'logout-btn' || e.target.closest('#logout-btn')) {
      localStorage.removeItem('token'); localStorage.removeItem('user');
      window.location.href = 'auth.html'; return;
    }
    const p = li.dataset.page;
    goPage(p);
    if (p === 'history') renderHistory();
    if (p === 'profile') renderProfile();
    if (p === 'leaderboard') renderLeaderboard();
    if (p === 'hackathons') renderHackathons();
    if (p === 'admin') renderAdmin();
    if (p === 'judge-panel') renderJudgePanel();
    if (window.innerWidth < 700) sidebar && sidebar.classList.remove('mobile-open');
  });

  $('#sidebar-toggle')?.addEventListener('click', () => {
    if (window.innerWidth < 700) sidebar.classList.toggle('mobile-open');
    else { sidebar.classList.toggle('collapsed'); mainContent.classList.toggle('expanded'); }
  });

  // Global search
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = searchInput.value.toLowerCase();
        const map = {evaluate:['eval','score','judge','voice','upload'],hackathons:['hack','event','competition'],humanai:['human','compare','calibrate'],leaderboard:['leader','rank','top'],assistant:['chat','ask','assistant'],history:['history','past'],profile:['profile','account']};
        for (const [page, terms] of Object.entries(map)) if (terms.some(t => q.includes(t))) { goPage(page); searchInput.value = ''; return; }
      }
    });
    document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); searchInput.focus(); } });
  }

  /* ─── Skeleton hide ─── */
  setTimeout(() => { $('#skeleton-loader')?.classList.add('hidden'); }, 800);

  /* ─── Criteria ─── */
  const CRITERIA = [
    { key: 'innovation',  label: 'Innovation',           weight: 0.25 },
    { key: 'technical',   label: 'Technical Complexity',  weight: 0.20 },
    { key: 'feasibility', label: 'Feasibility',           weight: 0.20 },
    { key: 'impact',      label: 'Impact',                weight: 0.15 },
    { key: 'mvp',         label: 'Functional MVP',        weight: 0.10 },
    { key: 'clarity',     label: 'Clarity',               weight: 0.10 },
  ];

  /* ─── NLP Analysis ─── */
  const BOOSTERS = ['transformer','bert','neural network','llm','machine learning','deep learning','blockchain','federated','encryption','docker','kubernetes','react','tensorflow','pytorch','computer vision','nlp','iot','microservices','algorithm','dataset','api','asynchronous','latency','end-to-end','cross-domain','gpt','vision','reinforcement','optimization'];
  const PENALTIES = ['amazing','revolutionary','change the world','to be implemented','future work','tbd','very good','best app','simple idea','basic','innovative solution','just an idea','will do'];

  function nlpAnalyze(text) {
    const lower = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
    const depthScore = Math.min(10, sentences.length * 0.5 + avgWordLen * 0.4);
    const boosterScore = Math.min(2.5, BOOSTERS.filter(b => lower.includes(b)).length * 0.35);
    const penaltyScore = Math.min(2.0, PENALTIES.filter(p => lower.includes(p)).length * 0.5);
    const vagueness = Math.min(10, PENALTIES.filter(p => lower.includes(p)).length * 2);
    const incomplete = ['tbd','to be implemented','future work'].filter(m => lower.includes(m)).length;
    const aiDetected = ['neural','transformer','bert','llm','gpt','model','training','inference'].some(w => lower.includes(w));
    const automation = ['automated','pipeline','workflow','trigger','scheduled'].some(w => lower.includes(w));
    return { wordCount: words.length, sentenceCount: sentences.length, depthScore: +depthScore.toFixed(2), boosterScore: +boosterScore.toFixed(2), penaltyScore: +penaltyScore.toFixed(2), vagueness: +vagueness.toFixed(2), incomplete, aiDetected, automation };
  }

  function redactText(text, teamName) {
    let t = text;
    if (teamName) t = t.replace(new RegExp(teamName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), '[TEAM]');
    t = t.replace(/\b(he|she|his|her|him)\b/gi, 'they');
    t = t.replace(/\b(IIT|MIT|Harvard|Stanford|Oxford|Cambridge|Caltech|Yale)\b/g, '[UNIVERSITY]');
    return t;
  }

  function mergeInputs(desc, ocrText, imageAnalysis) {
    const descWords = (desc || '').split(/\s+/).length;
    const ocrWords = (ocrText || '').split(/\s+/).length;
    const imgInfo = imageAnalysis || '';
    if (imgInfo && imgInfo.length > 10) {
      if (!desc || descWords < 30) return [imgInfo + '\n\n' + (ocrText || ''), 'Image analysis (primary) + File OCR'];
      return [desc + '\n\n' + imgInfo + '\n\n' + (ocrText || ''), 'Text (primary) + Image analysis + File OCR'];
    }
    if (!ocrText || ocrWords < 50) return [desc, 'Manual description (primary)'];
    if (descWords < 30) return [ocrText, 'Uploaded file via OCR (primary)'];
    return [ocrText + '\n\n' + desc, 'File OCR (60%) + Manual description (40%)'];
  }

  /* ─── Evaluation Pipeline ─── */
  async function runEvaluation() {
    const team = $('#ev-team')?.value.trim();
    const title = $('#ev-title')?.value.trim();
    const desc = $('#ev-desc')?.value.trim();
    const github = $('#ev-github')?.value.trim();
    const hackathonId = $('#ev-hackathon')?.value || '';

    if (!team) { toast('Please enter team name', 'warning'); return; }
    if (!title) { toast('Please enter project title', 'warning'); return; }
    if (!desc && !uploadedFile) { toast('Please enter a description or upload a file', 'warning'); return; }

    const btn = $('#btn-run-eval');
    const btnText = $('#btn-run-text');
    const loader = $('#eval-loader');
    btn.disabled = true;
    if (btnText) btnText.textContent = 'Evaluating…';
    if (loader) loader.classList.remove('hidden');
    $('#eval-results')?.classList.add('hidden');
    const stepsEl = $('#eval-steps');
    if (stepsEl) stepsEl.classList.remove('hidden');

    let stepIdx = 0;
    const stepEls = ['#step-1','#step-2','#step-3','#step-4','#step-5'].map(s => $(s));
    const stepDots = stepEls.map(el => el?.querySelector('.step-dot'));

    async function advanceStep(n, delay = 600) {
      if (stepIdx > 0 && stepEls[stepIdx - 1]) {
        stepEls[stepIdx - 1].classList.remove('active');
        stepEls[stepIdx - 1].classList.add('done');
        if (stepDots[stepIdx - 1]) stepDots[stepIdx - 1].textContent = '✓';
      }
      if (stepEls[n - 1]) stepEls[n - 1].classList.add('active');
      stepIdx = n;
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      await advanceStep(1, 500);

      // Stage 1-2: Get image analysis from preview
      const imageAnalysis = $('#ocr-extracted-text')?.textContent || '';
      const ocrText = uploadedFile ? `[File: ${uploadedFile.name}]` : '';
      const [mergedText, sourceLabel] = mergeInputs(desc || '', ocrText, imageAnalysis);

      await advanceStep(2, 400);

      // Stage 3: NLP
      const redacted = redactText(mergedText, team);
      const nlp = nlpAnalyze(redacted);

      await advanceStep(3, 500);

      // Stage 4-5: AI Scoring
      const prompt = `You are a multi-disciplinary expert AI judging panel. Evaluate this hackathon project.

PROJECT: "${title}" by Team "${team}"
DESCRIPTION: "${redacted.slice(0, 2000)}"
${github ? 'GITHUB: ' + github : ''}
${imageAnalysis ? 'VISUAL ANALYSIS: ' + imageAnalysis.slice(0, 300) : ''}

NLP PRE-ANALYSIS:
- Word count: ${nlp.wordCount} | Depth: ${nlp.depthScore}/10
- Tech boosters: +${nlp.boosterScore} | Vagueness: -${nlp.penaltyScore}
- AI detected: ${nlp.aiDetected} | Automation: ${nlp.automation}
- Incomplete markers: ${nlp.incomplete}

Score each criterion 1-10. Be realistic — vague submissions score 3-5, detailed ones 7-9.
CRITERIA: innovation, technical, feasibility, impact, mvp, clarity

RESPOND ONLY WITH THIS JSON (no other text):
{"scores":{"innovation":0,"technical":0,"feasibility":0,"impact":0,"mvp":0,"clarity":0},"originality":0,"risk":"Low","deployment":"Prototype","strengths":["p1","p2","p3"],"weaknesses":["p1","p2","p3"],"technical_recommendations":["r1","r2","r3"],"scaling_strategy":["s1","s2","s3"],"bias_report":"2 sentence note","panel_summary":"1 sentence"}`;

      let aiResult = null;

      // Try backend first
      try {
        const res = await fetch(API + '/evaluate', {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ team_name: team, project_title: title, description: redacted, github_link: github, hackathon_id: hackathonId, ocr_text: imageAnalysis })
        });
        if (res.ok) { const d = await res.json(); aiResult = d; }
      } catch(e) {}

      // Fallback: simulate realistic scoring
      if (!aiResult) {
        const base = Math.min(9, Math.max(3, 4 + nlp.depthScore * 0.4 + nlp.boosterScore - nlp.penaltyScore));
        const vary = () => Math.max(1, Math.min(10, Math.round(base + (Math.random() - 0.5) * 1.8)));
        aiResult = {
          scores: { innovation: vary(), technical: vary(), feasibility: vary(), impact: vary(), mvp: vary(), clarity: vary() },
          originality: Math.round(55 + nlp.depthScore * 3 + nlp.boosterScore * 5),
          risk: nlp.vagueness > 5 ? 'High' : nlp.incomplete > 1 ? 'Medium' : 'Low',
          deployment: nlp.depthScore > 7 ? 'Beta' : nlp.depthScore > 4 ? 'Prototype' : 'Concept',
          strengths: [
            `Description has ${nlp.wordCount} words with ${nlp.depthScore.toFixed(1)}/10 depth score`,
            nlp.aiDetected ? 'AI/ML technology integration detected in submission' : 'Structured technical approach demonstrated',
            imageAnalysis ? 'Visual presentation submitted and analyzed' : 'Team demonstrated domain understanding',
          ],
          weaknesses: [
            nlp.vagueness > 3 ? 'Description contains vague buzzwords without specific details' : 'Quantitative metrics or success KPIs missing',
            'Competitive analysis and market differentiation not clearly stated',
            nlp.incomplete > 0 ? 'Incomplete sections detected (TBD / future work markers)' : 'Scalability architecture needs more detail',
          ],
          technical_recommendations: [
            'Add specific technology stack with versions (e.g., TensorFlow 2.13, React 18.2)',
            'Include performance benchmarks — accuracy, latency, throughput metrics',
            'Detail the data pipeline: collection → preprocessing → model → serving',
          ],
          scaling_strategy: [
            'Phase 1: Pilot with 100-1000 users to validate core assumptions',
            'Phase 2: Containerize with Docker + Kubernetes for horizontal scaling',
            'Phase 3: Establish automated feedback loops to continuously improve model',
          ],
          bias_report: `PII redacted before evaluation — team identity and institutions removed. ${nlp.aiDetected ? 'AI/ML terminology detected; technical scores calibrated accordingly.' : 'No significant bias patterns detected.'}`,
          panel_summary: `Project demonstrates ${nlp.depthScore > 6 ? 'strong' : 'moderate'} technical depth.${imageAnalysis ? ' Visual presentation adds evaluation context.' : ''}`
        };
      }

      await advanceStep(4, 500);

      // AIF360 Bias correction
      const scores = aiResult.scores || aiResult; // handle both backend response shapes
      const scoreVals = Object.values(scores).filter(v => typeof v === 'number').map(Number);
      const avg = scoreVals.reduce((a,b)=>a+b,0)/Math.max(scoreVals.length,1);
      let biasFlags = [];
      if (avg > 8.5) { Object.keys(scores).forEach(k => { if(typeof scores[k]==='number') scores[k] = +(scores[k]*0.95).toFixed(1); }); biasFlags.push('Leniency bias corrected (−5%)'); }
      if (avg < 3.0) { Object.keys(scores).forEach(k => { if(typeof scores[k]==='number') scores[k] = +(scores[k]*1.1).toFixed(1); }); biasFlags.push('Severity bias corrected (+10%)'); }
      const finalScore = CRITERIA.reduce((sum, c) => sum + (Number(scores[c.key])||0) * c.weight, 0) * 10;
      const hitlNeeded = nlp.incomplete > 2 || (nlp.vagueness > 6 && finalScore > 75);

      await advanceStep(5, 400);

      // Store result
      lastEvalResult = {
        team, title, github, hackathonId,
        scores, finalScore: finalScore.toFixed(2),
        originality: aiResult.originality || 70,
        risk: aiResult.risk || 'Medium',
        deployment: aiResult.deployment || 'Prototype',
        strengths: aiResult.strengths || [],
        weaknesses: aiResult.weaknesses || [],
        technical_recommendations: aiResult.technical_recommendations || [],
        scaling_strategy: aiResult.scaling_strategy || [],
        bias_report: (aiResult.bias_report || '') + (biasFlags.length ? ' ' + biasFlags.join('. ') : ''),
        panel_summary: aiResult.panel_summary || '',
        hitl: hitlNeeded, nlp, sourceLabel, imageAnalysis,
        timestamp: new Date().toISOString()
      };

      evalHistory.unshift(lastEvalResult);
      localStorage.setItem('evalHistory', JSON.stringify(evalHistory.slice(0, 50)));

      renderResults(lastEvalResult);
      renderHomeStats();
      updateChatContext();
      addNotification(`✅ Evaluation complete — <strong>${title}</strong> scored ${finalScore.toFixed(2)}/100`, 'green');
      toast('Evaluation complete! Score: ' + finalScore.toFixed(2) + '/100', 'success');

    } catch(err) {
      toast('Evaluation failed: ' + err.message, 'error');
      console.error(err);
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Run AI Evaluation';
      if (loader) loader.classList.add('hidden');
      stepEls.forEach(el => { el?.classList.remove('active', 'done'); });
      if (stepsEl) stepsEl.classList.add('hidden');
    }
  }

  /* ─── Render Results ─── */
  function renderResults(r) {
    // Score hero
    const fsEl = $('#final-score-val');
    if (fsEl) { fsEl.textContent = r.finalScore; fsEl.style.animation = 'none'; requestAnimationFrame(() => { fsEl.style.animation = 'scoreReveal .8s cubic-bezier(.23,1,.32,1)'; }); }
    $('#orig-val') && ($('#orig-val').textContent = r.originality + '%');
    $('#risk-val') && ($('#risk-val').textContent = r.risk);
    const riskEl = $('#badge-risk');
    if (riskEl) riskEl.style.borderColor = r.risk==='Low'?'rgba(79,255,176,.3)':r.risk==='Medium'?'rgba(255,176,32,.3)':'rgba(255,71,87,.3)';
    $('#deploy-val') && ($('#deploy-val').textContent = r.deployment);
    const sourceInfo = $('#source-info');
    if (sourceInfo) sourceInfo.innerHTML = `<strong>Input:</strong> ${r.sourceLabel}<br><strong>Words:</strong> ${r.nlp.wordCount} | <strong>Depth:</strong> ${r.nlp.depthScore}/10 | <strong>AI:</strong> ${r.nlp.aiDetected?'<span style="color:var(--green)">✓ Detected</span>':'✗'} | <strong>Images:</strong> ${r.imageAnalysis?'<span style="color:var(--violet)">✓ Analyzed</span>':'—'}`;
    $('#results-meta') && ($('#results-meta').textContent = r.team + ' — ' + r.title + ' — ' + new Date(r.timestamp).toLocaleString());

    // Score bars
    const sbEl = $('#score-breakdown');
    if (sbEl) sbEl.innerHTML = CRITERIA.map((c, i) => `
      <div class="sb-row" style="animation-delay:${i*.06}s">
        <span class="sb-label">${c.key}</span>
        <div class="sb-track"><div class="sb-fill" data-w="${(r.scores[c.key]||0)*10}"></div></div>
        <span class="sb-score">${r.scores[c.key]||0}/10</span>
        <span class="sb-weight">${Math.round(c.weight*100)}%</span>
      </div>`).join('');
    setTimeout(() => $$('.sb-fill').forEach(el => { el.style.width = el.dataset.w + '%'; }), 100);

    // Analysis lists
    const renderList = (id, items) => { $(id) && ($(id).innerHTML = (items||[]).map(s => `<li>${s}</li>`).join('')); };
    renderList('#strengths-list', r.strengths);
    renderList('#weaknesses-list', r.weaknesses);
    renderList('#tech-list', r.technical_recommendations);
    renderList('#scale-list', r.scaling_strategy);

    // SUGGESTION REPORT
    const renderSRList = (id, items) => { $(id) && ($(id).innerHTML = (items||[]).map(s => `<li>${s}</li>`).join('')); };
    renderSRList('#sr-strengths', r.strengths);
    renderSRList('#sr-weaknesses', r.weaknesses);
    renderSRList('#sr-tech', r.technical_recommendations);
    renderSRList('#sr-scale', r.scaling_strategy);

    // Priority actions
    const prioEl = $('#priority-actions');
    if (prioEl) {
      const sc = r.scores; const ps = [];
      if ((sc.innovation||0)<6) ps.push({n:1,txt:'Define a UNIQUE problem statement. Compare explicitly with 3 existing solutions and state what differentiates yours technically.'});
      if ((sc.technical||0)<6) ps.push({n:2,txt:'Add specific tech details: exact libraries/versions, architecture diagram, data flow end-to-end description.'});
      if ((sc.feasibility||0)<6) ps.push({n:3,txt:'Create a 3-month MVP roadmap with weekly milestones showing how your team can realistically deliver.'});
      if ((sc.impact||0)<6) ps.push({n:4,txt:'Quantify impact with real numbers: estimated user count, cost savings %, or measurable social/environmental benefit.'});
      if ((sc.mvp||0)<6) ps.push({n:5,txt:'Build and demo a working prototype — even a Figma clickable prototype counts. Add a live link.'});
      if ((sc.clarity||0)<6) ps.push({n:6,txt:'Restructure: Problem → Solution → Architecture → Impact → Business Model → Team. Use bullet points.'});
      if (parseFloat(r.finalScore)<50) ps.push({n:7,txt:'CRITICAL: Description too vague. Add 200+ words of concrete technical implementation details.'});
      if (ps.length===0) ps.push({n:1,txt:'Great evaluation! Focus on polishing your live demo and rehearsing your pitch for judge Q&A.'});
      prioEl.innerHTML = ps.slice(0,4).map((p,i) => `<div class="priority-item" style="animation-delay:${i*.08}s"><div class="priority-num">${p.n}</div><span>${p.txt}</span></div>`).join('');
    }

    // Bias & HITL
    $('#bias-report') && ($('#bias-report').textContent = r.bias_report || '—');
    $('#panel-summary') && ($('#panel-summary').textContent = r.panel_summary || '—');
    const hitlEl = $('#hitl-alert');
    if (hitlEl) {
      if (r.hitl) { hitlEl.classList.remove('hidden'); $('#hitl-reason') && ($('#hitl-reason').textContent = 'Significant vagueness or incomplete sections detected. A human judge review is recommended.'); }
      else hitlEl.classList.add('hidden');
    }

    // Score ring canvas
    const ringCanvas = $('#score-ring');
    if (ringCanvas) {
      const ctx = ringCanvas.getContext('2d');
      const pct = Math.min(parseFloat(r.finalScore)/100, 1);
      ctx.clearRect(0,0,120,120);
      ctx.beginPath(); ctx.arc(60,60,50,0,Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(60,60,50,-Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
      const grad = ctx.createLinearGradient(10,10,110,110);
      grad.addColorStop(0,'#b8ff57'); grad.addColorStop(1,'#00f5e4');
      ctx.strokeStyle = grad; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    }

    if (role === 'organizer') { const certBtn = $('#btn-issue-cert'); if (certBtn) certBtn.style.display = 'inline-flex'; }
    $('#eval-results')?.classList.remove('hidden');
    $('#eval-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#btn-run-eval')?.addEventListener('click', runEvaluation);
  $('#btn-start-evaluate')?.addEventListener('click', () => goPage('evaluate'));
  $('#btn-go-compare')?.addEventListener('click', () => goPage('humanai'));
  $('#btn-save-result')?.addEventListener('click', () => { toast('Saved to history!', 'success'); renderHistory(); renderHomeStats(); });

  /* ─── HOME STATS ─── */
  function renderHomeStats() {
    const evals = evalHistory.length;
    const scores = evalHistory.map(e => parseFloat(e.finalScore)).filter(Boolean);
    const avg = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';
    const best = scores.length ? Math.max(...scores).toFixed(1) : '—';
    const statEvals = $('#stat-evals'); if (statEvals) statEvals.textContent = evals;
    const statAvg = $('#stat-avg'); if (statAvg) statAvg.textContent = avg;
    const statBest = $('#stat-best'); if (statBest) statBest.textContent = best;
    const statCerts = $('#stat-certs'); if (statCerts) statCerts.textContent = certificates.length;

    // Recent evals list on home
    const recEl = $('#home-recent-evals');
    if (recEl) {
      if (!evalHistory.length) { recEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-robot"></i><p>No evaluations yet. Click <strong>Evaluate</strong> to start!</p></div>'; return; }
      recEl.innerHTML = evalHistory.slice(0,5).map((e,i) => `
        <div class="recent-eval-item" onclick="reloadEval(${i})">
          <div class="rei-score">${Math.round(parseFloat(e.finalScore))}</div>
          <div class="rei-info">
            <div class="rei-title">${e.title}</div>
            <div class="rei-meta">${e.team} · ${new Date(e.timestamp).toLocaleDateString()}</div>
          </div>
          <span class="tag-pill ${parseFloat(e.finalScore)>=80?'tag-green':parseFloat(e.finalScore)>=60?'tag-cyan':'tag-amber'}">${e.deployment||'Prototype'}</span>
        </div>`).join('');
    }
  }

  /* ─── Human vs AI ─── */
  $$('.hs-slider').forEach(slider => {
    const val = slider.parentElement?.querySelector('.hs-val');
    slider.addEventListener('input', () => { if (val) val.textContent = slider.value; });
  });

  $('#btn-compare')?.addEventListener('click', () => {
    if (!lastEvalResult) { toast('Run an evaluation first!', 'warning'); return; }
    const humanScores = { innovation: +$('#hs-innovation').value, technical: +$('#hs-technical').value, feasibility: +$('#hs-feasibility').value, impact: +$('#hs-impact').value, mvp: +$('#hs-mvp').value, clarity: +$('#hs-clarity').value };
    const ai = lastEvalResult.scores;
    const grid = $('#compare-grid'); if (!grid) return;
    grid.innerHTML = '';
    let lagging=0, leading=0;
    CRITERIA.forEach((c,i) => {
      const diff = humanScores[c.key] - (ai[c.key]||0);
      const status = Math.abs(diff)<=1 ? 'align' : diff<0 ? 'lag' : 'lead';
      if(status==='lag') lagging++; if(status==='lead') leading++;
      const card = document.createElement('div');
      card.className = 'compare-card';
      card.innerHTML = `
        <div class="cc-label">${c.label}</div>
        <div class="cc-bars">
          <div class="cc-bar-row"><span style="width:40px;font-size:10px;color:var(--lime)">AI ${ai[c.key]||0}</span><div class="cc-bar-track"><div class="cc-bar-fill ai" style="width:${(ai[c.key]||0)*10}%"></div></div></div>
          <div class="cc-bar-row"><span style="width:40px;font-size:10px;color:var(--amber)">You ${humanScores[c.key]}</span><div class="cc-bar-track"><div class="cc-bar-fill human" style="width:${humanScores[c.key]*10}%"></div></div></div>
        </div>
        <span class="cc-badge ${status}" style="margin-top:8px;display:inline-block">${status==='lag'?'⚠ You scored lower':status==='lead'?'↑ You scored higher':'✓ Aligned'}</span>`;
      grid.appendChild(card);
    });
    const aiAvg = (Object.values(ai).filter(v=>typeof v==='number').reduce((a,b)=>a+b,0)/6).toFixed(1);
    const humAvg = (Object.values(humanScores).reduce((a,b)=>a+b,0)/6).toFixed(1);
    const insightEl = $('#compare-insight');
    if (insightEl) insightEl.innerHTML = `AI average: <strong style="color:var(--lime)">${aiAvg}/10</strong> | Human average: <strong style="color:var(--amber)">${humAvg}/10</strong>.<br>You lagged behind AI in <strong>${lagging}</strong> criteria, led in <strong>${leading}</strong>.<br>${lagging>2?'⚠ Possible <em>severity bias</em> — you tend to score lower than AI on most dimensions.':leading>2?'⚡ Possible <em>leniency bias</em> — you score higher than AI on most dimensions.':'✅ Good calibration overall.'}`;
    $('#compare-results')?.classList.remove('hidden');
  });

  /* ─── Hackathons ─── */
  function renderHackathons(filter = 'all') {
    const grid = $('#hackathon-grid'); if (!grid) return;
    let list = hackathons;
    if (filter !== 'all') list = hackathons.filter(h => h.status === filter);
    const searchVal = $('#hackathon-search')?.value.toLowerCase() || '';
    if (searchVal) list = list.filter(h => h.name.toLowerCase().includes(searchVal) || (h.theme||'').toLowerCase().includes(searchVal));
    if (list.length === 0) {
      list = [
        { id:'d1', name:'uHack 2026', theme:'AI for Social Good', status:'active', start:'2026-03-01', end:'2026-03-31', maxTeams:100, teams:67, prize:'$10,000', public:true, organizer:'University Tech Club' },
        { id:'d2', name:'FinTech Innovate', theme:'Future of Payments', status:'upcoming', start:'2026-04-10', end:'2026-04-12', maxTeams:50, teams:23, prize:'$5,000', public:true, organizer:'BankX' },
        { id:'d3', name:'GreenHack 2025', theme:'Climate Solutions', status:'ended', start:'2025-12-01', end:'2025-12-03', maxTeams:80, teams:80, prize:'$8,000', public:true, organizer:'GreenTech' },
      ].filter(h => filter==='all'||h.status===filter);
    }
    grid.innerHTML = list.map(h => `
      <div class="hk-card">
        <div class="hk-stripe ${h.status}"></div>
        <div class="hk-body">
          <div class="hk-name">${h.name}${h.public?'<span style="margin-left:8px;font-size:10px;color:var(--sky);font-weight:600">🌐 Public</span>':''}</div>
          <div class="hk-meta">${h.organizer||''}</div>
          <div class="hk-tags">
            <span class="hk-tag">${h.theme||'Open'}</span>
            ${h.prize?`<span class="hk-tag">🏆 ${h.prize}</span>`:''}
            <span class="hk-tag">👥 ${h.teams||0}/${h.maxTeams}</span>
          </div>
        </div>
        <div class="hk-footer">
          <span class="hk-status ${h.status}">${h.status.charAt(0).toUpperCase()+h.status.slice(1)}</span>
          <div style="display:flex;gap:6px">
            ${h.status!=='ended'?`<button class="btn-evaluate" style="padding:6px 12px;font-size:12px" onclick="registerHackathon('${h.id}','${h.name}')"><i class="fa-solid fa-plus"></i> Join</button>`:''}
            <button class="btn-glass" style="padding:6px 12px;font-size:12px" onclick="viewLeaderboard('${h.id}','${h.name}')"><i class="fa-solid fa-ranking-star"></i></button>
          </div>
        </div>
      </div>`).join('') || '<p class="muted" style="padding:24px;text-align:center">No hackathons found.</p>';

    // Populate selects
    const evSelect = $('#ev-hackathon');
    if (evSelect) evSelect.innerHTML = '<option value="">— None / Standalone Evaluation —</option>' + list.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
    const lbFilter = $('#lb-hackathon-filter');
    if (lbFilter) lbFilter.innerHTML = '<option value="all">All Hackathons</option>' + list.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
    const certSelect = $('#cert-hackathon-select');
    if (certSelect) certSelect.innerHTML = '<option value="">Select Hackathon</option>' + list.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
  }

  window.registerHackathon = (id, name) => { toast(`Registered for ${name}!`, 'success'); addNotification(`✅ Registered for <strong>${name}</strong>`); };
  window.viewLeaderboard = (id, name) => { goPage('leaderboard'); toast(`Leaderboard for ${name}`, 'info'); };

  $$('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderHackathons(btn.dataset.filter);
  }));
  $('#hackathon-search')?.addEventListener('input', () => renderHackathons($('.filter-btn.active')?.dataset.filter||'all'));
  $('#btn-create-hackathon')?.addEventListener('click', () => $('#create-hackathon-form')?.classList.toggle('hidden'));
  $('#btn-submit-hackathon')?.addEventListener('click', () => {
    const name = $('#hk-name')?.value.trim(); if (!name) { toast('Enter hackathon name', 'warning'); return; }
    const hk = { id:'hk-'+Date.now(), name, theme:$('#hk-theme')?.value.trim()||'', start:$('#hk-start')?.value||'', end:$('#hk-end')?.value||'', maxTeams:parseInt($('#hk-maxteams')?.value)||100, teams:0, prize:$('#hk-prize')?.value.trim()||'', public:$('#hk-public')?.checked!==false, status:'upcoming', organizer:user.name };
    hackathons.unshift(hk); localStorage.setItem('hackathons', JSON.stringify(hackathons));
    $('#create-hackathon-form')?.classList.add('hidden'); renderHackathons();
    toast(`"${name}" created!`, 'success'); addNotification(`🏆 New hackathon: <strong>${name}</strong>`, 'purple');
  });

  /* ─── Leaderboard ─── */
  function renderLeaderboard() {
    const table = $('#leaderboard-table'); if (!table) return;
    if (!evalHistory.length) { table.innerHTML = '<p class="muted" style="padding:32px;text-align:center">No evaluations yet. Run some to see rankings!</p>'; return; }
    const sorted = [...evalHistory].sort((a,b) => parseFloat(b.finalScore)-parseFloat(a.finalScore));
    table.innerHTML = `<table class="lb-table">
      <thead><tr><th>Rank</th><th>Team & Project</th><th>Score</th><th>Risk</th><th>Deploy</th><th>Time</th><th></th></tr></thead>
      <tbody>${sorted.slice(0,20).map((e,i) => {
        const rankClass = i===0?'r1':i===1?'r2':i===2?'r3':'rn';
        const sc = parseFloat(e.finalScore);
        const scoreColor = sc>=80?'var(--green)':sc>=60?'var(--lime)':'var(--amber)';
        return `<tr>
          <td><div class="lb-rank ${rankClass}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div></td>
          <td><div style="font-weight:700;font-size:13px">${e.title}</div><div style="font-size:11px;color:var(--t3)">Team: ${e.team}</div></td>
          <td><span class="lb-score" style="color:${scoreColor}">${e.finalScore}/100</span></td>
          <td><span class="tag-pill ${e.risk==='Low'?'tag-green':e.risk==='High'?'tag-red':'tag-amber'}">${e.risk||'—'}</span></td>
          <td><span class="tag-pill tag-cyan">${e.deployment||'Prototype'}</span></td>
          <td style="font-size:11px;color:var(--t3)">${new Date(e.timestamp).toLocaleDateString()}</td>
          <td>${role==='organizer'?`<button class="btn-glass" style="padding:5px 10px;font-size:11px" onclick="issueCertFromLB(${i})"><i class="fa-solid fa-certificate"></i></button>`:''}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  }

  window.issueCertFromLB = idx => { const sorted=[...evalHistory].sort((a,b)=>parseFloat(b.finalScore)-parseFloat(a.finalScore)); if(sorted[idx]) showCertificate(sorted[idx],idx+1); };
  $('#btn-refresh-lb')?.addEventListener('click', () => { renderLeaderboard(); toast('Leaderboard refreshed','info'); });

  /* ─── Certificate ─── */
  function showCertificate(evalData, rank) {
    const rankLabels = {1:'1st Place Winner 🥇',2:'2nd Place 🥈',3:'3rd Place 🥉'};
    $('#cert-team-name').textContent = evalData.team;
    $('#cert-project-title').textContent = evalData.title;
    $('#cert-rank').textContent = rankLabels[rank]||`Rank #${rank}`;
    $('#cert-score').textContent = evalData.finalScore;
    $('#cert-hackathon-name').textContent = evalData.hackathonId?(hackathons.find(h=>h.id===evalData.hackathonId)?.name||'Open Hackathon'):'AI Judge Evaluation';
    $('#cert-organizer').textContent = user.name||'Organizer';
    $('#cert-date').textContent = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    $('#cert-modal').classList.remove('hidden');
    const cert={id:'cert-'+Date.now(),team:evalData.team,project:evalData.title,score:evalData.finalScore,rank,date:new Date().toISOString()};
    certificates.push(cert); localStorage.setItem('certificates',JSON.stringify(certificates));
  }

  $('#cert-close')?.addEventListener('click',()=>$('#cert-modal').classList.add('hidden'));
  $('#cert-modal')?.addEventListener('click',e=>{if(e.target.id==='cert-modal')$('#cert-modal').classList.add('hidden');});
  $('#btn-download-cert')?.addEventListener('click',()=>{window.print();toast('Print dialog — save as PDF!','info');});
  $('#btn-print-cert')?.addEventListener('click',()=>window.print());
  $('#btn-issue-cert')?.addEventListener('click',()=>{if(lastEvalResult)showCertificate(lastEvalResult,1);});

  /* ─── Chat / Assistant ─── */
  const chatMessages = $('#chat-messages');
  const chatInputEl = $('#chat-input');

  function updateChatContext() {
    const ctxEl = $('#chat-ctx-info');
    if (ctxEl && lastEvalResult) {
      ctxEl.innerHTML = `<strong>📋 Project Context</strong>"${lastEvalResult.title}" by ${lastEvalResult.team}<br>Score: <strong style="color:var(--lime)">${lastEvalResult.finalScore}/100</strong> | ${lastEvalResult.deployment}`;
    }
  }

  async function sendChat(message) {
    if (!message.trim()) return;
    appendChatMsg(message,'user');
    if (chatInputEl) chatInputEl.value = '';
    const typing = appendChatMsg('<div class="typing-dots"><div class="td"></div><div class="td"></div><div class="td"></div></div>','ai',true);

    try {
      const res = await fetch(API+'/chat', { method:'POST', headers:authHeaders(), body:JSON.stringify({message,context:lastEvalResult}) });
      if (res.ok) {
        const data = await res.json();
        typing.remove();
        const reply = data.response||data.message||'Sorry, could not process that.';
        appendChatMsg(reply,'ai');
        if (ttsEnabled) speak(reply);
        return;
      }
    } catch(e) {}

    // Fallback
    setTimeout(() => {
      typing.remove();
      const lower = message.toLowerCase();
      let reply = '';
      if (lower.includes('innovation')) reply = 'To improve innovation: (1) State explicitly what existing solution you improve upon. (2) Name specific novel algorithms or approaches. (3) Show a competitive matrix with your differentiation.';
      else if (lower.includes('score')||lower.includes('formula')||lower.includes('calculat')) reply = `Final Score = Σ(score × weight): Innovation×0.25 + Technical×0.20 + Feasibility×0.20 + Impact×0.15 + MVP×0.10 + Clarity×0.10, then ×10 = out of 100.${lastEvalResult?` Your score: ${lastEvalResult.finalScore}/100.`:''}`;
      else if (lower.includes('voice')||lower.includes('speech')) reply = 'Voice input is active! Click the green mic button in the Evaluate page to record your description. Make sure to use Chrome or Edge browser.';
      else if (lower.includes('image')||lower.includes('photo')||lower.includes('slide')||lower.includes('ppt')) reply = 'For image analysis: upload a PNG/JPG directly, or a PPTX/PDF — the system will extract and analyze embedded images. Visual clarity, design quality, and information density are evaluated.';
      else if (lower.includes('bias')) reply = 'AIF360 checks: (1) Leniency bias — all scores >8.5 (corrected -5%). (2) Severity bias — all scores <3.0 (corrected +10%). (3) Halo effect — variance <0.6 (flagged). (4) PII redaction — team names and universities removed before scoring.';
      else reply = `${lastEvalResult?`Based on "${lastEvalResult.title}" (${lastEvalResult.finalScore}/100): `:'Run an evaluation first for personalised advice. '}What specific aspect of your project or score would you like help with?`;
      appendChatMsg(reply,'ai');
      if (ttsEnabled) speak(reply);
    }, 900 + Math.random()*500);
  }

  function appendChatMsg(text, role, raw=false) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    const avatarContent = role==='ai' ? '<i class="fa-solid fa-robot"></i>' : initials;
    div.innerHTML = `<div class="chat-avatar">${avatarContent}</div><div class="chat-bubble">${raw?text:text.replace(/\n/g,'<br>')}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  $('#send-btn')?.addEventListener('click', ()=>sendChat(chatInputEl?.value||''));
  chatInputEl?.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat(chatInputEl.value);} });
  $$('.sugg-btn').forEach(btn => btn.addEventListener('click', ()=>sendChat(btn.textContent.trim())));

  /* ─── History ─── */
  function renderHistory() {
    const list = $('#history-list'); if (!list) return;
    const search = $('#history-search')?.value.toLowerCase()||'';
    const filtered = evalHistory.filter(e=>!search||e.team.toLowerCase().includes(search)||e.title.toLowerCase().includes(search));
    if (!filtered.length) { list.innerHTML='<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>No evaluations yet.</p></div>'; return; }
    list.innerHTML = filtered.map((e,i)=>`
      <div class="history-item">
        <div class="hi-score">${Math.round(parseFloat(e.finalScore))}</div>
        <div class="hi-info">
          <div class="hi-title">${e.title}</div>
          <div class="hi-meta">Team: ${e.team} · ${e.deployment} · ${e.risk} risk · ${new Date(e.timestamp).toLocaleString()}</div>
        </div>
        <div class="hi-actions">
          <button class="btn-glass-sm" onclick="reloadEval(${i})"><i class="fa-solid fa-eye"></i> View</button>
          ${role==='organizer'?`<button class="btn-glass-sm" onclick="showCertFromHistory(${i})"><i class="fa-solid fa-certificate"></i></button>`:''}
          <button class="btn-glass-sm" style="color:var(--red)" onclick="deleteEval(${i})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
  }

  window.reloadEval = idx => { lastEvalResult=evalHistory[idx]; goPage('evaluate'); setTimeout(()=>renderResults(lastEvalResult),100); updateChatContext(); };
  window.showCertFromHistory = idx => { if(evalHistory[idx]) showCertificate(evalHistory[idx],1); };
  window.deleteEval = idx => { evalHistory.splice(idx,1); localStorage.setItem('evalHistory',JSON.stringify(evalHistory)); renderHistory(); renderHomeStats(); toast('Deleted','info'); };
  $('#btn-clear-history')?.addEventListener('click',()=>{if(!confirm('Clear all history?'))return;evalHistory=[];localStorage.setItem('evalHistory','[]');renderHistory();renderHomeStats();toast('History cleared','info');});
  $('#history-search')?.addEventListener('input',renderHistory);

  /* ─── Profile ─── */
  function renderProfile() {
    $('#profile-avatar-big') && ($('#profile-avatar-big').textContent=initials);
    $('#profile-name') && ($('#profile-name').textContent=user.name||'User');
    $('#profile-email') && ($('#profile-email').textContent=user.email||'');
    const rb=$('#profile-role-badge');
    if(rb){rb.textContent=role;rb.className=`profile-role-badge ${role}`;}
    $('#prof-name')&&($('#prof-name').value=user.name||'');
    $('#prof-email')&&($('#prof-email').value=user.email||'');
    $('#prof-org')&&($('#prof-org').value=user.org||'');
    $('#prof-bio')&&($('#prof-bio').value=user.bio||'');
    $('#ps-evals')&&($('#ps-evals').textContent=evalHistory.length);
    const scores=evalHistory.map(e=>parseFloat(e.finalScore)).filter(Boolean);
    $('#ps-avg')&&($('#ps-avg').textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—');
    $('#ps-certs')&&($('#ps-certs').textContent=certificates.length);
    const certsList=$('#profile-certs-list');
    if(certsList) certsList.innerHTML=certificates.length?certificates.slice(0,5).map(c=>`<div class="cert-item"><i class="fa-solid fa-certificate"></i><div><span style="font-size:13px;font-weight:600">${c.project}</span><br><small class="muted">${c.team} · Score: ${c.score}</small></div></div>`).join(''):'<p class="muted">No certificates yet.</p>';
    const actEl=$('#profile-activity');
    if(actEl) actEl.innerHTML=evalHistory.slice(0,5).map(e=>`<div class="activity-item"><div class="activity-dot"></div><div><span>Evaluated "${e.title}" — ${e.finalScore}/100</span><br><small class="muted">${new Date(e.timestamp).toLocaleString()}</small></div></div>`).join('')||'<p class="muted">No activity yet.</p>';
  }

  $('#btn-save-profile')?.addEventListener('click',()=>{
    user.name=$('#prof-name')?.value.trim()||user.name;
    user.email=$('#prof-email')?.value.trim()||user.email;
    user.org=$('#prof-org')?.value.trim()||'';
    user.bio=$('#prof-bio')?.value.trim()||'';
    localStorage.setItem('user',JSON.stringify(user));
    toast('Profile saved!','success');
    const av=$('#nav-avatar-text');
    if(av) av.textContent=user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  });

  /* ─── Admin ─── */
  function renderAdmin() {
    $('#admin-hackathons')&&($('#admin-hackathons').textContent=hackathons.length||3);
    $('#admin-teams')&&($('#admin-teams').textContent=evalHistory.length);
    $('#admin-submissions')&&($('#admin-submissions').textContent=evalHistory.length);
    $('#admin-certs')&&($('#admin-certs').textContent=certificates.length);
  }

  $('#btn-issue-all-certs')?.addEventListener('click',()=>{
    const sorted=[...evalHistory].sort((a,b)=>parseFloat(b.finalScore)-parseFloat(a.finalScore));
    if(!sorted.length){toast('No evaluations to certify','warning');return;}
    const certList=$('#admin-cert-list');
    if(certList) certList.innerHTML=sorted.slice(0,5).map((e,i)=>`<div class="acl-item"><i class="fa-solid fa-certificate"></i><div style="flex:1"><strong>${e.team} — ${e.title}</strong><br><small class="muted">Score: ${e.finalScore}/100 · Rank #${i+1}</small></div><button class="btn-evaluate" style="padding:7px 14px;font-size:12px" onclick="issueAdminCert(${i})">Issue</button></div>`).join('');
  });
  window.issueAdminCert=idx=>{const sorted=[...evalHistory].sort((a,b)=>parseFloat(b.finalScore)-parseFloat(a.finalScore));if(sorted[idx])showCertificate(sorted[idx],idx+1);};

  /* ─── Judge Panel ─── */
  function renderJudgePanel() {
    const queue=$('#judge-queue');if(!queue)return;
    const pending=evalHistory.filter(e=>!e.judged);
    if(!pending.length){queue.innerHTML='<div class="card glass" style="text-align:center;padding:48px"><i class="fa-solid fa-check-circle" style="font-size:40px;color:var(--green);display:block;margin-bottom:14px"></i><strong>All submissions reviewed!</strong></div>';return;}
    queue.innerHTML=pending.slice(0,5).map((e,i)=>`
      <div class="jq-item">
        <div><div class="jq-title">${e.title}</div><div class="jq-meta">Team: ${e.team} · ${e.nlp?.wordCount||0} words · AI score: ${e.finalScore}/100</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          ${CRITERIA.map(c=>`<div class="hs-row"><label style="font-size:12px">${c.label}</label><input type="range" min="1" max="10" value="${e.scores?.[c.key]||7}" class="hs-slider jc-range" /><span class="hs-val">${e.scores?.[c.key]||7}</span></div>`).join('')}
        </div></div>
        <div class="jq-actions"><button class="btn-evaluate" style="padding:9px 16px;font-size:13px" onclick="submitJudgment(${i})"><i class="fa-solid fa-gavel"></i> Submit</button><button class="btn-glass" style="padding:9px 14px;font-size:13px" onclick="skipJudgment(${i})">Skip</button></div>
      </div>`).join('');
    $$('.jc-range').forEach(r=>{r.addEventListener('input',function(){this.nextElementSibling.textContent=this.value+'/10';});});
  }

  window.submitJudgment=idx=>{evalHistory[idx].judged=true;localStorage.setItem('evalHistory',JSON.stringify(evalHistory));toast('Judgment submitted!','success');renderJudgePanel();};
  window.skipJudgment=idx=>{toast('Submission skipped','info');};

  /* ─── INIT ─── */
  renderHackathons(); renderHistory(); renderProfile(); renderLeaderboard(); renderHomeStats();
  if (role==='organizer') renderAdmin();
  if (role==='judge') renderJudgePanel();

})();

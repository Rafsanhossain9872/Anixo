import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './aniko-player.css';

/**
 * AnikoPlayer — Full-featured custom HLS player ported from the Aniko vanilla JS player.
 * Drop-in replacement for PlyrPlayer with the same prop interface.
 */
const AnikoPlayer = React.forwardRef(({
  src,
  type,
  poster,
  subtitles = [],
  onEnded,
  onTimeUpdate,
  onReady,
  onPlay,
  onPause,
  onSeeked,
  initialTime = 0,
  className,
  skipTimes,
  disableControls = false,
  availableStreams = [],
  currentStreamIndex = 0,
  onStreamChange = null
}, ref) => {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const cleanupRef = useRef(null);

  // Keep latest callbacks in a ref to avoid reinitializing
  const callbacksRef = useRef({ onEnded, onReady, onTimeUpdate, onPlay, onPause, onSeeked });
  useEffect(() => {
    callbacksRef.current = { onEnded, onReady, onTimeUpdate, onPlay, onPause, onSeeked };
  }, [onEnded, onReady, onTimeUpdate, onPlay, onPause, onSeeked]);

  // Keep skipTimes in a ref
  const skipTimesRef = useRef(skipTimes);
  useEffect(() => {
    skipTimesRef.current = skipTimes;
  }, [skipTimes]);

  // Expose imperative handle (same API as PlyrPlayer)
  React.useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time) => { if (videoRef.current) videoRef.current.currentTime = time; },
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    get paused() { return videoRef.current?.paused ?? true; }
  }));

  // Main initialization effect
  useEffect(() => {
    if (!src || !videoRef.current || !rootRef.current) return;

    const root = rootRef.current;
    const video = videoRef.current;
    const $ = (cls) => root.querySelector(`.${cls}`);

    // ─── DOM References ─────────────────────────────────────
    const wrapper = $('ap-player-wrapper');
    const clickArea = $('ap-click-area');
    const overlayLoading = $('ap-overlay-loading');
    const overlayError = $('ap-overlay-error');
    const errorMessage = $('ap-error-message');
    const retryBtn = $('ap-retry-btn');
    const centerIndicator = $('ap-center-indicator');
    const ciPlay = $('ap-ci-play');
    const ciPause = $('ap-ci-pause');
    const _topBar = $('ap-top-bar');
    const videoTitle = $('ap-video-title');
    const skipIntroBtn = $('ap-skip-intro-btn');
    const skipOutroBtn = $('ap-skip-outro-btn');
    const dtLeft = $('ap-dt-left');
    const dtRight = $('ap-dt-right');
    const _controls = $('ap-controls');
    const seekContainer = $('ap-seek-container');
    const seekBuffered = $('ap-seek-buffered');
    const seekPlayed = $('ap-seek-played');
    const seekThumb = $('ap-seek-thumb');
    const seekTooltip = $('ap-seek-tooltip');
    const seekHlIntro = $('ap-seek-hl-intro');
    const seekHlOutro = $('ap-seek-hl-outro');
    const timeDisplay = $('ap-time-display');
    const btnPlay = $('ap-btn-play');
    const iconPlay = $('ap-icon-play');
    const iconPause = $('ap-icon-pause');
    const btnMute = $('ap-btn-mute');
    const iconVolHigh = $('ap-icon-vol-high');
    const iconVolLow = $('ap-icon-vol-low');
    const iconVolMute = $('ap-icon-vol-mute');
    const btnServers = $('ap-btn-servers');
    const menuServers = $('ap-menu-servers');
    const btnSpeed = $('ap-btn-speed');
    const speedLabel = $('ap-speed-label');
    const menuSpeed = $('ap-menu-speed');
    const speedOptions = $('ap-speed-options');
    const btnSettings = $('ap-btn-settings');
    const menuSettings = $('ap-menu-settings');
    const panelMain = $('ap-panel-main');
    const panelQuality = $('ap-panel-quality');
    const panelAutoSkip = $('ap-panel-autoskip');
    const btnOpenQuality = $('ap-btn-open-quality');
    const btnOpenAutoSkip = $('ap-btn-open-autoskip');
    const btnBackQuality = $('ap-btn-back-quality');
    const btnBackAutoSkip = $('ap-btn-back-autoskip');
    const valQuality = $('ap-val-quality');
    const valAutoSkip = $('ap-val-autoskip');
    const qualityOptions = $('ap-quality-options');
    const qualityBadge = $('ap-quality-badge');
    const subOptions = $('ap-sub-options');
    const panelSubs = $('ap-panel-subs');
    const btnOpenSubs = $('ap-btn-open-subs');
    const btnBackSubs = $('ap-btn-back-subs');
    const valSubs = $('ap-val-subs');
    const btnAutoSkipOn = $('ap-btn-autoskip-on');
    const btnAutoSkipOff = $('ap-btn-autoskip-off');
    const btnFullscreen = $('ap-btn-fullscreen');
    const iconExpand = $('ap-icon-expand');
    const iconCompress = $('ap-icon-compress');
    const btnOpenSubSettings = $('ap-btn-open-sub-settings');
    const panelSubSettings = $('ap-panel-sub-settings');
    const btnBackSubSettings = $('ap-btn-back-sub-settings');
    const subSettingsOptions = $('ap-sub-settings-options');
    const btnRewind = $('ap-btn-rewind');
    const btnForward = $('ap-btn-forward');
    const btnOpenVolBoost = $('ap-btn-open-volboost');
    const panelVolBoost = $('ap-panel-volboost');
    const btnBackVolBoost = $('ap-btn-back-volboost');
    const valVolBoost = $('ap-val-volboost');
    const volBoostSlider = $('ap-volboost-slider');
    const volBoostValue = $('ap-volboost-value');
    const volBoostFill = $('ap-volboost-fill');
    const volBoostPresets = root.querySelectorAll('.ap-volboost-preset');
    const previewText = $('ap-ss-preview-text');

    // ─── State ──────────────────────────────────────────────
    let hls = null;
    let controlsTimer = null;
    let isSeeking = false;
    let savedVolume = 1;
    let activeMenu = null;
    let _currentSpeed = 1;
    let currentQualityLevel = -1;
    let activeSubTrack = -1;
    let savedSubLang = localStorage.getItem('aniko_sub_lang');
    let isAutoSkip = localStorage.getItem('aniko_autoskip') === 'true';
    let subColor = localStorage.getItem('aniko_sub_color') || '#ffffff';
    let subBg = localStorage.getItem('aniko_sub_bg') || 'rgba(0, 0, 0, 0.75)';
    let subSize = localStorage.getItem('aniko_sub_size') || 'clamp(10px, 2.5vw, 18px)';
    let subFont = localStorage.getItem('aniko_sub_font') || "'Inter', sans-serif";
    let subShadow = localStorage.getItem('aniko_sub_shadow') || 'none';

    // ─── Volume Enhancement (Web Audio API) ──────────────────
    let audioCtx = null;
    let gainNode = null;
    let mediaSourceNode = null;
    let currentBoost = parseFloat(localStorage.getItem('aniko_vol_boost')) || 100;

    function initAudioContext() {
      if (audioCtx) return; // Already initialized
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mediaSourceNode = audioCtx.createMediaElementSource(video);
        gainNode = audioCtx.createGain();
        mediaSourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        applyVolumeBoost(currentBoost);
      } catch (err) {
        console.warn('[AnikoPlayer] Failed to init AudioContext for volume boost:', err);
      }
    }

    function applyVolumeBoost(pct) {
      currentBoost = pct;
      if (gainNode) {
        gainNode.gain.value = pct / 100;
      }
      localStorage.setItem('aniko_vol_boost', String(pct));

      // Update UI elements
      if (volBoostSlider) volBoostSlider.value = pct;
      if (volBoostValue) volBoostValue.textContent = pct + '%';
      if (volBoostFill) volBoostFill.style.width = ((pct - 100) / 500) * 100 + '%';
      if (valVolBoost) valVolBoost.textContent = pct <= 100 ? 'Off' : pct + '%';

      // Update preset button active states
      volBoostPresets?.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.val) === pct);
      });
    }

    // Initialize audio context on first user interaction with volume boost
    function ensureAudioContext() {
      if (!audioCtx) {
        initAudioContext();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    // Event listener cleanup tracker
    const listeners = [];
    const addListener = (el, evt, handler, opts) => {
      if (!el) return;
      el.addEventListener(evt, handler, opts);
      listeners.push({ el, evt, handler, opts });
    };

    function applySubtitleSettings() {
      root.style.setProperty('--sub-color', subColor);
      root.style.setProperty('--sub-bg', subBg);
      root.style.setProperty('--sub-size', subSize);
      root.style.setProperty('--sub-font', subFont);
      root.style.setProperty('--sub-shadow', subShadow);

      if (subSettingsOptions) {
        subSettingsOptions.querySelectorAll('.sub-opt-color').forEach(b => b.classList.toggle('active', b.dataset.val === subColor));
        subSettingsOptions.querySelectorAll('.sub-opt-bg').forEach(b => b.classList.toggle('active', b.dataset.val === subBg));
        subSettingsOptions.querySelectorAll('.sub-opt-size').forEach(b => b.classList.toggle('active', b.dataset.val === subSize));
        subSettingsOptions.querySelectorAll('.sub-opt-font').forEach(b => b.classList.toggle('active', b.dataset.val === subFont));
        subSettingsOptions.querySelectorAll('.sub-opt-shadow').forEach(b => b.classList.toggle('active', b.dataset.val === subShadow));
      }

      if (previewText) {
        previewText.style.color = subColor;
        previewText.style.background = subBg;
        previewText.style.fontSize = subSize;
        previewText.style.fontFamily = subFont;
        previewText.style.textShadow = subShadow;
      }
    }
    applySubtitleSettings();

    // ─── Utilities ──────────────────────────────────────────
    function formatTime(s) {
      if (!isFinite(s) || s < 0) return '0:00';
      s = Math.floor(s);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0)
        return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      return `${m}:${String(sec).padStart(2, '0')}`;
    }

    function showLoading() {
      if (isSeeking) return;
      overlayLoading?.classList.remove('ap-hidden');
      overlayError?.classList.add('ap-hidden');
    }

    function hideLoading() {
      overlayLoading?.classList.add('ap-hidden');
    }

    function showError(msg) {
      overlayLoading?.classList.add('ap-hidden');
      overlayError?.classList.remove('ap-hidden');
      if (errorMessage) errorMessage.textContent = msg || 'Stream unavailable';
    }

    // ─── Controls Visibility ────────────────────────────────
    function showControls() {
      wrapper?.classList.add('controls-visible');
      wrapper?.classList.remove('controls-hidden');
      clearTimeout(controlsTimer);
      controlsTimer = setTimeout(hideControls, 3000);
    }

    function hideControls() {
      if (activeMenu) return;
      if (overlayLoading && !overlayLoading.classList.contains('ap-hidden')) return;
      wrapper?.classList.remove('controls-visible');
      wrapper?.classList.add('controls-hidden');
    }

    let lastTap = 0;
    let isTouchDevice = false;

    addListener(wrapper, 'mousemove', () => {
      if (isTouchDevice && Date.now() - lastTap < 500) return;
      showControls();
    });

    addListener(wrapper, 'mouseleave', () => {
      clearTimeout(controlsTimer);
      controlsTimer = setTimeout(hideControls, 1000);
    });

    addListener(clickArea, 'touchstart', (e) => {
      isTouchDevice = true;
      const now = Date.now();
      if (now - lastTap < 300) {
        const rect = clickArea.getBoundingClientRect();
        const x = e.touches[0].clientX;
        if (x < rect.width / 2) {
          video.currentTime = Math.max(0, video.currentTime - 10);
          dtLeft?.classList.remove('animate');
          void dtLeft?.offsetWidth;
          dtLeft?.classList.add('animate');
        } else {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          dtRight?.classList.remove('animate');
          void dtRight?.offsetWidth;
          dtRight?.classList.add('animate');
        }
        e.preventDefault();
      } else {
        if (wrapper?.classList.contains('controls-visible')) {
          hideControls();
        } else {
          showControls();
        }
      }
      lastTap = now;
    });

    // ─── Click Area → Play/Pause ────────────────────────────
    addListener(clickArea, 'click', () => {
      if (isTouchDevice) return;
      togglePlay();
    });

    function togglePlay() {
      if (disableControls) return;
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    function flashIndicator(isPlaying) {
      ciPlay?.classList.toggle('ap-hidden', isPlaying);
      ciPause?.classList.toggle('ap-hidden', !isPlaying);
      centerIndicator?.classList.remove('flash');
      void centerIndicator?.offsetWidth;
      centerIndicator?.classList.add('flash');
    }

    // ─── Play / Pause Button ────────────────────────────────
    addListener(btnPlay, 'click', (e) => {
      e.stopPropagation();
      togglePlay();
    });

    // ─── Skip 10s Buttons ───────────────────────────────────
    addListener(btnRewind, 'click', (e) => {
      e.stopPropagation();
      video.currentTime = Math.max(0, video.currentTime - 10);
      showControls();
    });

    addListener(btnForward, 'click', (e) => {
      e.stopPropagation();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      showControls();
    });

    // ─── Video Events ───────────────────────────────────────
    addListener(video, 'play', () => {
      iconPlay?.classList.add('ap-hidden');
      iconPause?.classList.remove('ap-hidden');
      flashIndicator(true);
      showControls();
      callbacksRef.current.onPlay?.();
    });

    addListener(video, 'pause', () => {
      iconPlay?.classList.remove('ap-hidden');
      iconPause?.classList.add('ap-hidden');
      flashIndicator(false);
      showControls();
      clearTimeout(controlsTimer);
      callbacksRef.current.onPause?.();
    });

    addListener(video, 'ended', () => {
      callbacksRef.current.onEnded?.();
    });

    addListener(video, 'seeked', () => {
      callbacksRef.current.onSeeked?.(video.currentTime);
    });

    // ─── SmartStreamGuard ───────────────────────────────────
    const SmartStreamGuard = {
      loadTimer: null,
      stallTimer: null,
      isSwitching: false,

      showNotice(msg) {
        let notice = wrapper?.querySelector('.ap-stream-guard-notice');
        if (!notice) {
          notice = document.createElement('div');
          notice.className = 'ap-stream-guard-notice';
          wrapper?.appendChild(notice);
        }
        notice.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff4d4f;box-shadow:0 0 10px #ff4d4f;animation:ap-secPulse 1.2s infinite;"></span><span>${msg}</span>`;
        notice.style.opacity = '1';
        notice.style.transform = 'translateY(0)';
        clearTimeout(notice.hideTimer);
        notice.hideTimer = setTimeout(() => {
          notice.style.opacity = '0';
          notice.style.transform = 'translateY(-10px)';
        }, 5000);
      },

      clearTimers() {
        if (this.loadTimer) { clearTimeout(this.loadTimer); this.loadTimer = null; }
        if (this.stallTimer) { clearTimeout(this.stallTimer); this.stallTimer = null; }
      },

      startMonitor() {
        this.clearTimers();
        this.isSwitching = false;
        this.loadTimer = setTimeout(() => {
          if (!video.currentTime && video.paused) {
            this.showNotice('⚡ Stream loading timed out. Please retry or switch server.');
          }
        }, 15000);
      },

      onWaiting() {
        if (this.isSwitching) return;
        if (!this.stallTimer) {
          this.stallTimer = setTimeout(() => {
            this.showNotice('🔄 Stream buffer stalled. Please check your connection.');
            this.stallTimer = null;
          }, 15000);
        }
      },

      onPlaying() {
        this.clearTimers();
        this.isSwitching = false;
      }
    };

    addListener(video, 'waiting', () => {
      showLoading();
      SmartStreamGuard.onWaiting();
    });

    addListener(video, 'playing', () => {
      hideLoading();
      SmartStreamGuard.onPlaying();
    });

    addListener(video, 'canplay', () => {
      hideLoading();
      SmartStreamGuard.onPlaying();
    });

    // ─── Seek Bar ───────────────────────────────────────────
    function updateSeek() {
      if (isSeeking || !video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      if (seekPlayed) seekPlayed.style.width = pct + '%';
      if (seekThumb) seekThumb.style.left = pct + '%';
      if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }

    function updateBuffer() {
      if (!video.duration || !video.buffered.length) return;
      const end = video.buffered.end(video.buffered.length - 1);
      if (seekBuffered) seekBuffered.style.width = (end / video.duration) * 100 + '%';
    }

    function checkSkipButtons() {
      const st = skipTimesRef.current;
      if (!st) return;
      const t = video.currentTime;

      // Convert skipTimes format: { op: [start, end], ed: [start, end] }
      const introTime = st.op ? { start: st.op[0], end: st.op[1] } : null;
      const outroTime = st.ed ? { start: st.ed[0], end: st.ed[1] } : null;

      if (introTime && introTime.end > 0) {
        const inIntro = t >= introTime.start && t < introTime.end;
        if (inIntro && isAutoSkip) {
          video.currentTime = introTime.end;
          return;
        }
        if (!inIntro && skipIntroBtn) skipIntroBtn.dataset.used = 'false';
        const shouldShow = inIntro && skipIntroBtn?.dataset.used !== 'true';
        skipIntroBtn?.classList.toggle('ap-hidden', !shouldShow);
        skipIntroBtn?.classList.toggle('visible', shouldShow);
      }

      if (outroTime && outroTime.end > 0) {
        const inOutro = t >= outroTime.start && t < outroTime.end;
        if (inOutro && isAutoSkip) {
          video.currentTime = outroTime.end;
          return;
        }
        if (!inOutro && skipOutroBtn) skipOutroBtn.dataset.used = 'false';
        const shouldShow = inOutro && skipOutroBtn?.dataset.used !== 'true';
        skipOutroBtn?.classList.toggle('ap-hidden', !shouldShow);
        skipOutroBtn?.classList.toggle('visible', shouldShow);
      }
    }

    function updateHighlights() {
      if (!video.duration) return;
      const st = skipTimesRef.current;
      if (!st) return;

      if (st.op && seekHlIntro) {
        const startPct = (st.op[0] / video.duration) * 100;
        const endPct = (st.op[1] / video.duration) * 100;
        seekHlIntro.style.left = startPct + '%';
        seekHlIntro.style.width = (endPct - startPct) + '%';
        seekHlIntro.classList.remove('ap-hidden');
      }

      if (st.ed && seekHlOutro) {
        const startPct = (st.ed[0] / video.duration) * 100;
        const endPct = (st.ed[1] / video.duration) * 100;
        seekHlOutro.style.left = startPct + '%';
        seekHlOutro.style.width = (endPct - startPct) + '%';
        seekHlOutro.classList.remove('ap-hidden');
      }
    }

    addListener(video, 'timeupdate', () => {
      updateSeek();
      checkSkipButtons();
      callbacksRef.current.onTimeUpdate?.(video.currentTime);
    });

    addListener(video, 'progress', updateBuffer);
    addListener(video, 'durationchange', updateHighlights);
    addListener(video, 'loadedmetadata', updateHighlights);

    // Seek interaction
    function startSeek(e) {
      e.preventDefault();
      isSeeking = true;
      doSeek(e);
      const moveHandler = (ev) => doSeek(ev);
      const upHandler = () => {
        isSeeking = false;
        if (video.readyState < 3) showLoading();
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', upHandler);
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      document.addEventListener('touchmove', moveHandler, { passive: false });
      document.addEventListener('touchend', upHandler);
    }

    function doSeek(e) {
      if (!seekContainer) return;
      const rect = seekContainer.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (seekPlayed) seekPlayed.style.width = pct * 100 + '%';
      if (seekThumb) seekThumb.style.left = pct * 100 + '%';
      video.currentTime = pct * (video.duration || 0);
      if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }

    addListener(seekContainer, 'mousedown', startSeek);
    addListener(seekContainer, 'touchstart', startSeek, { passive: false });

    // Seek tooltip on hover
    addListener(seekContainer, 'mousemove', (e) => {
      if (!seekContainer) return;
      const rect = seekContainer.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * (video.duration || 0);
      if (seekTooltip) {
        seekTooltip.textContent = formatTime(time);
        seekTooltip.style.left = pct * 100 + '%';
      }
    });

    // ─── Volume ─────────────────────────────────────────────
    function updateVolumeIcon() {
      const v = video.volume;
      const m = video.muted;
      iconVolHigh?.classList.add('ap-hidden');
      iconVolLow?.classList.add('ap-hidden');
      iconVolMute?.classList.add('ap-hidden');
      if (m || v === 0) iconVolMute?.classList.remove('ap-hidden');
      else if (v < 0.5) iconVolLow?.classList.remove('ap-hidden');
      else iconVolHigh?.classList.remove('ap-hidden');
    }

    addListener(btnMute, 'click', (e) => {
      e.stopPropagation();
      if (video.muted) {
        video.muted = false;
        video.volume = savedVolume || 1;
      } else {
        savedVolume = video.volume;
        video.muted = true;
      }
      updateVolumeIcon();
    });

    // ─── Fullscreen ─────────────────────────────────────────
    function toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        wrapper?.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch(() => {});
      }
    }

    addListener(btnFullscreen, 'click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });

    const fullscreenChangeHandler = () => {
      const fs = !!document.fullscreenElement;
      iconExpand?.classList.toggle('ap-hidden', fs);
      iconCompress?.classList.toggle('ap-hidden', !fs);
      if (!fs && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);

    // ─── Dropdown Menus ─────────────────────────────────────
    function toggleMenu(menu) {
      if (activeMenu && activeMenu !== menu) {
        activeMenu.classList.add('ap-hidden');
      }
      const isHidden = menu?.classList.contains('ap-hidden');
      menu?.classList.toggle('ap-hidden');
      activeMenu = isHidden ? menu : null;
    }

    function closeAllMenus() {
      [menuServers, menuSpeed, menuSettings].forEach((m) => m?.classList.add('ap-hidden'));
      if (panelMain) {
        panelMain.classList.remove('ap-hidden');
        panelQuality?.classList.add('ap-hidden');
        panelAutoSkip?.classList.add('ap-hidden');
        panelSubs?.classList.add('ap-hidden');
        panelSubSettings?.classList.add('ap-hidden');
        panelVolBoost?.classList.add('ap-hidden');
      }
      activeMenu = null;
    }

    // Settings sub-panel navigation
    addListener(btnOpenQuality, 'click', (e) => {
      e.stopPropagation();
      panelMain?.classList.add('ap-hidden');
      panelQuality?.classList.remove('ap-hidden');
    });

    addListener(btnOpenAutoSkip, 'click', (e) => {
      e.stopPropagation();
      panelMain?.classList.add('ap-hidden');
      panelAutoSkip?.classList.remove('ap-hidden');
    });

    addListener(btnBackQuality, 'click', (e) => {
      e.stopPropagation();
      panelQuality?.classList.add('ap-hidden');
      panelMain?.classList.remove('ap-hidden');
    });

    addListener(btnBackAutoSkip, 'click', (e) => {
      e.stopPropagation();
      panelAutoSkip?.classList.add('ap-hidden');
      panelMain?.classList.remove('ap-hidden');
    });

    addListener(btnOpenSubs, 'click', (e) => {
      e.stopPropagation();
      panelMain?.classList.add('ap-hidden');
      panelSubs?.classList.remove('ap-hidden');
    });

    addListener(btnBackSubs, 'click', (e) => {
      e.stopPropagation();
      panelSubs?.classList.add('ap-hidden');
      panelMain?.classList.remove('ap-hidden');
    });

    addListener(btnOpenSubSettings, 'click', (e) => {
      e.stopPropagation();
      panelSubs?.classList.add('ap-hidden');
      panelSubSettings?.classList.remove('ap-hidden');
    });

    addListener(btnBackSubSettings, 'click', (e) => {
      e.stopPropagation();
      panelSubSettings?.classList.add('ap-hidden');
      panelSubs?.classList.remove('ap-hidden');
    });

    // Volume Boost panel navigation
    addListener(btnOpenVolBoost, 'click', (e) => {
      e.stopPropagation();
      panelMain?.classList.add('ap-hidden');
      panelVolBoost?.classList.remove('ap-hidden');
    });

    addListener(btnBackVolBoost, 'click', (e) => {
      e.stopPropagation();
      panelVolBoost?.classList.add('ap-hidden');
      panelMain?.classList.remove('ap-hidden');
    });

    // Volume Boost slider interaction
    addListener(volBoostSlider, 'input', (e) => {
      e.stopPropagation();
      ensureAudioContext();
      applyVolumeBoost(parseInt(e.target.value));
    });

    // Volume Boost preset buttons
    volBoostPresets?.forEach(btn => {
      addListener(btn, 'click', (e) => {
        e.stopPropagation();
        ensureAudioContext();
        applyVolumeBoost(parseInt(btn.dataset.val));
      });
    });

    // Initialize Volume Boost UI from saved state
    applyVolumeBoost(currentBoost);

    // Subtitle settings selection
    addListener(subSettingsOptions, 'click', (e) => {
      e.stopPropagation();
      const target = e.target.closest('[data-val]');
      if (!target) return;
      const val = target.dataset.val;
      if (target.classList.contains('sub-opt-color')) {
        subColor = val;
        localStorage.setItem('aniko_sub_color', val);
      } else if (target.classList.contains('sub-opt-bg')) {
        subBg = val;
        localStorage.setItem('aniko_sub_bg', val);
      } else if (target.classList.contains('sub-opt-size')) {
        subSize = val;
        localStorage.setItem('aniko_sub_size', val);
      } else if (target.classList.contains('sub-opt-font')) {
        subFont = val;
        localStorage.setItem('aniko_sub_font', val);
      } else if (target.classList.contains('sub-opt-shadow')) {
        subShadow = val;
        localStorage.setItem('aniko_sub_shadow', val);
      }
      applySubtitleSettings();
    });

    addListener(btnSpeed, 'click', (e) => {
      e.stopPropagation();
      toggleMenu(menuSpeed);
    });

    addListener(btnServers, 'click', (e) => {
      e.stopPropagation();
      toggleMenu(menuServers);
    });

    addListener(btnSettings, 'click', (e) => {
      e.stopPropagation();
      toggleMenu(menuSettings);
    });

    addListener(wrapper, 'click', (e) => {
      if (!e.target.closest('.ap-dropdown-anchor')) {
        closeAllMenus();
      }
    });

    // ─── Build Quality Menu ─────────────────────────────────
    function buildQualityMenu(levels) {
      if (!qualityOptions) return;
      qualityOptions.innerHTML = '';

      const isAuto = hls ? hls.autoLevelEnabled : (currentQualityLevel === -1);
      let autoText = 'Auto';

      if (isAuto && hls && hls.currentLevel >= 0 && levels[hls.currentLevel]) {
        const lvl = levels[hls.currentLevel];
        const label = lvl.height >= 1080 ? '1080p' : lvl.height >= 720 ? '720p' : lvl.height >= 480 ? '480p' : `${lvl.height}p`;
        autoText = `Auto (${label})`;
      }

      const autoBtn = document.createElement('button');
      autoBtn.className = 'ap-menu-option' + (isAuto ? ' active' : '');
      autoBtn.textContent = autoText;
      autoBtn.addEventListener('click', () => {
        if (hls) {
          hls.currentLevel = -1;
          currentQualityLevel = -1;
        }
        buildQualityMenu(hls ? hls.levels : []);
        closeAllMenus();
      });
      qualityOptions.appendChild(autoBtn);

      const sorted = levels.map((l, i) => ({ ...l, index: i })).sort((a, b) => b.height - a.height);

      sorted.forEach((level) => {
        const btn = document.createElement('button');
        btn.className = 'ap-menu-option' + (!isAuto && currentQualityLevel === level.index ? ' active' : '');
        const label = level.height >= 1080 ? '1080p' : level.height >= 720 ? '720p' : level.height >= 480 ? '480p' : `${level.height}p`;
        btn.textContent = label;
        btn.addEventListener('click', () => {
          if (hls) {
            hls.currentLevel = level.index;
            currentQualityLevel = level.index;
          }
          buildQualityMenu(hls ? hls.levels : []);
          closeAllMenus();
        });
        qualityOptions.appendChild(btn);
      });

      const maxHeight = levels.length > 0 ? Math.max(...levels.map((l) => l.height)) : 0;
      if (maxHeight >= 720 && qualityBadge) {
        qualityBadge.textContent = maxHeight >= 1080 ? 'FHD' : 'HD';
        qualityBadge.classList.remove('ap-hidden');
      }

      if (valQuality) {
        if (isAuto) valQuality.textContent = autoText;
        else {
          const lvl = levels[currentQualityLevel];
          valQuality.textContent = lvl ? (lvl.height >= 1080 ? '1080p' : lvl.height >= 720 ? '720p' : lvl.height >= 480 ? '480p' : `${lvl.height}p`) : '';
        }
      }
    }

    // ─── Build Speed Menu ───────────────────────────────────
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    if (speedOptions) {
      speeds.forEach((s) => {
        const btn = document.createElement('button');
        btn.className = 'ap-menu-option' + (s === 1 ? ' active' : '');
        btn.textContent = s === 1 ? 'Normal' : s + 'x';
        btn.addEventListener('click', () => {
          video.playbackRate = s;
          if (speedLabel) speedLabel.textContent = s === 1 ? '1x' : s + 'x';
          speedOptions.querySelectorAll('.ap-menu-option').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          closeAllMenus();
        });
        speedOptions.appendChild(btn);
      });
    }

    // ─── Build Captions Menu ────────────────────────────────
    function buildSubMenu(subs) {
      if (!subOptions) return;
      subOptions.innerHTML = '';
      if (!subs || subs.length === 0) {
        if (valSubs) valSubs.textContent = 'Unavailable';
        if (btnOpenSubs) btnOpenSubs.style.display = 'none';
        return;
      }

      if (btnOpenSubs) btnOpenSubs.style.display = 'flex';

      const offBtn = document.createElement('button');
      offBtn.className = 'ap-menu-option' + (activeSubTrack === -1 ? ' active' : '');
      offBtn.textContent = 'Off';
      offBtn.addEventListener('click', () => {
        setSubTrack(-1);
        localStorage.setItem('aniko_sub_lang', 'Off');
        closeAllMenus();
      });
      subOptions.appendChild(offBtn);

      subs.forEach((sub, i) => {
        const btn = document.createElement('button');
        btn.className = 'ap-menu-option';
        btn.textContent = sub.label || sub.lang || sub.language || `Track ${i + 1}`;
        btn.addEventListener('click', () => {
          setSubTrack(i);
          const lbl = sub.label || sub.lang || sub.language || `Track ${i + 1}`;
          localStorage.setItem('aniko_sub_lang', lbl);
          closeAllMenus();
        });
        subOptions.appendChild(btn);
      });
    }

    function setSubTrack(index) {
      activeSubTrack = index;
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === index ? 'showing' : 'hidden';
      }
      if (subOptions) {
        Array.from(subOptions.children).forEach((btn, i) => {
          btn.classList.toggle('active', i - 1 === index);
        });
      }

      if (valSubs) {
        if (index === -1) {
          valSubs.textContent = 'Off';
        } else if (subtitles[index]) {
          valSubs.textContent = subtitles[index].label || subtitles[index].lang || subtitles[index].language || 'On';
        }
      }
    }

    // ─── Skip Intro / Outro ─────────────────────────────────
    if (btnAutoSkipOn && btnAutoSkipOff) {
      if (valAutoSkip) valAutoSkip.textContent = isAutoSkip ? 'On' : 'Off';
      btnAutoSkipOn.classList.toggle('active', isAutoSkip);
      btnAutoSkipOff.classList.toggle('active', !isAutoSkip);

      addListener(btnAutoSkipOn, 'click', () => {
        isAutoSkip = true;
        localStorage.setItem('aniko_autoskip', 'true');
        btnAutoSkipOn.classList.add('active');
        btnAutoSkipOff.classList.remove('active');
        if (valAutoSkip) valAutoSkip.textContent = 'On';
        closeAllMenus();
      });

      addListener(btnAutoSkipOff, 'click', () => {
        isAutoSkip = false;
        localStorage.setItem('aniko_autoskip', 'false');
        btnAutoSkipOff.classList.add('active');
        btnAutoSkipOn.classList.remove('active');
        if (valAutoSkip) valAutoSkip.textContent = 'Off';
        closeAllMenus();
      });
    }

    addListener(skipIntroBtn, 'click', (e) => {
      e.stopPropagation();
      if (skipIntroBtn) skipIntroBtn.dataset.used = 'true';
      const st = skipTimesRef.current;
      if (st?.op) video.currentTime = st.op[1];
      skipIntroBtn?.classList.add('ap-hidden');
      skipIntroBtn?.classList.remove('visible');
    });

    addListener(skipOutroBtn, 'click', (e) => {
      e.stopPropagation();
      if (skipOutroBtn) skipOutroBtn.dataset.used = 'true';
      const st = skipTimesRef.current;
      if (st?.ed) video.currentTime = st.ed[1];
      skipOutroBtn?.classList.add('ap-hidden');
      skipOutroBtn?.classList.remove('visible');
    });

    // ─── Keyboard Shortcuts ─────────────────────────────────
    const keydownHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // Only handle if the player is visible/focused
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          btnMute?.click();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          showControls();
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          showControls();
          break;
        case 'arrowup':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          video.muted = false;
          updateVolumeIcon();
          showControls();
          break;
        case 'arrowdown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          if (video.volume === 0) video.muted = true;
          updateVolumeIcon();
          showControls();
          break;
        case 'c':
          e.preventDefault();
          if (activeSubTrack >= 0) {
            setSubTrack(-1);
          } else if (subtitles.length > 0) {
            setSubTrack(0);
          }
          break;
        case 'escape':
          closeAllMenus();
          break;
      }
    };
    document.addEventListener('keydown', keydownHandler);

    // ─── Retry Button ───────────────────────────────────────
    addListener(retryBtn, 'click', () => {
      overlayError?.classList.add('ap-hidden');
      loadHls();
    });

    // ─── Add Subtitle Tracks ────────────────────────────────
    function addSubtitleTracks() {
      video.querySelectorAll('track').forEach((t) => t.remove());

      let englishIndex = -1;
      let defaultIndex = -1;
      let matchIndex = -1;

      subtitles.forEach((sub, i) => {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = sub.label || sub.lang || sub.language || `Track ${i + 1}`;
        track.srclang = sub.language || sub.lang || 'en';

        const isEng = track.label.toLowerCase().includes('english') || track.label.toLowerCase().includes('eng') || track.srclang.toLowerCase() === 'en';
        if (isEng && englishIndex === -1) englishIndex = i;
        if (sub.default || sub.isDefault) defaultIndex = i;
        if (savedSubLang && track.label === savedSubLang) matchIndex = i;

        track.src = sub.url || sub.file;
        video.appendChild(track);
      });

      if (activeSubTrack === -1 || activeSubTrack >= subtitles.length) {
        if (savedSubLang === 'Off') {
          activeSubTrack = -1;
        } else if (matchIndex !== -1) {
          activeSubTrack = matchIndex;
        } else if (englishIndex !== -1) {
          activeSubTrack = englishIndex;
        } else if (defaultIndex !== -1) {
          activeSubTrack = defaultIndex;
        } else if (subtitles.length > 0) {
          activeSubTrack = 0;
        }
      }

      setTimeout(() => setSubTrack(activeSubTrack), 200);
    }

    // ─── Load HLS Stream ────────────────────────────────────
    function loadHls() {
      showLoading();
      showControls();
      SmartStreamGuard.startMonitor();

      if (hls) {
        hls.destroy();
        hls = null;
      }

      const isHls = type === 'hls' || src.includes('.m3u8');

      if (isHls && Hls.isSupported()) {
        hls = new Hls({
          maxBufferLength: 120,
          maxMaxBufferLength: 600,
          maxBufferSize: 250 * 1000000,
          maxBufferHole: 0.5,
          backBufferLength: 90,
          startLevel: -1,
          capLevelToPlayerSize: true,
          startFragPrefetch: true,
          abrEwmaDefaultEstimate: 500000,
          abrEwmaFastLive: 3.0,
          abrEwmaSlowLive: 9.0,
          abrEwmaFastVoD: 3.0,
          abrEwmaSlowVoD: 9.0,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.5,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 8,
          fragLoadingRetryDelay: 500,
          fragLoadingMaxRetryTimeout: 16000,
          manifestLoadingTimeOut: 15000,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 500,
          manifestLoadingMaxRetryTimeout: 8000,
          levelLoadingTimeOut: 15000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 500,
          levelLoadingMaxRetryTimeout: 8000,
          enableWorker: true,
          lowLatencyMode: false,
          progressive: true,
          maxLoadingDelay: 2,
          testBandwidth: true,
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        let mediaRecoveryAttempts = 0;

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          hideLoading();

          buildQualityMenu(data.levels);
          addSubtitleTracks();
          buildSubMenu(subtitles);

          if (initialTime > 0) {
            video.currentTime = initialTime;
          }

          video.play().catch(() => {
            console.log('Autoplay blocked, waiting for user interaction.');
          });

          callbacksRef.current.onReady?.();
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          hideLoading();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              if (mediaRecoveryAttempts < 3) {
                mediaRecoveryAttempts++;
                hls.startLoad();
              } else {
                showError('Network error. Please check your connection and retry.');
              }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (mediaRecoveryAttempts < 2) {
                mediaRecoveryAttempts++;
                hls.recoverMediaError();
              } else {
                mediaRecoveryAttempts = 0;
                hls.swapAudioCodec();
                hls.recoverMediaError();
              }
            } else {
              showError('Playback error');
            }
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          if (hls?.autoLevelEnabled) {
            buildQualityMenu(hls.levels);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          hideLoading();
          addSubtitleTracks();
          buildSubMenu(subtitles);
          if (initialTime > 0) video.currentTime = initialTime;
          video.play().catch(() => {});
          callbacksRef.current.onReady?.();
        }, { once: true });
        video.addEventListener('error', () => {
          showError('Stream playback error');
        }, { once: true });
      } else {
        // Direct source
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          hideLoading();
          addSubtitleTracks();
          buildSubMenu(subtitles);
          if (initialTime > 0) video.currentTime = initialTime;
          video.play().catch(() => {});
          callbacksRef.current.onReady?.();
        }, { once: true });
      }
    }

    // Set video title
    if (videoTitle) {
      videoTitle.textContent = '';
    }

    // ─── Start ──────────────────────────────────────────────
    loadHls();

    // ─── Cleanup ────────────────────────────────────────────
    cleanupRef.current = () => {
      clearTimeout(controlsTimer);
      SmartStreamGuard.clearTimers();
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);

      listeners.forEach(({ el, evt, handler, opts }) => {
        el.removeEventListener(evt, handler, opts);
      });

      // Clean up Web Audio API
      if (mediaSourceNode) {
        try { mediaSourceNode.disconnect(); } catch { /* already disconnected */ }
      }
      if (gainNode) {
        try { gainNode.disconnect(); } catch { /* already disconnected */ }
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch { /* already closed */ }
      }
      audioCtx = null;
      gainNode = null;
      mediaSourceNode = null;

      if (hls) {
        hls.destroy();
        hls = null;
        hlsRef.current = null;
      }
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [src, type, initialTime, disableControls, subtitles]); // Only re-init when stream source changes

  return (
    <div ref={rootRef} className={`aniko-player-root ${className || ''}`}>
      <div className="ap-player-wrapper controls-visible">
        {/* Video Element */}
        <video ref={videoRef} className="ap-video" crossOrigin="anonymous" playsInline preload="auto" poster={poster}></video>

        {/* Click area for play/pause toggle */}
        <div className="ap-click-area"></div>

        {/* Gradient overlays */}
        <div className="ap-gradient ap-gradient-top"></div>
        <div className="ap-gradient ap-gradient-bottom"></div>

        {/* Loading Overlay */}
        <div className="ap-overlay ap-overlay-loading">
          <div className="ap-loader-ring">
            <div></div><div></div><div></div><div></div>
          </div>
        </div>

        {/* Error Overlay */}
        <div className="ap-overlay ap-overlay-error ap-hidden">
          <div className="ap-error-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="ap-error-message">Stream unavailable</p>
            <button className="ap-retry-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Retry
            </button>
          </div>
        </div>

        {/* Double Tap Ripple Indicators */}
        <div className="ap-dt-indicator ap-dt-left ap-dt-left">
          <div className="ap-dt-ripple"></div>
          <div className="ap-dt-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
            <span>10s</span>
          </div>
        </div>
        <div className="ap-dt-indicator ap-dt-right ap-dt-right">
          <div className="ap-dt-ripple"></div>
          <div className="ap-dt-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
            <span>10s</span>
          </div>
        </div>

        {/* Center play/pause flash indicator */}
        <div className="ap-center-indicator">
          <svg className="ap-ci-play" width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <svg className="ap-ci-pause ap-hidden" width="48" height="48" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </div>

        {/* Top bar with title */}
        <div className="ap-top-bar">
          <span className="ap-video-title"></span>
        </div>

        {/* Skip Intro Button */}
        <button className="ap-skip-btn ap-skip-intro-btn ap-hidden">
          Skip Intro
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>

        {/* Skip Outro Button */}
        <button className="ap-skip-btn ap-skip-btn--outro ap-skip-outro-btn ap-hidden">
          Skip Outro
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>

        {/* Bottom Controls */}
        <div className="ap-controls">
          {/* Progress / Seek Bar */}
          <div className="ap-seek-container">
            <div className="ap-seek-track">
              <div className="ap-seek-buffered ap-seek-fill"></div>
              <div className="ap-seek-hl-intro ap-seek-fill ap-seek-hl ap-hidden"></div>
              <div className="ap-seek-hl-outro ap-seek-fill ap-seek-hl ap-hidden"></div>
              <div className="ap-seek-played ap-seek-fill"></div>
              <div className="ap-seek-thumb"></div>
            </div>
            <div className="ap-seek-tooltip">0:00</div>
          </div>

          {/* Control buttons row */}
          <div className="ap-controls-row">
            <div className="ap-controls-left">
              {/* Rewind 10s */}
              <button className="ap-ctrl-btn ap-btn-rewind" title="Rewind 10s">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
              </button>

              {/* Play / Pause */}
              <button className="ap-ctrl-btn ap-btn-play" title="Play (Space)">
                <svg className="ap-icon-play" width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <svg className="ap-icon-pause ap-hidden" width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </button>

              {/* Forward 10s */}
              <button className="ap-ctrl-btn ap-btn-forward" title="Forward 10s">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
              </button>

              {/* Volume */}
              <div className="ap-volume-area">
                <button className="ap-ctrl-btn ap-btn-mute" title="Mute (M)">
                  <svg className="ap-icon-vol-high" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  <svg className="ap-icon-vol-low ap-hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  <svg className="ap-icon-vol-mute ap-hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                </button>
              </div>

              {/* Time Display */}
              <span className="ap-time-display">0:00 / 0:00</span>
            </div>

            <div className="ap-controls-right">
              {/* Servers */}
              {availableStreams && availableStreams.length > 1 && (
                <div className="ap-dropdown-anchor">
                  <button className="ap-ctrl-btn ap-btn-servers" id="ap-btn-servers" title="Servers">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                      <line x1="6" y1="6" x2="6.01" y2="6"/>
                      <line x1="6" y1="18" x2="6.01" y2="18"/>
                    </svg>
                  </button>
                  <div className="ap-dropdown-menu ap-menu-servers ap-hidden" id="ap-menu-servers">
                    <div className="ap-menu-title">Servers</div>
                    <div className="ap-menu-options ap-server-options">
                      {availableStreams.map((stream, idx) => (
                        <button
                          key={idx}
                          className={`ap-menu-option ${idx === currentStreamIndex ? 'ap-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStreamChange) onStreamChange(idx);
                            document.getElementById('ap-menu-servers')?.classList.add('ap-hidden');
                          }}
                        >
                          <span className="ap-option-label">{stream.server || `Server ${idx + 1}`}</span>
                          {idx === currentStreamIndex && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Speed */}
              <div className="ap-dropdown-anchor">
                <button className="ap-ctrl-btn ap-btn-speed" title="Speed">
                  <span className="ap-speed-label">1x</span>
                </button>
                <div className="ap-dropdown-menu ap-menu-speed ap-hidden">
                  <div className="ap-menu-title">Speed</div>
                  <div className="ap-menu-options ap-speed-options"></div>
                </div>
              </div>

              {/* Settings (Quality & Auto Skip & Captions) */}
              <div className="ap-dropdown-anchor">
                <button className="ap-ctrl-btn ap-btn-settings" title="Settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  <span className="ap-quality-badge ap-hidden">HD</span>
                </button>
                <div className="ap-dropdown-menu ap-menu-settings ap-hidden" style={{ width: '220px', padding: 0 }}>
                  {/* Main Panel */}
                  <div className="ap-settings-panel ap-panel-main">
                    <div className="ap-menu-title" style={{ padding: '10px 14px 4px' }}>Settings</div>
                    <button className="ap-settings-item ap-btn-open-quality">
                      <span>Quality</span>
                      <span className="ap-settings-val ap-val-quality">Auto</span>
                    </button>
                    <button className="ap-settings-item ap-btn-open-autoskip">
                      <span>Auto Skip</span>
                      <span className="ap-settings-val ap-val-autoskip">Off</span>
                    </button>
                    <button className="ap-settings-item ap-btn-open-subs">
                      <span>Captions</span>
                      <span className="ap-settings-val ap-val-subs">Off</span>
                    </button>
                    <button className="ap-settings-item ap-btn-open-volboost">
                      <span>Volume Boost</span>
                      <span className="ap-settings-val ap-val-volboost">Off</span>
                    </button>
                  </div>

                  {/* Quality Panel */}
                  <div className="ap-settings-panel ap-panel-quality ap-hidden">
                    <button className="ap-settings-back-btn ap-btn-back-quality">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      Quality
                    </button>
                    <div className="ap-menu-options ap-quality-options" style={{ paddingBottom: '8px' }}></div>
                  </div>

                  {/* Auto Skip Panel */}
                  <div className="ap-settings-panel ap-panel-autoskip ap-hidden">
                    <button className="ap-settings-back-btn ap-btn-back-autoskip">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      Auto Skip
                    </button>
                    <div className="ap-menu-options" style={{ paddingBottom: '8px' }}>
                      <button className="ap-menu-option ap-btn-autoskip-on">On</button>
                      <button className="ap-menu-option active ap-btn-autoskip-off">Off</button>
                    </div>
                  </div>

                  {/* Captions Panel */}
                  <div className="ap-settings-panel ap-panel-subs ap-hidden">
                    <button className="ap-settings-back-btn ap-btn-back-subs">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      Captions
                    </button>
                    <button className="ap-settings-item ap-btn-open-sub-settings" style={{ marginBottom: '4px', paddingTop: '4px' }}>
                      <span>Subtitle Settings</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                    <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 14px 4px' }} />
                    <div className="ap-menu-options ap-sub-options" style={{ paddingBottom: '8px' }}></div>
                  </div>

                  {/* Subtitle Settings Panel */}
                  <div className="ap-settings-panel ap-panel-sub-settings ap-hidden">
                    <button className="ap-settings-back-btn ap-btn-back-sub-settings">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      Subtitle Settings
                    </button>

                    {/* Live Preview */}
                    <div className="ap-ss-preview">
                      <span className="ap-ss-preview-text">Preview Text</span>
                    </div>

                    <div className="ap-menu-options ap-sub-settings-options" style={{ paddingBottom: '8px', maxHeight: '320px', overflowY: 'auto' }}>

                      {/* Color Swatches */}
                      <div className="ap-ss-section-title">COLOR</div>
                      <div className="ap-ss-swatches">
                        <button className="ap-ss-swatch sub-opt-color" data-val="#ffffff" style={{ background: '#ffffff' }} title="White"></button>
                        <button className="ap-ss-swatch sub-opt-color" data-val="#ffff00" style={{ background: '#ffff00' }} title="Yellow"></button>
                        <button className="ap-ss-swatch sub-opt-color" data-val="#00ffff" style={{ background: '#00ffff' }} title="Cyan"></button>
                        <button className="ap-ss-swatch sub-opt-color" data-val="#00ff00" style={{ background: '#00ff00' }} title="Green"></button>
                        <button className="ap-ss-swatch sub-opt-color" data-val="#ff6b6b" style={{ background: '#ff6b6b' }} title="Red"></button>
                        <button className="ap-ss-swatch sub-opt-color" data-val="#ffa500" style={{ background: '#ffa500' }} title="Orange"></button>
                      </div>

                      {/* Background */}
                      <div className="ap-ss-section-title">BACKGROUND</div>
                      <div className="ap-ss-chips">
                        <button className="ap-ss-chip sub-opt-bg" data-val="rgba(0, 0, 0, 0)">None</button>
                        <button className="ap-ss-chip sub-opt-bg" data-val="rgba(0, 0, 0, 0.5)">Light</button>
                        <button className="ap-ss-chip sub-opt-bg" data-val="rgba(0, 0, 0, 0.75)">Medium</button>
                        <button className="ap-ss-chip sub-opt-bg" data-val="rgba(0, 0, 0, 1)">Solid</button>
                      </div>

                      {/* Size */}
                      <div className="ap-ss-section-title">SIZE</div>
                      <div className="ap-ss-chips">
                        <button className="ap-ss-chip sub-opt-size" data-val="clamp(10px, 2.5vw, 18px)">S</button>
                        <button className="ap-ss-chip sub-opt-size" data-val="clamp(12px, 3.5vw, 24px)">M</button>
                        <button className="ap-ss-chip sub-opt-size" data-val="clamp(16px, 4.5vw, 32px)">L</button>
                        <button className="ap-ss-chip sub-opt-size" data-val="clamp(20px, 5.5vw, 40px)">XL</button>
                      </div>

                      {/* Font Family */}
                      <div className="ap-ss-section-title">FONT</div>
                      <div className="ap-ss-chips ap-ss-chips--wide">
                        <button className="ap-ss-chip sub-opt-font" data-val="'Inter', sans-serif" style={{ fontFamily: 'Inter, sans-serif' }}>Sans</button>
                        <button className="ap-ss-chip sub-opt-font" data-val="Georgia, serif" style={{ fontFamily: 'Georgia, serif' }}>Serif</button>
                        <button className="ap-ss-chip sub-opt-font" data-val="'Courier New', monospace" style={{ fontFamily: "'Courier New', monospace" }}>Mono</button>
                        <button className="ap-ss-chip sub-opt-font" data-val="'Comic Sans MS', cursive" style={{ fontFamily: "'Comic Sans MS', cursive" }}>Fun</button>
                      </div>

                      {/* Text Shadow */}
                      <div className="ap-ss-section-title">TEXT SHADOW</div>
                      <div className="ap-ss-chips">
                        <button className="ap-ss-chip sub-opt-shadow" data-val="none">None</button>
                        <button className="ap-ss-chip sub-opt-shadow" data-val="1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)">Outline</button>
                        <button className="ap-ss-chip sub-opt-shadow" data-val="2px 2px 4px rgba(0,0,0,0.8)">Drop</button>
                        <button className="ap-ss-chip sub-opt-shadow" data-val="0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.5)">Glow</button>
                      </div>
                    </div>
                  </div>

                  {/* Volume Boost Panel */}
                  <div className="ap-settings-panel ap-panel-volboost ap-hidden">
                    <button className="ap-settings-back-btn ap-btn-back-volboost">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      Volume Boost
                    </button>

                    {/* Volume Level Display */}
                    <div className="ap-vb-display">
                      <div className="ap-vb-icon-wrap">
                        <svg className="ap-vb-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                      </div>
                      <div className="ap-vb-level">
                        <span className="ap-volboost-value">100%</span>
                        <span className="ap-vb-label">Volume Level</span>
                      </div>
                    </div>

                    {/* Slider Section */}
                    <div className="ap-vb-slider-section">
                      <div className="ap-volboost-slider-wrapper">
                        <div className="ap-volboost-track">
                          <div className="ap-volboost-fill" style={{ width: '0%' }}></div>
                        </div>
                        <input
                          type="range"
                          className="ap-volboost-slider"
                          min="100"
                          max="600"
                          step="10"
                          defaultValue="100"
                        />
                      </div>
                      <div className="ap-vb-range-labels">
                        <span>100%</span>
                        <span>300%</span>
                        <span>600%</span>
                      </div>
                    </div>

                    {/* Preset Chips */}
                    <div className="ap-vb-presets">
                      <button className="ap-vb-chip ap-volboost-preset active" data-val="100">1x</button>
                      <button className="ap-vb-chip ap-volboost-preset" data-val="150">1.5x</button>
                      <button className="ap-vb-chip ap-volboost-preset" data-val="200">2x</button>
                      <button className="ap-vb-chip ap-volboost-preset" data-val="300">3x</button>
                      <button className="ap-vb-chip ap-volboost-preset" data-val="400">4x</button>
                      <button className="ap-vb-chip ap-volboost-preset" data-val="600">6x</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fullscreen */}
              <button className="ap-ctrl-btn ap-btn-fullscreen" title="Fullscreen (F)">
                <svg className="ap-icon-expand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                <svg className="ap-icon-compress ap-hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AnikoPlayer.displayName = 'AnikoPlayer';

export default AnikoPlayer;

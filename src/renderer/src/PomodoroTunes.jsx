import { useState, useEffect, useRef } from "react";

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const TOTAL_SESSIONS = 4;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function PomodoroTunes() {
  const [timeLeft, setTimeLeft] = useState(WORK_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [albumArt, setAlbumArt] = useState(null);
  const [songTitle, setSongTitle] = useState("Title - Artist");
  const [token, setToken] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const intervalRef = useRef(null);
  const lastTrackId = useRef(null);
  const audioCtxRef = useRef(null);
  const lastGlassClickRef = useRef(0);

  function playGlassClick() {
    const now = Date.now();
    if (now - lastGlassClickRef.current < 80) return;
    lastGlassClickRef.current = now;

    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) {}
  }

  // ── Timer logic ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          handleSessionEnd();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isBreak]);

  // ── Fetch current track every 5 seconds ───────────────────────────────
  useEffect(() => {
    if (!token) return;

    const fetchTrack = async () => {
      const data = await window.electronAPI.spotifyCurrentTrack(token);
      if (data && data.item) {
        setSongTitle(`${data.item.name} - ${data.item.artists[0].name}`);
        setIsPlaying(data.is_playing);

        if (data.item.id !== lastTrackId.current) {
          lastTrackId.current = data.item.id;
          const imageUrl = data.item.album.images[0].url;
          const base64Image = await window.electronAPI.spotifyGetImage(imageUrl);
          setAlbumArt(base64Image);
        }
      }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 5000);
    return () => clearInterval(interval);
  }, [token]);

  function handleSessionEnd() {
    setIsRunning(false);
    if (!isBreak) {
      setSessions((s) => Math.min(s + 1, TOTAL_SESSIONS));
      setIsBreak(true);
      setTimeLeft(BREAK_MINUTES * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(WORK_MINUTES * 60);
    }
  }

  function handleStart() { setIsRunning((r) => !r); }

  function handleReset() {
    setIsRunning(false);
    setIsBreak(false);
    setSessions(0);
    setTimeLeft(WORK_MINUTES * 60);
  }

  async function handlePlayPause() {
    if (isPlaying) await window.electronAPI.spotifyControl('pause', token);
    else await window.electronAPI.spotifyControl('play', token);
    setIsPlaying((p) => !p);
  }

  async function handlePrev() { await window.electronAPI.spotifyControl('previous', token); }
  async function handleNext() { await window.electronAPI.spotifyControl('next', token); }

  async function handleMute() {
    if (isMuted) await window.electronAPI.spotifyVolume(token, volume);
    else await window.electronAPI.spotifyVolume(token, 0);
    setIsMuted((m) => !m);
  }

  async function handleVolumeChange(e) {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (newVol > 0) setIsMuted(false);
    await window.electronAPI.spotifyVolume(token, newVol);
  }

  async function handleLogin() {
    const { getAuthUrl } = await import('./spotify');
    const url = getAuthUrl();
    const code = await window.electronAPI.spotifyAuth(url);
    const accessToken = await window.electronAPI.spotifyGetToken(code);
    setToken(accessToken);
  }

  const total = isBreak ? BREAK_MINUTES * 60 : WORK_MINUTES * 60;
  const progress = 1 - timeLeft / total;
  const circumference = 2 * Math.PI * 54;
  const dash = circumference * (1 - progress);

  // ── Theme colors ──────────────────────────────────────────────────────
  const theme = darkMode ? {
    bg: 'linear-gradient(180deg, #1a1a2e, #16213e)',
    glass: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
    glow: 'rgba(180,100,255,0.3)',
    textMain: '#e8c4f0',
    textSub: '#b08ec0',
    ringStroke: '#a855f7',
    ringGlow: 'rgba(168,85,247,0.6)',
    insetTop: 'rgba(255,255,255,0.1)',
    insetBot: 'rgba(255,255,255,0.04)',
    ctrlColor: 'rgba(255,255,255,0.7)',
    playBg: '#fff',
    playColor: '#a855f7',
    sliderColor: '#a855f7',
  } : {
    bg: 'linear-gradient(180deg, #f9a8d4, #93c5fd)',
    glass: 'rgba(255,255,255,0.15)',
    border: 'rgba(255,255,255,0.6)',
    glow: 'rgba(255,182,230,0.35)',
    textMain: '#7c3060',
    textSub: '#a0527a',
    ringStroke: '#d946a3',
    ringGlow: 'rgba(217,70,163,0.6)',
    insetTop: 'rgba(255,255,255,0.8)',
    insetBot: 'rgba(255,255,255,0.2)',
    ctrlColor: 'rgba(255,255,255,0.85)',
    playBg: '#fff',
    playColor: '#d946a3',
    sliderColor: 'rgb(255, 153, 247)',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Quicksand:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Indie Flower', sans-serif;
        }

        .card {
          width: 100vw;
          min-height: 100vh;
          border-radius: 0;
          padding: 24px 22px 26px;
          background: ${theme.bg};
          transition: background 0.4s ease;
        }

        .card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .card > * { position: relative; z-index: 1; }

        /* ── Dark mode toggle ── */
        .top-bar {
          display: flex;
          justify-content: flex-end;
          margin-bottom:-25px;
          margin-right: 400px;
        }

        .toggle-track {
          width: 52px;
          height: 28px;
          border-radius: 999px;
          background: ${darkMode ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.3)'};
          border: 1.5px solid ${theme.border};
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: inset 0 2px 0 ${theme.insetTop};
          position: relative;
          cursor: pointer;
          transition: background 0.3s;
          display: flex;
          align-items: center;
          padding: 3px;
        }

        .toggle-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(.4,0,.2,1);
          transform: ${darkMode ? 'translateX(17px)' : 'translateX(0px)'};
          flex-shrink: 0;
        }

        /* ── Title pill ── */
        .title-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 8px 28px;
          margin: 0 auto 18px;
          width: fit-content;
          background: ${theme.glass};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid ${theme.border};
          box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 0 20px ${theme.glow}, inset 0 2px 0 ${theme.insetTop};
          transition: all 0.4s ease;
        }

        .title-pill span {
          font-family: 'Dancing Script', cursive;
          font-size: 22px;
          color: ${theme.textMain};
          font-weight: 700;
          letter-spacing: 0.3px;
          transition: color 0.4s ease;
        }

        /* ── Timer box ── */
        .timer-box {
          width: 80%;
          margin: 0 auto 16px;
          background: ${theme.glass};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 40px;
          border: 1.5px solid ${theme.border};
          box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1), 0 0 30px ${theme.glow}, inset 0 2px 0 ${theme.insetTop}, inset 0 -2px 0 ${theme.insetBot};
          padding: 22px 5px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          position: relative;
          z-index: 1;
          transition: all 0.4s ease;
        }

        .timer-ring-wrap {
          position: relative;
          width: 130px;
          height: 130px;
        }

        .timer-ring-wrap svg { transform: rotate(-90deg); }

        .timer-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Dancing Script', cursive;
          font-size: 38px;
          font-weight: 700;
          color: ${theme.textMain};
          transition: color 0.4s ease;
        }

        .ring-bg { fill: none; stroke: ${darkMode ? 'rgba(168,85,247,0.15)' : 'rgba(124,48,96,0.12)'}; stroke-width: 6; }
        .ring-fg {
          fill: none;
          stroke: ${theme.ringStroke};
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1), stroke 0.4s ease;
          filter: drop-shadow(0 0 6px ${theme.ringGlow});
        }

        /* ── Buttons row ── */
        .btn-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: -30px;
          margin-bottom: 14px;
          position: relative;
          z-index: 2;
        }

        .pill-btn {
          font-family: 'Dancing Script', cursive;
          font-size: 20px;
          font-weight: 700;
          color: ${theme.textMain};
          background: ${theme.glass};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid ${theme.border};
          border-radius: 999px;
          padding: 9px 32px;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 0 20px ${theme.glow}, inset 0 2px 0 ${theme.insetTop}, inset 0 -2px 0 ${theme.insetBot};
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease, color 0.4s, background 0.35s ease, backdrop-filter 0.35s ease;
          letter-spacing: 0.2px;
        }

        .pill-btn {
          position: relative;
          overflow: hidden;
        }

        .pill-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(255,255,255,0.08) 100%);
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }

        .pill-btn:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 16px 32px rgba(0,0,0,0.2), 0 0 24px ${theme.glow}, inset 0 2px 0 ${theme.insetTop};
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          background: ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)'};
        }

        .pill-btn:hover::before {
          opacity: 1;
        }

        .pill-btn:active {
          transform: translateY(1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }

        .pill-btn.running {
          background: ${darkMode ? 'rgba(168,85,247,0.2)' : 'rgba(252,231,243,0.35)'};
          color: ${darkMode ? '#c084fc' : '#681a3c'};
          border: 1.5px solid ${theme.border};
          box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 0 20px ${theme.glow}, inset 0 2px 0 ${theme.insetTop};
        }

        .pill-btn.running:hover {
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          background: ${darkMode ? 'rgba(168,85,247,0.28)' : 'rgba(252,231,243,0.5)'};
        }

        /* ── Session stars ── */
        .stars-row {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .star {
          font-size: 20px;
          transition: transform 0.3s, filter 0.3s;
          filter: drop-shadow(0 0 0px transparent);
        }

        .star.filled {
          filter: drop-shadow(0 0 5px rgba(255,200,50,0.7));
          transform: scale(1.15);
          animation: starPop 0.35s ease;
        }

        @keyframes starPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1.15); }
        }

        /* ── Music player row ── */
        .music-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .album-art {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          flex-shrink: 0;
          overflow: hidden;
          background: ${theme.glass};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid ${theme.border};
          box-shadow: 0 12px 28px rgba(0,0,0,0.2), 0 0 20px ${theme.glow}, inset 0 2px 0 ${theme.insetTop};
          transition: all 0.4s ease;
        }

        .album-art img { width: 100%; height: 100%; object-fit: cover; }

        .music-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .song-pill {
          border-radius: 999px;
          padding: 6px 16px;
          overflow: hidden;
          background: ${theme.glass};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid ${theme.border};
          box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 0 20px ${theme.glow}, inset 0 2px 0 ${theme.insetTop};
          transition: all 0.4s ease;
        }

        .song-pill span {
          font-family: 'Dancing Script', cursive;
          font-size: 16px;
          color: ${theme.textMain};
          font-weight: 700;
          white-space: nowrap;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.4s ease;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 4px;
        }

        .ctrl-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s;
          color: ${theme.ctrlColor};
        }

        .ctrl-btn:hover { transform: scale(1.2); }
        .ctrl-btn:active { transform: scale(0.9); }

        .ctrl-btn.play-btn {
          background: ${theme.playBg};
          border-radius: 50%;
          width: 36px;
          height: 36px;
          color: ${theme.playColor};
          box-shadow: 0 3px 10px rgba(0,0,0,0.18);
        }

        .ctrl-btn.play-btn:hover { transform: scale(1.12); }
        .ctrl-btn svg { display: block; }

        /* ── Volume slider ── */
        .volume-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          max-width: 120px;
        }

        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, ${theme.sliderColor} 0%, ${theme.sliderColor} ${(isMuted ? 0 : volume)}%, ${theme.glass} ${(isMuted ? 0 : volume)}%, ${theme.glass} 100%);
          border: 1px solid ${theme.border};
          outline: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${theme.sliderColor};
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.12s;
        }

        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${theme.sliderColor};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* ── Login button ── */
        .login-btn {
          position: fixed;
          top: 12px;
          right: 12px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${theme.glass};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid ${theme.border};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12), inset 0 2px 0 ${theme.insetTop};
          transition: transform 0.12s;
          z-index: 999;
        }

        .login-btn:hover { transform: scale(1.1); }
      `}</style>

      <div className="card">

        {/* Top bar with dark mode toggle */}
        <div className="top-bar">
          <div className="toggle-track" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Light mode' : 'Dark mode'}>
            <div className="toggle-thumb">
              {darkMode
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="#7c3aed"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM2 13h2M20 13h2M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              }
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="title-pill">
          <span>Pomodoro Tunes</span>
        </div>

        {/* Login button */}
        {!token && (
          <button className="login-btn" onClick={handleLogin} title="Login with Spotify">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={theme.textMain}>
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>
            </svg>
          </button>
        )}

        {/* Timer */}
        <div className="timer-box">
          <div className="timer-ring-wrap">
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle className="ring-bg" cx="65" cy="65" r="54" />
              <circle
                className="ring-fg"
                cx="65" cy="65" r="54"
                strokeDasharray={circumference}
                strokeDashoffset={dash}
              />
            </svg>
            <div className="timer-text">{formatTime(timeLeft)}</div>
          </div>
        </div>

        {/* Start / Reset */}
        <div className="btn-row">
          <button className={`pill-btn${isRunning ? " running" : ""}`} onClick={handleStart} onMouseEnter={playGlassClick}>
            {isRunning ? "Pause" : "Start"}
          </button>
          <button className="pill-btn" onClick={handleReset} onMouseEnter={playGlassClick}>Reset</button>
        </div>

        {/* Session stars */}
        <div className="stars-row">
          {Array.from({ length: TOTAL_SESSIONS }).map((_, i) => (
            <span key={i} className={`star${i < sessions ? " filled" : ""}`}>
              {i < sessions ? "★" : "☆"}
            </span>
          ))}
        </div>

        {/* Music player */}
        <div className="music-row">
          <div className="album-art">
            {albumArt && <img src={albumArt} alt="album" />}
          </div>
          <div className="music-info">
            <div className="song-pill">
              <span>{songTitle}</span>
            </div>
            <div className="controls-row">
              <button className="ctrl-btn" onClick={handlePrev} title="Previous">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
                </svg>
              </button>
              <button className="ctrl-btn play-btn" onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"}>
                {isPlaying
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
                </svg>
              </button>
              <div className="volume-row">
                <button className="ctrl-btn" onClick={handleMute} title={isMuted ? "Unmute" : "Mute"}>
                  {isMuted
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 19L19 20.27 20.27 19 5.27 4 4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  }
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  title="Volume"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
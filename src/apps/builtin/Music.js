// Music.js — Soundtracks app (1.6). Streams MP3s, remembers volume + last track.

import { storage } from '../../core/Storage.js';

const TRACKS = [
  { title: 'Larizo JJS OST', src: 'https://res.cloudinary.com/mprmst5x/video/upload/v1784684746/JJS_OST_-_LARPZO_-_Copy_deo2qd.mp3' },
  { title: 'Glory ULTRAKILL OST', src: 'https://res.cloudinary.com/mprmst5x/video/upload/v1784684794/Glory_-_Copy_uvmkhe.mp3' },
  { title: 'Death Odyssey ULTRAKILL OST', src: 'https://res.cloudinary.com/mprmst5x/video/upload/v1784684812/Death_Odyssey_-_Copy_cwove0.mp3' },
  { title: 'Requiem ULTRAKILL OST', src: 'https://res.cloudinary.com/mprmst5x/video/upload/v1784684815/Requiem_-_Copy_mtg5c1.mp3' },
  { title: 'Sands of Tide ULTRAKILL OST', src: 'https://res.cloudinary.com/mprmst5x/video/upload/v1784684818/Sands_of_Tide_-_Copy_aqbniy.mp3' },
];

export function createMusicContent() {
  const vol = storage.get('cinmin:app:music:volume', 1);
  const last = storage.get('cinmin:app:music:last', 0);
  const wrap = document.createElement('div');
  wrap.className = 'music-app';
  wrap.style.cssText = 'padding:14px; overflow:auto; display:flex; flex-direction:column; gap:10px';
  wrap.innerHTML = `
    <h2 style="margin:0">Soundtracks</h2>
    <div class="music-grid" style="display:flex; flex-direction:column; gap:10px"></div>
  `;
  const grid = wrap.querySelector('.music-grid');
  const audios = [];

  TRACKS.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.style.cssText = 'padding:10px; background:rgba(255,255,255,0.06); border-radius:10px; display:flex; flex-direction:column; gap:6px';
    card.innerHTML = `<div class="track-title" style="font-weight:600; font-size:13px"></div><audio controls preload="none" style="width:100%"></audio>`;
    card.querySelector('.track-title').textContent = t.title;
    const a = card.querySelector('audio');
    a.src = t.src;
    a.volume = typeof vol === 'number' ? vol : 1;
    // pause others when one plays (mixtape behavior)
    a.addEventListener('play', () => {
      audios.forEach(o => { if (o !== a) o.pause(); });
      storage.set('cinmin:app:music:last', i);
      grid.querySelectorAll('.track-card').forEach(c => c.style.border = '');
      card.style.border = '1px solid #8b5cf6';
    });
    a.addEventListener('volumechange', () => storage.set('cinmin:app:music:volume', a.volume));
    audios.push(a);
    grid.appendChild(card);
  });

  // resume last track position in list
  if (TRACKS[last]) grid.children[last]?.scrollIntoView?.();

  wrap._destroy = () => audios.forEach(a => a.pause());
  return wrap;
}

import { Game, loadSave, clearSave } from './game/Game.js';

const $=s=>document.querySelector(s);
const ui={
  journalOpen:false,dialogueOpen:false,
  showGame(g){$('#title-screen').classList.add('hidden');$('#ending').classList.add('hidden');$('#hud').classList.remove('hidden');if(matchMedia('(pointer:coarse)').matches)$('#touch').classList.remove('hidden');this.refreshJournal(g);this.update(g);},
  update(g){if(!g?.realm)return;$('#realm-name').textContent=g.realm.name.toUpperCase();$('#objective').textContent=g.realm.objective;$('#health-fill').style.width=`${Math.max(0,g.hp)}%`;$('#quest-text').textContent=g.step===0?'Approach the memory stone.':g.step===1?'Recover the memory hidden here.':g.step===2?'Survive the opposition.':g.realmIndex===7?'Break the curse.':'Follow the road to the next realm.';},
  loading(show,text='ENTERING PIUKISTAN…'){const e=$('#loading');if(text)$('#loading-text').textContent=text;if(show){e.classList.remove('hidden');e.style.opacity='1';}else{e.style.opacity='0';setTimeout(()=>e.classList.add('hidden'),550);}},
  toast(text,ms=1200){const e=$('#toast');e.textContent=text;e.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>e.classList.remove('visible'),ms);},
  toggleJournal(g){this.journalOpen=!this.journalOpen;$('#journal').classList.toggle('hidden',!this.journalOpen);if(this.journalOpen)this.refreshJournal(g);},
  refreshJournal(g){if(!g)return;$('#journal-title').textContent=g.realm?.name||'Field Journal';$('#journal-content').innerHTML=[...g.journal].reverse().map(e=>`<div class="entry"><b>${escapeHtml(e.title)}</b><p>${escapeHtml(e.text)}</p></div>`).join('')||'<p>No entries yet. Search the landmarks and recover memories.</p>';},
  dialogue(label,text,next){this.dialogueOpen=true;$('#dialogue-label').textContent=label;$('#dialogue-text').textContent=text;$('#dialogue').classList.remove('hidden');$('#dialogue-next').onclick=()=>{this.dialogueOpen=false;$('#dialogue').classList.add('hidden');next?.();};},
  boss(show,hp,name){$('#bossbar').classList.toggle('hidden',!show);if(show){$('#boss-name').textContent=name;$('#boss-hp').style.width=`${Math.max(0,hp)}%`;$('#boss-hp-label').textContent=`${Math.max(0,Math.round(hp))}%`; }},
  pause(show){$('#pause').classList.toggle('hidden',!show);},
  finish(){this.dialogueOpen=false;$('#hud').classList.add('hidden');$('#touch').classList.add('hidden');$('#ending').classList.remove('hidden');$('#ending-copy').textContent='The Bone Throne shatters. The horns, darkness, and corruption fall away. Piuu stands restored — not a demon, but the Princess of Piulandia. Dawn reaches the surviving palace as she walks toward its gates. You did not defeat Piuu. You found Piuu beneath the curse.';}
};
function escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[c]));}

const game=new Game($('#game'),ui);
$('#new-game').onclick=()=>{clearSave();location.reload();};
$('#continue-game').onclick=()=>game.start(loadSave()||undefined);
$('#journal-button').onclick=()=>ui.toggleJournal(game);
$('#journal-close').onclick=()=>ui.toggleJournal(game);
$('#resume').onclick=()=>game.togglePause();
$('#restart').onclick=()=>location.reload();

document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{
  const action=b.dataset.action;if(action==='attack')game.pressed.add('Space');
  if(action==='interact')game.pressed.add('KeyE');
  if(action==='dodge'){game.keys.add('ShiftLeft');setTimeout(()=>game.keys.delete('ShiftLeft'),160);}
  if(action==='journal')ui.toggleJournal(game);
}));

const stick=$('#stick');let touchPointer=null;
stick.addEventListener('pointerdown',e=>{touchPointer=e.pointerId;stick.setPointerCapture?.(e.pointerId);game.touch.active=true;moveStick(e);});
stick.addEventListener('pointermove',e=>{if(e.pointerId===touchPointer)moveStick(e);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>stick.addEventListener(type,()=>{if(touchPointer!==null){touchPointer=null;game.touch.active=false;game.touch.x=0;game.touch.y=0;}}));
function moveStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy)||1,m=Math.min(1,l/(r.width*.38));game.touch.x=dx/l*m;game.touch.y=dy/l*m;}

$('#continue-game').style.display=loadSave()?'inline-block':'none';
window.addEventListener('load',()=>ui.loading(false));

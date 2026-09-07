import * as THREE from 'three';
import { REALMS } from '../data/realms.js';
import { World3D } from './World3D.js';

const SAVE_KEY='piukistan-3d-save-v2';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class Game {
  constructor(canvas,ui){
    this.canvas=canvas;this.ui=ui;this.realmIndex=0;this.step=0;this.hp=100;this.memories=[];this.journal=[];this.running=false;this.paused=false;this.clock=new THREE.Clock();
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,180);this.camera.position.set(0,5,9);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.world=new World3D(this.scene);this.player=null;this.playerVisual=null;this.enemy=null;this.enemyVisual=null;this.enemyHp=100;this.attackCooldown=0;this.invulnerable=0;
    this.keys=new Set();this.pressed=new Set();this.look={yaw:0,pitch:.28,drag:false,lastX:0,lastY:0};this.touch={active:false,x:0,y:0};this.bindInput();addEventListener('resize',()=>this.resize());
  }
  get realm(){return REALMS[this.realmIndex]}
  bindInput(){
    addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!this.keys.has(e.code))this.pressed.add(e.code);this.keys.add(e.code);if(e.code==='Escape')this.togglePause();});
    addEventListener('keyup',e=>this.keys.delete(e.code));
    this.canvas.addEventListener('pointerdown',e=>{this.look.drag=true;this.look.lastX=e.clientX;this.look.lastY=e.clientY;this.canvas.setPointerCapture?.(e.pointerId)});
    this.canvas.addEventListener('pointermove',e=>{if(!this.look.drag)return;const dx=e.clientX-this.look.lastX,dy=e.clientY-this.look.lastY;this.look.lastX=e.clientX;this.look.lastY=e.clientY;this.look.yaw-=dx*.006;this.look.pitch=clamp(this.look.pitch-dy*.004,-.05,.62)});
    this.canvas.addEventListener('pointerup',()=>this.look.drag=false);this.canvas.addEventListener('pointercancel',()=>this.look.drag=false);
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));}
  async start(saved){
    this.ui.loading(true,'BUILDING THE CURSED REALM…');if(saved){this.realmIndex=saved.realmIndex||0;this.step=saved.step||0;this.hp=saved.hp??100;this.memories=saved.memories||[];this.journal=saved.journal||[];}
    this.running=true;this.paused=false;await this.loadRealm();this.ui.showGame(this);this.ui.loading(false);this.clock.start();this.renderer.setAnimationLoop(()=>this.loop());this.toast(`ENTERED ${this.realm.name.toUpperCase()}`,1600);
  }
  async loadRealm(){this.enemy=null;this.enemyVisual=null;this.attackCooldown=0;this.invulnerable=0;this.player=null;this.configureLights();await this.world.build(this.realm,this.realmIndex);await this.spawnPlayer();this.ui.update(this);this.save();if(this.step>=2&&this.step<3)this.spawnEnemy();}
  configureLights(){
    while(this.scene.children.length)this.scene.remove(this.scene.children[0]);this.scene.add(this.world.root);
    const hemi=new THREE.HemisphereLight(0x8b8ea0,0x17100e,1.25);this.scene.add(hemi);
    const moon=new THREE.DirectionalLight(0xd4c7a6,2.4);moon.position.set(-18,28,12);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.near=1;moon.shadow.camera.far=70;moon.shadow.camera.left=-30;moon.shadow.camera.right=30;moon.shadow.camera.top=30;moon.shadow.camera.bottom=-30;this.scene.add(moon);
    const rim=new THREE.PointLight(0x8f466f,1.7,28);rim.position.set(0,5,-22);this.scene.add(rim);
  }
  async spawnPlayer(){
    this.player=new THREE.Group();this.player.position.set(0,.02,24);this.player.rotation.y=Math.PI;this.scene.add(this.player);const visual=await this.world.model('warrior');
    if(visual){visual.scale.setScalar(1.45);visual.rotation.y=Math.PI;this.player.add(visual);this.playerVisual=visual;}else this.makeFallback(this.player,false);
  }
  makeFallback(parent,enemy){const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,1.1,6,10),new THREE.MeshStandardMaterial({color:enemy?0x160b13:0x9c8662,roughness:.8}));body.position.y=1;parent.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.32,16,12),new THREE.MeshStandardMaterial({color:enemy?0x24101b:0xd2b995}));head.position.y=1.85;parent.add(head);}
  spawnEnemy(){
    if(this.enemy)return;this.enemy={position:new THREE.Vector3(0,.02,-10),hp:this.enemyHp||100,attackTimer:0};this.enemyVisual=null;this.world.model('warrior').then(v=>{if(!this.enemy)return;this.enemyVisual=v;v.scale.setScalar(1.55);v.rotation.y=Math.PI;v.traverse(o=>{if(o.isMesh&&o.material){const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];mats.forEach((old)=>{const m=old.clone();if(m.color)m.color.multiplyScalar(.24);if(m.emissive)m.emissive.set(0x260612);m.emissiveIntensity=.8;o.material=m;});}});this.scene.add(v);v.position.copy(this.enemy.position);});
    this.ui.boss(true,this.enemy.hp,this.realm.enemy);this.toast('THE ROAD REMEMBERS YOU.',1200);
  }
  updateEnemy(dt){
    if(!this.enemy||!this.player)return;const e=this.enemy,p=this.player;const dx=p.position.x-e.position.x,dz=p.position.z-e.position.z,d=Math.hypot(dx,dz);if(d>.1){e.position.x+=dx/d*dt*.9;e.position.z+=dz/d*dt*.9;}if(this.enemyVisual){this.enemyVisual.position.copy(e.position);this.enemyVisual.lookAt(p.position.x,this.enemyVisual.position.y,p.position.z);}e.attackTimer=Math.max(0,e.attackTimer-dt);if(d<2.1&&e.attackTimer<=0&&this.invulnerable<=0){this.hp-=12;e.attackTimer=1.1;this.invulnerable=.5;this.toast('THE CURSE STRIKES.',500);if(this.hp<=0){this.hp=100;this.player.position.set(0,.02,24);this.toast('THE CHECKPOINT HOLDS.',1000);}}}
  attack(){if(this.attackCooldown>0||!this.player)return;this.attackCooldown=.48;if(this.enemy&&this.player.position.distanceTo(this.enemy.position)<3){this.enemy.hp-=34;this.enemyHp=this.enemy.hp;this.ui.boss(true,this.enemy.hp,this.realm.enemy);this.toast('THE CURSE RECOILS.',350);if(this.enemy.hp<=0)this.defeatEnemy();}}
  defeatEnemy(){if(!this.enemy)return;this.step=3;this.ui.boss(false);if(this.enemyVisual)this.scene.remove(this.enemyVisual);this.enemy=null;this.enemyVisual=null;this.toast(this.realmIndex===7?'THE CURSE BREAKS.':'THE PATH IS CLEAR.',1200);this.addJournal('The opposition falls',`The ${this.realm.enemy} was not the truth. Something deeper is waiting beyond this realm.`);this.save();if(this.realmIndex===7)setTimeout(()=>this.finish(),1300);}
  interact(){
    if(!this.player)return;const p=this.player,landmark=new THREE.Vector3(0,0,-27),d=p.position.distanceTo(landmark);
    if(d<5.5&&this.step===0){this.step=1;this.addJournal(this.realm.name,this.realm.lore);this.dialogue('ANCIENT CHRONICLE',this.realm.lore);return;}
    if(d<5.5&&this.step===1){this.step=2;this.memories.push(this.realm.name);this.addJournal(`Memory — ${this.realm.name}`,this.realm.memory);this.dialogue('PIUU MEMORY',this.realm.memory);return;}
    if(this.step===3&&this.realmIndex<7&&p.position.z>28){this.nextRealm();return;}
    this.toast(this.step===0?'Approach the memory stone.':this.step===1?'The landmark holds a memory.':this.step===2?'Something hostile is approaching.':'Follow the road to the next realm.',800);
  }
  dialogue(label,text){this.paused=true;this.ui.dialogue(label,text,()=>{this.paused=false;if(this.step===2)this.spawnEnemy();this.save();});}
  nextRealm(){if(this.realmIndex>=7){this.finish();return;}this.realmIndex++;this.step=0;this.hp=100;this.save();this.loadRealm().then(()=>this.toast(`REALM DISCOVERED: ${this.realm.name.toUpperCase()}`,1800));}
  togglePause(){if(!this.running||this.ui.dialogueOpen||this.ui.journalOpen)return;this.paused=!this.paused;this.ui.pause(this.paused);}
  save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({realmIndex:this.realmIndex,step:this.step,hp:this.hp,memories:this.memories,journal:this.journal}));}catch{}}
  addJournal(title,text){this.journal.push({title,text});this.ui.refreshJournal(this);}
  toast(text,ms=1000){this.ui.toast(text,ms);}
  finish(){this.running=false;this.paused=true;this.renderer.setAnimationLoop(null);this.ui.finish();try{localStorage.removeItem(SAVE_KEY);}catch{}}
  loop(){if(!this.running)return;const dt=Math.min(this.clock.getDelta(),.05);const t=this.clock.elapsedTime;if(!this.paused)this.update(dt,t);this.render();}
  update(dt,t){
    if(!this.player)return;this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);let x=0,z=0;if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x-=1;if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x+=1;if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))z-=1;if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))z+=1;if(this.touch.active){x+=this.touch.x;z+=this.touch.y;}
    const len=Math.hypot(x,z)||1,speed=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?8.5:5.2;if(x||z){this.player.position.x=clamp(this.player.position.x+x/len*speed*dt,-3.7,3.7);this.player.position.z=clamp(this.player.position.z+z/len*speed*dt,-36,36);this.player.rotation.y=Math.atan2(x,z);}
    if(this.pressed.has('Space'))this.attack();if(this.pressed.has('KeyE'))this.interact();if(this.pressed.has('KeyJ'))this.ui.toggleJournal(this);this.pressed.clear();this.updateEnemy(dt);this.updateCamera(dt);this.world.update(t);if(this.step===3&&this.realmIndex<7&&this.player.position.z>30)this.nextRealm();this.ui.update(this);
  }
  updateCamera(dt){const p=this.player.position,desired=new THREE.Vector3(p.x+Math.sin(this.look.yaw)*7.8,p.y+4.6+this.look.pitch*3,p.z+Math.cos(this.look.yaw)*7.8);this.camera.position.lerp(desired,1-Math.pow(.001,dt));this.camera.lookAt(p.x,p.y+1.2,p.z);}
  render(){this.renderer.render(this.scene,this.camera);}
}

export function loadSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
export function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch{}}

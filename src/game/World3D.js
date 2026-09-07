import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const ASSETS = {
  warrior:'https://raw.githubusercontent.com/euuuuuuan/cairnfall-public/main/assets/vendor/quaternius_rpg/Warrior.gltf',
  cleric:'https://raw.githubusercontent.com/euuuuuuan/cairnfall-public/main/assets/vendor/quaternius_rpg/Cleric.gltf',
  tree:'https://raw.githubusercontent.com/euuuuuuan/cairnfall-public/main/assets/meshes/tree.glb',
  rock:'https://raw.githubusercontent.com/euuuuuuan/cairnfall-public/main/assets/meshes/rock.glb',
  pillar:'https://raw.githubusercontent.com/euuuuuuan/cairnfall-public/main/assets/meshes/pillar.glb',
  totem:'https://raw.githubusercontent.com/euuuuuuan/cairnfall-public/main/assets/meshes/totem.glb'
};

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(seed)=>{const x=Math.sin(seed*999.13)*43758.5453;return x-Math.floor(x)};

export class World3D {
  constructor(scene){
    this.scene=scene; this.loader=new GLTFLoader(); this.cache=new Map(); this.root=new THREE.Group(); this.root.name='PiukistanWorld'; scene.add(this.root); this.decor=[]; this.interactables=[]; this.portals=[];
  }
  async model(key){
    if(this.cache.has(key)) return this.cache.get(key).clone(true);
    const src=ASSETS[key];
    if(!src) return null;
    try{const gltf=await this.loader.loadAsync(src); const base=gltf.scene; base.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true; if(o.material) o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}}); this.cache.set(key,base); return base.clone(true);}catch(e){console.warn('Asset failed',key,e); return null;}
  }
  clear(){while(this.root.children.length)this.root.remove(this.root.children[0]);this.decor=[];this.interactables=[];this.portals=[];}
  async build(realm,index){
    this.clear();
    const theme=realm.theme;
    this.makeGround(realm,index);
    this.makeRoad(theme,index);
    await this.addProps(theme,index);
    this.makeLandmark(theme,index);
    this.makeAtmosphere(theme,index);
    this.makePortal(index);
  }
  makeGround(realm,index){
    const geo=new THREE.PlaneGeometry(90,90,36,36); const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);const wobble=Math.sin(x*.25+index)*.25+Math.cos(y*.19-index)*.18;pos.setZ(i,wobble+Math.sin(x*.08)*Math.cos(y*.07)*.4);}
    geo.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:realm.ground,roughness:.96,metalness:.02}); const mesh=new THREE.Mesh(geo,mat);mesh.rotation.x=-Math.PI/2;mesh.receiveShadow=true;this.root.add(mesh);
    for(let i=0;i<80;i++){const g=new THREE.IcosahedronGeometry(.08+rand(i+index)*.22,0);const m=new THREE.MeshStandardMaterial({color:new THREE.Color(realm.ground).offsetHSL(0,0,rand(i+7)*.12-.04),roughness:1});const rock=new THREE.Mesh(g,m);rock.position.set((rand(i*2+index)-.5)*70,.03,(rand(i*3+index)-.5)*70);rock.scale.y=.25;this.root.add(rock);}
  }
  makeRoad(theme,index){
    const roadMat=new THREE.MeshStandardMaterial({color:theme==='palace'?0x50443a:theme==='throne'?0x171019:0x25272b,roughness:.9});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(9,72),roadMat);road.rotation.x=-Math.PI/2;road.position.y=.015;this.root.add(road);
    for(let z=-34;z<35;z+=3){const rune=new THREE.Mesh(new THREE.BoxGeometry(.65,.025,.08),new THREE.MeshBasicMaterial({color:0x8d6f40,transparent:true,opacity:.24}));rune.position.set(Math.sin(z*.3)*1.2,.045,z);rune.rotation.y=Math.sin(z)*.4;this.root.add(rune);}
  }
  async addProps(theme,index){
    const keys=theme==='forest'||theme==='marsh'?['tree','rock','totem']:theme==='palace'||theme==='throne'?['pillar','rock','totem']:['rock','pillar','totem'];
    const tasks=[]; for(let i=0;i<18;i++){const key=keys[i%keys.length];tasks.push(this.model(key).then(obj=>{if(!obj)return; const side=i%2?-1:1;obj.position.set(side*(6+rand(i+index)*17),0,-31+i*3.4);obj.rotation.y=rand(i*4+index)*Math.PI*2;const s=theme==='forest'?(1.1+rand(i)*1.1):(0.8+rand(i)*.8);obj.scale.setScalar(s);this.root.add(obj);this.decor.push(obj);}));}
    await Promise.all(tasks);
    if(theme==='forest'||theme==='marsh'){for(let i=0;i<14;i++){const obj=await this.model('tree');if(!obj)break;obj.position.set((rand(i+40+index)-.5)*48,0,(rand(i+90+index)-.5)*62);obj.scale.setScalar(1+rand(i+3)*1.6);obj.rotation.y=rand(i+5)*6.28;this.root.add(obj);this.decor.push(obj);}}
  }
  makeLandmark(theme,index){
    const group=new THREE.Group(); group.position.set(0,0,-27); this.root.add(group);
    const stoneMat=new THREE.MeshStandardMaterial({color:theme==='palace'?0x776b5d:theme==='throne'?0x24121c:0x35343a,roughness:.86});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(3.4,4,1.2,8),stoneMat);base.position.y=.6;group.add(base);
    const spire=new THREE.Mesh(new THREE.ConeGeometry(2.25,7,8),stoneMat);spire.position.y=4.2;group.add(spire);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.4,.06,8,48),new THREE.MeshBasicMaterial({color:0xd8b66e,transparent:true,opacity:.75}));ring.rotation.x=Math.PI/2;ring.position.y=2.8;group.add(ring);
    const light=new THREE.PointLight(theme==='throne'?0xa14b78:0xd8b66e,3,12);light.position.y=3;group.add(light);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.45),new THREE.MeshBasicMaterial({color:0x171218,transparent:true,opacity:.82}));label.position.set(0,7.8,0);label.rotation.x=-Math.PI/2;group.add(label);
    this.interactables.push({position:new THREE.Vector3(0,0,-27),type:'memory',radius:5,used:false});
  }
  makeAtmosphere(theme,index){
    const colors={road:0x7e8499,ash:0x8a5c58,marsh:0x41696a,forest:0x496c54,veil:0x76628e,bones:0x8b6860,palace:0xa58d62,throne:0x8e3d59};
    const c=colors[theme]||0x667080; const fog=new THREE.FogExp2(c,.028+(theme==='throne'?.012:0));this.scene.fog=fog;this.scene.background=new THREE.Color(c).multiplyScalar(.18);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(4,24,24),new THREE.MeshBasicMaterial({color:0xe4dcc8}));moon.position.set(-25,25,-38);this.root.add(moon);
    for(let i=0;i<35;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.035+rand(i+index)*.09,6,6),new THREE.MeshBasicMaterial({color:0xcbbf9f,transparent:true,opacity:.16}));p.position.set((rand(i+20)-.5)*60,3+rand(i+30)*14,(rand(i+50)-.5)*55);this.root.add(p);this.decor.push(p);}
  }
  makePortal(index){
    if(index>=7)return;
    const group=new THREE.Group();group.position.set(0,0,34);this.root.add(group);
    const mat=new THREE.MeshStandardMaterial({color:0x24151f,roughness:.4,metalness:.45});
    for(const x of [-2.7,2.7]){const p=new THREE.Mesh(new THREE.BoxGeometry(.75,5.8,.75),mat);p.position.y=2.9;p.position.x=x;group.add(p);}
    const top=new THREE.Mesh(new THREE.BoxGeometry(6.1,.8,.8),mat);top.position.y=5.6;group.add(top);
    const r=new THREE.Mesh(new THREE.RingGeometry(1.9,2.3,32),new THREE.MeshBasicMaterial({color:0xb56a82,transparent:true,opacity:.55,side:THREE.DoubleSide}));r.position.y=3;group.add(r);
    const l=new THREE.PointLight(0xb65d7e,5,13);l.position.set(0,3,0);group.add(l);this.portals.push({position:new THREE.Vector3(0,0,34),radius:4});
  }
  update(t){for(const o of this.decor){if(!o.parent)continue;if(o.userData.float){o.position.y=o.userData.baseY+Math.sin(t*o.userData.speed+o.userData.phase)*.3;}}}
}

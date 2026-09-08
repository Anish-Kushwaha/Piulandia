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

const hash=n=>{const x=Math.sin(n*127.31)*43758.5453123;return x-Math.floor(x)};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export class World3D {
  constructor(scene){
    this.scene=scene;
    this.loader=new GLTFLoader();
    this.cache=new Map();
    this.root=new THREE.Group();
    this.root.name='PIUKISTAN_WORLD';
    scene.add(this.root);
    this.decor=[];
    this.interactables=[];
    this.portals=[];
    this.fx=[];
  }
  async model(key){
    if(this.cache.has(key)) return this.cache.get(key).clone(true);
    const src=ASSETS[key];
    if(!src) return null;
    try{
      const gltf=await this.loader.loadAsync(src);
      const base=gltf.scene;
      base.traverse(o=>{
        if(o.isMesh){
          o.castShadow=true;o.receiveShadow=true;
          if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
        }
      });
      this.cache.set(key,base);
      return base.clone(true);
    }catch(e){console.warn('[Piukistan] Asset failed',key,e);return null;}
  }
  clear(){
    while(this.root.children.length)this.root.remove(this.root.children[0]);
    this.decor=[];this.interactables=[];this.portals=[];this.fx=[];
  }
  async build(realm,index){
    this.clear();
    this.makeEnvironment(realm,index);
    this.makeRoad(realm,index);
    this.makeBounds(realm,index);
    this.makeLandmark(realm,index);
    await this.addProps(realm,index);
    this.makeTorches(index);
    this.makePortal(index);
    this.makeSigils(index);
    this.makeBiomeEffects(index);
  }
  makeEnvironment(realm,index){
    const fogColors=[0x5f687b,0x7b554e,0x31565c,0x426044,0x62547d,0x755b57,0x897659,0x6c3046];
    const c=new THREE.Color(fogColors[index%fogColors.length]);
    this.scene.background=c.clone().multiplyScalar(.12);
    this.scene.fog=new THREE.FogExp2(c,.014+index*.002);
    const hemi=new THREE.HemisphereLight(0xbcc4d1,0x111018,.72);this.root.add(hemi);
    const moon=new THREE.DirectionalLight(0xd9d6cc,1.2);moon.position.set(-25,35,-24);moon.castShadow=true;
    moon.shadow.mapSize.set(1536,1536);moon.shadow.camera.left=-45;moon.shadow.camera.right=45;moon.shadow.camera.top=45;moon.shadow.camera.bottom=-45;this.root.add(moon);
    const fill=new THREE.PointLight(index>=6?0xb46c82:0x6f86a6,2,34);fill.position.set(0,8,-20);this.root.add(fill);
    const geo=new THREE.PlaneGeometry(100,100,48,48);const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*.16+index)*.22+Math.cos(y*.11-index)*.17+Math.sin(x*.035)*Math.cos(y*.05)*.7);}
    geo.computeVertexNormals();
    const ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:realm.ground||0x242733,roughness:.97,metalness:.01}));
    ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.name='Terrain';this.root.add(ground);
    for(let i=0;i<100;i++){
      const s=.06+hash(i+index*11)*.28;
      const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),new THREE.MeshStandardMaterial({color:new THREE.Color(realm.ground||0x242733).offsetHSL((hash(i+5)-.5)*.05,0,hash(i+7)*.16-.08),roughness:1}));
      rock.position.set((hash(i*3+index)-.5)*82,.03,(hash(i*7+index)-.5)*82);rock.scale.y=.25+hash(i)*.5;this.root.add(rock);this.decor.push(rock);
    }
  }
  makeRoad(realm,index){
    const color=index===7?0x151018:index===6?0x3b3027:index===1?0x4a3937:0x20252b;
    const road=new THREE.Mesh(new THREE.PlaneGeometry(10,78),new THREE.MeshStandardMaterial({color,roughness:.92}));
    road.rotation.x=-Math.PI/2;road.position.y=.035;road.receiveShadow=true;road.name='The_Last_Road';this.root.add(road);
    for(let z=-36;z<37;z+=2.5){
      const rune=new THREE.Mesh(new THREE.BoxGeometry(.07,.035,.7),new THREE.MeshBasicMaterial({color:index>=6?0xd9b879:0x847a69,transparent:true,opacity:.3}));
      rune.position.set(Math.sin(z*.33)*1.25,.065,z);rune.rotation.y=Math.sin(z*2.1)*.3;this.root.add(rune);
    }
  }
  makeBounds(realm,index){
    const mat=new THREE.MeshStandardMaterial({color:realm.ground||0x20232a,roughness:1});
    for(const side of[-1,1])for(let i=0;i<14;i++){
      const h=2+hash(i+index*13)*7,w=.4+hash(i+30)*1.4;
      const m=new THREE.Mesh(new THREE.ConeGeometry(w,w*2.6,5),mat);
      m.position.set(side*(13+hash(i+90)*24),h/2,-37+i*5.7+hash(i)*2);m.rotation.y=hash(i+50)*6.28;m.castShadow=true;this.root.add(m);this.decor.push(m);
    }
  }
  async addProps(realm,index){
    const forest=index===2||index===3,palace=index>=6;
    const keys=forest?['tree','rock','totem']:palace?['pillar','rock','totem']:['rock','pillar','totem'];
    const jobs=[];
    for(let i=0;i<48;i++){
      const key=keys[i%keys.length];
      jobs.push(this.model(key).then(obj=>{
        if(!obj)return;
        const side=i%2?-1:1;
        obj.position.set(side*(7+hash(i+10)*21),0,-35+i*1.45+hash(i+20)*2.1);
        obj.scale.setScalar(forest?1.35+hash(i+index)*1.7:.65+hash(i+index)*1.1);
        obj.rotation.y=hash(i*8+index)*6.283;
        this.root.add(obj);this.decor.push(obj);
      }));
    }
    await Promise.all(jobs);
    if(forest){
      const more=[];
      for(let i=0;i<45;i++)more.push(this.model('tree').then(o=>{
        if(!o)return;o.position.set((hash(i+200+index)-.5)*72,0,(hash(i+400+index)-.5)*72);o.scale.setScalar(1+hash(i+2)*2.2);o.rotation.y=hash(i+3)*6.28;this.root.add(o);this.decor.push(o);
      }));
      await Promise.all(more);
    }
  }
  makeLandmark(realm,index){
    const g=new THREE.Group();g.name='Memory_Stone';g.position.set(0,0,-26);this.root.add(g);
    const stone=index===7?0x2b101c:index===6?0x655548:0x34353b;
    const mat=new THREE.MeshStandardMaterial({color:stone,roughness:.87});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(3.6,4.4,1.4,10),mat);base.position.y=.7;base.castShadow=base.receiveShadow=true;g.add(base);
    const spire=new THREE.Mesh(new THREE.ConeGeometry(2.35,7.2,9),mat);spire.position.y=4.95;spire.castShadow=spire.receiveShadow=true;g.add(spire);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55,.07,10,48),new THREE.MeshBasicMaterial({color:index>=6?0xd8a963:0xc8b27a,transparent:true,opacity:.82}));ring.rotation.x=Math.PI/2;ring.position.y=2.95;g.add(ring);
    const light=new THREE.PointLight(index>=6?0xb34f77:0xd9bd78,3.6,12);light.position.y=3.2;g.add(light);
    this.interactables.push({type:'memory',position:V(0,0,-26),radius:5.2,used:false});
  }
  makeTorches(index){
    for(const x of[-5.2,5.2]){
      const g=new THREE.Group();g.position.set(x,0,-16);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,2.4,8),new THREE.MeshStandardMaterial({color:0x2d2520,roughness:.8}));pole.position.y=1.2;g.add(pole);
      const flame=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),new THREE.MeshBasicMaterial({color:index===7?0x9e315f:index===1?0xdf8f45:0xceb16e}));flame.position.y=2.55;flame.scale.y=1.4;g.add(flame);
      const light=new THREE.PointLight(index===7?0xa23b68:index===1?0xd4773c:0xcfa967,2.8,7);light.position.y=2.5;g.add(light);this.root.add(g);this.fx.push({flame,light,phase:hash(x+index)});
    }
  }
  makePortal(index){
    if(index>=7)return;
    const g=new THREE.Group();g.name='Realm_Gate';g.position.set(0,0,34);this.root.add(g);
    const stone=new THREE.MeshStandardMaterial({color:0x24202a,roughness:.5,metalness:.35});
    for(const x of[-2.9,2.9]){const p=new THREE.Mesh(new THREE.BoxGeometry(.8,6.4,.9),stone);p.position.set(x,3.2,0);p.castShadow=p.receiveShadow=true;g.add(p);}
    const top=new THREE.Mesh(new THREE.BoxGeometry(6.6,.85,.9),stone);top.position.y=6.05;top.castShadow=top.receiveShadow=true;g.add(top);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.05,.22,14,48),new THREE.MeshBasicMaterial({color:0xa95c78,transparent:true,opacity:.7}));ring.position.y=3;ring.rotation.x=Math.PI/2;g.add(ring);
    const glow=new THREE.PointLight(0xb45c7a,5,14);glow.position.y=3;g.add(glow);
    this.portals.push({position:V(0,0,34),radius:4,group:g,ring,glow});
  }
  makeSigils(index){
    for(let i=0;i<24;i++){
      const a=hash(i*4+index)*Math.PI*2,r=8+hash(i*9+index)*21;
      const m=new THREE.Mesh(new THREE.TorusGeometry(.45,.035,6,18),new THREE.MeshBasicMaterial({color:index===7?0xc47b9e:0x8e7d63,transparent:true,opacity:.28}));
      m.position.set(Math.cos(a)*r,.19,Math.sin(a)*r);m.rotation.x=Math.PI/2;this.root.add(m);this.decor.push(m);
    }
  }
  makeBiomeEffects(index){
    if(index===1){
      for(let i=0;i<70;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.035+hash(i)*.08,0),new THREE.MeshBasicMaterial({color:0xb69284,transparent:true,opacity:.25}));m.position.set((hash(i)-.5)*60,2+hash(i+4)*15,(hash(i+8)-.5)*60);m.userData.baseY=m.position.y;m.userData.phase=hash(i+9)*6.28;m.userData.speed=.3+hash(i+5);this.root.add(m);this.decor.push(m);}
    }
    if(index===2||index===3){
      for(let i=0;i<55;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color:index===3?0xb8cc78:0x91c9a7,transparent:true,opacity:.55}));m.position.set((hash(i+30)-.5)*50,.6+hash(i+50)*7,(hash(i+70)-.5)*50);m.userData.baseY=m.position.y;m.userData.phase=hash(i+80)*6.28;m.userData.speed=.5+hash(i+90);this.root.add(m);this.decor.push(m);}
    }
    if(index===5){
      for(let i=0;i<20;i++){const x=(hash(i)-.5)*35,z=(hash(i+3)-.5)*65;const pool=new THREE.Mesh(new THREE.CircleGeometry(.5+hash(i+4)*1.4,18),new THREE.MeshBasicMaterial({color:0x26070d,transparent:true,opacity:.65}));pool.rotation.x=-Math.PI/2;pool.position.set(x,.07,z);this.root.add(pool);}
    }
  }
  update(t){
    for(const f of this.fx){const q=.5+.5*Math.sin(t*6+f.phase);f.flame.scale.y=1.1+q*.6;f.light.intensity=2.1+q*1.5;}
    for(const p of this.decor){if(p.userData.baseY!==undefined)p.position.y=p.userData.baseY+Math.sin(t*p.userData.speed+p.userData.phase)*.12;}
    for(const gate of this.portals){gate.ring.rotation.z=t*.45;gate.glow.intensity=4.2+Math.sin(t*3)*.8;}
  }
}

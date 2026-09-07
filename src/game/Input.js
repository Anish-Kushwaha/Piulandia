export class Input {
  constructor(){this.keys=new Set();this.pressed=new Set();addEventListener('keydown',e=>{if(!e.repeat)this.pressed.add(e.code);this.keys.add(e.code)});addEventListener('keyup',e=>this.keys.delete(e.code))}
  down(...codes){return codes.some(c=>this.keys.has(c))} hit(...codes){return codes.some(c=>this.pressed.has(c))} end(){this.pressed.clear()}
}

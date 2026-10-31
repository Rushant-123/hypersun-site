/* Bright future energy campus. Passing birds, an articulated solar robot and quiet pointer depth.
   Five-second landscape entrance; a solar robot takes a short walk, then rests. Time stops offscreen or in background tabs; reduced motion stays still. */
(() => {
  'use strict';
  const hero = document.querySelector('.energy-hero');
  if (!hero) return;
  const stage = hero.querySelector('.energy-stage');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d', {alpha: false});
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const base = new URL('hero/', document.currentScript.src);
  const load = file => new Promise((resolve, reject) => {
    const image = new Image(); image.decoding = 'async';
    image.onload = () => resolve(image); image.onerror = reject;
    image.src = new URL(file, base).href;
  });
  let ground, robot, ready = false, visible = true, finished = false;
  let w=0, h=0, dpr=1, time=0, last=0, raf=0, drawn=0;
  let pointer=0, target=0;
  function running(){ return ready && visible && !document.hidden && !finished && !reduce.matches; }
  function sync(){
    if(running() && !raf){last=0;raf=requestAnimationFrame(tick);}
    if(!running()){cancelAnimationFrame(raf);raf=0;last=0;if(ready)draw();}
  }
  function resize(){
    const box=stage.getBoundingClientRect(); w=box.width;h=box.height;dpr=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    if(ready) draw();
  }
  function bird(x,y,size,phase){
    const wing=Math.sin(phase)*.55;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(phase*.21)*.06);
    ctx.fillStyle='#3c4542';ctx.beginPath();
    ctx.moveTo(-size, -size*(.15+wing));
    ctx.quadraticCurveTo(-size*.5, -size*.11, 0,size*.12);
    ctx.quadraticCurveTo(size*.5,-size*.11,size,-size*(.15+wing));
    ctx.quadraticCurveTo(size*.55,size*.14,size*.15,size*.24);
    ctx.lineTo(0,size*.16);ctx.lineTo(-size*.15,size*.24);
    ctx.quadraticCurveTo(-size*.55,size*.14,-size,-size*(.15+wing));ctx.fill();ctx.restore();
  }
  const robotRig=window.createTerraceRobot?.();
  function drawRobot(gx,gy,gw,gh,mobile){
    if(!robot&&!robotRig)return;
    const t=reduce.matches||!robotRig?14:time;
    const walkTime=Math.max(0,Math.min(t-.6,3.4))+Math.max(0,Math.min(t-5.4,6.6));
    const progress=Math.min(1,walkTime/10);
    const walking=(t>.6&&t<4)||(t>5.4&&t<12);
    const height=Math.min(138,gh*.14),size=height/0.8;
    const x=gx+gw*(mobile?(.60+.105*progress):(.27+.21*progress));
    const y=gy+gh*(.904+.006*progress);
    ctx.save();ctx.fillStyle='rgba(52,40,24,.19)';ctx.beginPath();ctx.ellipse(x,y+1,height*.23,height*.032,0,0,Math.PI*2);ctx.fill();
    if(robotRig){ctx.drawImage(robotRig.render(walkTime,walking,t),x-size/2,y-size*.90,size,size);}
    else{const width=height*367/443;ctx.drawImage(robot,567,45,367,443,x-width/2,y-height,width,height);}
    ctx.restore();
  }
  function draw(){
    if(!ready||!w||!h)return;
    const mobile=w<=760;
    const sceneTime=Math.min(time,5);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;
    ctx.fillStyle='#eff6f8';ctx.fillRect(0,0,w,h);
    const gw=mobile?850:Math.max(w+16,h*1.5);
    const gh=gw*ground.height/ground.width;
    const gx=mobile?w-gw+25:(w-gw)/2+pointer*5;
    const gy=h-gh+2;
    ctx.drawImage(ground,gx,gy,gw,gh);
    const flight=(sceneTime+5)%37;
    if(!reduce.matches && flight<22){
      for(let i=0;i<3;i++){
        const progress=(flight-i*.65)/22;
        const x=-60+progress*(w+150);
        const y=h*(mobile?.23:.18)+Math.sin(progress*3.4)*16+i*12;
        bird(x,y,mobile?5+i:7+i*1.7,sceneTime*3.1+i*1.9);
      }
    }
    drawRobot(gx,gy,gw,gh,mobile);
  }
  function tick(now){
    raf=0;if(!running())return;
    if(last)time+=Math.min((now-last)/1000,.1);last=now;
    if(time>=(robotRig?14:5)){finished=true;pointer=target=0;draw();return;}
    if(time>=5){pointer=target=0;}else{pointer+=(target-pointer)*.055;}
    // Cap paint frequency while keeping motion elapsed-time based.
    if(now-drawn>=1000/30){draw();drawn=now;}
    raf=requestAnimationFrame(tick);
  }
  hero.addEventListener('pointermove',e=>{if(fine.matches&&running()){const r=hero.getBoundingClientRect();target=(e.clientX-r.left)/r.width*2-1;}},{passive:true});
  hero.addEventListener('pointerleave',()=>{target=0;},{passive:true});
  document.addEventListener('visibilitychange',sync);
  reduce.addEventListener('change',()=>{pointer=target=0;sync();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);
  new ResizeObserver(resize).observe(stage);
  Promise.all([load('energy-future-campus.webp'),robotRig?Promise.resolve(null):load('solar-robot-walk.webp').catch(()=>null)]).then(images=>{
    [ground,robot]=images;ready=true;resize();stage.classList.add('ready');sync();
  }).catch(()=>{/* Layered HTML artwork stays visible if canvas assets cannot load. */});
})();

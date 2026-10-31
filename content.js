async function drawRecordedCharts() {
  const response = await fetch('assets/gv.json');
  if (!response.ok) throw new Error('Plant data could not be loaded');
  const g = await response.json();
  function chart(id,expected,actual) {
    const svg=document.getElementById(id);
    if(!svg)return;
    svg.setAttribute('viewBox','0 0 600 240');
    const max=Math.max(...expected,...actual);
    const curve=(values,color,dashed=false)=>{
      const points=values.slice(24,73).map((value,i)=>`${(i/48*600).toFixed(2)},${(224-value/max*208).toFixed(2)}`).join(' ');
      return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke" ${dashed?'stroke-dasharray="4 5"':''}/>`;
    };
    svg.innerHTML='<path d="M0 16H600M0 120H600M0 224H600" fill="none" stroke="#d5d8d6" stroke-width=".7" vector-effect="non-scaling-stroke"/>'+curve(expected,'#929795',true)+curve(actual,'#252725');
  }
  chart('inverter-loss-chart',g.mod[36],g.act[36]);
  chart('schedule-preview-chart',g.dsm.da,g.dsm.act);
}
drawRecordedCharts().catch(() => {
  document.querySelectorAll('.recorded-diagnostic figcaption,.chart-caption').forEach(el => {el.textContent='Recorded data unavailable. Open the demo to try again.';});
});

function openFilmFromHash() {if(location.hash==='#film')document.getElementById('watch').click();}
addEventListener('hashchange',openFilmFromHash);
document.querySelectorAll('a[href="#film"]').forEach(a=>a.addEventListener('click',e=>{if(location.hash==='#film'){e.preventDefault();openFilmFromHash();}}));
openFilmFromHash();

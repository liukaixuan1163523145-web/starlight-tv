(function(){
const P={
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 film:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8.5 4.5v5M15.5 4.5v5"/>',
 live:'<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 rew:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3.8h3.8"/><text x="12.6" y="15.4" font-size="6.6" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700" font-family="system-ui">10</text>',
 fwd:'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v3.8h-3.8"/><text x="11.4" y="15.4" font-size="6.6" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700" font-family="system-ui">10</text>',
 full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 list:'<path d="M4 6h16M4 12h16M4 18h10"/>',
 refresh:'<path d="M19.5 11A7.5 7.5 0 0 0 6 7.2L4.5 8.5M4.5 4.5v4h4M4.5 13A7.5 7.5 0 0 0 18 16.8l1.5-1.3M19.5 19.5v-4h-4"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 alert:'<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
 signal:'<path d="M3 9.5a14 14 0 0 1 18 0M6.5 13a9 9 0 0 1 11 0M10 16.5a3.5 3.5 0 0 1 4 0"/><path d="M4 4l16 16"/>',
 chev:'<path d="m9 5 7 7-7 7"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
 box:'<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5 12 11l8-3.5M12 11v9"/>'
};
const F2={play:'<path d="M8 5.2v13.6L19 12z"/>',pause:'<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>',
 star:'<path d="M12 2.5c.6 5 2.9 8.3 9.5 9.5-6.6 1.2-8.9 4.5-9.5 9.5-.6-5-2.9-8.3-9.5-9.5 6.6-1.2 8.9-4.5 9.5-9.5z"/>'};
const ic=n=>P[n]?`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`:`<svg class="i f" viewBox="0 0 24 24" aria-hidden="true">${F2[n]}</svg>`;


window.StarlightIcon=ic;
})();

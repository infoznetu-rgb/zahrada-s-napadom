(()=>{
  const PAGE_URL="https://www.facebook.com/zahradasnapadom";
  const loadBtn=document.querySelector("#facebook-load");
  const frameWrap=document.querySelector("#facebook-frame-wrap");
  if(!loadBtn||!frameWrap)return;

  let loaded=false;

  function loadFacebook(){
    if(loaded)return;
    loaded=true;
    loadBtn.disabled=true;
    loadBtn.textContent="Načítavam Facebook…";

    const iframe=document.createElement("iframe");
    const params=new URLSearchParams({
      href:PAGE_URL,
      tabs:"timeline",
      width:"500",
      height:"620",
      small_header:"false",
      adapt_container_width:"true",
      hide_cover:"false",
      show_facepile:"true"
    });

    iframe.src="https://www.facebook.com/plugins/page.php?"+params.toString();
    iframe.title="Facebook stránka Záhrada s nápadom";
    iframe.width="500";
    iframe.height="620";
    iframe.style.border="none";
    iframe.style.overflow="hidden";
    iframe.scrolling="no";
    iframe.frameBorder="0";
    iframe.allowFullscreen=true;
    iframe.allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
    iframe.loading="lazy";

    const timeout=setTimeout(()=>{
      if(!iframe.dataset.ready){
        loadBtn.disabled=false;
        loadBtn.textContent="Otvoriť Facebook priamo";
        loadBtn.onclick=()=>window.open(PAGE_URL,"_blank","noopener");
      }
    },8000);

    iframe.addEventListener("load",()=>{
      iframe.dataset.ready="1";
      clearTimeout(timeout);
      loadBtn.textContent="Facebook načítaný";
      loadBtn.disabled=true;
    });

    frameWrap.innerHTML="";
    frameWrap.classList.add("is-loaded");
    frameWrap.appendChild(iframe);
  }

  loadBtn.addEventListener("click",loadFacebook);
})();
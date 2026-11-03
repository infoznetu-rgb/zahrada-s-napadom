// Keep password recovery on the website origin, including a Site URL fallback.
(()=>{
  if(new URLSearchParams(location.hash.slice(1)).get("type")!=="recovery")return;
  location.replace(new URL("/admin/",location.origin).href+location.hash);
})();

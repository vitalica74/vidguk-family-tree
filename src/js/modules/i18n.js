(function(){
  const supported = ["uk","en","pl","de"];
  let dict = {};
  async function loadLang(lang){
    if(!supported.includes(lang)) lang = "uk";
    try{
      const res = await fetch(`src/lang/${lang}.json`, {cache:"no-cache"});
      dict = await res.json();
      localStorage.setItem("app.lang", lang);
      applyI18n();
      const sel = document.getElementById("languageSelect");
      if(sel) sel.value = lang;
    }catch(e){ console.warn("i18n load failed", e); }
  }
  function t(key){ return dict[key] || key; }
  function applyI18n(){
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if(dict[key]) el.textContent = dict[key];
    });
  }
  window.I18N = { loadLang, t, applyI18n };
  window.addEventListener("DOMContentLoaded", () => {
    const sel = document.getElementById("languageSelect");
    const lang = localStorage.getItem("app.lang") || (navigator.language || "uk").slice(0,2);
    if(sel) sel.addEventListener("change", e => loadLang(e.target.value));
    loadLang(lang);
  });
})();

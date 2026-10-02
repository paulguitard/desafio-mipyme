export const DESKTOP_SCALE_SCRIPT = `(function () {
  var BREAKPOINT = 768;
  function apply() {
    var html = document.documentElement;
    if (window.innerWidth < BREAKPOINT) {
      html.style.fontSize = "";
      return;
    }
    var iw = window.innerWidth || 1;
    var ih = window.innerHeight || 1;
    var zoom = window.outerWidth && iw ? window.outerWidth / iw : 1;
    if (!(zoom >= 0.75 && zoom <= 3)) zoom = 1;
    var px = Math.min(16, (iw * zoom) / 120, (ih * zoom) / 56.25);
    html.style.fontSize = px + "px";
  }
  apply();
  window.addEventListener("resize", apply);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", apply);
})();`;

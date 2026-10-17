/* Foothold funnel snippet.
 * <script src="https://YOUR-FOOTHOLD-HOST/t.js" data-p="PRODUCT_ID" defer></script>
 * Fires a `visit` on load, then call window.fh('signup'), window.fh('paywall'),
 * window.fh('payment') from your app at those moments.
 */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var p = s.getAttribute("data-p");
  if (!p) return;
  var host = s.src.replace(/\/t\.js.*$/, "");
  var key = "fh_anon";
  var a;
  try {
    a = localStorage.getItem(key);
    if (!a) {
      a = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, a);
    }
  } catch (e) {
    a = "na";
  }
  function send(e) {
    var body = JSON.stringify({ p: p, e: e, a: a });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(host + "/api/track", new Blob([body], { type: "application/json" }));
        return;
      }
    } catch (err) {}
    try {
      fetch(host + "/api/track", { method: "POST", body: body, headers: { "content-type": "application/json" }, keepalive: true });
    } catch (err) {
      new Image().src = host + "/api/track?p=" + p + "&e=" + e + "&a=" + a;
    }
  }
  window.fh = send;
  send("visit");
})();

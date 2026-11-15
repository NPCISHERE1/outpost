/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Entry point */

/* Hook your game here. onBegin runs once, when the player clicks
   "Begin mission" at the mission console (that also unlocks the tablet). */
window.OutpostMenu = {
  player,
  onBegin(p) {
    console.log('MISSION STARTED', p);
  }
};

loadWeather();            // start fetching real NASA data in the background
show('sTitle');

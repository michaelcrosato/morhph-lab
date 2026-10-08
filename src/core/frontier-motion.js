/** Continuous, normalized mixer channels. These clips do not apply physical forces. */
const clip=(label,extra)=>({label,rate:.65,stride:0,lateral:0,lift:0,stance:.6,bob:.025,sway:.012,pitch:0,flap:0,tail:.2,jaw:.02,tuck:.18,wingRate:1,wingOpen:1,pulse:0,paddle:0,comb:0,pump:0,spread:0,spin:0,fold:0,scull:0,...extra});
export const FRONTIER_MOTION=Object.freeze({
  combbeat:clip('Comb wave',{comb:1,wingRate:1.5,bob:.008}),
  chainpump:clip('Linked pulse',{pump:1,pulse:.7,wingRate:.7,bob:.028}),
  radialstroke:clip('Radial stroke',{spread:1,pump:.25,wingRate:.65,bob:.055}),
  metachronal:clip('Oar sequence',{scull:1,paddle:.6,wingRate:1.15,tail:.4}),
  canopy:clip('Canopy breath',{spread:.85,fold:.25,wingRate:.36,bob:.085}),
  corkscrew:clip('Helix turn',{spin:.7,wingRate:.65,bob:.035}),
  turbines:clip('Duct rotation',{spin:1,wingRate:2.4,bob:.012}),
  concertina:clip('Pleat stroke',{fold:1,flap:.35,wingRate:.85,bob:.045})
});

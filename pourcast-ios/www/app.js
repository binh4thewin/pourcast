/* =====================================================================
   POURFECT app script, organized top-down. Order matters only at INIT,
   which is the last thing in the file. Everything above is declarations.

   1. DATA        tools, recipes
   2. STATE       runtime variables
   3. STORE       persistence (settings, beans, log) with in-memory fallback
   4. ENGINES     schedule, drainage physics, temperature, bean age,
                  flow rate, insights
   5. DEVICES     bluetooth scale, simulator
   6. SETUP UI    chips, recipe card, dose card, previews
   7. BREW UI     countdown, timeline, instruction, bars, living method list
   8. RATING+LOG  stars, taste tags, report, history
   9. INIT        restore settings, first render
===================================================================== */

/* ============================ 1. DATA ============================ */
const TOOLS=[
 {id:'v60',name:'Hario V60'},{id:'switch',name:'Hario Switch'},{id:'kalita',name:'Kalita Wave'},{id:'chemex',name:'Chemex'},
 {id:'origami',name:'Origami'},{id:'melitta',name:'Melitta / flat wedge'},
 {id:'aeropress',name:'AeroPress'},{id:'frenchpress',name:'French Press'},{id:'phin',name:'Phin (Việt Nam)'},{id:'any',name:'Any dripper'}
];
/* Step types: pour{frac,dur} wait{dur} stir{dur} swirl{dur}.
   timing 'rigid' = championship clock (weights scale, times fixed);
   'adaptive' = pour durations scale with water volume.
   tempC is calibrated for roastRec. */
const RECIPES=[
 {id:'basic6040',level:'beginner',tool:['v60','origami','any'],champ:'Beginner-friendly two-pour',timing:'adaptive',
  name:'Basic 60/40 · Two Pours',ratio:16,defaultDose:18,grind:'Medium',tempC:[92,94],roastRec:'Medium',
  desc:'A no-fuss two-pour V60 after the bloom: one bigger pour for 60% of the water, a quick stir, then a final pour for the last 40%. Forgiving and easy to nail with or without a scale.',
  steps:[
    {type:'pour',frac:.15,dur:10,label:'Bloom pour'},
    {type:'wait',dur:30,label:'Bloom rest',note:'wet all the grounds, let it degas'},
    {type:'pour',frac:.51,dur:30,label:'Pour 1 → 60% · steady spiral',note:'the bigger of the two pours'},
    {type:'stir',dur:8,label:'Stir · 1x each way',note:'knock grounds off the walls, even the bed'},
    {type:'wait',dur:5,label:'Let bed settle'},
    {type:'pour',frac:.34,dur:25,label:'Pour 2 → 100% · ease off',note:'final 40%, gentler to the finish'},
    {type:'swirl',dur:5,label:'Gentle swirl'},
    {type:'wait',dur:45,label:'Let it drain'}
 ]},
 {id:'kasuya46',level:'intermediate',tool:['v60','origami','any'],champ:'Competition-born classic',timing:'rigid',
  name:'The 4:6 · World Champ Method',ratio:15,defaultDose:20,grind:'Coarse',tempC:[92,96],roastRec:'Light',
  desc:'Five equal pours on a fixed 45s clock, letting the bed fully drain between pours. First 40% of water tunes sweetness vs acidity, last 60% tunes strength.',
  steps:[
    {type:'pour',frac:.20,dur:10,label:'Pour 1 · flavor'},
    {type:'wait',dur:35,label:'Drain fully',note:'wait for a dry-ish bed'},
    {type:'pour',frac:.20,dur:10,label:'Pour 2 · flavor'},
    {type:'wait',dur:35,label:'Drain fully',note:'wait for a dry-ish bed'},
    {type:'pour',frac:.20,dur:10,label:'Pour 3 · strength'},
    {type:'wait',dur:35,label:'Drain fully',note:'wait for a dry-ish bed'},
    {type:'pour',frac:.20,dur:10,label:'Pour 4 · strength'},
    {type:'wait',dur:35,label:'Drain fully'},
    {type:'pour',frac:.20,dur:10,label:'Pour 5 · strength'},
    {type:'wait',dur:45,label:'Final drawdown'}
  ]},
 {id:'winton5',level:'intermediate',tool:['v60','origami','any'],champ:'Modern competition style',timing:'rigid',
  name:'Five Even Pours · World Champ Method',ratio:15,defaultDose:20,grind:'Medium-coarse',tempC:[92,94],roastRec:'Light',
  desc:'Five equal center pours on a 40s clock. No dedicated bloom (pour 1 acts as one), no stirs, no swirls, minimal agitation.',
  steps:[
    {type:'pour',frac:.20,dur:12,label:'Pour 1 · center'},{type:'wait',dur:28,label:'Settle'},
    {type:'pour',frac:.20,dur:12,label:'Pour 2 · center'},{type:'wait',dur:28,label:'Settle'},
    {type:'pour',frac:.20,dur:12,label:'Pour 3 · center'},{type:'wait',dur:28,label:'Settle'},
    {type:'pour',frac:.20,dur:12,label:'Pour 4 · center'},{type:'wait',dur:28,label:'Settle'},
    {type:'pour',frac:.20,dur:12,label:'Pour 5 · center'},{type:'wait',dur:50,label:'Final drawdown'}
  ]},
 {id:'hoffmann',level:'intermediate',tool:['v60','origami'],champ:'World-champion barista\'s method',timing:'adaptive',
  name:'The Two-Speed V60 · World Champ Method',ratio:16.7,defaultDose:30,grind:'Medium-fine',tempC:[95,100],roastRec:'Light',roastNote:'the hotter end for the lightest roasts',
  desc:'Big bloom with a swirl, then ONE continuous pour with a speed change: brisk to 60% by 1:15, then ease off ~20% slower to 100% by 1:45 (shown as two steps so each phase gets its own flow-rate target). Stir + final swirl for a flat bed; drawdown ~3:30.',
  steps:[
    {type:'pour',frac:.12,dur:10,label:'Bloom pour · 2x coffee'},
    {type:'swirl',dur:8,label:'Swirl the bloom',note:'wet every ground'},
    {type:'wait',dur:27,label:'Bloom rest'},
    {type:'pour',frac:.48,dur:30,label:'Main pour → 60% · brisk spiral',note:'one continuous pour begins, checkpoint: 60% of water by 1:15'},
    {type:'pour',frac:.40,dur:30,label:'Final pour → 100% · ease off',note:'do NOT stop, same pour, ~20% slower and gentler to the end'},
    {type:'stir',dur:8,label:'Stir · 1x each way',note:'knock grounds off walls'},
    {type:'wait',dur:2,label:'Let bed settle'},
    {type:'swirl',dur:5,label:'Final gentle swirl'},
    {type:'wait',dur:90,label:'Drawdown to flat bed'}
  ]},
 {id:'rao',level:'advanced',tool:['v60','any'],champ:'High-extraction school',timing:'adaptive',
  name:'Single Spiral & Spin',ratio:16.7,defaultDose:22,grind:'Medium-fine',tempC:[93,95],roastRec:'Light',
  desc:'Bloom with 3x coffee weight and stir it thoroughly. One continuous spiral pour, then a confident spin to flatten the bed.',
  steps:[
    {type:'pour',frac:.18,dur:10,label:'Bloom pour · 3x coffee'},
    {type:'stir',dur:10,label:'Stir bloom thoroughly',note:'every ground wet, no dry clumps'},
    {type:'wait',dur:25,label:'Bloom rest'},
    {type:'pour',frac:.82,dur:60,label:'Continuous spiral pour'},
    {type:'swirl',dur:6,label:'Flattening spin',note:'flatten the bed'},
    {type:'wait',dur:75,label:'Drawdown'}
  ]},
 {id:'hedrick',level:'intermediate',tool:['v60','origami','any'],champ:'Sweetness-first approach',timing:'adaptive',
  name:'Low & Slow',ratio:16,defaultDose:20,grind:'Medium',tempC:[88,92],roastRec:'Medium',roastNote:'built around medium & dark roasts',
  desc:'Cooler water, gentle bloom, two low-and-slow pours keeping the slurry calm. Built for sweetness and body; rescues medium/dark roasts that go bitter on hot recipes.',
  steps:[
    {type:'pour',frac:.15,dur:10,label:'Bloom pour'},
    {type:'swirl',dur:5,label:'Gentle swirl'},
    {type:'wait',dur:25,label:'Bloom rest'},
    {type:'pour',frac:.45,dur:35,label:'Pour 2 · low & slow'},
    {type:'wait',dur:20,label:'Let it drop'},
    {type:'pour',frac:.40,dur:35,label:'Pour 3 · low & slow'},
    {type:'swirl',dur:5,label:'Tiny finishing swirl'},
    {type:'wait',dur:60,label:'Drawdown'}
  ]},
 {id:'chemexClassic',level:'beginner',tool:['chemex'],champ:'House classic',timing:'adaptive',
  name:'Chemex · Classic Batch',ratio:16,defaultDose:34,grind:'Medium-coarse',tempC:[94,96],roastRec:'Medium',
  desc:'Thick filters drain slowly, so stay patient. Bloom with a stir, then three spiral pours staying off the filter walls. Scales happily from 500g to 900g.',
  steps:[
    {type:'pour',frac:.13,dur:12,label:'Bloom pour'},
    {type:'stir',dur:8,label:'Stir bloom gently'},
    {type:'wait',dur:25,label:'Bloom rest'},
    {type:'pour',frac:.29,dur:30,label:'Pour 2 · spiral'},
    {type:'wait',dur:30,label:'Pause · water near bed'},
    {type:'pour',frac:.29,dur:30,label:'Pour 3 · spiral'},
    {type:'wait',dur:30,label:'Pause · water near bed'},
    {type:'pour',frac:.29,dur:30,label:'Pour 4 · spiral'},
    {type:'wait',dur:90,label:'Long Chemex drawdown'}
  ]},
 {id:'kalitaPulse',level:'intermediate',tool:['kalita','origami','melitta'],champ:'Flat-bed standard',timing:'adaptive',
  name:'Kalita Wave · Pulse Pours',ratio:15.5,defaultDose:21,grind:'Medium',tempC:[92,94],roastRec:'Light',
  desc:'Flat bed loves rhythm: bloom plus four small pulses, keeping the water level low and consistent. Very even, very forgiving.',
  steps:[
    {type:'pour',frac:.14,dur:10,label:'Bloom pour'},
    {type:'wait',dur:30,label:'Bloom rest'},
    {type:'pour',frac:.215,dur:12,label:'Pulse 1'},{type:'wait',dur:23,label:'Let it drop'},
    {type:'pour',frac:.215,dur:12,label:'Pulse 2'},{type:'wait',dur:23,label:'Let it drop'},
    {type:'pour',frac:.215,dur:12,label:'Pulse 3'},{type:'wait',dur:23,label:'Let it drop'},
    {type:'pour',frac:.215,dur:12,label:'Pulse 4'},{type:'wait',dur:65,label:'Drawdown'}
  ]},
 {id:'melitta1cup',level:'beginner',tool:['melitta','kalita','any'],champ:'Daily driver',timing:'adaptive',
  name:'One-Cup Wedge · Easy Morning',ratio:15,defaultDose:15,grind:'Medium-fine',tempC:[91,93],roastRec:'Medium',
  desc:'Small-dose weekday recipe: bloom then two pours. Wedge drippers restrict flow, so grind slightly finer and let the brewer do the work.',
  steps:[
    {type:'pour',frac:.20,dur:8,label:'Bloom pour'},
    {type:'wait',dur:27,label:'Bloom rest'},
    {type:'pour',frac:.40,dur:20,label:'Pour 2'},
    {type:'wait',dur:25,label:'Pause · water near bed'},
    {type:'pour',frac:.40,dur:20,label:'Pour 3'},
    {type:'wait',dur:60,label:'Drawdown'}
  ]},
 {id:'osmotic',level:'advanced',tool:['v60','origami'],champ:"Popular in Spain's comp scene",timing:'adaptive',
  name:'Osmotic Flow · Center Drip',ratio:15,defaultDose:20,grind:'Medium-fine',tempC:[90,93],roastRec:'Light',
  desc:'After the bloom, pour pencil-thin and dead-center the entire time, letting water migrate outward through the bed. Slow, meditative, juicy.',
  steps:[
    {type:'pour',frac:.15,dur:10,label:'Bloom pour'},
    {type:'wait',dur:30,label:'Bloom rest'},
    {type:'pour',frac:.85,dur:105,label:'Center drip · continuous',note:'thin stream, never move'},
    {type:'wait',dur:45,label:'Drawdown'}
  ]},
 {id:'v60hario1cup',level:'beginner',tool:['v60'],champ:'Hario house method',timing:'adaptive',
  name:'V60 · Classic 1-Cup',ratio:15,defaultDose:15,grind:'Medium-fine',tempC:[92,94],roastRec:'Medium',
  desc:'The straightforward daily single cup: bloom with 2x the coffee weight, let it rest, then two easy pours (to 60%, then 100%). Fast, forgiving, and the timing scales to your dose. The recipe to reach for before caffeine.',
  steps:[
    {type:'pour',frac:.125,dur:8,label:'Bloom · 2× coffee'},
    {type:'agitate',dur:5,note:'until no dry clumps',swirlLabel:'Swirl the bloom',stirLabel:'Stir the bloom'},
    {type:'wait',dur:40,label:'Bloom rest'},
    {type:'pour',frac:.475,dur:22,label:'Pour 1 · to 60%'},
    {type:'wait',dur:15,label:'Pause · let it settle'},
    {type:'pour',frac:.40,dur:18,label:'Pour 2 · to 100%'},
    {type:'swirl',dur:5,label:'Flattening swirl',note:'level the bed'},
    {type:'wait',dur:55,label:'Drawdown'}
  ]},
 {id:'v60iced',level:'intermediate',tool:['v60'],champ:'Japanese iced standard',timing:'adaptive',iced:true,
  name:'V60 · Japanese Iced (flash brew)',ratio:15,defaultDose:22,grind:'Medium-fine',tempC:[93,96],roastRec:'Light',
  desc:'Brew hot, directly onto ice. Set your total water as usual, then put 40% of it IN THE SERVER AS ICE, the app schedules only the hot 60% you actually pour. Grind a touch finer since less hot water passes through.',
  steps:[
    {type:'pour',frac:.15,dur:8,label:'Bloom pour'},
    {type:'stir',dur:6,label:'Stir bloom',note:'small dose needs help wetting'},
    {type:'wait',dur:26,label:'Bloom rest'},
    {type:'pour',frac:.225,dur:14,label:'Pour 2'},
    {type:'wait',dur:20,label:'Pause · water near bed'},
    {type:'pour',frac:.225,dur:14,label:'Pour 3'},
    {type:'wait',dur:20,label:'Pause · water near bed'},
    {type:'wait',dur:55,label:'Drawdown · swirl server to melt ice'}
  ],waterNote:0.6},
 {id:'kasuyaSweet',level:'advanced',tool:['v60','origami','any'],champ:'4:6 system · sweetness setting',timing:'rigid',
  name:'The 4:6 Sweet · World Champ Method',ratio:15,defaultDose:20,grind:'Coarse',tempC:[92,96],roastRec:'Light',
  desc:"The 4:6 system's own sweetness dial: shrink pour 1, grow pour 2 (same first-40% total), keep the strength pours identical. Compare against standard 4:6 on the same beans to taste what the dial does.",
  steps:[
    {type:'pour',frac:.14,dur:8,label:'Pour 1 · small = sweeter'},
    {type:'wait',dur:37,label:'Drain fully',note:'wait for a dry-ish bed'},
    {type:'pour',frac:.26,dur:12,label:'Pour 2 · big = sweeter'},
    {type:'wait',dur:33,label:'Drain fully',note:'wait for a dry-ish bed'},
    {type:'pour',frac:.20,dur:10,label:'Pour 3 · strength'},
    {type:'wait',dur:35,label:'Drain fully'},
    {type:'pour',frac:.20,dur:10,label:'Pour 4 · strength'},
    {type:'wait',dur:35,label:'Drain fully'},
    {type:'pour',frac:.20,dur:10,label:'Pour 5 · strength'},
    {type:'wait',dur:45,label:'Final drawdown'}
  ]},
 {id:'chemexHoffmann',level:'intermediate',tool:['chemex'],champ:'Two-speed technique',timing:'adaptive',
  name:'Chemex · Two-Speed · World Champ Method',ratio:16.7,defaultDose:30,grind:'Medium-coarse',tempC:[95,100],roastRec:'Light',roastNote:'the hotter end for the lightest roasts',
  desc:'His V60 logic adapted to thick Chemex paper: big stirred bloom, ONE continuous pour with a speed change at 60% (two steps = two flow-rate targets), then a gentle swirl. Patience on the drawdown, the filter is the brake.',
  steps:[
    {type:'pour',frac:.12,dur:10,label:'Bloom pour · 2x coffee'},
    {type:'stir',dur:8,label:'Stir the bloom',note:'thick filter needs full wetting'},
    {type:'wait',dur:27,label:'Bloom rest'},
    {type:'pour',frac:.48,dur:35,label:'Main pour → 60% · brisk',note:'one continuous pour begins'},
    {type:'pour',frac:.40,dur:35,label:'Final pour → 100% · ease off',note:'do NOT stop, same pour, slower'},
    {type:'swirl',dur:6,label:'Gentle swirl'},
    {type:'wait',dur:110,label:'Long Chemex drawdown'}
  ]},
 {id:'chemexSmall',level:'beginner',tool:['chemex'],champ:'Small-batch daily',timing:'adaptive',
  name:'Chemex · Small Batch (1–2 cups)',ratio:16,defaultDose:22,grind:'Medium',tempC:[93,95],roastRec:'Medium',
  desc:'The Chemex at weekday scale. Grind finer than a full batch, a shallow bed drains fast through even Chemex paper. Bloom plus two patient pours.',
  steps:[
    {type:'pour',frac:.16,dur:10,label:'Bloom pour'},
    {type:'wait',dur:30,label:'Bloom rest'},
    {type:'pour',frac:.42,dur:26,label:'Pour 2 · slow spiral'},
    {type:'wait',dur:25,label:'Pause · water near bed'},
    {type:'pour',frac:.42,dur:26,label:'Pour 3 · slow spiral'},
    {type:'wait',dur:80,label:'Drawdown'}
  ]},
 {id:'chemexIced',level:'intermediate',tool:['chemex'],champ:'Japanese iced standard',timing:'adaptive',iced:true,
  name:'Chemex · Japanese Iced (flash brew)',ratio:15,defaultDose:34,grind:'Medium',tempC:[94,96],roastRec:'Light',
  desc:'Summer batch: set total water as usual, put 40% of it IN THE CHEMEX AS ICE, and the app schedules only the hot 60%. Grind finer than your hot Chemex, concentrated hot phase needs the extra extraction.',
  steps:[
    {type:'pour',frac:.14,dur:12,label:'Bloom pour'},
    {type:'stir',dur:8,label:'Stir bloom'},
    {type:'wait',dur:25,label:'Bloom rest'},
    {type:'pour',frac:.23,dur:20,label:'Pour 2'},
    {type:'wait',dur:25,label:'Pause · water near bed'},
    {type:'pour',frac:.23,dur:20,label:'Pour 3'},
    {type:'wait',dur:90,label:'Drawdown · swirl to melt ice'}
  ],waterNote:0.6},
 {id:'aeropressHoffmann',level:'intermediate',tool:['aeropress'],champ:'World-champion barista\'s AeroPress',timing:'adaptive',immersion:true,
  name:'AeroPress · Sealed Steep · World Champ Method',ratio:18.2,defaultDose:11,grind:'Fine',tempC:[95,99],roastRec:'Light',
  desc:'Small dose, fine grind, very hot water. Pour everything, cap immediately (plunger seal holds heat and stops dripping), long undisturbed steep, gentle swirl, slow press. No bloom, no stir.',
  steps:[
    {type:'pour',frac:1.0,dur:15,label:'Pour all water'},
    {type:'press',dur:8,label:'Insert plunger · just the seal',note:'creates vacuum, stops drip-through'},
    {type:'wait',dur:97,label:'Steep · hands off'},
    {type:'swirl',dur:6,label:'Gentle swirl'},
    {type:'wait',dur:30,label:'Settle'},
    {type:'press',dur:30,label:'Press slowly to the hiss'}
  ]},
 {id:'aeropressClassic',level:'beginner',tool:['aeropress'],champ:'House standard',timing:'adaptive',immersion:true,
  name:'AeroPress · Classic',ratio:14.5,defaultDose:15,grind:'Medium-fine',tempC:[85,90],roastRec:'Medium',
  desc:'The everyday AeroPress: pour, brief stir, short steep, steady press. Cooler water than pour over, immersion extracts efficiently.',
  steps:[
    {type:'pour',frac:1.0,dur:15,label:'Pour all water'},
    {type:'stir',dur:10,label:'Stir · 3 gentle turns'},
    {type:'wait',dur:60,label:'Steep'},
    {type:'press',dur:25,label:'Press steadily · stop at the hiss'}
  ]},
 {id:'frenchHoffmann',level:'intermediate',tool:['frenchpress'],champ:'The patient method',timing:'adaptive',immersion:true,
  name:'French Press · Patient · World Champ Method',ratio:16.7,defaultDose:30,grind:'Medium',tempC:[95,100],roastRec:'Light',roastNote:'boiling is fine here',
  desc:'The patient method: full steep, break and skim the crust, then a LONG settle so fines sink. Plunger barely submerged, it strains, never presses. Silty-free cups.',
  steps:[
    {type:'pour',frac:1.0,dur:20,label:'Pour all water'},
    {type:'wait',dur:240,label:'Steep · 4 minutes, lid off'},
    {type:'stir',dur:10,label:'Break the crust · then skim foam'},
    {type:'wait',dur:300,label:'Settle · 5 min, fines sink'},
    {type:'press',dur:10,label:'Plunger to surface only',note:'strain, don\'t plunge, pour gently'}
  ]},
 {id:'frenchClassic',level:'beginner',tool:['frenchpress'],champ:'House standard',timing:'adaptive',immersion:true,
  name:'French Press · Classic 4:00',ratio:15,defaultDose:30,grind:'Coarse',tempC:[93,96],roastRec:'Medium',
  desc:'The four-minute standard: pour, stir, steep, press. Coarse grind keeps the plunge clean.',
  steps:[
    {type:'pour',frac:1.0,dur:20,label:'Pour all water'},
    {type:'stir',dur:8,label:'Stir the crust in'},
    {type:'wait',dur:232,label:'Steep · lid on'},
    {type:'press',dur:20,label:'Press slowly & serve'}
  ]},
 {id:'phinClassic',level:'beginner',tool:['phin'],champ:'Cà phê phin tradition',timing:'adaptive',immersion:true,
  name:'Phin · Classic (Cà Phê Sữa Đá)',ratio:5,defaultDose:20,grind:'Medium-fine',tempC:[95,100],roastRec:'Dark',
  desc:'The traditional Vietnamese drip. Small water, big coffee, metal filter, no hurry. Bloom is the most-skipped step and the #1 mistake, never skip it. Rest the gravity press on the grounds; never screw or twist it down. First drips should appear within ~2 minutes and the cup finishes in 4–6; faster means grind finer, slower means grind coarser. Classic serve: 2–3 tsp condensed milk waiting in the glass.',
  steps:[
    {type:'pour',frac:0.25,dur:15,label:'Bloom, wet ALL the grounds',note:'slow spiral, every ground dark'},
    {type:'wait',dur:35,label:'Bloom · watch it swell'},
    {type:'press',dur:8,label:'Rest the gravity press on top',note:'rest it, never twist or force'},
    {type:'pour',frac:0.75,dur:20,label:'Fill to the top · lid on'},
    {type:'wait',dur:280,label:'Drip · patience IS the recipe',note:'first drips by ~2:00 · done ~4–6 min'}
  ]},
 {id:'phinDouble',level:'intermediate',tool:['phin'],champ:'Double-bloom technique',timing:'adaptive',immersion:true,
  name:'Phin · Double Bloom',ratio:5,defaultDose:20,grind:'Medium-fine',tempC:[95,100],roastRec:'Dark',
  desc:'Blooms the bed from the top AND the bottom. The first small pour blooms the surface; then you wait for the first drips below, that is the bottom of the bed finally saturating and blooming from beneath. A second small splash evens everything before the main fill. Slower to start, noticeably sweeter and more even in the cup.',
  steps:[
    {type:'pour',frac:0.2,dur:12,label:'First bloom, top of the bed',note:'just enough to darken all grounds'},
    {type:'wait',dur:30,label:'Top bloom · swelling'},
    {type:'wait',dur:35,label:'Bottom bloom, wait for FIRST DRIPS',note:'drips below = the bottom of the bed is now bloomed'},
    {type:'pour',frac:0.1,dur:8,label:'Second bloom splash',note:'evens the bed'},
    {type:'wait',dur:20,label:'Settle'},
    {type:'press',dur:8,label:'Rest the gravity press on top',note:'rest, never twist'},
    {type:'pour',frac:0.7,dur:20,label:'Main fill to the top · lid on'},
    {type:'wait',dur:270,label:'Drip · 4–6 minutes is right'}
  ]},
 {id:'custom',tool:['any','v60','kalita','chemex','origami','melitta'],champ:'Yours',timing:'adaptive',
  name:'Custom · Even Pours',ratio:16,defaultDose:22,grind:'Your call',tempC:[92,94],roastRec:'Any',
  desc:'Bloom at 15%, then three even pours with a finishing swirl. A neutral canvas to tweak.',
  steps:[
    {type:'pour',frac:.15,dur:10,label:'Bloom pour'},
    {type:'wait',dur:30,label:'Bloom rest'},
    {type:'pour',frac:.2833,dur:15,label:'Pour 2'},
    {type:'wait',dur:25,label:'Pause · water near bed'},
    {type:'pour',frac:.2833,dur:15,label:'Pour 3'},
    {type:'wait',dur:25,label:'Pause · water near bed'},
    {type:'pour',frac:.2834,dur:15,label:'Pour 4'},
    {type:'swirl',dur:5,label:'Finishing swirl'},
    {type:'wait',dur:60,label:'Drawdown'}
  ]},
 {id:'switchChronicler',level:'intermediate',tool:['switch'],champ:'Coffee Chronicler hybrid',timing:'adaptive',
  name:'Switch · Coffee Chronicler Hybrid',ratio:16,defaultDose:20,grind:'Medium-fine',tempC:[91,93],roastRec:'Medium',
  desc:'Asser Christensen\'s modified-Kasuya Switch method. Pour half with the valve OPEN so the coffee percolates (clarity), then CLOSE the switch and fill for an immersion steep (body and sweetness), then open to drain. Clean and sweet.',
  steps:[
    {type:'pour',frac:.5,dur:25,label:'Switch OPEN · pour to 50%',note:'let it drip through, this is the percolation phase'},
    {type:'wait',dur:20,label:'Let it drip'},
    {type:'pour',frac:.5,dur:20,label:'Close the switch, fill to 100%',note:'valve shut, the coffee is now steeping'},
    {type:'wait',dur:55,label:'Steep · switch closed',note:'immersion builds body and sweetness'},
    {type:'wait',dur:75,label:'Open the switch · drain',note:'flip the valve open, let it drain fully'}
  ]},
 {id:'switchImmersion',level:'beginner',tool:['switch'],champ:'Full immersion, very forgiving',timing:'adaptive',
  name:'Switch · Easy Immersion',ratio:15,defaultDose:20,grind:'Medium',tempC:[92,94],roastRec:'Medium',
  desc:'The set-and-forget Switch method. Valve CLOSED, add all the water, stir once, let it steep, then open to drain. Almost impossible to mess up, with great body and sweetness and no pour technique.',
  steps:[
    {type:'pour',frac:1,dur:20,label:'Switch CLOSED · add all the water',note:'valve shut, fill to 100%'},
    {type:'stir',dur:6,label:'Stir once',note:'wet every ground'},
    {type:'wait',dur:120,label:'Steep · switch closed',note:'let it immerse'},
    {type:'wait',dur:60,label:'Open the switch · drain',note:'flip open, let it run out'}
  ]}
];

/* ---- custom recipes (persisted, merged with built-ins) ---- */
function customRecipes(){return Store.get(KEYS.customs,[]);}
function allRecipes(){return RECIPES.concat(customRecipes());}
/* ============================ 2. STATE ============================ */
const $=id=>document.getElementById(id);
/* Escapes user-entered text (bean/roaster names, notes, BLE device names)
   before it's interpolated into innerHTML, so it can't break out as markup. */
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={pour:'🫗',wait:'⏳',stir:'🥄',swirl:'🌀',press:'🔽'};
const _I=(p)=>`<svg class="ticon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const TOOL_ICONS={
  v60:_I('<path d="M4 6h16L14 15h-4L4 6z"/><path d="M9 15h6l-1 3h-4l-1-3z"/><path class="acc" d="M4 6h16"/><path d="M12 19v2"/>'),
  switch:_I('<path d="M4 6h16L14 15h-4L4 6z"/><path d="M9 15h6l-1 3h-4l-1-3z"/><path class="acc" d="M4 6h16"/><path d="M12 19v2"/><path class="acc" d="M15 16.4h3.3"/><circle class="acc" cx="19.2" cy="16.4" r="1"/>'),
  kalita:_I('<path d="M5 6h14l-2.5 9h-9L5 6z"/><path d="M8.5 15h7"/><path d="M10 18h4"/><path class="acc" d="M5 6h14"/><path d="M8 9.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0"/>'),
  chemex:_I('<path d="M8 3h8l-2.5 7 3.5 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l3.5-9L8 3z"/><path class="acc" d="M8.7 10.5h6.6M8.9 12.3h6.2"/>'),
  origami:_I('<path d="M4 6h16L14 15h-4L4 6z"/><path d="M8 6l2 9M16 6l-2 9M12 6v9"/><path class="acc" d="M4 6h16"/><path d="M12 18v3"/>'),
  melitta:_I('<path d="M6 5h12l-3 11H9L6 5z"/><path class="acc" d="M6 5h12"/><path d="M9 16v3h6v-3"/>'),
  aeropress:_I('<rect x="8" y="8" width="8" height="10" rx="1"/><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path class="acc" d="M12 5V3M10 3h4"/><path d="M8 18h8"/><path d="M10 21h4"/>'),
  frenchpress:_I('<path d="M7 7h9v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7z"/><path d="M16 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/><path d="M11.5 7V4"/><circle class="acc" cx="11.5" cy="3" r="1.2"/><path class="acc" d="M7 7h9"/><path d="M8.5 12h6"/>'),
  phin:_I('<path d="M7 4h10v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 10V4z"/><path class="acc" d="M6 4h12"/><path d="M10 14v1M12 13v2M14 14v1"/><path d="M8 18h8v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2z"/>'),
  any:_I('<path d="M6 8h10v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z"/><path d="M16 10h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2"/><path class="acc" d="M9 4c0 1-1 1-1 2M13 4c0 1-1 1-1 2"/>')
};
const ROAST_IDX={'Light':0,'Light-Medium':1,'Medium':2,'Medium-Dark':3,'Dark':4};
let tool='v60',recipe=null,schedule=[],totalWater=0,totalDur=0;
let brewIdx=0,brewStart=0,timerIv=null,brewing=false,stepStart=0,finishedAt=null;
let weight=0,weightOffset=0,wSamples=[],metrics=null,liveTrace=null;
let simIv=null,simMode=false,ble={device:null,connected:false};
let brewTrace=[];   // [seconds, grams] sampled ~1/s while brewing with live weight
let unitF=true,cdIv=null,curRating=0,curTags=new Set(),restoring=false;
let paused=false,pauseStart=0;
/* ---- SFX: synthesized with Web Audio. No audio files; everything is generated.
   Countdown ticks, GO tone, last-3-seconds step ticks, advance chime, and a
   looping filtered-noise "pouring water" bed during pour steps. ---- */
let soundOn=true,actx=null,pourNode=null,lastTickSec=null;
function audioInit(){ // must be called from a user gesture (browser autoplay policy)
  if(typeof AudioContext==='undefined'&&typeof webkitAudioContext==='undefined')return;
  try{
    if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)();loadPourSample();}
    if(actx.state==='suspended')actx.resume();   // iOS starts contexts suspended; must resume inside a tap
    primeAudio();                                 // iOS: fully unlock by firing one silent buffer inside the gesture
  }catch(_){actx=null;}
}
// iOS Safari/WKWebView keep the context "half-locked" until an actual buffer
// plays inside a user gesture. Fire one silent 1-sample buffer, once.
let audioPrimed=false;
function primeAudio(){
  if(audioPrimed||!actx)return;
  try{
    const b=actx.createBuffer(1,1,actx.sampleRate||22050);
    const s=actx.createBufferSource();s.buffer=b;s.connect(actx.destination);
    (s.start||s.noteOn).call(s,0);
    audioPrimed=true;
  }catch(_){}
}
function beep(freq,dur,vol,type){
  if(!soundOn||!actx)return;
  if(actx.state==='suspended'){try{actx.resume();}catch(_){}}  // context may nap between steps
  try{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=type||'sine';o.frequency.value=freq;
    g.gain.setValueAtTime(0,actx.currentTime);
    g.gain.linearRampToValueAtTime(vol||0.18,actx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+(dur||0.12));
    o.connect(g).connect(actx.destination);
    o.start();o.stop(actx.currentTime+(dur||0.12)+0.02);
  }catch(_){}
}
function sfxTick(){beep(880,0.09,0.15,'square');}                 // 3 · 2 · 1
function sfxGo(){beep(660,0.1,0.2,'square');setTimeout(()=>beep(1320,0.3,0.22,'sine'),90);}  // GO!
function sfxAdvance(){beep(1040,0.12,0.16,'sine');}               // step change chime
function sfxDone(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.22,0.16,'sine'),i*110));} // brew complete
/* Pour sound: a REAL recording. Drop a royalty-free "pour.mp3" next to
   index.html (Pixabay/Mixkit/Freesound CC0, search "water pour"). Loops
   during pour steps, fades in/out, follows pause + the sound toggle.
   No file present → water stays silent; ticks and chimes still work. */
let pourBuf=null,pourTried=false;
async function loadPourSample(){
  if(pourBuf||pourTried||!actx)return;
  pourTried=true;
  try{
    const r=await fetch('pour.mp3');
    if(!r.ok)return;
    pourBuf=await actx.decodeAudioData(await r.arrayBuffer());
  }catch(_){/* stay silent */}
}
function pourStart(){
  if(!soundOn||!actx||pourNode)return;
  if(!pourBuf){loadPourSample();return;}   // ready by the next pour if it exists
  try{
    const src=actx.createBufferSource();src.buffer=pourBuf;src.loop=true;
    const g=actx.createGain();
    g.gain.setValueAtTime(0,actx.currentTime);
    g.gain.linearRampToValueAtTime(0.5,actx.currentTime+0.3);
    src.connect(g).connect(actx.destination);
    src.start();
    pourNode={src,g};
  }catch(_){pourNode=null;}
}
function pourStop(){
  if(!pourNode)return;
  try{
    const {src,g}=pourNode;
    g.gain.linearRampToValueAtTime(0.0001,actx.currentTime+0.2);
    setTimeout(()=>{try{src.stop();}catch(_){}} ,260);
  }catch(_){}
  pourNode=null;
}
function setSound(on){
  soundOn=on;
  $('sndOn').classList.toggle('on',on);
  $('sndOff').classList.toggle('on',!on);
  if(!on)pourStop();else audioInit();
  saveSettings();
}
let weightOz=false;   // kept in sync with wUnil==='oz' so all the oz-display code keeps working
let wUnit='g';        // 'g' | 'oz' | 'tbsp'. tbsp applies to the COFFEE DOSE only (water/live scale stay grams)
const G2OZ=1/28.3495;
/* Display-only unit: inputs stay in grams (every coffee scale doses in grams);
   oz converts what you READ, live weight, targets, bars, logs. */
function fmtW(g,dec){ return weightOz ? (g*G2OZ).toFixed(dec===0?2:2)+' oz' : (dec===0?Math.round(g):g.toFixed(dec===undefined?0:dec))+' g'; }
/* No-scale helper: grams of ground coffee per LEVEL tablespoon is ~5-6g (medium grind ~0.4 g/ml,
   a US tbsp ~15ml). We use 5.3 and round to the nearest half tbsp; it's a starting point, not exact. */
const TBSP_G=5.3;
function tbspTxt(g){const r=Math.round((g/TBSP_G)*2)/2,w=Math.floor(r),h=(r-w)===0.5;return (w||(h?'':'0'))+(h?'½':'')+' tbsp';}
/* How to show the COFFEE DOSE, per the weight-unit setting (tbsp is approximate). */
function doseTxt(g){return wUnit==='tbsp'?('≈ '+tbspTxt(g)):(wUnit==='oz'?(g*G2OZ).toFixed(2)+' oz':Math.round(g)+' g');}
/* Just Brew beans: grams OR tablespoons only (oz is a scale-unit thing, not shown here). */
function beansDisp(g){return wUnit==='tbsp'?('≈ '+tbspTxt(g)):(Math.round(g)+' g');}
function beansToField(g){return wUnit==='tbsp'?(Math.round((g/TBSP_G)*2)/2):Math.round(g);}   // grams -> what the Beans field shows
function fieldToBeans(v){v=parseFloat(v);if(!(v>0))return null;return wUnit==='tbsp'?v*TBSP_G:v;}   // field value -> grams (source of truth)
function setWeightUnit(u){
  if(u===true)u='oz'; else if(u===false)u='g';   // back-compat with old boolean callers
  wUnit=u; weightOz=(u==='oz');
  $('wG').classList.toggle('on',u!=='oz');        // Settings shows the scale unit (g unless oz)
  $('wOz').classList.toggle('on',u==='oz');
  if(recipe){computeSchedule();}
  renderOzHint();
  if(typeof renderBasic==='function')renderBasic();   // updates the Just Brew beans field, inline toggle, and summary
  if($('doseSum'))renderDoseReadout();
  saveSettings();
}
function renderOzHint(){
  const d=parseFloat($('dose').value),w=parseFloat($('water').value);
  let hint='';
  if(d&&w){
    if(wUnit==='oz')hint=`= ${(d*G2OZ).toFixed(2)} oz coffee · ${(w*G2OZ).toFixed(2)} oz water (inputs stay in grams, scales dose in grams)`;
    else if(wUnit==='tbsp')hint=`= ≈ ${tbspTxt(d)} of ground coffee · ${w} ml water. Tablespoons are approximate; grind changes the weight.`;
  }
  $('ozHint').textContent=hint;
}
const hasLiveWeight=()=>ble.connected||simMode;
const fmtT=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
// zero-padded mm:ss for the brew screen only (fmtT stays single-digit elsewhere)
const fmtClock=s=>{const x=Math.max(0,s);return String(Math.floor(x/60)).padStart(2,'0')+':'+String(Math.floor(x%60)).padStart(2,'0');};
// current-step countdown with a quiet tenths digit, e.g. 0:07.4 — this is where the tenths live
const stepCountdownHTML=s=>{s=Math.max(0,s);return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}<span class="t-frac">.${Math.floor((s%1)*10)}</span>`;};

/* ============================ 3. STORE ============================ */
/* All persistence flows through Store. localStorage when available
   (this file runs as a real page, not a sandboxed artifact), with an
   in-memory fallback so nothing crashes in restricted contexts. */
const Store={
  _mem:{},
  get(k,fallback){try{const v=localStorage.getItem(k);return v===null?( k in this._mem?this._mem[k]:fallback):JSON.parse(v);}catch(_){return k in this._mem?this._mem[k]:fallback;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){this._mem[k]=v;}}
};
const KEYS={settings:'pourfect-settings',log:'pourfect-log',unit:'pourfect-unit',customs:'pourfect-customs',library:'pourfect-library'};
/* Everything worth restoring lives in one settings object. Saved on every
   change (debounced), restored once at INIT. Dose/water are included too:
   beans and method persist for days; dose is the field you'll tweak. */
function currentSettings(){
  return{
    tool, recipeId:recipe?recipe.id:null,
    dose:$('dose').value, water:$('water').value, ratio:$('ratioInput').value,
    grindSetting:$('grindSetting').value,
    theme, weightOz, wUnit, soundOn, beanName:$('beanName').value, roaster:curRoasterName()||$('roasterSel').value, bean:$('beanSel').value,
    roast:$('roast').value, roastDate:$('roastDate').value,
    unitF
  };
}
let saveT=null;
function saveSettings(){
  if(restoring)return;                       // don't save mid-restore
  clearTimeout(saveT);
  saveT=setTimeout(()=>Store.set(KEYS.settings,currentSettings()),250);
}
function restoreSettings(){
  const s=Store.get(KEYS.settings,null);
  restoring=true;
  unitF=s&&'unitF'in s?s.unitF:(Store.get(KEYS.unit,'F')==='F');
  $('unitC').classList.toggle('on',!unitF);
  $('unitFbtn').classList.toggle('on',unitF);
  if(s&&s.theme)setTheme(s.theme);
  if(s&&'soundOn'in s){soundOn=s.soundOn;$('sndOn').classList.toggle('on',soundOn);$('sndOff').classList.toggle('on',!soundOn);}
  if(s&&('wUnit'in s||'weightOz'in s)){
    const u=('wUnit'in s)?s.wUnit:(s.weightOz?'oz':'g');   // migrate the old g/oz boolean
    wUnit=u; weightOz=(u==='oz');
    $('wG').classList.toggle('on',u!=='oz');   // Settings scale unit; the Just Brew g/tbsp toggle is set by renderBasic
    $('wOz').classList.toggle('on',u==='oz');
  }
  if(s){
    if(s.tool&&TOOLS.some(t=>t.id===s.tool))tool=s.tool;
    renderChips();populateRecipes();          // builds list for restored tool
    if(s.recipeId&&allRecipes().some(r=>r.id===s.recipeId)&&[...$('recipeSel').options].some(o=>o.value===s.recipeId)){
      loadRecipe(s.recipeId);
    }
    migrateLegacyBean(s);
    renderLibrary(s.roaster,s.bean);
    if(s.roast)$('roast').value=s.roast;       // manual override survives
    if(s.roastDate)$('roastDate').value=s.roastDate;
    if(s.dose){$('dose').value=s.dose;}
    if(s.ratio){$('ratioInput').value=s.ratio;}
    if(s.grindSetting)$('grindSetting').value=s.grindSetting;
    if(s.water){$('water').value=s.water;}
    // Ratio must NEVER sit blank, and when legacy settings (no ratio key) carry
    // a saved dose+water, the ratio shown must be THEIR ratio, not the recipe's,
    // even if an earlier computeSchedule backfilled a default into the field.
    if(!s.ratio){
      const d=parseFloat($('dose').value),w=parseFloat($('water').value);
      $('ratioInput').value=(d&&w)?Math.round(w/d*10)/10:recipe.ratio;
    }
    computeSchedule();renderTempAdvice();renderAge();syncCustomized();
  }else{
    renderChips();populateRecipes();
    renderLibrary(null,null);
  }
  // a returning user with a saved bean is already "confirmed" → keep setup folded
  beansConfirmed=!!($('beanSel').value&&$('beanSel').value!=='__newB');
  updateToolSummary();updateBeansSummary();
  updateFavHeart();
  updateSetupCards();
  wireCollapsibles();
  restoring=false;
  autoReconnectOnLoad();
}

/* ============================ 4. ENGINES ============================ */
/* ---- schedule ---- */
/* Bloom agitation, picked by dose.
   A step of type 'agitate' resolves to a swirl or a stir when the schedule is
   built. Why dose decides it: Barista Hustle's testing found stirring loses its
   edge at small doses (they measured it falling off around 15 g) — there is too
   little slurry for a spoon to redistribute, and it drags fines into the bed.
   Hoffmann's V60 technique swirls instead. At batch size the bed is deep enough
   that a spoon genuinely mixes, so stirring wins. Hence: swirl small, stir big.
   The 30 g line is a judgement call — roughly where a single cup becomes a batch. */
const STIR_MIN_DOSE=30;
function resolveAgitation(st,dose){
  if(st.type!=='agitate')return st;
  return dose>=STIR_MIN_DOSE
    ?{...st,type:'stir', label:st.stirLabel ||'Stir the bloom'}
    :{...st,type:'swirl',label:st.swirlLabel||'Swirl the bloom'};
}
function buildSchedule(dose,water){
  const defWater=recipe.defaultDose*recipe.ratio;
  const scaleF=recipe.timing==='adaptive'?water/defWater:1;
  let t=0,cum=0;
  return recipe.steps.map(st0=>{
    const st=resolveAgitation(st0,dose);
    const dur=st.type==='pour'?Math.max(4,Math.round(st.dur*scaleF)):st.dur;
    const out={type:st.type,label:st.label,note:st.note||'',start:t,dur,end:t+dur};
    if(st.type==='pour'){cum+=st.frac*water;out.target=Math.round(cum*10)/10;out.amount=Math.round(st.frac*water);}
    t+=dur;return out;
  });
}
/* ---- drainage physics ----
   Scale weight = total water added (monotonic). Slurry = water in the bed,
   draining at K*sqrt(head)/resistance; resistance grows with dose^0.6 and
   grind fineness. Kitchen model, not CFD. */
const GRIND_R={'coarse':0.75,'medium-coarse':0.95,'medium':1.15,'medium-fine':1.4,'fine':1.75};
function grindResistance(txt){
  const t=(txt||'medium').toLowerCase();
  for(const k of['medium-coarse','medium-fine','coarse','medium','fine'])if(t.includes(k))return GRIND_R[k];
  return GRIND_R['medium'];
}
function simulateBrew(sched,dose){
  const K=2.1,R=grindResistance(recipe.grind)*Math.pow(dose/recipe.defaultDose,0.6);
  const dt=0.25,totalT=sched[sched.length-1].end,horizon=totalT+240;
  let t=0,slurry=0,added=0,finish=null;
  const drainEvents=[],trace=[];
  while(t<horizon){
    let inflow=0;
    for(const st of sched)if(st.type==='pour'&&t>=st.start&&t<st.end){inflow=st.amount/st.dur;break;}
    added+=inflow*dt;
    const outflow=slurry>0?Math.min(slurry/dt,K*Math.sqrt(slurry)/R):0;
    slurry=Math.max(0,slurry+(inflow-outflow)*dt);
    for(const st of sched)if(st.type==='wait'&&Math.abs(t-st.end)<dt/2)drainEvents.push({label:st.label,end:st.end,slurryLeft:slurry});
    if(finish===null&&added>=totalWater-0.5&&slurry<=Math.max(1.5,dose*0.06))finish=t;
    if(t%1<dt)trace.push([Math.round(t),Math.round(slurry*10)/10]);
    t+=dt;
    if(finish!==null&&t>totalT)break;
  }
  return{finish,drainEvents,trace,R};
}
function brewPrediction(){
  const dose=parseFloat($('dose').value)||recipe.defaultDose;
  if(recipe.immersion){
    // Immersion: no bed drainage, the steep time IS the schedule.
    return{sim:{finish:schedule[schedule.length-1].end,drainEvents:[],trace:[]},warnings:[],immersion:true};
  }
  const sim=simulateBrew(schedule,dose);
  const warnings=[];
  if(recipe.timing==='rigid'){
    const wet=sim.drainEvents.filter(e=>/drain fully/i.test(e.label)&&e.slurryLeft>Math.max(4,dose*0.25));
    if(wet.length)warnings.push(`⚠ At ${dose} g, the bed likely won't fully drain inside the fixed ${wet.length>1?'windows':'window'} (${wet.map(e=>fmtT(e.end)).join(', ')}). Grind coarser or reduce the dose to keep the 4:6 structure honest.`);
  }
  if(sim.finish===null)warnings.push('⚠ Model predicts a stalled drawdown at this dose/grind, grind coarser.');
  const schedEnd=schedule[schedule.length-1].end;
  if(sim.finish!==null&&sim.finish>schedEnd+45)warnings.push(`⚠ Predicted drawdown runs ~${Math.round(sim.finish-schedEnd)}s past the schedule, consider a coarser grind at this dose.`);
  return{sim,warnings};
}
function slurryAt(t){
  if(!liveTrace)return null;
  let best=null;
  for(const p of liveTrace){if(p[0]<=t)best=p;else break;}
  return best?best[1]:null;
}
/* ---- temperature ---- */
const c2f=c=>Math.round(c*9/5+32);
const fmtTemp=(lo,hi)=>unitF?`${c2f(lo)}–${c2f(hi)}°F`:`${lo}–${hi}°C`;
function adjustedTemp(){
  const[lo,hi]=recipe.tempC;
  if(recipe.roastRec==='Any')return{lo,hi,delta:0};
  const diff=(ROAST_IDX[$('roast').value]??2)-(ROAST_IDX[recipe.roastRec]??2);
  const d=Math.round(diff>0?-2*diff:-1.5*diff);   // half-steps: darker −2°C, lighter +1.5°C
  const clamp=c=>Math.min(100,Math.max(80,c+d));
  return{lo:clamp(lo),hi:clamp(hi),delta:d};
}
/* ---- bean age (roast-aware: darker degasses & stales faster) ---- */
function beanAgeDays(){
  const v=$('roastDate').value;
  if(!v)return null;
  const d=Math.floor((Date.now()-new Date(v+'T12:00:00').getTime())/86400000);
  return d>=0&&d<400?d:null;
}
function beanAgeState(){
  const d=beanAgeDays();
  if(d===null)return null;
  const ri=ROAST_IDX[$('roast').value]??2;
  const shift=Math.max(0,ri-2)*1.5;
  const freshEnd=Math.max(3,5-Math.max(0,ri-2)*0.5),peakEnd=28-shift*2,fadeEnd=42-shift*3;
  if(d<freshEnd)return{d,cls:'fresh',txt:`☁️ ${d} day${d===1?'':'s'} off roast, still degassing hard. Expect a wild bloom; a longer bloom rest helps, and don't chase sourness with the grinder yet.`};
  if(d<=peakEnd)return{d,cls:'peak',txt:`✅ ${d} days off roast, peak window for filter${ri>2?' (windows tightened for darker roasts)':''}. Recipes should behave as designed.`};
  if(d<=fadeEnd)return{d,cls:'fading',txt:`🍂 ${d} days off roast, past peak${ri>2?' for a darker roast':''}. Expect a smaller bloom and softer aromatics; a slightly finer grind or tighter ratio can compensate.`};
  return{d,cls:'stale',txt:`💀 ${d} days off roast, likely stale${ri>2?' (darker roasts fade faster)':''}. Flat or papery cups at this age are the beans, not your technique.`};
}
/* ---- flow rate ---- */
let _firstW=false;
function pushWeight(g){
  if(!_firstW){_firstW=true;blog('★ first weight received: '+g.toFixed(1)+' g, stream is LIVE');}
  weight=g;
  const now=Date.now();
  wSamples.push([now,g]);
  while(wSamples.length&&now-wSamples[0][0]>1600)wSamples.shift();
  if(brewing)updateBrewUI();
}
const displayedWeight=()=>weight-weightOffset;
function liveFlowRate(){
  if(wSamples.length<3)return null;
  const[t0,w0]=wSamples[0],[t1,w1]=wSamples[wSamples.length-1];
  const dt=(t1-t0)/1000;
  return dt>0.4?(w1-w0)/dt:null;
}
/* ---- post-mortem insights (age- and data-aware) ---- */
function buildInsights(){
  const out=[];
  const dose=parseFloat($('dose').value)||recipe.defaultDose;
  const schedEnd=schedule[schedule.length-1].end;
  const actual=finishedAt||schedEnd;
  const drift=recipe.immersion?0:actual-schedEnd;   // steeps end on the clock
  const pouredFast=metrics&&metrics._tot>5&&metrics.frFastPct>0.35;
  const bigOver=metrics&&metrics.overshoot>Math.max(6,totalWater*0.03);
  const roast=$('roast').value;
  const T=curTags,age=beanAgeState();
  const under=T.has('sour')||T.has('weak')||T.has('hollow');
  const over=T.has('bitter')||T.has('astringent');

  if(T.has('balanced')){
    out.push({cls:'win',title:'Reference brew 🎯',body:`Save this one: ${dose} g · 1:${(totalWater/dose).toFixed(1)} · ${recipe.grind.toLowerCase()} · finished ${fmtT(actual)}. Change nothing next time, repeatability first, experiments after.`});
    return out;
  }
  // Freshness first, it overrides technique diagnoses.
  if(age&&age.cls==='stale'&&(T.has('hollow')||T.has('weak'))){
    out.push({cls:'temp',title:`Check the beans first (${age.d} days off roast)`,body:'Flat or hollow cups at this age are usually staling, not extraction. No grind change fixes oxidized aromatics, verify with a fresher bag before adjusting anything else.'});
  }
  if(age&&age.cls==='fresh'&&T.has('sour')){
    out.push({cls:'temp',title:`Very fresh beans (${age.d} days off roast)`,body:'Heavy CO2 degassing pushes water away from the grounds and reads as sourness. Before grinding finer, try: rest the bag a few more days, or extend the bloom 15–20s and stir it. Re-taste, then adjust grind.'});
  }
  if(age&&age.cls==='fading'&&under&&!T.has('sour')){
    out.push({cls:'temp',title:`Beans past peak (${age.d} days)`,body:'Softer cups are partly age. A slightly finer grind or a 1-point tighter ratio can pull back some intensity while you finish the bag.'});
  }
  if(T.has('harsh')||(T.has('bitter')&&T.has('sour'))){
    out.push({cls:'pour',title:'Uneven extraction (bitter + sour together)',body:`This usually means channeling, not the wrong grind, some grounds over-extract while others under-extract.${pouredFast?' Your flow rate ran hot on '+Math.round(metrics.frFastPct*100)+'% of pour time, which digs craters in the bed, pour lower and slower.':' Keep the flow gentle, pour in circles not one spot, and swirl to keep the bed flat.'}`});
  }
  const staleExplainsIt=age&&age.cls==='stale'&&(T.has('hollow')||T.has('weak'))&&!T.has('sour');
  if(under&&!over&&!staleExplainsIt){
    const grindLine=drift<-15
      ?`Your drawdown ran ${Math.round(-drift)}s FASTER than schedule, the water isn't spending enough time in the coffee. Grind finer (the data agrees with your tongue).`
      :`Grind one step finer, or raise water temp${roast.startsWith('Light')?`, lighter roasts want ${fmtTemp(96,100)}`:''}.`;
    out.push({cls:'grind',title:'Under-extracted (sour / weak / hollow)',body:grindLine});
    if(T.has('weak')&&!T.has('sour'))out.push({cls:'ratio',title:'Or: strength, not extraction',body:`Weak without sourness can just be dilution. Try tightening the ratio a notch (1:${(totalWater/dose-1).toFixed(0)}) before touching the grind.`});
  }
  if(over&&!under){
    const grindLine=drift>20
      ?`Your drawdown ran ${Math.round(drift)}s SLOWER than schedule, water sat in the coffee too long. Grind coarser (the data agrees with your tongue).`
      :`Grind one step coarser, or drop water temp a few degrees${(roast==='Dark'||roast==='Medium-Dark')?`, darker roasts extract fast, ${fmtTemp(88,92)} is friendlier`:''}.`;
    out.push({cls:'grind',title:'Over-extracted (bitter / drying)',body:grindLine});
    if(pouredFast)out.push({cls:'pour',title:'Agitation is stacking on top',body:`You were over target flow rate ${Math.round(metrics.frFastPct*100)}% of the time. Hard pours churn the slurry and extract more, fix the pour before the second grind change.`});
  }
  if(T.has('strong')){
    out.push({cls:'ratio',title:'Too strong / muddy',body:`Widen the ratio, try 1:${(totalWater/dose+1).toFixed(0)} at the same grind. If it's muddy specifically, coarsen slightly too; fines make silt.`});
  }
  if(bigOver){
    out.push({cls:'pour',title:'Pour accuracy',body:`Biggest overshoot was ${metrics.overshoot.toFixed(0)} g past a target. Overshooting stretches the ratio mid-brew. Ease off ~10 g before each target and finish in pulses.`});
  }
  if(!out.length&&curTags.size){
    out.push({cls:'temp',title:'Mixed signals',body:'These tags point in different directions, change ONE variable next brew (grind first), keep everything else identical, and compare.'});
  }
  if(drift>20&&!over)out.push({cls:'grind',title:'FYI: slow drawdown',body:`Finished ${Math.round(drift)}s past schedule. If the next cup trends bitter, this is why, coarsen before it does.`});
  return out;
}

/* ============================ 4b. BEAN LIBRARY ============================
Roaster -> beans, each bean carrying its roast level. Roast is a property of
the bean, set once; only the roast date is per-bag. Home roasters: add
yourself as a roaster. */
/* Preset catalogs: stable blend lineups with roast levels pre-filled.
   Planned as a Reserve (paid) feature, free preview for now. Single
   origins rotate seasonally, so those stay manual. */
/* Curated starter catalog of respected US SPECIALTY coffee roasters — the kind
   people actually reach for when brewing pour-over. Selection sourced from
   published "best specialty roaster" rankings (Coffee Bros. 2026, Sprudge,
   Chowhound), not mass-market/grocery brands. Only name + roast level are
   stored (the factual bits); roast levels are approximate and editable.
   Specialty roasters mostly sell rotating single origins, so we seed each
   roaster's confirmed signature blends and leave a neutral "Rotating single
   origin" entry for the single-origin-focused houses. Users add their own
   roasters/beans; the long tail is meant to be user-added. */
const PRESET_ROASTERS=[
 {name:'Onyx Coffee Lab',beans:[
   {name:'Southern Weather',roast:'Medium'},
   {name:'Monarch',roast:'Medium-Dark'},
   {name:'Geometry',roast:'Medium'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Stumptown Coffee Roasters',beans:[
   {name:'Hair Bender',roast:'Medium'},
   {name:'Holler Mountain',roast:'Medium'},
   {name:"Founder's Blend",roast:'Medium'},
   {name:'Hundred Mile',roast:'Medium'}
 ]},
 {name:'Counter Culture Coffee',beans:[
   {name:'Hologram',roast:'Medium'},
   {name:'Big Trouble',roast:'Medium'},
   {name:'Fast Forward',roast:'Medium'},
   {name:'Apollo',roast:'Light'},
   {name:'Forty-Six',roast:'Medium-Dark'}
 ]},
 {name:'Intelligentsia Coffee',beans:[
   {name:'Black Cat Classic Espresso',roast:'Medium-Dark'},
   {name:'House Blend',roast:'Medium'},
   {name:'Frequency Blend',roast:'Medium'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Blue Bottle Coffee',beans:[
   {name:'Bella Donovan',roast:'Medium-Dark'},
   {name:'Three Africas',roast:'Medium'},
   {name:'Giant Steps',roast:'Dark'},
   {name:'Hayes Valley Espresso',roast:'Medium-Dark'}
 ]},
 {name:'Verve Coffee Roasters',beans:[
   {name:'Streetlevel',roast:'Medium'},
   {name:'Sermon',roast:'Medium'},
   {name:'1950',roast:'Medium-Dark'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Sightglass Coffee',beans:[
   {name:'Blueboon',roast:'Medium'},
   {name:"Owl's Howl Espresso",roast:'Medium-Dark'}
 ]},
 {name:'Equator Coffees',beans:[
   {name:'Tigerwalk Espresso',roast:'Medium-Dark'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Heart Coffee Roasters',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Sey Coffee',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Prodigal Coffee',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Proud Mary Coffee',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'JBC Coffee Roasters',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Madcap Coffee',beans:[
   {name:'Third Coast',roast:'Medium'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Sweet Bloom Coffee Roasters',beans:[
   {name:'Hometown Blend',roast:'Medium'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'George Howell Coffee',beans:[
   {name:'Alchemy',roast:'Medium'},
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Bird Rock Coffee Roasters',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]},
 {name:'Passenger Coffee',beans:[
   {name:'Rotating single origin',roast:'Light',rotating:true}
 ]}
];
function addPresetRoaster(name){
  const p=PRESET_ROASTERS.find(x=>x.name===name);
  if(!p)return;
  const lib=getLibrary();
  if(!lib.some(r=>r.name===p.name))lib.push({name:p.name,beans:p.beans.map(b=>({...b}))});
  setLibrary(lib);
  $('libAddRow').style.display='none';
  renderLibrary(p.name,null);
  saveSettings();
}
function getLibrary(){return Store.get(KEYS.library,[]);}
function setLibrary(lib){Store.set(KEYS.library,lib);}
function libRoaster(name){return getLibrary().find(r=>r.name===name);}
function favCount(){return getLibrary().reduce((n,r)=>n+r.beans.filter(b=>b.fav).length,0);}
function roasterOptionsHTML(){
  const lib=getLibrary();
  const presets=PRESET_ROASTERS.filter(p=>!lib.some(r=>r.name===p.name));
  return '<option value="">Select a roaster…</option>'
    +(favCount()?`<option value="__favs">⭐ Favorited Beans</option>`:'')
    +lib.map(r=>`<option value="${escapeHTML(r.name)}">${escapeHTML(r.name)}</option>`).join('')
    +presets.map(p=>`<option value="${escapeHTML(p.name)}">${escapeHTML(p.name)}</option>`).join('')
    +'<option value="__newR">＋ Add roaster…</option>';
}
// Rebuild the roaster <option>s (e.g. after favoriting) without disturbing selection.
function refreshRoasterOptions(){
  const rs=$('roasterSel'),cur=rs.value;
  rs.innerHTML=roasterOptionsHTML();
  if([...rs.options].some(o=>o.value===cur))rs.value=cur;
}
function renderLibrary(selRoaster,selBean){
  const lib=getLibrary();
  const presets=PRESET_ROASTERS.filter(p=>!lib.some(r=>r.name===p.name));
  const rs=$('roasterSel');
  rs.innerHTML=roasterOptionsHTML();
  if(selRoaster&&(lib.some(r=>r.name===selRoaster)||presets.some(p=>p.name===selRoaster)))rs.value=selRoaster;
  else rs.value='';   // first run / no saved choice → prompt "Select a roaster…"
  ensureRoasterInstalled(rs.value);
  renderBeans(selBean);
}
/* Preset roasters live in the dropdown like any other; first selection
   quietly copies the catalog into the user's library. */
function ensureRoasterInstalled(name){
  if(!name||name==='__newR')return;
  if(libRoaster(name))return;
  const p=PRESET_ROASTERS.find(x=>x.name===name);
  if(p){const lib=getLibrary();lib.push({name:p.name,beans:p.beans.map(b=>({...b}))});setLibrary(lib);}
}
function renderBeans(selBean){
  const bs=$('beanSel');
  // no roaster chosen yet → prompt, no beans
  if($('roasterSel').value===''){
    bs.innerHTML='<option value="" disabled selected>Select a roaster first</option>';
    applyBeanSelection();
    return;
  }
  // "⭐ Favorited Beans" view: list hearted beans from every roaster
  if($('roasterSel').value==='__favs'){
    const favs=[];
    getLibrary().forEach(r=>r.beans.forEach(b=>{if(b.fav)favs.push({roaster:r.name,bean:b.name});}));
    bs.innerHTML='<option value="" disabled'+(selBean?'':' selected')+'>Choose a favorite…</option>'
      +favs.map(f=>`<option value="${escapeHTML(f.bean)}" data-roaster="${escapeHTML(f.roaster)}"${selBean===f.bean?' selected':''}>${escapeHTML(f.bean)} · ${escapeHTML(f.roaster)}</option>`).join('');
    applyBeanSelection();   // resolves roast/name for the picked favorite (or clears)
    return;
  }
  const r=libRoaster($('roasterSel').value);
  const beans=r?r.beans:[];
  bs.innerHTML=beans.map(b=>`<option value="${escapeHTML(b.name)}">${escapeHTML(b.name)}${b.rotating?'':` · ${escapeHTML(b.roast)}`}</option>`).join('')+'<option value="__newB">＋ Add bean…</option>';
  if(selBean&&beans.some(b=>b.name===selBean))bs.value=selBean;
  else if(beans.length)bs.value=beans[0].name;
  applyBeanSelection();
}
function applyBeanSelectionAndFold(){
  applyBeanSelection();
  beansConfirmed=false;   // a fresh bean pick needs confirming; don't collapse yet
  if($('beanSel').value&&$('beanSel').value!=='__newB')updateBeansSummary();
  updateSetupCards();     // keeps the card open so roast + roast date can be set
}
// The roaster a bean actually belongs to. In the "⭐ Favorited Beans" view the
// roaster dropdown reads "__favs", so resolve the real roaster from the chosen
// bean option's data-roaster; otherwise it's just the selected roaster.
function curRoasterName(){
  const rv=$('roasterSel').value;
  if(rv==='__favs'){const opt=$('beanSel').selectedOptions[0];return(opt&&opt.dataset.roaster)||null;}
  return rv;
}
function applyBeanSelection(){
  const rn=curRoasterName();
  const r=rn?libRoaster(rn):null;
  const b=r&&r.beans.find(x=>x.name===$('beanSel').value);
  if(b){
    // fixed blends carry their roast; rotating single origins force an explicit pick
    $('roast').value=b.rotating?'':b.roast;
    $('beanName').value=`${b.name}, ${r.name}`;
    renderTempAdvice();renderAge();
  }else{
    $('beanName').value='';
  }
  updateFavHeart();
}
/* ---- Bean favorites: heart the current bean, browse them as a roaster ---- */
function curLibBean(){
  const rn=curRoasterName();if(!rn)return null;
  const r=libRoaster(rn);
  return r?r.beans.find(x=>x.name===$('beanSel').value)||null:null;
}
function updateFavHeart(){
  const btn=$('btnFavBean');if(!btn)return;
  const b=curLibBean(),on=!!(b&&b.fav);
  btn.disabled=!b;
  btn.textContent=on?'♥':'♡';
  btn.setAttribute('aria-pressed',on?'true':'false');
  btn.title=b?(on?'Remove from favorites':'Add to favorites'):'Pick a bean to favorite';
}
function toggleFavBean(){
  const rn=curRoasterName();
  const lib=getLibrary();
  const r=rn&&lib.find(x=>x.name===rn);
  const b=r&&r.beans.find(x=>x.name===$('beanSel').value);
  if(!b)return;
  b.fav=!b.fav;
  setLibrary(lib);
  if($('roasterSel').value==='__favs'){
    if(favCount()===0){                  // just removed the last favorite
      toast('That was your last favorite bean — showing all roasters.');
      beansConfirmed=false;
      renderLibrary(null,null);           // leave the favorites view
      updateBeansSummary();updateSetupCards();saveSettings();
      return;
    }
    beansConfirmed=false;
    renderBeans('');                      // stay in favorites; dropped bean falls off the list
    updateBeansSummary();updateSetupCards();
    return;
  }
  updateFavHeart();
  refreshRoasterOptions();                // add/remove the "⭐ Favorited Beans" entry
}
function showLibAdd(kind){
  $('libAddRow').style.display='flex';
  $('libAddRow').dataset.kind=kind;
  $('libAddName').value='';
  $('libAddName').placeholder=kind==='roaster'?'Roaster name (or "Home roast")':'Bean name, e.g. Ethiopia Chelbesa';
  $('libAddRoastWrap').style.display=kind==='bean'?'block':'none';
  $('roasterSel').onchange=()=>{
    if($('roasterSel').value==='__newR'){showLibAdd('roaster');return;}
    $('libAddRow').style.display='none';
    ensureRoasterInstalled($('roasterSel').value);
    renderBeans(null);saveSettings();
  };
}
function commitLibAdd(){
  const kind=$('libAddRow').dataset.kind,name=$('libAddName').value.trim();
  if(!name)return;
  const lib=getLibrary();
  if(kind==='roaster'){
    if(!lib.some(r=>r.name===name))lib.push({name,beans:[]});
    setLibrary(lib);
    renderLibrary(name,null);
    showLibAdd('bean');                        // natural next step: add their first bean
  }else{
    const r=lib.find(x=>x.name===$('roasterSel').value);
    if(r&&!r.beans.some(b=>b.name===name)){
      r.beans.push({name,roast:$('libAddRoast').value});
      setLibrary(lib);
    }
    $('libAddRow').style.display='none';
    renderLibrary($('roasterSel').value,name);
  }
  saveSettings();
}
function migrateLegacyBean(s){
  // Old settings carried a freeform beanName; seed the library so nothing is lost.
  if(getLibrary().length||!s||!s.beanName)return;
  const nm=String(s.beanName);
  const[bean,roaster]=nm.includes(', ')?nm.split(', '):[nm,'My beans'];
  setLibrary([{name:roaster,beans:[{name:bean,roast:s.roast||'Medium'}]}]);
}
/* ============================ 5. DEVICES ============================ */
const WSS={svc:0x181D,chr:0x2A9D};
const ACAIA={
  svc:'49535343-fe7d-4ae5-8fa9-9fafd205e455',
  rx:'49535343-1e4d-4bd9-ba61-23c647249616',
  tx:'49535343-8841-43f4-a8d4-ecbe34729bb3'
};
const ACAIA_LEGACY={   // original Pearl / older Lunar firmware: same protocol, older service
  svc:'00001820-0000-1000-8000-00805f9b34fb',
  chr:'00002a80-0000-1000-8000-00805f9b34fb'   // single characteristic: notify + write
};
const BOOKOO={   // official protocol: github.com/BooKooCode/OpenSource
  svc:'00000ffe-0000-1000-8000-00805f9b34fb',
  weight:'0000ff11-0000-1000-8000-00805f9b34fb',
  cmd:'0000ff12-0000-1000-8000-00805f9b34fb'
};
const TIMEMORE={ // standard 181D service, custom payload: int16 LE grams*10 at byte 1
  svc:'0000181d-0000-1000-8000-00805f9b34fb',
  chr:'00002a9d-0000-1000-8000-00805f9b34fb'
};
const FELICITA={svc:'0000ffe0-0000-1000-8000-00805f9b34fb',chr:'0000ffe1-0000-1000-8000-00805f9b34fb'};
/* Acaia protocol (pyacaia/Beanconqueror lineage): every message EF DD <type> <payload> <cksum>.
   We send ident + notification-config, heartbeat every 2.75s, decode type-12 event
   packets whose payload[0]===5 as weight. */
/* Acaia protocol, corrected against pyacaia + Beanconqueror (protocol facts
   re-expressed, no code copied, theirs is GPL, ours is not):
   frame: EF DD <cmd> <len> <payload:len-1> <ck1> <ck2>
   ident: cmd 0x0B, Pyxis-era payload = ASCII digits; LEGACY Pearl/Lunar = 15×0x2D
   config: cmd 0x0C event-request; heartbeat cmd 0x00 [2,0] every ~2.75s
   weight arrives as cmd 5 (direct, old), 8 (event, old), 11 (heartbeat reply,
   old) or 12 (event, new), old format: 2-byte value+unit@4+sign@5;
   new format: 3-byte value+exp@5+sign@6. Notifications fragment, so frames
   are reassembled from a rolling buffer. */
function acaiaEncode(msgType,payload){
  let c1=0,c2=0;
  for(let i=0;i<payload.length;i++){ if(i%2===0)c1+=payload[i];else c2+=payload[i]; }
  return new Uint8Array([0xEF,0xDD,msgType,...payload,c1&0xFF,c2&0xFF]);
}
const ACAIA_IDENT_NEW=[0x30,0x31,0x32,0x33,0x34,0x35,0x36,0x37,0x38,0x39,0x30,0x31,0x32,0x33,0x34];
const ACAIA_IDENT_LEGACY=[0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D,0x2D];
const ACAIA_CONFIG=[9,0,1,1,2,2,5,3,4];
function acaiaWeightOld(p){          // [v_lo, v_hi, ?, ?, unit, flags]
  if(p.length<6)return null;
  let v=((p[1]&0xFF)<<8)|(p[0]&0xFF);
  const unit=p[4]&0xFF;
  if(unit<1||unit>4)return null;
  v/=Math.pow(10,unit);
  if(p[5]&0x02)v=-v;
  return v;
}
function acaiaWeightNew(p){          // [v0,v1,v2, ?, exp, flags]
  if(p.length<6)return null;
  let v=((p[2]&0xFF)<<16)|((p[1]&0xFF)<<8)|(p[0]&0xFF);
  v/=Math.pow(10,p[4]&0xFF);
  if(p[5]&0x02)v=-v;
  return v;
}
/* kept for tests + type-12 packets arriving in a single notification */
function acaiaDecodeWeight(dv){
  const b=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);
  for(let i=0;i+9<b.length;i++){
    if(b[i]===0xEF&&b[i+1]===0xDD&&b[i+2]===0x0C){
      const p=b.slice(i+4);
      if(p[0]===5&&p.length>=7)return acaiaWeightNew(p.slice(1));
    }
  }
  return null;
}
function acaiaWeightAny(p){
  const old=acaiaWeightOld(p);
  if(old!==null)return old;
  return acaiaWeightNew(p);
}
function makeAcaiaParser(){
  let buf=[];
  return function(dv){
    const b=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);
    for(const x of b)buf.push(x);
    if(buf.length>512)buf=buf.slice(-256);
    for(;;){
      let s=-1;
      for(let i=0;i+1<buf.length;i++)if(buf[i]===0xEF&&buf[i+1]===0xDD){s=i;break;}
      if(s<0){buf=buf.slice(-1);return;}
      if(buf.length-s<6)return;
      const cmd=buf[s+2],len=buf[s+3],end=s+4+(len-1)+2;
      if(len<1||len>60){buf=buf.slice(s+2);continue;}
      if(buf.length<end)return;
      const p=buf.slice(s+4,s+4+(len-1));
      buf=buf.slice(end);
      let w=null;
      if(cmd===12){                       // event envelope
        const t=p[0],q=p.slice(1);
        if(t===5)w=acaiaWeightAny(q);
        else if(t===8&&q.length>=8&&(q[0]===0||q[0]===8)&&q[1]===5)w=acaiaWeightAny(q.slice(2));
        else if(t===11&&q.length>=9&&q[2]===5)w=acaiaWeightAny(q.slice(3));
      }else if(cmd===8){                  // settings report
        ble.battery=p[0]&0x7F;
        blog('settings: battery '+ble.battery+'% · '+(p[1]===2?'grams':p[1]===5?'ounces':'?')+' · auto-off '+(p[3]*5)+'min');
        refreshScaleBattery();
      }else if(cmd===5){                  // bare weight fallback
        w=acaiaWeightAny(p);
      }
      if(w!==null&&Number.isFinite(w))pushWeight(w);
    }
  };
}
function refreshScaleBattery(){
  if(!ble.connected||ble.battery==null)return;
  const sum=$('scaleSum');
  if(sum&&sum.innerHTML.includes('mdot on')&&!sum.innerHTML.includes('🔋'))
    sum.innerHTML+=` <span class="dotsep">·</span> 🔋${ble.battery}%`;
  const st=$('scaleStatus');
  if(st&&!st.textContent.includes('🔋'))st.textContent+=` · 🔋${ble.battery}%`;
}
async function acaiaHandshake(writeChr,identBytes,label){
  blog(label+': ident + event config');
  await writeChr.writeValue(acaiaEncode(0x0B,identBytes));
  await writeChr.writeValue(acaiaEncode(0x0C,ACAIA_CONFIG));
  await writeChr.writeValue(acaiaEncode(0x06,new Array(16).fill(0)));  // request settings → battery
  const hb=acaiaEncode(0x00,[0x02,0x00]);
  setInterval(()=>{if(ble.connected)writeChr.writeValue(hb).catch(()=>{});},2750);
}
async function tryAcaia(server){
  try{
    const svc=await server.getPrimaryService(ACAIA.svc);
    const rx=await svc.getCharacteristic(ACAIA.rx);
    const tx=await svc.getCharacteristic(ACAIA.tx);
    await rx.startNotifications();
    const parse=makeAcaiaParser();
    rx.addEventListener('characteristicvaluechanged',e=>parse(e.target.value));
    await acaiaHandshake(tx,ACAIA_IDENT_NEW,'Acaia (Pyxis-era)');
    return'Acaia';
  }catch(_){return null;}
}
async function tryAcaiaLegacy(server){
  try{
    const svc=await server.getPrimaryService(ACAIA_LEGACY.svc);
    const chr=await svc.getCharacteristic(ACAIA_LEGACY.chr);
    await chr.startNotifications();
    const parse=makeAcaiaParser();
    chr.addEventListener('characteristicvaluechanged',e=>parse(e.target.value));
    blog('Acaia legacy service found');
    await acaiaHandshake(chr,ACAIA_IDENT_LEGACY,'Acaia (Pearl/legacy)');
    return'Acaia (Pearl/legacy)';
  }catch(_){return null;}
}
function bookooDecode(dv){
  const b=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);
  if(b.length<20||b[0]!==0x03||b[1]!==0x0B)return null;
  let x=0;for(let i=0;i<19;i++)x^=b[i];
  if(x!==b[19])return null;                       // official XOR checksum
  let w=((b[7]&0xFF)<<16|(b[8]&0xFF)<<8|(b[9]&0xFF))/100;
  if(b[6]===0x2D||b[6]===1)w=-w;                  // sign byte
  return {w,battery:b[13]&0xFF};
}
async function tryBookoo(server){
  try{
    const svc=await server.getPrimaryService(BOOKOO.svc);
    const wchr=await svc.getCharacteristic(BOOKOO.weight);
    await wchr.startNotifications();
    wchr.addEventListener('characteristicvaluechanged',e=>{
      const d=bookooDecode(e.target.value);
      if(d){pushWeight(d.w);
        if(ble.battery!==d.battery){ble.battery=d.battery;refreshScaleBattery();}}
    });
    try{ble.bookooCmd=await svc.getCharacteristic(BOOKOO.cmd);}catch(_){}
    blog('Bookoo protocol matched (official spec)');
    return'Bookoo';
  }catch(_){return null;}
}
function timemoreDecode(dv){
  if(dv.byteLength<3)return null;
  return dv.getInt16(1,true)/10;                  // grams*10, little-endian, at byte 1
}
async function tryTimemore(server){
  try{
    if(!(ble.device&&/^TIMEMORE/i.test(ble.device.name||'')))return null;  // shares 181D: name-gate it
    const svc=await server.getPrimaryService(TIMEMORE.svc);
    const chr=await svc.getCharacteristic(TIMEMORE.chr);
    await chr.startNotifications();
    chr.addEventListener('characteristicvaluechanged',e=>{
      const w=timemoreDecode(e.target.value);
      if(w!==null&&Number.isFinite(w))pushWeight(w);
    });
    blog('Timemore protocol matched');
    return'Timemore';
  }catch(_){return null;}
}
async function tryFelicita(server){
  try{
    const svc=await server.getPrimaryService(FELICITA.svc);
    const chr=await svc.getCharacteristic(FELICITA.chr);
    await chr.startNotifications();
    let hits=0;
    chr.addEventListener('characteristicvaluechanged',e=>{
      const w=felicitaDecode(e.target.value);
      if(w!==null){hits++;pushWeight(w);}
    });
    return'Felicita';
  }catch(_){return null;}
}
/* Adapter registry, tried in order; genericSniffer remains the universal fallback
   (covers Fellow Tally, Timemore, DiFluid, Bookoo and friends heuristically). */
const SCALE_ADAPTERS=[
  {name:'Acaia',try:tryAcaia},
  {name:'Acaia legacy (Pearl)',try:tryAcaiaLegacy},
  {name:'Bookoo',try:tryBookoo},
  {name:'Timemore',try:tryTimemore},
  {name:'Felicita',try:tryFelicita},
  {name:'Standard BLE scale',try:async s=>await tryStandard(s)?'Standard BLE scale':null}
];
const bleLog=[];
function blog(m){
  bleLog.push(new Date().toLocaleTimeString()+' · '+m);
  if(bleLog.length>14)bleLog.shift();
  const el=$('bleDebug');
  if(el&&el.style.display!=='none')el.textContent=bleLog.join('\n');
}
function setScaleUI(state,msg,tag){
  const stCls=state==='on'?'on':state==='sim'?'sim':'off';
  $('scaleStatus').textContent=msg;
  const bs=$('btnSim');if(bs)bs.classList.toggle('sim-on',state==='sim');
  const t=$('scaleTag');
  if(state==='on'){t.textContent='⚖ '+(tag||'scale');t.className='scaletag real';t.style.display='inline-block';}
  else if(state==='sim'){t.textContent='🧪 SIM';t.className='scaletag sim';t.style.display='inline-block';}
  else{t.style.display='none';}
  // quiet header dot: the main screen's only scale indicator
  const hd=$('hdrDot');
  if(hd){hd.className='btstat '+(state==='on'?'on':state==='sim'?'sim':'off');
    hd.title=state==='on'?'Bluetooth scale connected':state==='sim'?'Simulator on (no scale)':'Scale not connected, tap to connect';}
  // header summary: color = truth; fold when settled, unfold when attention is needed
  const sum=$('scaleSum');
  if(sum){
    const label=state==='on'?(tag||'Connected'):state==='sim'?'Simulator':'Not connected';
    sum.innerHTML=`<span class="btmini ${stCls}"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="7,8 17,16 12,21 12,3 17,8 7,16"/><line class="bt-slash" x1="4" y1="20" x2="20" y2="4"/></svg></span>${escapeHTML(label)}`;
    setCollapsed('scaleCard',state!=='off');
  }
  // keep the in-place badge panel in sync if it's open
  const sm=$('smStatus');if(sm)sm.textContent=msg;
  const smb=$('smConnect');if(smb)smb.textContent=state==='on'?'Done':'Connect scale';
}
// Fill the badge's scale panel with the current status before showing it.
function refreshScaleModal(){
  const smb=$('smConnect'),sm=$('smStatus');
  if(!bleNativeAvailable()&&!navigator.bluetooth){
    if(sm)sm.textContent='Bluetooth scales aren’t supported on this device. The app runs fully guided on timers, no scale needed.';
    if(smb){smb.disabled=true;smb.style.opacity='.4';smb.style.cursor='not-allowed';smb.textContent='Connect scale';}
    return;
  }
  if(smb){smb.disabled=false;smb.style.opacity='';smb.style.cursor='';smb.textContent=ble.connected?'Done':'Connect scale';}
  if(sm)sm.textContent=ble.connected?(`Connected: ${(ble.device&&ble.device.name)||'scale'}`):(simMode?'Simulator on (no scale)':'Not connected, works fine without one');
}
async function attachAndNegotiate(device){
  ble.device=device;ble.battery=null;
  device.addEventListener('gattserverdisconnected',()=>{
    ble.connected=false;blog('scale disconnected');
    setScaleUI('off','Scale disconnected, retrying…');
    scheduleAutoReconnect();                 // scale napped? get it back when it wakes
  });
  const server=await device.gatt.connect();
  blog('GATT connected');
  let proto=null;
  for(const ad of SCALE_ADAPTERS){
    blog('trying adapter: '+ad.name+'…');
    proto=await ad.try(server);
    if(proto){blog('✓ matched: '+proto);break;}
    blog('  not '+ad.name);
  }
  if(!proto){blog('falling back to generic sniffer…');if(await genericSniffer(server)){proto='auto-detected';blog('✓ sniffer found a weight-like stream');}}
  if(proto){
    ble.connected=true;simStop();
    localStorage.setItem('pc_scale',JSON.stringify({id:device.id,name:device.name||'scale'}));
    setScaleUI('on',`Connected: ${device.name||'scale'} (${proto})`,`${device.name||'scale'} · ${proto}`);
  }
  else setScaleUI('off','Connected but no weight stream found, try Simulator.');
}
let reconTimer=null,reconTries=0;
function scheduleAutoReconnect(){
  if(reconTimer||!ble.device)return;
  reconTries=0;
  reconTimer=setInterval(async()=>{
    if(ble.connected||brewingSuppressRecon()){clearInterval(reconTimer);reconTimer=null;return;}
    if(++reconTries>20){clearInterval(reconTimer);reconTimer=null;setScaleUI('off','Scale disconnected');return;}
    try{blog('auto-reconnect attempt '+reconTries+'…');await attachAndNegotiate(ble.device);
      clearInterval(reconTimer);reconTimer=null;blog('✓ auto-reconnected');
    }catch(_){/* keep trying */}
  },3000);
}
function brewingSuppressRecon(){return false;}
async function autoReconnectOnLoad(){
  if(bleNativeAvailable())return autoReconnectNative();
  try{
    if(!navigator.bluetooth||!navigator.bluetooth.getDevices)return;
    const saved=JSON.parse(localStorage.getItem('pc_scale')||'null');
    if(!saved)return;
    const devs=await navigator.bluetooth.getDevices();
    const dev=devs.find(d=>d.id===saved.id)||devs.find(d=>d.name===saved.name);
    if(!dev){blog('remembered scale not in granted list');return;}
    setScaleUI('off','Reconnecting to '+(dev.name||'scale')+'…');
    blog('auto-reconnect on load: '+(dev.name||'(unnamed)'));
    await attachAndNegotiate(dev);
  }catch(e){blog('auto-reconnect failed: '+e.message);setScaleUI('off','Not connected');}
}
/* ---- Native Bluetooth (Capacitor / iOS) --------------------------------
   iOS WKWebView has no Web Bluetooth, so inside the native app we route the
   SAME six scale adapters through @capacitor-community/bluetooth-le. The
   trick: a shim that mimics the exact Web Bluetooth surface the adapters use
   (device.gatt.connect → getPrimaryService → getCharacteristic →
   startNotifications / 'characteristicvaluechanged' / writeValue), backed by
   the native BluetoothLe bridge. Every byte-parser (parse/decode*) is reused
   unchanged. No bundler needed: we talk to window.Capacitor.Plugins.BluetoothLe
   directly and replicate the small things BleClient does — hex⇄DataView,
   the 'notification|id|svc|chr' listener key, and UUID normalisation.
   NOTE: cannot be verified in the iOS Simulator (no BLE radio); needs a real
   device + scale. See RUNBOOK.md "Milestone 2". */
function capNative(){return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());}
function bleBridge(){return window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.BluetoothLe;}
function bleNativeAvailable(){return capNative()&&!!bleBridge();}
// 16-bit number → full UUID; strings lower-cased (native wants 128-bit lower).
function nUUID(u){return typeof u==='number'?`0000${u.toString(16).padStart(4,'0')}-0000-1000-8000-00805f9b34fb`:String(u).toLowerCase();}
// native characteristic values cross the bridge as hex strings (matches BleClient)
function hexToDV(hex){const bin=[];let buf=0,empty=1;for(let i=0;i<hex.length;i++){const c=hex.charCodeAt(i);if((c>47&&c<58)||(c>64&&c<71)||(c>96&&c<103)){buf=(buf<<4)^((c>64?c+9:c)&15);if((empty^=1))bin.push(buf&0xff);}}return new DataView(Uint8Array.from(bin).buffer);}
function dvToHex(dv){const u=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);let s='';for(const n of u)s+=n.toString(16).padStart(2,'0');return s;}
function toDV(b){if(b instanceof DataView)return b;const u=b instanceof Uint8Array?b:Uint8Array.from(b);return new DataView(u.buffer,u.byteOffset,u.byteLength);}
// notification listener handles for the current device — cleared on every
// (re)connect so a reconnect can't stack duplicate listeners (double weight).
let NATIVE_NOTIFY=[];
async function clearNativeNotify(){for(const h of NATIVE_NOTIFY){try{h&&h.remove&&await h.remove();}catch(_){}}NATIVE_NOTIFY=[];}
function nativeChar(deviceId,svc,chr,props){
  return {
    properties:props||{}, _cb:null,
    addEventListener(type,cb){if(type==='characteristicvaluechanged')this._cb=cb;},
    async startNotifications(){
      const self=this,key=`notification|${deviceId}|${svc}|${chr}`;
      const h=await bleBridge().addListener(key,ev=>{if(self._cb)self._cb({target:{value:hexToDV((ev&&ev.value)||'')}});});
      NATIVE_NOTIFY.push(h);
      await bleBridge().startNotifications({deviceId,service:svc,characteristic:chr});
    },
    // Web writeValue ≈ with-response, fall back to without-response (some scales)
    async writeValue(bytes){
      const value=dvToHex(toDV(bytes)),b=bleBridge();
      try{await b.write({deviceId,service:svc,characteristic:chr,value});}
      catch(e){try{await b.writeWithoutResponse({deviceId,service:svc,characteristic:chr,value});}catch(_){throw e;}}
    }
  };
}
function nativeService(deviceId,svc,chars){
  return {
    uuid:svc,
    async getCharacteristic(cu){const u=nUUID(cu),m=(chars||[]).find(c=>String(c.uuid).toLowerCase()===u);if(!m&&(chars||[]).length)throw new Error('characteristic '+u+' not found');return nativeChar(deviceId,svc,u,m&&m.properties);},
    async getCharacteristics(){return (chars||[]).map(c=>nativeChar(deviceId,svc,String(c.uuid).toLowerCase(),c.properties));}
  };
}
function nativeServer(deviceId,services){
  return {
    // throw on missing service — adapters rely on this to detect "not my scale"
    async getPrimaryService(su){const u=nUUID(su),s=(services||[]).find(x=>String(x.uuid).toLowerCase()===u);if(!s)throw new Error('service '+u+' not found');return nativeService(deviceId,u,s.characteristics);},
    async getPrimaryServices(){return (services||[]).map(s=>nativeService(deviceId,String(s.uuid).toLowerCase(),s.characteristics));}
  };
}
function nativeDevice(deviceId,name){
  const dev={id:deviceId,name:name||'',_disc:null,_discHandle:null,
    addEventListener(type,cb){if(type==='gattserverdisconnected')dev._disc=cb;},
    gatt:{
      async connect(){
        const b=bleBridge();
        await clearNativeNotify();          // drop any listeners from a prior connect
        await b.connect({deviceId});
        if(dev._discHandle&&dev._discHandle.remove)try{await dev._discHandle.remove();}catch(_){}
        dev._discHandle=await b.addListener(`disconnected|${deviceId}`,()=>{if(dev._disc)dev._disc();});
        const res=await b.getServices({deviceId});
        return nativeServer(deviceId,(res&&res.services)||[]);
      },
      async disconnect(){try{await bleBridge().disconnect({deviceId});}catch(_){}}
    }
  };
  return dev;
}
async function connectScaleNative(showAll){
  const b=bleBridge();
  setScaleUI('off','Choosing device…');
  await b.initialize();
  const OPT=[WSS.svc,0x181B,ACAIA.svc,ACAIA_LEGACY.svc,BOOKOO.svc,FELICITA.svc,TIMEMORE.svc,'0000fff0-0000-1000-8000-00805f9b34fb','0000ff12-0000-1000-8000-00805f9b34fb'].map(nUUID);
  const SCALE_SVCS=[WSS.svc,ACAIA.svc,ACAIA_LEGACY.svc,BOOKOO.svc,FELICITA.svc].map(nUUID);
  /* Native requestDevice takes a flat filter, not Web Bluetooth's multi-filter
     array or several name-prefixes. Filtered = must advertise a known scale
     service; "show all" = every BLE device (fallback for scales that don't
     advertise their service in the scan record, e.g. some Acaia firmwares). */
  const opts=showAll?{optionalServices:OPT}:{services:SCALE_SVCS,optionalServices:OPT};
  blog(showAll?'native picker: all devices':'native picker: known scale services');
  const dev=await b.requestDevice(opts);
  blog('chose device: '+(dev.name||'(unnamed)'));
  await attachAndNegotiate(nativeDevice(dev.deviceId,dev.name));
}
async function autoReconnectNative(){
  try{
    const saved=JSON.parse(localStorage.getItem('pc_scale')||'null');if(!saved||!saved.id)return;
    const b=bleBridge();await b.initialize();
    const res=await b.getDevices({deviceIds:[saved.id]});
    const found=(res&&res.devices||[]).find(d=>d.deviceId===saved.id);
    if(!found){blog('remembered scale not known to system');return;}
    setScaleUI('off','Reconnecting to '+(found.name||saved.name||'scale')+'…');
    await attachAndNegotiate(nativeDevice(found.deviceId,found.name||saved.name));
  }catch(e){blog('native auto-reconnect failed: '+(e&&e.message));setScaleUI('off','Not connected');}
}
/* ------------------------------------------------------------------------ */
/* Web Bluetooth is unavailable in the iOS WKWebView, but the native app
   supplies it through the Capacitor bridge above. Only when NEITHER exists
   (e.g. a desktop browser with the flag off) do we disable the UI. */
function initScaleSupport(){
  if(bleNativeAvailable()||navigator.bluetooth)return;
  const s=$('scaleStatus');if(s)s.textContent='Bluetooth scales aren’t supported on this device. The app runs fully guided on timers, no scale needed.';
  ['btnConnect','btnConnectAll'].forEach(id=>{const b=$(id);if(b){b.disabled=true;b.style.opacity='.4';b.style.cursor='not-allowed';}});
}
async function connectScale(showAll=false){
  if(bleNativeAvailable()){
    try{await connectScaleNative(showAll);}
    catch(e){const m=(e&&e.message)||'';blog('✗ '+((e&&e.name)||'')+': '+m);
      setScaleUI('off',/cancel|no device|not found|denied/i.test(m)
        ?(showAll?'No device chosen':'Scale not in the list? Tap "All devices" to widen the search.')
        :'Connect failed: '+(m||'unknown'));}
    return;
  }
  if(!navigator.bluetooth){setScaleUI('off','Bluetooth scales aren’t supported on this device (iPhone/iPad). The app runs fully guided on timers.');return;}
  try{
    setScaleUI('off','Choosing device…');
    const OPT=[WSS.svc,0x181B,ACAIA.svc,ACAIA_LEGACY.svc,BOOKOO.svc,FELICITA.svc,'0000fff0-0000-1000-8000-00805f9b34fb','0000ff12-0000-1000-8000-00805f9b34fb'];
    // Filtered picker: show ONLY things that look like coffee scales, not every
    // gadget in the house. Known name prefixes + known scale services.
    const SCALE_NAMES=['PROCHBT','PEARL','ACAIA','LUNAR','PYXIS','CINCO','FELICITA','TIMEMORE','BOOKOO','THEMIS','DIFLUID','TALLY','FELLOW','SKALE','DECENT','VARIA','SMARTCHEF'];
    const req=showAll
      ?{acceptAllDevices:true,optionalServices:OPT}
      :{filters:[...SCALE_NAMES.map(n=>({namePrefix:n})),{services:[WSS.svc]},{services:[ACAIA.svc]},{services:[ACAIA_LEGACY.svc]},{services:[BOOKOO.svc]},{services:[FELICITA.svc]}],optionalServices:OPT};
    blog(showAll?'picker: showing ALL devices':'picker: filtered to scales only');
    const device=await navigator.bluetooth.requestDevice(req);
    blog('chose device: '+(device.name||'(unnamed)'));
    await attachAndNegotiate(device);
  }catch(e){blog('✗ '+e.name+': '+e.message);
    setScaleUI('off',e.name==='NotFoundError'
      ?(showAll?'No device chosen':'Scale not in the list? Tap "All devices" to widen the search.')
      :'Connect failed: '+e.message);}
}
async function tryStandard(server){
  try{
    const svc=await server.getPrimaryService(WSS.svc);
    const chr=await svc.getCharacteristic(WSS.chr);
    await chr.startNotifications();
    chr.addEventListener('characteristicvaluechanged',e=>{
      const dv=e.target.value,flags=dv.getUint8(0),raw=dv.getUint16(1,true);
      pushWeight((flags&1)?raw*0.01*28.3495:raw*5);
    });
    return true;
  }catch(_){return false;}
}
async function genericSniffer(server){
  let hooked=false;
  try{
    const services=await server.getPrimaryServices();
    for(const svc of services){
      let chars=[];try{chars=await svc.getCharacteristics();}catch(_){continue;}
      for(const c of chars){
        if(!c.properties.notify&&!c.properties.indicate)continue;
        try{
          await c.startNotifications();
          c.addEventListener('characteristicvaluechanged',e=>{
            const g=decodeGuess(e.target.value);if(g!==null)pushWeight(g);
          });
          hooked=true;
        }catch(_){}
      }
    }
  }catch(_){}
  return hooked;
}
let lockOffset=null,lockKind=null,lastGuess=null,stableCount=0;
function decodeGuess(dv){
  const tryRead=(off,kind)=>{
    try{
      let v;
      if(kind==='i16le')v=dv.getInt16(off,true)/10;
      else if(kind==='i16be')v=dv.getInt16(off,false)/10;
      else if(kind==='i32le')v=dv.getInt32(off,true)/10;
      else v=dv.getInt32(off,false)/10;
      return(v>=-50&&v<=2600)?v:null;
    }catch(_){return null;}
  };
  if(lockOffset!==null){const v=tryRead(lockOffset,lockKind);if(v!==null)return v;lockOffset=null;}
  for(const kind of['i32le','i32be','i16le','i16be']){
    for(let off=0;off<dv.byteLength-1;off++){
      const v=tryRead(off,kind);
      if(v===null)continue;
      if(lastGuess!==null&&Math.abs(v-lastGuess)<50)stableCount++;else stableCount=0;
      lastGuess=v;
      if(stableCount>4){lockOffset=off;lockKind=kind;return v;}
    }
  }
  return null;
}
/* simulator: pours at the schedule's true rate with ±15% wobble */
function simStop(){if(simIv){clearInterval(simIv);simIv=null;}simMode=false;}
function simToggle(){
  if(simMode){simStop();setScaleUI('off','Simulator off');return;}
  simMode=true;weight=0;weightOffset=0;
  setScaleUI('sim','Simulator, fake pours for practice, no hardware. Weight climbs by itself during pour steps.');
  let simLast=Date.now();
  simIv=setInterval(()=>{
    const now=Date.now(),dt=(now-simLast)/1000;simLast=now;
    if(!brewing||paused)return;
    const st=schedule[brewIdx];if(!st||st.type!=='pour')return;
    if(displayedWeight()<st.target){
      const rate=st.amount/st.dur,wobble=0.85+Math.random()*0.3;
      pushWeight(Math.min(weightOffset+st.target+0.4,weight+rate*wobble*dt));
    }
  },100);
}

/* ============================ 6. SETUP UI ============================ */
const TOOL_IMGS={
  switch:'data:image/png;base64,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We2tDKCATDb7RncyV66trUVE5HsPHjyuKBgsy+fzjBBiFXXTxsbGxU888cTT1dXVtqjbLhvg7OpQ/I3LV6y4q6m5eaMkSWghcBBFUVhRUdGgM88889Jd3cWZLvqJROKjeDyeJ4RYXU04pRR8Hs+vShcwR4CJWGyDruvt/CihlcUoezwen6kpg0606fL5/b2dLhcUjoo55yDLch3AL2c2mknWgUDgLLEg+804IEAmmXyzu5grWw2V/YHAVblcjrcTdVMK2VxO37hp04Rly5blDQC3uze7bICz60fib/Lwww83NTc33y0IAhZQsFHTNO73+/963qmnluzKLi4ajTLj5veloiirDDDmlucJkiwfccoppwQRkRWC08/xo0xlMuutfpSmXRciuvr06VPaFa9P07TCzpATQjCfz+c1TYvBr8u5Y2PHji2XZPlIVVWtr4tJkkSSyeSWJd9885F1V7cryxw3Dho06Bafz+ezdpyMc93ldJJ4LPaf6urqdw1LLlvUbZcNcHZtu4t75ZVXnmpualrlcDiQc84sujhWUlzc6/Djj79uF3dx5g5GSWcyb4miCGY4q+ml6XK5eh9++OG/+7VC5UwmU2d1FDHtuhwOh9CzR4/KzrTrMm26VF0vKiCYACEENE2LNTY2JgB+mU2X+T706dnzMK/XW66qKrOaK1NKuZLP//eZZ55pMgJv+a625AqHw/rkyZMPKgoGL7BacnHOOSWEpJJJZcPGjbcjYhsj2C67bICza5td3MKFC1NN8fi95p7DKv5WFIUHgsFrx48fv0stvMzxWTKZfCubzerWsZUZleJ2u4+FX2/XFbfu4CxkDHC53cUAP4wWO4shSggpM6aT7XZjmq43L1myJP1rf47sch1dOJ40P2Ij+w27w3jSsOSCXr161bjdboemae0Mld1uNza3tDwzderUL1544QVqywLssgHOLtiRhVdtbS1d8N57zzY1NX1liL9ZOyPmYNDfv2/fcYjId9Wp2SQSPPvssx+k0+mNoii2PU+A1jGiz+sdDQDk16QLBAKBZAeROJxSCgzA19kuJgBAZUkaYGSztQM4zljjwoULM6ZO7+c+fjgc1vv27evwuN0nWh+fc85FUaSJRKJl/fr17wMA39UiadOSq7q6+uiA339aJpPh1u5NFEUaa2lJ1G/ceE9tbS3tjHRzu2yAswt26xEl5Zxj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jOUJIUSSJIFSus2fbRDLTFMHREQqSRIRRRESiQTkFOXDVDz+/LqNG1++//77N1jvNdu7H5jM59mzZz/bu1ev85MWprS5i1u9Zs1fx48ff9+ezJK2Ae4nsrKMi5Ndf/31FVVVVTVFweDlhBBQFEUzTolYyIYUBIHKsgyZTAbS6fSbjfX1D06YOPEts1szRw6Fi+qfCLL0oQcfvLWsvPxW43TJCCHW0QsTRZEwxnhdff1111577Sy7c7NrD568CJFIRLvssst6HX7YYY8WFxefksvlmEG1JwV7cQoATBRFzOVydS+/8sr+0Wi0YdKkSaMG9O9/o8PhONHr81FmJHfouq4ZY8yOioiiKAiCAIQQyLeyI1cpudzLWzdvfqX69tv/VziC/Cn3AzNzbsqUKaOH7rPPu5bbD3LOubH+2DJ//vxhf/vb3+r2VJ2rDXA/kZEFAHDfffddXF5aOs3n91dkMhlukkQKR5GUUupwOCCZTMYURXl90+bNj06ZMuUDa7f2E0aQ2/ySXn755RVHHHbYE8Giot939Dw455rD4RAymUxiy6ZNV/51woTnzFGN/YnaZU9ggM6aNWt6r549xxvxUoVaOeCc6263m27esuVvV1555cWfffaZOHz4cBUA4Oabbz6sV2XlKR6v9wRE7O9wOEqcTqf599oleKiqCqlUKsY5X5FKJhekMpmFTz311AemdvXnTm8KHFQAEcljc+bMLysvPzKTyTDLLk53u930u++/v/P666+fuKd2cTbA/YQvxPHHH+8OnX32g6VlZZcwxkBRFL2QFck5Z4iILpcLU6lUKplIPLl+48YHp02btsa6W/s53VpHY5Zp06Yd1atXr78XBYP9Uum0Bj/uHjWv1yu0NDd//9U334Tvueeez+yxpF12/XBgvf222xjjHO6///7Ly8vKpvv9/kA6ne4o5R6/X7v2hJtuuund2tpasnTpUl4oq7n4j38cMGjffQfKstwbACoEQoqAEMp1PaExtkEQhM3r1q37dsaMGasL7y2/ANQ6vD9Nu+22M4bss89Lmqa185qVJAlSqVTThx99dOCjjz662RrCagMc2HP70aNHa7fccMPeQ/bb72/FxcWHptNp04GcFIwjdafTKeTzeYjH48+vXrPmjunTp39dMHbQf+1zmTVjxh/KKir+KUmSu3BRbsaAuFwuEovF3n/3vff+9PTT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',
  any:'data:image/png;base64,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',v60:'data:image/png;base64,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',kalita:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABoCAYAAAAdHLWhAAAlX0lEQVR42u19ebhkV1XvWmvvfaaqOlV1xx4zdCdhHgKiCIoyiPEJwseoIOBjEj7I+xARCAIPIhLiF4HHIDKoUcQRgowqg3kqKhhlFIiEkHSnp9t9763xjHtY74+q6lv33rpTJx3zPe/qVHdu1T6nzjlrr7V+67fW3hdgV3ZlV3ZlV3ZlV3ZlV3ZlV3ZlV3ZlV3ZlV3ZlV3ZlV0AgIjSqMw8K/cpBbYpTzMyrh+DZ/1PSU6EXNT3pVxDQWGftpHHrvoQkKaGUkn4IAI6B3WbH4Zr3lPCk7wU1T/oRIrFjZwF44ti17yESKKGkp7xQkJIA4JgdTz529c9SKOEpPyKSxMyOgSeOW3e90vcalemHeSqIS5OfuTMKkjP1vU9uVmc/jggQh80bWv3Tr+qmndvg7MUwKOnJqdrcc6pB/deFEBcDABlnb0nz/nu7ydKH06K/vDJ+RSK/2qxXpp4ReNFzieTFhNC07I6WOv9CknU/0E3b37LOuLXHMTAQCayF9UurYfwLvoyeQiQOAbIE5qVcZ59I896Hu2n7JmO1nXS8IElxpfnQalh/gZL+YwhoLwCAccW/9LP+ezrJ4me1Kc3aIxERqmH9omrY+PlAhc+QRBc6BGN0+c+9vPeeTn/xxrXXzMBASBj6lZlqWH9CxY9foZR6IDCAkuqKxc6pvz1XBeHB2cPvCVT07Fxnnwj88BcIyesnnTe1ksV3l6bsBl4wM9fY/3FfhQ/PyuTzpc4+hyAiJeRDfL/yJGdNt593Xt9JWn9c6LwDAOApv1qPpp4dV5q/I0hCobOvFCb/ErNrS/QuC/zw2UREeZn9QzdpXdXPOv9mnNE4mLV+Jaz/UBzWXx34lScCMxRl/vfalV9j51IhxB7PC5+lSAW5zr7cTVpX9bLOvxijSwAGIaSoBvH9G5WZ6wI/fKxjB1mZfdSa8mZEin3Pf7wng3sXZfHNVnLm+f208w3L1hISRUH1wjia+rVKUHsJAEOhs88Za76DjKQ8/wpf+pelef+vlnoLLy3KfBEQUKBQUVB7SC1q/K9ABU9HJMh0+rmiTD9WC+u/Wejyb46evuU556ygZm32h+abB2460zn1hLJMvzFd3/tBX/lXOGdL5/gOIcRhZld2ktZzl7oLfzmaPUQC46j5oGZl5u2e5z+aHZvSFv9MiJ4S/sORCNI8uaGdLL42zbu3Gjs4DgEh9CuNWtR8Si2KrxGk5owpj1hnvsmIyiPvEVLK2Dpd9rLe67pJ68N5mS6Oz9rQrzYa0dSzq2H8FiFkw1q9rK3+JwdQeCQfJpV3oTbmZD9rv76Xtf8qK5Llkef2pO81qtNPqUfT75dSxqUubzNsvitIXqqEvJSZIcm7b2ony7+bFclp5yyvHDf7843q1B8iIBhrbkMEj0jsJSTSTp/Oi+R3emnnI/28e2s9al4+P3Xw30+3Tz5uuXvqiwO3yDtXkBJKHJg9fJNAmrpt4XuHAADiSvPyyK88gUBMGau/181af57kvcWJPlIoEUeNH4r82lOkkPdhZmud+W4/7/1FN219Y3SDkyTwwko1bDwq8KKfk0IeRkaybG5Li+RTSdb9v1mZdDe7+MCLqtWw8ZjQj54gUR5iZGWd/W6S9/8yydr/VOg83+y742j6qaEf/g9AbALzYqHzf+yl7Y9udK8AAFFQna6HjZ9XKniwYzbOmeNZkXw2LZLvFjrLBjFX4AVzl31VCLH36OlbLih1Ud4ppDDb2Pfk+1zwEJ6O5x+1Q/2u+olIICFtOmbiWRBBkCQigYh4jscLFCQJtzF+9bEE5/K9g++ZfEyzOvPge19wOe+dOnjlXQLlAhWGl+1/YOfi+Xt9QZDAdSgFEQIvqkghaTuKkkIJRNq5OSPCf4UQEq4oFrccK4USG90/IeGFc5d+/F4HH1hEQW36Tl8bAECus6ybtd8Y+NFjK0F8eOArV76UmUEK1fRVNDP5NLxqRlbD+v2V9Pwd4X2S2KhMP8STvneuN1MJajPVsH5gh8qBWtS4VEnPW3svG7jVRuBF8xvdfxRU9wR+9HNJ3v9QlveX7hIFAQB0kqXrnbNlXGn+ymAmr77QUucLSnp7Bxa2sTA7sM60lFDxTi6EgQEQpZJe7ZyTOqGmCFHu0GoJACWzc1s+LCJU0pvTpljeaEwcNX8REamXtt/Fayb6nVJQXqSdfta9rhLUXhz6lam1A7UtNQCzp4L6Vic1VrelUFM7uRDnLDvn+ojkn+vNIIA0zvZ3lAgKz2d2hXHWbDXWk0GESIG2upj0ua/CMApqv1oU+Rf7WfeWzS0St6U8Gp/BnbT1PgCUcTT1nPWWwVCa4rivgn1bnVibMkFEtd5Xb6EktgkieuemHAREFMyu3JlrFaFjlzNvaUDgSX+vdaa1ETKNK80rJMn5btZ+66QEfL1b3Bp2r3IHad47npXJR2th/PqWCj8wgo0jKXTe8lV4sZJKaVPqjU5qnbHMrhQkPWN1tn0rcoUUqomAwDvNGRAAAIm386THQIkUql6aYnFrS1NCSe9AP+t+ZdLnSnqyGtTfaEx5Rzdd/kffC6PpeM9rmTkdWoLHiBIBnDb6B9aVt5W6uC0rkxOjHHFLBTl23Evb11aaB55Wr0w9+XT7+J+uevDWOGPKBU8G09qUpzaOQwzGmmVP+TOFzu7YgQVlRP5+JELeJH/awIIQAWg1z7clxEYiEVtnj2011lfhNDOX2hT5+pnBUAsbP+wr/8GdZPlKbUo93zzwi7UwfoNx9iQBK2AgAJIMQNVQVBFx8JxM8Z1e1r263V/8eGnW50vrAmo/63y9qM18Lw4b17b6ix/VptBrrGghCmr3ESQW7CYP0VjdD6U3T0johuTkVmKdzRHQI0B0O0y7iYQARMnOme0eo4TyB5ZrzFaW5klvvzbF0fX3MuQNK803OGe7nWT5IwAA7f7Sn7X7S382mDCrSVZC8oSQldCvPqLmxy+fqs3+WS2Kb17snH5qJ1n6zsQYNBY/TJJ136SUfzCOGj+6FudrW5bMTnsqqG0BFApEiqRQattIzjmLCOJcEiJCoqEFbVuxQqgqs9N2C2uVwlOI5Oc6W5iU/1TD+JJAhVekRXp9ViStwUTOskJnWanzotTF8JUXpc6LvEx7SdY9tdg+ccPRM7c8dqF17KEMKOabB749E+/5qU0VNIDcy5+01rSrYeMqQoHjk3kAFsoTnvT3b5a1O+fYOdv1lL9tNMfgHDOAIKF2qiBEJAawbhtobPRslVAz1tnO1uDAq1tnltfHXQYEhDhqvBCAoZcuv2vEbEuhhBKeVNJX3srL86SvxuefdZZb/cWvnli8/fLC5J+drs9/biqe+7HRRU7MGfIyS3p559p61LwmCqv7+2nn2DjZV+q8G3rRfTzlBxvxXQwMxuq2kv4eBDy1naDvnGMGLoVQFdiER9sgnggAdo63Z0EEhIJEI9fZ0a2BhDdXbDAu8KM48KJfKsrsM92sfWvoV+rzzQOfJBANQKwQQjCafQxgGMFYq7+el+lnemn7U4NSDUJepsmppaNPOzB70b/N1PZ8JiuSC7Ii6WzIx3SS5Q8yuzKOpl68Fs9bZ5xxetH3wk2zdm3LtiBRFxtSRGtBgmN2rk9I3jlYkAQG3G7oGrheROfMprBcSd9HRKVNkUyE1kHjiYLUXJL33odIOFWdfZUkebFjc8Ta8lulKW8sTfHXuck+Ver801rnfydIHGxUp68/MHtoab65/xcIEREQCp1lS90zzxJCxFPx3Bs29fSICAdmDv+fy/Y/oBN4UXVSUjYdz/+k3OThExFO1WZ/xPfCaLsPOo6ah+OoeWinCqqG9X2N6vQDtxu+Qr9Sb1ZnLt9qfDWs76uF9YMb5EXeoX33/c9De+/zZSU9hYighJKCJBESEtIwnOLKnyExXAlqswdmD73j3hdczvPNA88ff+4Xzl/yJ5ceeEAW+dUp2gwqd9PldxGJuFGdecHaz0tTZMwuC7xodjOXpa1Z8KQ/swPKpyQStZ2y0oQUMIPeLkRQwpuxbHubecRhLJkpTTGxbF2LGg/3pX9ZL21frU2pmQG01cY64xw7duxgcH5e+cMM1hmX5L0zJxZvf2U/7VzbrM38XjWs7xs9907SvlaSDKKg+tBNXU8/7/4g1+nna0H8Rl8F4VrOrdD5D5T0D27GXBtbtgTJqe2y287ZXJBoEhHu0MV5DK7cjotDRBBCNrUpz2zh3gIAQG3KfAKsx2rYuErb8nQ3bf3ddojWtcyHY8eL3ZNXM7OpV5ovWsEAyfeNNW1fBj9Jm53COctJ1n2nlN5UrTL9M2shd6HzZUIKPekFm9A+fUEiliS3RWIaa/qI6APsDGoTUmjt9ng4QVIgoLTWZFtQOzPW6kU3IfetBvFFoRde0c96bx0ApZ1Z/Ag0FTpPk7z/IV+FPyNoEC4KnSelLb/sqeBnaHOuCKCbtm/UVp+uh/U3S6FofJYYq6225YnNXJhz1jq2qaf8+rYsiJ1BQIW4fQsaFvtqAGy3BxBkwOC0trrc7JxKqv2TaCAEhFql8TIGdr209ZGdWs861sWUNxHJ+0khvbH3+4SktvQ7hc6zJOtc4yn//tWw/sC1VpSX2XEpvfmNyhCOHVhrFpX09m3vgge0vxQy2D6LQIKQqtuleaRQsXOuvxlt5ym/BgBcmrJYDzCiRuRVX5rl/d9Li2QR7rwgIUYAK3EAmSUj+rQNBhLayfL11pm8HjVePYglPO7Ccma2/iZliNKUZ6Tw9o1MeCsFMbAWJKId+HMEROWc09tU0NxW8cdXwQXalCcmKTEOm88QJKJO2nrnDrjZDWORp7xHGKv/1Vidj1ywkN79jC1voq08JQJCViTtJOtdF/iVp1f86p5x5TE70KY47qlgQ2ZB2zIDAJJSbWkVdlAX6tFOFIQkEEAws9naHQokpMCxLTZRoBQkm4XOT0+wLK8S1l9blNmN/ax78501HU8Foe9Fzyp09jejEoUvg4YS8tJSZ1/cekYP/+6ky+8DAIqj5vPW+txCZ0tEoi7lZN7NWuus1ad8GezdpptLCXeiIBSj+LUN6/EBUGizcRnEU37snO1qO+7ecGg9jUcqqS7u5Z23bV3z2do71aLmTwkSQT/r/cXZ7/eCQwAIWZF9eRvYd6CIJO+fyIr+9VEYvzLwwsoa5OWsNUuBF+3b6BzG6tNSqPntwG3HLpMkZ7ebdBKSdAzGbsFKDxVUY+DSsXUbM9f+3sIUx1bnSAxCSKpGjTdpZ0520/Y/3DnlMPgqDBuV5ruyPPlEL2vfPLwXqIaNX9W2vCUterfQdk/I7KCbtt8uSMzF0fRTJ/B3Rz3pXyxITnyqhSkWiagqSIitFWRTJGrgNqH2wB26YjtASklvj7FmaaMEVZJSiOiXOm+tY62D+LLAix6V5r3fLnfIFa4LHUgw29j3dkHy4FLv9MtHVdooqO2v+JVnpnn/vdqUmrZ7QgCAftr5blnmN9ai+uuV9NVqIJBnDFxuBBaMLUvnXHc7TSHGmq4gqmwXahOJCjNo2KLUMKBfRGysbm+iwNha27HW2NUPFKEWNa5kZtdNRtD63BpCEBH2NA68rBrGL2n1zjyzn3WOjaxnqjZzNYMru8nyH21YbtjIiowzrp933q6kd2m90nzcarDAUOridk/5BzeifYzTy0p4W5YfnHMFAIXbTVUJMWB26VaMuRRKEVJgbNnfQIHgKX+PtuWZtecKvepM5FdemBf9P0+L/qlzzX0QEeYbB17QqM28p5d1rlvsnvrYCFw1a7M/Efm15/fS9q+nRb+1QwWNEtfWF4zVC3HUfPOApeYxN5cuEMrGRs0ipS5OKqn20xZxiNk5RCAxrHhuA8UFjl22VaVBClVx7FJjzUQ4LoTyECksdbFOgXGl+Wwi4XXS9rU7h9Y4SpBpz9SFr23UZj7UzzrvPbV89DWOHTMwVMN431R19oZCF19f6px+90pZZIdfVOg876edN/sqfFgtrN9v/AKM1dY4fcpXwdQGbi5lBhZbVFkZ2DnHpSRZ2T5R6rJtxJ9Z4/SZjR6wr/wp68zyWnTmycCP/NqVeZl9qZ91/uNcYk7ghZV9M4f+vF5pXtNNWq87sXT7lXbYLBKoMJqr7/8MEsVL3VNPK0xenC2P7/SLBla0/CeOTRlHjVfgmq79osyOK+nvm2QlxhrrnG150mtsEYMsg+vgNpsQETF0zuVbJYSIGBijlzaKT0r6B0o9zlyPoHD9h5VUh5Os+1uT1iNtZjUAAPXK9H33Tx/6RqjCpy12Tv70yeUj19ixVRN7py78pKf8By/3zjypm7ZuHS+O0rkEuaxIO2mWvD/ya78UBdXZ0QMYMAtFNpytweSkVS9K6c1uVk5gduyc7eA2CneCJBJQ7HhzBQkhBQJ52uj+Rsw1InralMkqaE0Ca0H8q9aUR7pp6/M7mcy+CoL9Mxe+fs/UwW8z2/aJ5SMXLXZOfW40n5X01b7pCz/q++FjW90zv7jUOfnZtctUzkFBg561drp0HSBSvTL94nF21rFjbctTngrmN3BzHUliGrcoJzh2iSBR34b1ECMSw+ZJKpGQDKwtT86VPOXPG6MXVtzbqCGkfonvV57Uz/vXFtuE1ogIzerMQw7OHLo5jqZ+I8k619yxeNsjemn7yKjnz1dBsG/mwk8HXvTEVu/0sxY6xz/CE4AHnYs/BQBIsu4daZ7cUA1qrx4lriOrKHW+LEnNTCJQjdUFA2hPetEWdaGuINncqnA3Wjdird304SmhYutMa1K/HZFAJdR8YfKTE6D1K5hd2c2W/2JjaL3yXhRUpw/OHv7gnqmD/w6I8tTyHQ89vnT76/Sw542BoRrEe/ZNX/wvgQofv9g59fiF1ur+wzupoGGtiB130+WrSch4JXHlkRK0A5dP6uO2zrK1piOFV9+Ck+shoIdb0AmEgw4g63S+hSusWmf6k3CeJ7yQmXNtymx8okV+dToKqs/Py/QPsyJZ2hhaDyxiz9SBFx+YObwYeNELW/3Flxw9/f1Drf7iV0fokkjgbH3vz+6bueikQJw+uXz00sXuqU3d5jkqaJi4Zp3/KHV+UzWKf11JT/Hw5pgZtC5O+iq4YJIFaFOeUkLNb2Yd1ureoE97SwsicFxs1s0jSCAR1bTRvUmTTSl/RptyYZTNj9x1XJl+kUARdJLWO5l54qItXwXBXGPfUw7MXfKDRmXm/UnRu+7YmR9Mn1q+4/3jnaKVoDZ3cPbQn07X5z+dl8nvH1u67d7dpPX9LRHqnWFijdW2n3Z+yxPeZXHUfPhqZqHoEInayrqbVUChj0iREFJsEoM0A0qkLdNVBNy8UCdIKgQUk7g6QYSCRFyYYmncegIvqtSC+DVFmf17P+/+50q/OI9c2dTeqQtefsHspSenavMf06a48cTSkcPHz9z2a4NWqrO5l5hvHnjegdlDC76KnrnYPf3UY2due2FeZul2mAgJd1I6aeuzcbV5uhbV39DuL10xCrLGamutOe17wVxpimOrLajQzC5T0qttRLs4ZocIQpBU1ppikxzIY+CMN2kvltKrWWe7k8Yo6UXOuczY1U2JtajxeCFko5UsvsUOoTUhYSWMD8Zh45erUf11hAKSvH9Dp3P8qm7a/t54fjWMX5dO1eZ+P/CiH0uL5KPLnVMv7+fdhbWe6LwqqNBZmuT9d9Sj5jWVID7UTZe/P5pthc5PhF50L0I6vranWVt9SgmvmUHS3gAkGABgQcIHgGITdBZaZ/ubkQgCRcU605nkBZXwmtqWi4PPBtcthRK1sH6VNsXxTn/pr6VQol6Z+vFaEL8i8CtPYmZI8+T9nWT5ul7W/v7axLcS1GabtdmrqkH8K9rp04vtE49b7i3+nWO7Y26I4C6QXtL6AwBwcdR4EYwtHSl1njKAGXbHwBoXuERE8UblB+uMY7Zd2mJBFyEFztnORrORSKAQombs+vxnEJtEVZsBNzdyOLWw8SAlvYflZfpHQsjggtnDX5lvHLhRyeDR3bT16mOLP5g7dubWl3TT5VXKCf1Kfd/Uha85MHPx6Ypf+5VOuvxrx07feuFid+GLA+XsnFyVd4WCkqK3kOT9D1eC6itCP3prViSdUVuRNsUJT/nzhc5uXxW/TFmCVzFKKFWuWUExRpomW3WZIpLvnO1tokACQGHs+g5SJf2KY5eP2AE+C63rL2V2ZTdt/4EnvFlj9TdPd068sZe2b1y7ZmpApEa1enXm+bUofhuBCPpZ563tZOkd65fz83+NgoZNjtdWw/h59crU07Mi+RCfdYF5qxrGe4SQZMcWKjl2bNmlQsgITNHZKFlFpGBzBQHxJt08SqqKczZZW6BDQPCkN1uacnH08zBH2R960XPTIvlgN23dQiSwl3WeP6n1KvQrjUZl6jm1qPkuQoKk6L2/3Vv8jV7WOQ53kci76kT9vPufeZl+rRrEb/KU/0ejzRusNdY5l/gyiFPbb6+B0m0lvdmsSDob5EJnk9WNSgkIKDfrRRCkapOYbiGkIBI1bcsjZ60HEOLK1IsAyeskS9cNYyGvZQkqQbw3rky9tBbGb0BASPL++9vJ4tv6Wed2Zoa7UuiuOpG1xvWzzhuV9PfH0dSjx2elNsWikt6etXmPsTohFNWNWrasNT1CijZy3YgIgOgzT+7mQSQQJKrGlp0J1E7DsUvHrdr3wmrkVa7My+xvkrx/ZI1CqVGdvv/B2Us+vH/m4hPVsPaGXtb9jTsWf7DnjjO3vqSXtu9y5dylFjSqFdWr0wvVMH59q3fm8yPIXZqiH3hRqKTnjSdv2uoSAUgK5Vu3nqqxg84bQkCctDCLUBAiKusmd4gSEiGSb9Z0kCIgeMLfM1p6MppItajxU0KqqV7/zDXWGR4lonHUfGwtavxvT/oP01afbPUWn9fLWn+VFeNb1ZzbXjx3q4IKnedJ1n1LvTL17moQH+6ky7cgIFhn2Vh9xlP+dGmKk2OsNRhrFqXw6pOISHZsAdggEYJdn8MgIgKDsc7qyQU66Tlnu2vrO1IqBQikzaAwNw6tizL7WjdZ+lLoV+rNysxLqmHtahLKK3X+5TOdk4/ppe0vrQY1I8Xc9cq5S13c2cQ1Wf6IdTatRvUrx2NHrvMFQaqxFlYbWy4LEtXJIMFoZi4ISWxElDKw4w18iyAZWWfStR97MpgyVi8OajLDmk9Yf4AS6mGlyT/RqM7+9AVzl7TjSvNteZl/5OTS0fsdWbjlkUvdhRvXI87zo5jzYkEAAGmRtNK8/75qWLsyCqpXj6CmMaVmz2ZKen6p82IlHypTTwVCkKS1M9066xxzSSgkAOgNaGTeqFmEiHxtVjMVhIRKqJm0TL4/9h5Uw8YrHNtFQd4DI09e2EmWfrmXdm5I8/7i6p0Wz69CzrsFATD0svZ7EIVXr0z9z5V3GUpTLnnSn17DGDhm1pPWpQ5mvjOjxsQJIICA2UwyoGEHT2DdappISc9nYKPP9lwzREF1X+hHzyzK/FOLnRMvPL502wtOLR/7QJL3Fldv53L3Kuc8KQign3ePFGV6YzWIXzfe5KhNmQgS1fEe7eFa1q6SXjwZartkQwUBoAMuJz05IaRw7Iq1Vqmk19C2XNWXEEdTLyQSQStZujot+q31q77vfsWcRwUN1hV1svYbhZCNuDL1hHH6xjmbesqvroHbPSJRmVT6sc5syCYgkmTnUjfBggTJgNnpcesiJCCkoNQribGvwrASVK8sivTGNO8dgXuYnBcXBwDQS1tfKUx5Sy2M36SkJ8diztJgoyUcV5BGRCloffmB2WkiUdkARivrbDZphhOSMtb016A3zzGXZqwpMa40Hi+Fmull7bdYZ/m/gYIGVqRNqftZ+2ol/HtXw/rlY6WGfAiBxTjt45xNpFDhhDhkCdHboLiHAOtZBEQEIhFZZ8vVsNurDZJWHlkZVYL4VaUub+umrX+Ee6CcJwWNrKj9KetsvxrUXzZqw3Ls2FrTlWJ1T8Kg3VdMUpDjwToYmAzF1yuIUBAM9k61q90bKm3KdKwscJGvwh/r5523lJtsDvX/oYIGkhdpJy367478yrOjYLSuaFBtlWJ1zDFW54io1uVJzmhgcJP6tAf7WE6IP0IqB6zHgYAUymPms9u+ICDUosYLnbPdbtr66AqM/m+joEGS2k1bHwBEGUdTLxhThmVmMx5zhrOdBRGtiUEMwJZw0qoIJGbW628KhXMmX+3eVFWP1YQCL6xFfu1lSd777RXKhv87KWhws2neO1Lo9PMVv/aqQK1saGGs7o/HnMH+ATYlkmrtaZhZ4waVPTeJ5kHE0XLCUU6EiMKYslwBB1NPEURxL2tff0+1nvPu4oZsAHfT9pullI1apfnTYwoqBIlg1cZC1mSCRLBaPwyWbYqTp4Bza+rNiATM7MZ/r4QUSjpn81HZXUlPVYL6G3Kd/UOa94/dU63nblHQECz8a2n1yXrYfIcSA8htnWXHrhh3c8ZqjYC0Nh+avJ/BaNnL6kLcoILKq+g5IhFouwIO4qj5yMDzD/fTzlsGiew903oAALa1pygCAOFgvdvmL1x50fBfQGC2Tgn5fSm9vXnZ/7S1pkBEGGxkxIww2jObYbC4l8/uazPYmdAZZmdH40bfNRjr3PhYRObBXgsr1+PY6eGSFkBEiCv1HwEE1eqffqdjq8fHrry2vsd7hF7pnju57hku6Dw/oG2dXQhB9zlQ3YOD7djGPBDDYLvrgYURwZqZP/A0DhDM8LfvMA/BMTM7xzjwRMyEAIJwCJ0HPCkDAjPAIBEabWTMQ06ZARmQcfARIQLh8GqG4JuZgR2wY16peyAAEgIhsicHLfzGDghxxAEv7hyDZQDHw/RreEpJoxIUsBJEdyzl7dOdIh0dd7cqaPSll+yLove+5KK/fvhF7lFSADiSgGK4RyrwYHMMJEAgIGZAYBA0ONhaBsvDWigNQp5zgwXJzhlg6wCYAAmABIIUBEIiIDpwzgI7BmcdODt4YGAZ2A1bcEkACQ9QEJBAIIEgiABpoAt2DM5YMFqDNQactYA8cEskCISUQJIGFoAEJAQgETgL4JwDay1Yq4HZAIKDwQSSMFiyRABAcKpT5m+54eRz/+BvT/0l4WAi3a0KIiS44fX3+sgT7++e9fc3l9872rHfVEooQHF2SjMCMwsA62AwERlM6fqlcS3rXB8ASkZQQpBHIDwA5xCBHYBGZsOOLRIAkEAe7DOSOeASmA04B+AcOgBgB8zWGgC0gCgQiRiFIAFSChFIiVUklEBMyCiAAdhabY0z1tnUGkiN4cwBG0JSgKQYwSPA0PNEXSoKBFJFIkqQCGC1tY5LY2zC7AwgO2BBiOARs1epyH1XPCj+WQyr8MhXfmvu5iPdM4QIju8GNDhyYVHoiW//7oMWjvzuAxbmmpVwRae7gQkA4OrnHLrafuER+hk/se/pA27vrn8um1ZUmZlJ+Lq0zlk7yiu2N0OEGCKhLY2Vz8nctzpq0m9N2Op46wbxZ7uirbNkjSzyjXvHz4uCeBj4i9K4W07Zf37ij9ae/sk33/db3zzavTHrma/1+uZkq8+mm1pxvK07R85k3+mnplNohix30C+dsZbvMUWvnXkPktVAoCeJK6H05pv+RfMNeahZldyIiKdjLwgkH56J6eFPe7h8yqkzxn3j9uTvR2zI3Q4SDu+vRu975f0+/cMX06NrPgB5DIAOwFoAdgCOwWYa+j3juolzra6Tty+V/3G6Y76UZeW3231uFxCTF8aWpAcWCZjt4ByOgdmCdQNAwWyBHQwTTzfMpAlGLSNEcHabcGcdODjbjDWM9Qg0vHYEcARIQIPchQEdAICzDMYyWQaw2qAuU/TJublGAPOz/o8f3h88c67uxbWKNI2q9IKAAUADOAtQWrCFgbw0kGQGFkux+Jo/Xv7xT3/lzM1EAM7B3aegNbMK73OwuqcaovQ94KqPrhpSLa7Ih8zV1X331mlPI0IRBwRxQP5UDX6uHnG1FsYgaheCHzRBehUAKYAZAdmABQ3OFMAmB2dyYDtCdQNoiwKBiICIYPAbZEZQls9yd+wsDPZPGmiNAACZB510BIAogIQElAqI1AB9OQQNAMIZ0MaBURWoYQeSpeOw3C9hsa+/3s3tN7o5Qrdv9GLf2JPL+tjx5fKmpa7+Tj9l7ucMacF4vFUu9HNTns9WEtxaOTvH+FJJGSrw9szONA9dfPnHrC4vaLdvfQxzvuQcEA8TlGGmA4PMwgGP5zs4xhoArjTUIKy5oIEVMa9ubVzFaAxvdZD9EyAJlAKcE1OPiWsXX6/t0lVHj3z7TxaW86yb6P5O7pgIdxS3zpsWB4kogljzIlpNi6yVqj/95Ivn7s8IQXxPizeNaP+VB6bu1QJYTdCupXdW3/eAXSHc6a6q55EsZRhk1c7xIF6MvZwbzeCVeTea/YQIJO1NUeTBXGP6cfck5XhSibnp5hul5/5WEOcjrnEEksZfq+97kJA6Pn/swbZh9jlXgsaW4mZFulDo4nQ1bPxWWiZftdZ0YNBGxcP/eMui0qroM/LLuPa3AjKMnXRCWFh1eBw1nkioZtJ8+WPWuXtsbne3XNV0PPfI2fq+Lw34MefWW+4mO8Ot6NCtNIggDSbXML7g+hky1IYZsnKOGRwC0GgsovDKsvji8eXbfrbURQH3ULnbpk0talwQ+dVHImAECMjMdug5GRHkgCZlMYIlzGgAuGR2BgAZgHHYLk9DAlDiELituxPHBIiOgTUDW2A2wGAYwSKDAARpnLmjl7S/om1pYFd2ZVd2ZVd2ZVd2ZVd2ZVd2ZVd2ZVd2ZVd2ZVd2ZVfu2fL/AG0ggZVNtMcgAAAAAElFTkSuQmCC',chemex:'data:image/png;base64,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',origami:'data:image/png;base64,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',melitta:'data:image/png;base64,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',aeropress:'data:image/png;base64,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',frenchpress:'data:image/png;base64,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',phin:'data:image/png;base64,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'};
/* Cards fold after a choice is made: beans change weekly, brewers rarely;
   the daily screen should be Method + Dose, with everything settled tucked
   into one-line summaries. Tap a folded header to reopen. */
function setCollapsed(id,c){const el=$(id);if(el)el.classList.toggle('collapsed',c);}
/* Beans + brewer rarely change: once both are picked, hide the two cards
   entirely and leave a single "Change" bar to bring them back. */
let setupEditing=false;
let beansConfirmed=false;   // beans card collapses only after the user confirms
function updateSetupCards(){
  const beanOk=$('beanSel').value&&$('beanSel').value!=='__newB';
  const beansDone=beanOk&&beansConfirmed&&!setupEditing;  // gated on Confirm beans
  // Beans and brewer are independent now: confirming beans collapses ONLY the
  // beans card. The brewer card always stays open so you can switch brewers
  // (which drives the method) without disturbing your bean selection.
  if($('beansCard'))$('beansCard').style.display=beansDone?'none':'';
  if($('brewerCard'))$('brewerCard').style.display='';
  const btn=$('btnChangeSetup');
  if(btn){
    // once beans are confirmed there's always a way back to change them
    btn.style.display=beansDone?'block':'none';
    if(beansDone)btn.innerHTML=`✎ Change beans <span style="opacity:.55;text-decoration:none;font-weight:600">· ${$('beanSel').value}</span>`;
  }
}
/* Plain-language dose readout for Brew Print, mirroring Just Brew. */
function renderDoseReadout(){
  const dose=parseFloat($('dose').value)||0,r=curRatio(),water=Math.round(dose*r);
  const ice=dose?icedInfo():null;   // flash brew: show ice + hot water, not one lumped total
  const waterPart=ice?`🧊 <b>${ice.iceG} g</b> ice + <b>${ice.hotG} g</b> hot water`:`<b>${water} g</b> water`;
  $('doseSum').innerHTML=dose?`makes ≈ <b>${cupsTxt(water/CUP_G)}</b> · <b>${doseTxt(dose)}</b> beans · ${waterPart}`:'';
  if(document.activeElement!==$('doseCups'))$('doseCups').value=Math.round(water/CUP_G*4)/4;
}
function updateBeansSummary(){
  const b=$('beanSel').value,r=$('roasterSel').value;
  if(!b||b==='__newB'||!r||r==='__newR'){$('beansSum').textContent='';return;}
  const age=beanAgeDays();
  $('beansSum').innerHTML=`${b}${$('roast').value?` <span class="dotsep">·</span> ${$('roast').value}`:''}${age!=null?` <span class="dotsep">·</span> ${age}d`:''}`;
}
function updateToolSummary(){
  const t=TOOLS.find(x=>x.id===tool);
  if(!t){$('toolSum').textContent='';return;}
  const art=typeof TOOL_IMGS!=='undefined'&&TOOL_IMGS[t.id]?`<img src="${TOOL_IMGS[t.id]}" alt="">`:'';
  $('toolSum').innerHTML=`${art}${t.name}`;
}
function wireCollapsibles(){
  ['beansCard','brewerCard','scaleCard'].forEach(id=>{
    const h=$(id)&&$(id).querySelector('.ctoggle');
    if(h)h.onclick=()=>$(id).classList.toggle('collapsed');
  });
}
/* Pinned brewers float to the front of the picker (user preference, saved per device). */
function getPinned(){try{return JSON.parse(localStorage.getItem('pourcast-pins')||'[]');}catch(_){return[];}}
function togglePin(id){const a=getPinned();const i=a.indexOf(id);if(i>-1)a.splice(i,1);else a.push(id);localStorage.setItem('pourcast-pins',JSON.stringify(a));}
function pinnedFirst(list){const p=getPinned();const pin=[];p.forEach(id=>{const it=list.find(x=>x.id===id);if(it)pin.push(it);});return pin.concat(list.filter(x=>p.indexOf(x.id)<0));}
function pinBtnHTML(id){const on=getPinned().indexOf(id)>-1;return `<button class="tool-pin ${on?'pinned':''}" data-pin="${id}" aria-label="${on?'Unpin brewer':'Pin brewer to front'}" aria-pressed="${on}">${on?'★':'☆'}</button>`;}
/* Size brewer tiles so an EXACT whole number of icons fills the strip: no partial peek at any width. */
const STRIP_MINTILE=74;
function sizeStrip(id){
  const el=$(id);if(!el||!el.clientWidth)return;                      // hidden strips size when their screen shows
  const cs=getComputedStyle(el);
  const gap=parseFloat(cs.columnGap||cs.gap)||10;
  const content=el.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);
  const n=Math.max(1,Math.floor((content+gap)/(STRIP_MINTILE+gap)));  // how many whole tiles fit
  const tile=Math.floor((content-(n-1)*gap)/n);                       // grow them to fill exactly
  el.querySelectorAll('.tool-tile').forEach(t=>{t.style.flexBasis=tile+'px';});
}
let _stripRz;
window.addEventListener('resize',()=>{clearTimeout(_stripRz);_stripRz=setTimeout(()=>{sizeStrip('toolChips');sizeStrip('bBrewers');},120);});
function renderChips(){
  $('toolChips').innerHTML=pinnedFirst(TOOLS).map(t=>`<div class="tool-tile ${t.id===tool?'on':''}" data-t="${t.id}" role="button" tabindex="0" aria-pressed="${t.id===tool}">
    ${pinBtnHTML(t.id)}
    <div class="tool-circle">${TOOL_IMGS[t.id]?`<img class="timg" src="${TOOL_IMGS[t.id]}" alt="">`:(TOOL_ICONS[t.id]||'')}</div>
    <div class="tool-name">${t.name}</div>
  </div>`).join('');
  document.querySelectorAll('#toolChips .tool-tile').forEach(c=>{
    const pick=()=>{tool=c.dataset.t;renderChips();populateRecipes();updateToolSummary();setupEditing=false;updateSetupCards();saveSettings();};
    c.onclick=pick;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')pick()};
    const pin=c.querySelector('.tool-pin');
    if(pin)pin.onclick=e=>{e.stopPropagation();togglePin(pin.dataset.pin);renderChips();};
  });
  sizeStrip('toolChips');
  updateToolArrows();
}
// Show a slim scroll indicator ONLY when the brewer strip overflows (e.g. mobile).
// When every icon fits (desktop), it hides — no arrows, nothing over the icons.
function updateStripInd(stripId,indId,thumbId){
  const el=$(stripId);if(!el)return;
  const ind=$(indId),thumb=$(thumbId);
  const range=el.scrollWidth-el.clientWidth;
  const overflow=range>2;
  if(ind)ind.hidden=!overflow;
  if(overflow&&thumb){
    const w=Math.max(14,(el.clientWidth/el.scrollWidth)*100);
    thumb.style.width=w+'%';
    thumb.style.left=((el.scrollLeft/range)*(100-w))+'%';
  }
}
function updateToolArrows(){updateStripInd('toolChips','toolInd','toolThumb');}
function updateBrewerArrows(){updateStripInd('bBrewers','bInd','bThumb');}
function wireStripScroll(stripId,fn){
  const el=$(stripId);if(!el)return;
  el.addEventListener('scroll',fn,{passive:true});
  window.addEventListener('resize',fn);
}
function wireToolScroll(){
  wireStripScroll('toolChips',updateToolArrows);
  wireStripScroll('bBrewers',updateBrewerArrows);   // Basic mode uses the same strip
}
const LEVEL_LABEL={beginner:'🟢 Beginner friendly',intermediate:'🟡 Intermediate',advanced:'🔴 Advanced'};
function populateRecipes(){
  const list=allRecipes().filter(r=>r.id!=='custom'&&(r.tool.includes(tool)||tool==='any'||(tool==='switch'&&r.tool.includes('v60'))));
  // group by difficulty so the simple methods come first and the level is obvious
  let html='',firstId=null;
  ['beginner','intermediate','advanced'].forEach(lv=>{
    const rs=list.filter(r=>(r.level||'intermediate')===lv);
    if(!rs.length)return;
    if(!firstId)firstId=rs[0].id;
    html+=`<optgroup label="${LEVEL_LABEL[lv]}">`+rs.map(r=>`<option value="${r.id}">${escapeHTML(r.name)}</option>`).join('')+`</optgroup>`;
  });
  html+=`<optgroup label="Make your own"><option value="__edit__">Customize this method</option><option value="__scratch__">Start from scratch</option></optgroup>`;
  $('recipeSel').innerHTML=html;
  loadRecipe(firstId||list[0].id);
}
function loadRecipe(id){
  recipe=allRecipes().find(r=>r.id===id);
  $('recipeSel').value=id;
  if(!restoring){
    $('dose').value=recipe.defaultDose;
    $('ratioInput').value=recipe.ratio;
    $('water').value=Math.round(recipe.defaultDose*recipe.ratio);
  }
  // Adaptive timing is the default and built in, no need to flag it. Only the
  // rigid championship clock is worth calling out, since its timing is fixed.
  const tBadge=recipe.timing==='rigid'?'<span class="badge rigid">⏱ CHAMPIONSHIP CLOCK</span>':'';
  const roastBadge=recipe.roastRec==='Any'?'':`<span class="badge b2">☕ dialed on ${recipe.roastRec.toLowerCase()} roast</span>`;
  const lvlBadge=recipe.level?`<span class="badge b-lvl">${LEVEL_LABEL[recipe.level]}</span>`:'';
  $('recipeBadges').innerHTML=`${lvlBadge}${tBadge}<span class="badge b3">${recipe.grind}</span><span class="badge" id="tempBadge"></span>${roastBadge}`;
  $('recipeMeta').innerHTML=recipe.desc+'<div style="margin-top:8px" id="tempAdvice"></div>';
  const tn=$('timingNote');
  if(recipe.timing==='rigid'){tn.style.display='';tn.innerHTML='⏱ <b>Championship clock:</b> pour weights scale to your dose, but pour windows and rests stay exactly on the published clock, the timing structure is the method. Big dose changes may need a grind adjustment to keep drawdown on time.';}
  else{tn.style.display='none';tn.innerHTML='';}
  $('btnDeleteCustom').style.display=recipe.custom?'inline-block':'none';
  computeSchedule();
  renderTempAdvice();
  syncCustomized();
  saveSettings();
}
function computeSchedule(){
  const dose=parseFloat($('dose').value)||recipe.defaultDose;
  if(!parseFloat($('ratioInput').value))$('ratioInput').value=recipe.ratio;
  totalWater=parseFloat($('water').value)||Math.round(dose*curRatio());
  schedule=buildSchedule(dose,totalWater);
  totalDur=schedule[schedule.length-1].end;
  const pred=brewPrediction();
  const finishTxt=pred.sim.finish!==null?fmtT(pred.sim.finish):'';
  // Flash-brew (Japanese iced): show the ice/hot split as its own clear banner.
  const ib=$('iceBanner'),ice=icedInfo();
  if(ib){
    if(ice){
      ib.innerHTML=`🧊 <b>Japanese iced:</b> put <b>${ice.iceG} g of ice</b> in the server first, then pour <b>${ice.hotG} g</b> of hot water over it (total ${ice.total} g). The app times only the hot pours.`;
      ib.style.display='';
    }else ib.style.display='none';
  }
  const modelNote=pred.immersion?'<span style="font-weight:500">(immersion, steep time is the schedule)</span>':`· predicted finish <b>${finishTxt?'~'+finishTxt:'n/a'}</b> <span style="font-weight:500">(drainage model: ${recipe.grind.toLowerCase()} grind, ${dose} g bed)</span>`;
  $('ratioMeta').innerHTML=`Ratio <b>1:${(totalWater/dose).toFixed(1)}</b> · schedule <b>${fmtT(totalDur)}</b> ${modelNote}`
    +pred.warnings.map(w=>`<div class="timing-note" style="margin-top:8px;background:#FFE3E3">${w}</div>`).join('');
  $('stepPreview').innerHTML=schedule.map((st,i)=>stepRowHTML(st,i,-1)).join('');
  renderDoseReadout();
}
function stepRowHTML(st,i,activeIdx){
  const cls=i<activeIdx?'done':i===activeIdx?'active':'';
  const detail=st.type==='pour'
    ?`${st.label}, <b>${fmtW(st.amount)}</b> over ${st.dur}s${st.note?' · '+st.note:''}`
    :`${st.label} (${st.dur}s)${st.note?' · '+st.note:''}`;
  const cum=st.type==='pour'?`→ ${fmtW(st.target)}`:'';
  return `<div class="step-row ${cls}" id="srow${i}"><div class="fill" id="sfill${i}"></div><span class="t">${fmtT(st.start)}</span><span class="icn">${ICONS[st.type]}</span><span>${detail}</span><span class="cum">${cum}</span></div>`;
}
function renderTempAdvice(){
  if(!recipe)return;
  const a=adjustedTemp();
  const tb=$('tempBadge');if(tb)tb.textContent=`💧 ${fmtTemp(a.lo,a.hi)}`;
  const userRoast=$('roast').value;
  let line;
  if(recipe.roastRec==='Any'){
    line=`💧 Water: <b>${fmtTemp(a.lo,a.hi)}</b>. A neutral baseline; nudge hotter for lighter roasts, cooler for darker.`;
  }else if(a.delta===0){
    line=`💧 Water: <b>${fmtTemp(a.lo,a.hi)}</b>${recipe.roastNote?`. ${recipe.roastNote}`:''}. This method is tuned for <b>${recipe.roastRec.toLowerCase()} roasts</b>, so your bag matches. Any roast works.`;
  }else{
    line=`💧 Water: <b>${fmtTemp(a.lo,a.hi)}</b>, adjusted ${a.delta>0?'+':''}${unitF?Math.round(a.delta*9/5)+'°F':a.delta+'°C'} for your <b>${userRoast.toLowerCase()} roast</b>. This method is tuned for ${recipe.roastRec.toLowerCase()} roasts (published: ${fmtTemp(recipe.tempC[0],recipe.tempC[1])}), and any roast works with the shift.`;
  }
  const ta=$('tempAdvice');if(ta)ta.innerHTML=line;
}
function renderAge(){
  const a=beanAgeState(),chip=$('ageChip');
  if(!a){chip.style.display='none';return;}
  chip.style.display='block';chip.className='age '+a.cls;chip.textContent=a.txt;
}

const APP_VERSION='1.8.3';
let theme='max';
// Single-skin mode: shipping Max only for now. Haze + Burnt are fully built and kept
// intact below (CSS + JS); flip THEMES_ENABLED to true to bring back the switcher.
const THEMES_ENABLED=false;
const THEME_ORDER=['max','sage','burnt'];
const THEME_LABEL={max:'Max',sage:'Haze',burnt:'Burnt'};
function setTheme(t){
  if(t==='calm'||t==='adobe')t='sage';   // Adobe retired → Haze (legacy 'calm' migrates here too)
  if(!THEMES_ENABLED)t='max';            // one look for everyone; any saved Haze/Burnt collapses to Max
  theme=t;
  document.body.classList.toggle('sage',t==='sage');
  document.body.classList.toggle('burnt',t==='burnt');
  $('themeMax').classList.toggle('on',t==='max');
  $('themeSage').classList.toggle('on',t==='sage');
  $('themeBurnt').classList.toggle('on',t==='burnt');
  const ln=$('mpLookName');if(ln)ln.textContent=THEME_LABEL[t]||t;
  saveSettings();
}
// Tapping the big logo on the start screen cycles the look for fun.
function cycleTheme(){if(!THEMES_ENABLED)return;setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme)+1)%THEME_ORDER.length]);}
function setUnit(f){
  unitF=f;
  $('unitC').classList.toggle('on',!f);
  $('unitFbtn').classList.toggle('on',f);
  const hu=$('hdrUnit');
  if(hu){hu.textContent=f?'°F':'°C';hu.title=`Showing °${f?'F':'C'}, tap to switch to °${f?'C':'F'}`;}
  renderTempAdvice();
  if(isBasic())renderBasic();   // keep the Just Brew summary's temp in the chosen unit
  saveSettings();
}
function curRatio(){
  const r=parseFloat($('ratioInput').value);
  return r>=10&&r<=20?r:recipe.ratio;
}
/* When the working ratio departs from the recipe's, the method presents as a
   customization, the select's label changes and a one-tap reset appears. */
function syncCustomized(){
  if(!recipe)return;
  const off=Math.abs(curRatio()-recipe.ratio)>0.05;
  const opt=[...$('recipeSel').options].find(o=>o.value===recipe.id);
  if(opt&&recipe.id!=='custom')opt.textContent=(off?'Customized · ':'')+recipe.name;
  $('btnRatioReset').style.display=off?'inline-block':'none';
  $('defRatio').textContent=recipe.ratio;
}
/* ============================ 7. BREW UI ============================ */
/* Pausing freezes brew time itself: while paused, elapsed() is pinned to the
   pause moment; on resume, brewStart shifts forward by the paused duration so
   every countdown, ETA, and pace calc continues exactly where it stopped. */
const elapsed=()=>((paused?pauseStart:Date.now())-brewStart)/1000;
/* Corner clock: actual vs. goal. The goal is the schedule end, fixed, known
   up front. Finishing well past it is the "grind coarser" tell. */
// total-time counter: clean mm:ss elapsed / total, no tenths (tenths live on the step countdown)
const timerHTML=t=>`${fmtClock(t)}<small> / ${fmtClock(totalDur)}</small>`;
// brewer shown at the top of the brew screen (basic uses the saved brewer, print uses the picked tool)
function currentBrewerName(){const id=isBasic()?((basicState()&&basicState().brewer)||'v60'):tool;const t=TOOLS.find(x=>x.id===id);return t?t.name:'';}
function togglePause(){
  if(!brewing||brewIdx>=schedule.length)return;
  paused=!paused;
  if(paused){
    pauseStart=Date.now();pourStop();
    $('btnPause').textContent='Resume ▶';
    $('pace').textContent='⏸ PAUSED';$('pace').className='pace hold';$('pace').style.display='inline-block';
    $('btnNext').style.display='none';   // no forward step while paused — just Resume or Exit
  }else{
    brewStart+=Date.now()-pauseStart;
    $('btnPause').textContent='Pause ⏸';
    $('btnNext').style.display='';
  }
  if(navigator.vibrate)navigator.vibrate(40);
  updateBrewUI();
}
/* For flash-brew (Japanese iced) recipes, the ratio's water is split into the
   hot water you pour and the ice you pre-load in the server. Do that math so
   the brewer doesn't have to. Returns null for normal hot recipes. */
function icedInfo(){
  if(isBasic())return null;               // Just Brew is always the default hot V60, never iced
  if(!recipe||!recipe.iced)return null;   // only the Japanese iced (flash brew) methods
  const pourSum=recipe.steps.filter(s=>s.type==='pour').reduce((z,s)=>z+s.frac,0);
  if(pourSum>=0.95)return null;
  const dose=parseFloat($('dose').value)||recipe.defaultDose;
  const total=parseFloat($('water').value)||Math.round(dose*curRatio());
  return {iceG:Math.round(total*(1-pourSum)),hotG:Math.round(total*pourSum),total:Math.round(total)};
}
/* One-line "start now?" gate so the timer never fires by surprise. */
let _startConfirmFn=null;
function toast(msg){
  let t=$('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toast._iv);toast._iv=setTimeout(()=>t.classList.remove('show'),2800);
}
/* Guard: never start a brew on a zero / empty / invalid coffee (or water) amount. */
function brewInputError(){
  if(isBasic()){
    // beans and cups are two views of the same brew; block if EITHER was zeroed/cleared
    if(!(parseFloat($('bDose').value)>0))return{msg:'Enter how much coffee to brew (grams) before starting.',field:'bDose'};
    if(!(parseFloat($('bCups').value)>0))return{msg:'Enter how many cups you want (more than 0) before starting.',field:'bCups'};
  }else{
    if(!(parseFloat($('dose').value)>0))return{msg:'Enter a coffee amount greater than 0 g to start.',field:'dose'};
    if(!(parseFloat($('water').value)>0))return{msg:'Enter a water amount greater than 0 g to start.',field:'water'};
    if($('beanSel').value&&$('beanSel').value!=='__newB'&&!$('roast').value)
      return{msg:'Choose a roast level for this bean before starting.',field:'roast'};
  }
  return null;
}
function askStartConfirm(fn){
  const err=brewInputError();
  if(err){
    toast(err.msg);
    const f=$(err.field);
    if(f){f.focus();f.classList.add('bad');setTimeout(()=>f.classList.remove('bad'),1800);}
    return;
  }
  _startConfirmFn=fn;
  const ice=icedInfo();
  const base=ice
    ?`🧊 <b>${ice.iceG} g ice</b> in the server, then <b>${ice.hotG} g</b> hot water.`
    :`Water hot and gear ready?`;
  // With a connected scale or the simulator, Pourcast zeroes at GO. Otherwise the
  // brewer reads their own scale and must tare it themselves.
  const tare=hasLiveWeight()?'':` Zero your scale first.`;
  $('scLine').innerHTML=base+tare;
  $('startConfirm').style.display='flex';
}
function closeStartConfirm(){$('startConfirm').style.display='none';_startConfirmFn=null;}
function confirmStartProceed(){const fn=_startConfirmFn;closeStartConfirm();if(fn)fn();}
function startCountdown(){
  computeSchedule();
  const first=schedule[0];
  $('cdFirst').textContent=first?`First up: ${ICONS[first.type]} ${first.label}${first.type==='pour'?`, to ${fmtW(first.target)}`:''}`:'';
  $('setup').style.display='none';$('basic').style.display='none';$('brew').style.display='block';
  document.body.classList.add('brewing');$('settingsCard').style.display='none';
  buildTimeline();renderLiveMethodStatic();
  $('brewHead').textContent=currentBrewerName();
  $('countdown').style.display='flex';
  audioInit();
  let n=3;$('cdNum').textContent=n;sfxTick();
  if(navigator.vibrate)navigator.vibrate(40);
  cdIv=setInterval(()=>{
    n--;
    if(n>0){$('cdNum').textContent=n;sfxTick();if(navigator.vibrate)navigator.vibrate(40);}
    else if(n===0){$('cdNum').textContent='GO';sfxGo();if(navigator.vibrate)navigator.vibrate([60,40,120]);}
    else{clearInterval(cdIv);cdIv=null;$('countdown').style.display='none';beginBrew();}
  },1000);
}
function beginBrew(){
  const dose=parseFloat($('dose').value)||recipe.defaultDose;
  liveTrace=simulateBrew(schedule,dose).trace;
  brewIdx=0;brewing=true;weightOffset=weight;brewStart=Date.now();stepStart=0;finishedAt=null;wSamples=[];
  metrics={pours:[],overshoot:0,frFastPct:0,_fast:0,_tot:0};
  disarmExit();

  brewTrace=[];
  paused=false;$('btnPause').textContent='Pause ⏸';$('btnPause').style.display='';$('btnNext').style.display='';
  clearInterval(timerIv);                      // no zombie timers from prior brews
  timerIv=setInterval(tick,100);tick();   // 100ms so the tenths animate smoothly
}
function buildTimeline(){
  $('timeline').innerHTML=schedule.map((st,i)=>
    `<div class="seg ${st.type}" id="seg${i}" style="flex:${st.dur} ${st.dur} 0"><div class="segfill" id="segfill${i}"></div><span class="segicon">${ICONS[st.type]}</span></div>`
  ).join('')+`<div class="playhead" id="playhead" style="left:0%"></div>`;
  $('tlMid').textContent=fmtT(totalDur/2);
  $('tlEnd').textContent=fmtT(totalDur);
}
function tick(){
  if(!brewing){clearInterval(timerIv);timerIv=null;return;}   // stray intervals kill themselves
  if(brewIdx>=schedule.length){finishUI();return;}            // completed: frozen clock only
  if(paused){$('timer').innerHTML=timerHTML(elapsed());return;}  // world on hold
  const el=elapsed();
  if(hasLiveWeight()&&(!brewTrace.length||el-brewTrace[brewTrace.length-1][0]>=1))
    brewTrace.push([Math.round(el*10)/10,Math.round(Math.max(0,displayedWeight())*10)/10]);
  $('timer').innerHTML=timerHTML(el);
  const st=schedule[brewIdx];
  if(st){
    const inStep=el-stepStart;
    // any step that will auto-advance on the clock gets an audible 3·2·1
    const timed=st.type!=='pour'||!hasLiveWeight();
    if(timed){
      const remain=Math.ceil(st.dur-inStep);
      if(remain>=1&&remain<=3&&remain!==lastTickSec){lastTickSec=remain;sfxTick();}
    }
    // water sound rides along with pour steps only
    if(st.type==='pour'&&!paused)pourStart();else pourStop();
    if(st.type!=='pour'&&inStep>=st.dur&&!isFinalDrawdown()){advance();return;}
    if(st.type==='pour'&&!hasLiveWeight()&&inStep>=st.dur){advance();return;}
  }
  updateBrewUI();
}
function paceState(){
  if(brewIdx>=schedule.length)return['DONE','ok'];
  const d=stepStart-schedule[brewIdx].start;
  if(Math.abs(d)<6)return['ON PACE','ok'];
  if(d>0)return[`+${Math.round(d)}s BEHIND`,'behind'];
  return[`${Math.round(-d)}s AHEAD`,'ahead'];
}
/* The final drain of a percolation brew is where grind size shows up. For the tinkerer
   (Brew Print) we let them end it by hand so the finish time reads as a grind signal.
   Autopilot (Basic) and immersion brews still end on the clock. */
function isFinalDrawdown(){
  const st=schedule[brewIdx];
  return !isBasic()&&recipe&&!recipe.immersion&&brewIdx===schedule.length-1&&st&&st.type!=='pour';
}
function drawdownHint(){
  if(isBasic()||!recipe||recipe.immersion)return '';   // these end on the clock, no drawdown to read
  const drift=finishedAt-totalDur;   // + ran long (slow drain) · − finished early (fast drain)
  if(drift>=15)return `Drawdown ran ~${Math.round(drift)}s long. If the bed was slow to drain, the grind may be a touch too fine. Try one notch coarser next time.`;
  if(drift<=-15)return `Finished ~${Math.round(-drift)}s early. If the bed drained fast, the grind may be a touch too coarse. Try one notch finer next time.`;
  return `Landed right on the estimate. Your grind's dialed in for this coffee, so repeat it.`;
}
function pourFrac(st,w){
  const prevPour=[...schedule.slice(0,schedule.indexOf(st))].reverse().find(x=>x.type==='pour');
  const prev=prevPour?prevPour.target:0;
  return Math.min(1,Math.max(0,(w-prev)/(st.target-prev)));
}
function updateBrewUI(){
  const st=schedule[brewIdx],el=elapsed(),w=Math.max(0,displayedWeight());

  if(paused){
    $('pace').textContent='⏸ PAUSED';$('pace').className='pace hold';$('pace').style.display='inline-block';
  }else{
    const[ptxt,pcls]=paceState();
    $('pace').textContent=ptxt;$('pace').className='pace '+pcls;
    $('pace').style.display=(pcls==='ok')?'none':'inline-block';   // silence = on pace
  }
  const schedTime=st?Math.min(st.end,st.start+(el-stepStart)):totalDur;
  $('playhead').style.left=`calc(${Math.min(100,schedTime/totalDur*100)}% - 2px)`;
  schedule.forEach((x,i)=>{
    const f=$('segfill'+i),sg=$('seg'+i);
    if(!f)return;
    if(i<brewIdx){f.style.width='100%';sg.classList.remove('now');}
    else if(i===brewIdx){
      const frac=x.type==='pour'&&hasLiveWeight()?pourFrac(x,w):Math.min(1,(el-stepStart)/x.dur);
      f.style.width=(frac*100)+'%';sg.classList.add('now');
    }else{f.style.width='0%';sg.classList.remove('now');}
  });
  renderWaterBar(w);
  if(!st){finishUI();return;}
  const finalDraw=isFinalDrawdown();
  if(finalDraw)$('btnNext').textContent='Cup drained ✓';
  $('instrKicker').textContent=isBasic()
    ?(st.type==='pour'?'POUR UNTIL THE SCALE READS':st.type==='wait'?(/bloom/i.test(st.label||'')?'WAIT, LET IT BLOOM':(brewIdx===schedule.length-1||/draw|drain/i.test(st.label||''))?'LAST STEP · DRAWDOWN':'WAIT, HANDS OFF'):st.type.toUpperCase())
    :(finalDraw?'DRAWDOWN · LAST STEP':`STEP ${brewIdx+1} OF ${schedule.length} · ${st.type.toUpperCase()}`);
  // The number IS the instruction: cumulative target = what the scale should read.
  // Tare happens once at GO, never mid-brew, so this always matches the scale face.
  const stepRem=st.dur-(el-stepStart);   // time left in THIS step
  $('instrMain').innerHTML=st.type==='pour'
    ?fmtW(st.target)
    :(isBasic()?stepCountdownHTML(stepRem):escapeHTML(st.label));
  const nxt=schedule[brewIdx+1];
  $('instrSub').innerHTML=isBasic()
    ?(st.type==='pour'?`${stepCountdownHTML(stepRem)} to get there`:'')
    :(finalDraw?`Let the bed drain, then tap <b>Cup drained ✓</b> when it goes dry. The finish time tells you if your grind was on.`:(st.note?escapeHTML(st.note)+'  ·  ':'')+(nxt?`next: ${ICONS[nxt.type]} ${escapeHTML(nxt.label)}${nxt.type==='pour'?` (→ ${fmtW(nxt.target)})`:''}`:'last step!'));
  // flow gauge
  if(st.type==='pour'&&hasLiveWeight()){
    const fr=liveFlowRate(),target=st.amount/st.dur;
    $('frTarget').textContent=target.toFixed(1);
    let show=false;
    if(fr!==null&&fr>0.15){
      $('frNow').textContent=fr.toFixed(1);
      const ratio=fr/target,v=$('frVerdict');
      if(metrics){metrics._tot++;if(ratio>1.35)metrics._fast++;metrics.frFastPct=metrics._fast/metrics._tot;}
      if(ratio>1.35){v.textContent='SLOW DOWN';v.className='fr-verdict fast';show=true;}
      else if(ratio<0.65){v.textContent='SPEED UP';v.className='fr-verdict slow';show=true;}
      // on target: gauge stays hidden, calm means you're doing it right
    }
    $('flow').style.display=show?'flex':'none';
  }else{$('flow').style.display='none';}
  // in-step bar
  if(st.type==='pour'){
    const frac=hasLiveWeight()?pourFrac(st,w):Math.min(1,(el-stepStart)/st.dur);
    $('stepbar').style.transform='scaleX('+frac+')';
    $('stepbarLabel').innerHTML=hasLiveWeight()
      ?`${weightOz?(w*G2OZ).toFixed(2):w.toFixed(1)}<small> / ${fmtW(st.target)}</small>`
      :`${Math.max(0,Math.ceil(st.dur-(el-stepStart)))}<small>s of pouring left</small>`;
    if(hasLiveWeight()&&w>=st.target-1)advance();
  }else{
    const inStep=el-stepStart;
    $('stepbar').style.transform='scaleX('+Math.min(1,inStep/st.dur)+')';
    if(finalDraw&&inStep>=st.dur){
      $('stepbarLabel').innerHTML=`+${Math.round(inStep-st.dur)}<small>s past estimate · still draining?</small>`;
    }else{
      const remain=Math.max(0,Math.ceil(st.dur-inStep));
      $('stepbarLabel').innerHTML=`${remain}<small>s, ${finalDraw?'drawdown (est.)':st.type==='wait'?'hands off':'go!'}</small>`;
    }
  }
  if(methodOpen)renderLiveMethod(el,w);
}
/* Water you actually pour. For flash-brew (iced) that's the hot water only,
   not the full volume (which includes ice), so the bar completes when pouring does. */
function pourTarget(){
  if(recipe&&recipe.iced){
    const ps=recipe.steps.filter(s=>s.type==='pour').reduce((z,s)=>z+s.frac,0);
    return Math.round(totalWater*ps);
  }
  return totalWater;
}
function renderWaterBar(w){
  const shown=hasLiveWeight()?w:estimatedWater();
  const tgt=pourTarget();
  $('waterbar').style.transform='scaleX('+Math.max(0,Math.min(1,(tgt?shown/tgt:0)))+')';
  $('waterbarLabel').textContent=`${weightOz?(shown*G2OZ).toFixed(2):Math.round(shown)} / ${fmtW(tgt)}${hasLiveWeight()?'':' (est.)'}`;
  const st=schedule[brewIdx];
  const schedTime=st?Math.min(st.end,st.start+(elapsed()-stepStart)):totalDur;
  const sl=slurryAt(schedTime);
  $('bedInfo').textContent=sl!==null?`~${Math.round(sl)} g in the bed`:'';
}
function estimatedWater(){
  let est=0;const el=elapsed();
  schedule.forEach((st,i)=>{
    if(st.type!=='pour')return;
    if(i<brewIdx)est=st.target;
    else if(i===brewIdx){
      const prevPour=[...schedule.slice(0,i)].reverse().find(x=>x.type==='pour');
      const prev=prevPour?prevPour.target:0;
      est=prev+(st.target-prev)*Math.min(1,(el-stepStart)/st.dur);
    }
  });
  return est;
}
function renderLiveMethodStatic(){
  $('stepList').innerHTML=schedule.map((st,i)=>stepRowHTML(st,i,0)).join('');
}
function renderLiveMethod(el,w){
  const drift=schedule[brewIdx]?stepStart-schedule[brewIdx].start:0;
  $('stepList').innerHTML=schedule.map((st,i)=>{
    if(i<brewIdx){
      const amt=st.type==='pour'?` · ${fmtW(st.amount)}`:'';
      return `<div class="step-row compact"><span class="icn">✅</span><span>${st.label}${amt}</span><span class="t">${fmtT(st.start)}</span></div>`;
    }
    if(i===brewIdx){
      let live;
      if(st.type==='pour'){
        live=hasLiveWeight()
          ?`${weightOz?(w*G2OZ).toFixed(2):w.toFixed(1)} / ${fmtW(st.target)}`
          :`${Math.max(0,Math.ceil(st.dur-(el-stepStart)))}s left · aim ${fmtW(st.amount)}`;
      }else{
        live=`${Math.max(0,Math.ceil(st.dur-(el-stepStart)))}s`;
      }
      return `<div class="step-row expanded">
        <div class="exp-head"><span>${ICONS[st.type]} NOW · ${st.label}</span><span class="eta">step ${i+1}/${schedule.length}</span></div>
        ${st.note?`<div class="exp-detail">${st.note}</div>`:''}
        <div class="exp-live">${live}</div>
      </div>`;
    }
    const eta=st.start+Math.max(0,drift);
    const amt=st.type==='pour'?`, ${fmtW(st.amount)}`:` (${st.dur}s)`;
    return `<div class="step-row"><span class="t">~${fmtT(eta)}</span><span class="icn">${ICONS[st.type]}</span><span>${st.label}${amt}</span><span class="cum">${st.type==='pour'?'→ '+fmtW(st.target):''}</span></div>`;
  }).join('');
}
function finishUI(){
  if(finishedAt===null){
    paused=false;pourStop();sfxDone();
    finishedAt=elapsed();
    clearInterval(timerIv);timerIv=null;      // brew is over: stop the clock
    if(navigator.vibrate)navigator.vibrate([80,60,160]);
  }
  // completed: show the REAL finish time. Running over or under the estimate is the grind signal, so don't hide it
  $('timer').innerHTML=`${fmtClock(finishedAt)}<small> / ${fmtClock(totalDur)}</small>`;
  $('instrKicker').textContent='BREW COMPLETE';
  $('instrMain').textContent='☕ Pull the dripper, enjoy';
  $('instrSub').textContent=drawdownHint();
  $('stepbar').style.transform='scaleX(1)';
  const dd=finishedAt-totalDur;
  const deltaTag=(recipe&&!recipe.immersion&&!isBasic()&&Math.abs(dd)>=5)?`  <small>· ${dd>0?'+':'−'}${Math.abs(Math.round(dd))}s vs est.</small>`:'';
  $('stepbarLabel').innerHTML=`${fmtT(finishedAt)}<small> total</small>${deltaTag}`;
  $('flow').style.display='none';
  $('btnPause').style.display='none';   // brew's over — Pause is dead here, leave just Exit + finish
  const n=$('btnNext');
  n.textContent=isBasic()?'Done ✓':'⭐ Rate this brew';
  n.classList.add('pulse');
  n.onclick=finishToRating;
}
function finishToRating(){
  brewing=false;clearInterval(timerIv);
  cleanupBrewUI();
  if(isBasic()){showFrontDoor();return;}   // mornings are autopilot: no rating, no log
  showRating();
}
function resetNextBtn(){
  const n=$('btnNext');
  n.textContent='Next step ›';
  n.classList.remove('pulse');
  n.onclick=advance;
}
function cleanupBrewUI(){
  $('waterbarWrap').dataset.ticks='';
  document.querySelectorAll('.watertick').forEach(t=>t.remove());
  resetNextBtn();
}
function advance(){
  if(paused)return;
  lastTickSec=null;pourStop();sfxAdvance();
  const leaving=schedule[brewIdx];
  if(leaving&&leaving.type==='pour'&&hasLiveWeight()&&metrics){
    const over=Math.max(0,displayedWeight()-leaving.target);
    metrics.pours.push({label:leaving.label,over:Math.round(over*10)/10});
    metrics.overshoot=Math.max(metrics.overshoot,over);
  }
  if(brewIdx<schedule.length){
    brewIdx++;stepStart=elapsed();
    updateBrewUI();
    if(navigator.vibrate)navigator.vibrate(80);
  }
}
let exitArm=null;
function confirmExit(){
  // Brew finished → Exit just proceeds (it leads to rating, nothing is lost).
  if(!brewing||brewIdx>=schedule.length){disarmExit();endBrew();return;}
  const b=$('btnBack');
  if(exitArm){disarmExit();endBrew();return;}       // second tap within window
  b.textContent='Tap again to exit';
  b.style.background='#FFC2C2';
  exitArm=setTimeout(disarmExit,3000);              // auto-disarm
  if(navigator.vibrate)navigator.vibrate(30);
}
function disarmExit(){
  if(exitArm){clearTimeout(exitArm);exitArm=null;}
  const b=$('btnBack');
  b.textContent='Exit';
  b.style.background='';
}
function endBrew(){
  pourStop();lastTickSec=null;
  paused=false;$('btnPause').textContent='Pause ⏸';
  disarmExit();
  const madeProgress=schedule.slice(0,brewIdx).some(st=>st.type==='pour');
  brewing=false;clearInterval(timerIv);
  if(cdIv){clearInterval(cdIv);cdIv=null;}
  $('countdown').style.display='none';
  cleanupBrewUI();
  if(madeProgress&&!isBasic()){showRating();}     // rate anything you actually poured, even cut short
  else{showFrontDoor();}   // basic mode keeps no log, so nothing to record on an early stop
}

/* ---- brew print: weight + flow graph, Filtru-style, pure SVG ---- */
function brewPrintSVG(trace,targets,W,H,steps){
  if(!trace||trace.length<3)return'';
  W=W||320;H=H||140;
  const P=26,tMax=Math.max(trace[trace.length-1][0],30),wMax=Math.max(totalWater,trace[trace.length-1][1])*1.05;
  const X=t=>P+(t/tMax)*(W-P-8),Y=w=>H-18-(w/wMax)*(H-30);
  // weight polyline
  const line=trace.map(p=>`${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  // flow bars (g/s over each sample gap), capped for display
  let bars='';
  for(let i=1;i<trace.length;i++){
    const dt=trace[i][0]-trace[i-1][0];if(dt<=0)continue;
    const fl=Math.min(10,(trace[i][1]-trace[i-1][1])/dt);
    if(fl<=0.05)continue;
    const h=(fl/10)*(H-30)*0.5;
    bars+=`<rect x="${X(trace[i-1][0]).toFixed(1)}" y="${(H-18-h).toFixed(1)}" width="${Math.max(1,X(trace[i][0])-X(trace[i-1][0])-0.5).toFixed(1)}" height="${h.toFixed(1)}" fill="#00D6C3" opacity="0.45"/>`;
  }
  // pour target guides
  const guides=(targets||[]).map(g=>`<line x1="${P}" x2="${W-8}" y1="${Y(g).toFixed(1)}" y2="${Y(g).toFixed(1)}" stroke="#7A2EFF" stroke-dasharray="3 4" stroke-width="1" opacity="0.5"/>`).join('');
  // step labels on the curve, Acaia-style: name each phase at its start time
  let labels='';
  if(steps&&steps.length){
    let lastX=-99;
    for(const st of steps){
      const x=X(st.start);
      if(x-lastX<26)continue;                 // avoid label pileup
      lastX=x;
      const short=st.label.split('·')[0].trim().slice(0,12);
      labels+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="16" y2="${H-18}" stroke="#1B0B2E" stroke-width="0.6" opacity="0.25"/>
      <text x="${(x+2).toFixed(1)}" y="${(20+((labels.match(/<text/g)||[]).length%3)*10).toFixed(1)}" font-size="7.5" font-weight="700" fill="#1B0B2E" opacity="0.75">${ICONS[st.type]||''}${short}</text>`;
    }
  }
  const tgt=(targets&&targets.length)?`<text x="${W-10}" y="${(Y(targets[targets.length-1])-4).toFixed(1)}" font-size="8.5" font-weight="800" fill="#7A2EFF" text-anchor="end">target ${Math.round(targets[targets.length-1])} g</text>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#fff;border:3px solid #1B0B2E;border-radius:12px">
    <text x="${P}" y="12" font-size="9" font-weight="700" fill="#7A2EFF">g</text>
    <text x="${W-30}" y="${H-4}" font-size="9" font-weight="700" fill="#7A2EFF">${fmtT(tMax)}</text>
    ${guides}${bars}${labels}${tgt}
    <polyline points="${line}" fill="none" stroke="#FF2E93" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="${P+4}" y="${H-4}" font-size="8.5" font-weight="700" fill="#1B0B2E">▬ weight&#160;&#160;▮ flow</text>
  </svg>`;
}
/* ============================ 8. RATING + LOG ============================ */
function loadLog(){return Store.get(KEYS.log,[]);}
function saveLog(list){Store.set(KEYS.log,list);}
function renderLog(){
  const log=loadLog();
  $('logCard').style.display=log.length?'block':'none';
  $('logList').innerHTML=log.slice(0,8).map((e,i)=>
    `<div class="log-row"><span>${e.date}</span><span style="flex:1">${escapeHTML(e.beans||e.recipe)}${e.beanAge!=null?` (${e.beanAge}d)`:''}${e.tags&&e.tags.length?` · <i>${escapeHTML(e.tags.join(', '))}</i>`:''}</span><span>${fmtW(e.dose)}${e.grindSetting?` @${escapeHTML(e.grindSetting)}`:''}</span><span class="log-stars">${'★'.repeat(e.rating)}${'☆'.repeat(5-e.rating)}</span><button class="btn-sm" data-again="${i}" style="padding:4px 8px;font-size:11px">↻</button></div>`
    +(e.note?`<div class="log-row" style="opacity:.7;font-weight:500;padding-top:0">↳ ${escapeHTML(e.note)}</div>`:'')
  ).join('');
  document.querySelectorAll('[data-again]').forEach(b=>{b.onclick=()=>brewAgain(loadLog()[+b.dataset.again]);});
}
/* One tap restores everything from a past brew: tool, method, ratio, dose,
   water. Falls back gracefully for entries logged before ids were stored. */
function brewAgain(e){
  if(!e)return;
  if(e.tool&&TOOLS.some(t=>t.id===e.tool)){tool=e.tool;renderChips();populateRecipes();}
  const r=e.recipeId?allRecipes().find(x=>x.id===e.recipeId):allRecipes().find(x=>x.name===e.recipe);
  if(r&&[...$('recipeSel').options].some(o=>o.value===r.id))loadRecipe(r.id);
  if(e.dose)$('dose').value=e.dose;
  if(e.ratio){$('ratioInput').value=e.ratio;$('water').value=Math.round(e.dose*e.ratio);}
  if(e.grindSetting!=null)$('grindSetting').value=e.grindSetting;
  else if(e.water)$('water').value=e.water;
  computeSchedule();syncCustomized();saveSettings();
  if(typeof window!=='undefined'&&window.scrollTo)window.scrollTo({top:0,behavior:'smooth'});
}
function showRating(){
  const dose=parseFloat($('dose').value)||recipe.defaultDose;
  const aDays=beanAgeDays();
  const early=brewIdx<schedule.length?' · ⚠ ended early':'';
  const gs=$('grindSetting').value?` · grind ${$('grindSetting').value}`:'';
  $('ratingSummary').innerHTML=`<b>${escapeHTML(recipe.name)}</b> · ${fmtW(dose)} → ${fmtW(totalWater)}${gs} · ${fmtT(finishedAt||elapsed())}${early}${$('beanName').value?` · ${escapeHTML($('beanName').value)}`:''}${aDays!==null?` · ${aDays}d off roast`:''}`;
  const guides=schedule.filter(x=>x.type==='pour').map(x=>x.target);
  $('brewPrint').innerHTML=brewTrace.length>2?brewPrintSVG(brewTrace,guides,undefined,undefined,schedule):'';
  curRating=0;$('brewNote').value='';curTags=new Set();$('brewReport').innerHTML='';
  document.querySelectorAll('.star').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.tagc').forEach(x=>x.classList.remove('on'));
  document.body.classList.remove('brewing');
  $('brew').style.display='none';$('rating').style.display='block';
}
function wireRating(){
  document.querySelectorAll('.star').forEach(st=>{
    st.onclick=()=>{curRating=+st.dataset.v;
      document.querySelectorAll('.star').forEach(x=>x.classList.toggle('on',+x.dataset.v<=curRating));};
  });
  document.querySelectorAll('.tagc').forEach(tg=>{
    tg.onclick=()=>{
      const t=tg.dataset.t;
      if(t==='balanced'){curTags.clear();curTags.add('balanced');
        document.querySelectorAll('.tagc').forEach(x=>x.classList.toggle('on',x.dataset.t==='balanced'));}
      else{curTags.delete('balanced');document.querySelector('[data-t=balanced]').classList.remove('on');
        curTags.has(t)?curTags.delete(t):curTags.add(t);tg.classList.toggle('on');}
      $('brewReport').innerHTML=buildInsights().map(i=>`<div class="insight ${i.cls}"><b>${i.title}</b>${i.body}</div>`).join('');
    };
  });
  $('btnSaveRating').onclick=()=>{
    const dose=parseFloat($('dose').value)||recipe.defaultDose;
    const log=loadLog();
    log.unshift({date:new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'}),
      recipe:recipe.name,recipeId:recipe.id,ratio:curRatio(),tool,grindSetting:$('grindSetting').value,
      beans:$('beanName').value,roast:$('roast').value,dose,water:Math.round(totalWater),
      time:fmtT(finishedAt||0),rating:curRating||3,note:$('brewNote').value,
      tags:[...curTags],insights:buildInsights().map(i=>i.title),beanAge:beanAgeDays(),
      trace:brewTrace.filter((_,i)=>i%3===0).slice(0,120)});   // compact brew print
    saveLog(log.slice(0,50));
    saveSettings();
    renderLog();
    showFrontDoor();
  };
  $('btnSkipRating').onclick=showFrontDoor;
}

/* ============================ 8b. RECIPE EDITOR ============================ */
const clampN=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const GRINDS=['Coarse','Medium-coarse','Medium','Medium-fine','Fine'];
/* Ideal total pour-over time. Beyond IDEAL_MAX the bed over-extracts and turns
   bitter; below IDEAL_MIN the cup runs weak/sour. Used to warn in the editor. */
const IDEAL_MIN=75, IDEAL_MAX=240;
let edSteps=[];
const ED_ADD={pour:{frac:.2,dur:12},wait:{frac:0,dur:25},swirl:{frac:0,dur:5},stir:{frac:0,dur:8}};
function renderEdRows(){
  $('edRows').innerHTML=edSteps.map((st,i)=>`
    <div class="ed-row2">
      <select data-i="${i}" data-f="type">${['pour','wait','swirl','stir'].map(t=>`<option ${t===st.type?'selected':''}>${t}</option>`).join('')}</select>
      <input type="number" data-i="${i}" data-f="pct" value="${st.type==='pour'?Math.round(st.frac*1000)/10:''}" ${st.type==='pour'?'':'disabled'} step="1" min="1" max="100">
      <input type="number" data-i="${i}" data-f="dur" value="${st.dur}" step="1" min="2" max="300">
      <div class="ed-del" data-del="${i}" role="button" tabindex="0" aria-label="Remove step">✕</div>
    </div>`).join('');
  $('edRows').querySelectorAll('select,input').forEach(el=>{el.onchange=el.oninput=()=>{
    const i=+el.dataset.i,f=el.dataset.f,st=edSteps[i];
    if(f==='type'){st.type=el.value;if(st.type!=='pour')st.frac=0;else if(!st.frac)st.frac=.2;renderEdRows();return;}
    if(f==='pct')st.frac=(parseFloat(el.value)||0)/100;
    else st.dur=clampN(parseInt(el.value)||10,2,300);
    updateEdTotal();
  };});
  $('edRows').querySelectorAll('[data-del]').forEach(d=>{d.onclick=()=>{edSteps.splice(+d.dataset.del,1);renderEdRows();};});
  updateEdTotal();
}
function updateEdTotal(){
  const total=edSteps.reduce((a,s)=>a+(s.dur||0),0);
  const el=$('edTotal');if(!el)return;
  const warn=total>IDEAL_MAX||total<IDEAL_MIN;
  el.className='edtotal '+(warn?'warn':'ok');
  el.textContent=`Total ≈ ${fmtT(total)}`+(total>IDEAL_MAX?' · long brews over ~4:00 can taste bitter':total<IDEAL_MIN?' · very short brews can taste weak':' · in the sweet spot');
}
function addEdStep(type){edSteps.push({type,frac:ED_ADD[type].frac,dur:ED_ADD[type].dur});renderEdRows();}
const SCRATCH_STEPS=[
  {type:'pour',frac:.15,dur:8},{type:'wait',dur:40},
  {type:'pour',frac:.45,dur:30},{type:'wait',dur:15},
  {type:'pour',frac:.40,dur:30},{type:'wait',dur:45}
];
/* mode 'edit' = customize this method: ratio, grind, and its full step list, all seeded
   from the current recipe. mode 'scratch' = a blank bloom + two-pour skeleton. Both save a custom. */
function openEditor(mode){
  const base=recipe, scratch=mode==='scratch';
  $('edTitle').textContent=scratch?'Start from scratch':'Customize this method';
  $('edName').value=scratch?'My pour-over':(base.custom?base.name:`My ${base.name.split('·')[0].trim()}`);
  $('edRatio').value=scratch?16:base.ratio;
  $('edGrind').value=(!scratch&&GRINDS.includes(base.grind))?base.grind:'Medium';
  $('editor').dataset.baseId=base.custom?(base.baseId||base.id):base.id;
  $('editor').dataset.editingId=(!scratch&&base.custom)?base.id:'';
  edSteps=(scratch?SCRATCH_STEPS:base.steps).map(st=>resolveAgitation(st,base.defaultDose)).map(st=>({type:st.type,frac:st.frac||0,dur:st.dur}));
  renderEdRows();
  $('editor').style.display='block';
  $('editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function saveCustom(){
  const base=allRecipes().find(r=>r.id===$('editor').dataset.baseId)||recipe;
  const editingId=$('editor').dataset.editingId;
  const ratio=clampN(parseFloat($('edRatio').value)||base.ratio,10,20);
  const grind=$('edGrind').value;
  const pours=edSteps.filter(s=>s.type==='pour');
  if(!pours.length){alert('Add at least one pour.');return;}
  const sum=pours.reduce((a,s)=>a+s.frac,0);
  if(sum<=0){alert('Pour % must be above zero.');return;}
  let pn=0;
  const steps=edSteps.map(s=>s.type==='pour'
    ?{type:'pour',frac:s.frac/sum,dur:s.dur,label:'Pour '+(++pn)}
    :{type:s.type,dur:s.dur,label:s.type[0].toUpperCase()+s.type.slice(1)});
  const waitIdx=steps.map((s,i)=>s.type==='wait'?i:-1).filter(i=>i>=0);
  if(waitIdx.length){steps[waitIdx[0]].label='Bloom';steps[waitIdx[waitIdx.length-1]].label='Drawdown';}
  const cust={
    id:editingId||('cust-'+Date.now()),
    custom:true, baseId:base.id, tool:[...new Set([...base.tool,'any'])], timing:'adaptive',
    name:($('edName').value||'My method').trim(),
    ratio, defaultDose:base.defaultDose, grind,
    tempC:base.tempC, roastRec:base.roastRec, roastNote:base.roastNote,
    desc:`Custom method: ${pours.length} pour${pours.length>1?'s':''} at 1:${ratio}, ${grind.toLowerCase()} grind.`,
    steps
  };
  const customs=customRecipes().filter(c=>c.id!==cust.id);
  customs.push(cust);
  Store.set(KEYS.customs,customs);
  $('editor').style.display='none';
  populateRecipes();
  loadRecipe(cust.id);
}
function deleteCustom(){
  if(!recipe.custom)return;
  Store.set(KEYS.customs,customRecipes().filter(c=>c.id!==recipe.id));
  $('editor').style.display='none';
  populateRecipes();
}
function wireEditor(){
  $('btnEdCancel').onclick=()=>{$('editor').style.display='none';};
  $('btnEdSave').onclick=saveCustom;
  $('btnDeleteCustom').onclick=deleteCustom;
  $('edAddPour').onclick=()=>addEdStep('pour');
  $('edAddWait').onclick=()=>addEdStep('wait');
  $('edAddSwirl').onclick=()=>addEdStep('swirl');
  $('edAddStir').onclick=()=>addEdStep('stir');
}

/* ============================ 8c. MODES + BASIC BREW ============================ */
/* Two front doors, one engine. Basic = dose + roast, everything else derived:
   1:16 V60 (bloom + two pours), temp from roast. No methods, no library, no rating. */
const MODEKEY='pourfect-mode',BASICKEY='pourfect-basic';
/* Basic mode: one forgiving recipe per brewer, plus the volume that brewer can
   physically hold. maxDose is the real constraint — a V60-02 brims around 400 ml,
   so asking it for a 700 g pour schedules a brew nobody can pour. baseRatio is
   the brewer's sensible default strength; the Strength chips shift it from there. */
const BASIC_BREWERS=[
 {id:'v60',        recipe:'v60hario1cup',   baseRatio:16,  maxDose:40},
 {id:'switch',     recipe:'switchChronicler',baseRatio:16, maxDose:40},
 {id:'kalita',     recipe:'kalitaPulse',    baseRatio:16,  maxDose:35},
 {id:'chemex',     recipe:'chemexClassic',  baseRatio:16,  maxDose:60},
 {id:'origami',    recipe:'hedrick',        baseRatio:16,  maxDose:40},
 {id:'melitta',    recipe:'melitta1cup',    baseRatio:16,  maxDose:30},
 {id:'aeropress',  recipe:'aeropressClassic',baseRatio:15, maxDose:20},
 {id:'frenchpress',recipe:'frenchClassic',  baseRatio:15,  maxDose:60},
 {id:'phin',       recipe:'phinClassic',    baseRatio:5,   maxDose:30},
 {id:'any',        recipe:'hedrick',        baseRatio:16,  maxDose:40}
];
const basicBrewer=s=>BASIC_BREWERS.find(b=>b.id===(s&&s.brewer))||BASIC_BREWERS[0];
/* Once you've brewed, the front door is the Brew Again card. But while you're
   actively changing beans/brewer/amount, any re-render must leave the setup card
   open — otherwise tapping a brewer bounces you straight back out. */
let basicEditing=false;
/* Strength in plain language → brew ratio. More water per gram = lighter cup. */
/* Strength shifts the brewer's base ratio rather than naming an absolute one —
   a Phin at 1:5 and a V60 at 1:16 both need 'stronger', just not the same number. */
const STRENGTH={lighter:{d:1,label:'Mild'},regular:{d:0,label:'Regular'},strong:{d:-2,label:'Strong'}};
const CUP_G=240;   // one cup ≈ 240 g of brewed coffee
const basicRatio=s=>Math.max(4,basicBrewer(s).baseRatio+(STRENGTH[s.strength]||STRENGTH.regular).d);
const doseForCups=(cups,s)=>Math.round(cups*CUP_G/basicRatio(s));
const isBasic=()=>document.body.classList.contains('basic');
function setMode(m){
  Store.set(MODEKEY,m);
  document.body.classList.toggle('basic',m==='basic');
  $('hdrBasic').classList.toggle('on',m==='basic');
  $('hdrPrint').classList.toggle('on',m!=='basic');
  showFrontDoor();
}
function showFrontDoor(){
  basicEditing=false;
  document.body.classList.remove('brewing');
  $('brew').style.display='none';$('rating').style.display='none';
  if(isBasic()){$('setup').style.display='none';$('basic').style.display='block';renderBasic();requestAnimationFrame(updateBrewerArrows);}
  else{$('basic').style.display='none';$('setup').style.display='';requestAnimationFrame(updateToolArrows);}
}
function basicState(){
  const s=Store.get(BASICKEY,null)||{dose:20,roast:'Medium',strength:'regular',brewed:false};
  if(!s.brewer||!BASIC_BREWERS.some(b=>b.id===s.brewer))s.brewer='v60';   // pre-brewer saves
  return s;
}
function setBasicState(s){Store.set(BASICKEY,s);}
function basicTemp(roast,st){
  const r=RECIPES.find(x=>x.id===basicBrewer(st||basicState()).recipe);
  const diff=(ROAST_IDX[roast]??2)-(ROAST_IDX[r.roastRec]??2);
  const d=Math.round(diff>0?-2*diff:-1.5*diff);
  const clamp=c=>Math.min(100,Math.max(80,c+d));
  return fmtTemp(clamp(r.tempC[0]),clamp(r.tempC[1]));
}
function cupsTxt(cups){
  // nearest quarter cup, in plain words: 1, 1¼, 1½, 1¾ …
  const q=Math.max(1,Math.round(cups*4)),whole=Math.floor(q/4),frac=['','¼','½','¾'][q%4];
  const n=(whole||'')+frac||'¼';
  return `${n} cup${q>4?'s':''}`;
}
/* Total brew time for the basic recipe, scaled to the dose (pour durations
   grow with water on adaptive recipes; waits are fixed). Keeps the on-screen
   estimate honest instead of a hard-coded number. */
function basicBrewTime(s){
  const r=RECIPES.find(x=>x.id===basicBrewer(s).recipe);
  const water=s.dose*basicRatio(s);
  const scaleF=r.timing==='adaptive'?water/(r.defaultDose*r.ratio):1;
  return r.steps.reduce((t,st)=>t+(st.type==='pour'?Math.max(4,Math.round(st.dur*scaleF)):st.dur),0);
}
function basicSummary(s){
  const water=Math.round(s.dose*basicRatio(s));
  const main=`makes ≈ <b>${cupsTxt(water/CUP_G)}</b> · <b>${beansDisp(s.dose)}</b> beans · <b>${water} g</b> water · kettle at <b>${basicTemp(s.roast,s)}</b> · ready in ~<b>${fmtT(basicBrewTime(s))}</b>`;
  // if they're already reading in tbsp, the "no scale" helper is redundant
  const noScale=wUnit==='tbsp'?'':`<span class="noscale">No scale? Use about <b>${tbspTxt(s.dose)}</b> of ground coffee (level) and <b>${water} ml</b> water. A measuring cup works. Tablespoons are approximate; grind changes the weight.</span>`;
  return main+noScale;
}
function syncCupsField(s){
  $('bCups').value=Math.round(s.dose*basicRatio(s)/CUP_G*4)/4;   // beans → cups, quarter steps
}
function renderBasicBrewers(){
  const s=basicState();
  $('bBrewers').innerHTML=pinnedFirst(BASIC_BREWERS.filter(b=>b.id!=='any')).map(b=>{
    const t=TOOLS.find(x=>x.id===b.id);
    return `<div class="tool-tile ${b.id===s.brewer?'on':''}" data-b="${b.id}" role="button" tabindex="0" aria-pressed="${b.id===s.brewer}">
      ${pinBtnHTML(b.id)}
      <div class="tool-circle">${TOOL_IMGS[b.id]?`<img class="timg" src="${TOOL_IMGS[b.id]}" alt="">`:(TOOL_ICONS[b.id]||'')}</div>
      <div class="tool-name">${t?t.name:b.id}</div>
    </div>`;}).join('');
  $('bBrewers').querySelectorAll('.tool-tile').forEach(c=>{
    const pick=()=>{
      const st=readBasicInputs();
      st.brewer=c.dataset.b;
      st.dose=Math.min(basicBrewer(st).maxDose,st.dose);   // new brewer may hold less
      setBasicState(st);renderBasic();
    };
    c.onclick=pick;c.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();pick();}};
    const pin=c.querySelector('.tool-pin');
    if(pin)pin.onclick=e=>{e.stopPropagation();togglePin(pin.dataset.pin);renderBasicBrewers();};
  });
  sizeStrip('bBrewers');
  requestAnimationFrame(()=>{sizeStrip('bBrewers');updateBrewerArrows();});   // re-size once layout settles
}
function renderBasic(){
  const s=basicState();
  const brw=basicBrewer(s);
  renderBasicBrewers();
  const tb=(wUnit==='tbsp');
  {const g=$('bUg'),t=$('bUtbsp');if(g)g.classList.toggle('on',!tb);if(t)t.classList.toggle('on',tb);}
  $('bDose').step=tb?0.5:1;
  $('bDose').min=tb?2:10;
  $('bDose').max=tb?Math.round((brw.maxDose/TBSP_G)*2)/2:brw.maxDose;
  $('bCups').max=Math.round(brw.maxDose*basicRatio(s)/CUP_G*4)/4;
  $('bDose').value=beansToField(s.dose);
  syncCupsField(s);
  document.querySelectorAll('#bRoast .chip').forEach(c=>c.classList.toggle('on',c.dataset.r===s.roast));
  document.querySelectorAll('#bStr .chip').forEach(c=>c.classList.toggle('on',c.dataset.s===(s.strength||'regular')));
  $('bSum').innerHTML=basicSummary(s);
  const showAgain=s.brewed&&!basicEditing;
  $('againCard').style.display=showAgain?'block':'none';
  $('basicCard').style.display=showAgain?'none':'block';
  if(s.brewed){
    const tn=TOOLS.find(x=>x.id===s.brewer);
    $('againSum').innerHTML=`<b>${tn?tn.name:''}</b> · <b>${cupsTxt(s.dose*basicRatio(s)/CUP_G)}</b> · <b>${beansDisp(s.dose)}</b> · ${s.roast} roast · ${STRENGTH[s.strength||'regular'].label}`;
  }
}
function readBasicInputs(){
  const s=basicState();
  s.dose=Math.min(basicBrewer(s).maxDose,Math.max(10,fieldToBeans($('bDose').value)||20));
  const on=document.querySelector('#bRoast .chip.on');
  s.roast=on?on.dataset.r:'Medium';
  const st=document.querySelector('#bStr .chip.on');
  s.strength=st?st.dataset.s:'regular';
  return s;
}
function startBasic(fromAgain){
  basicEditing=false;
  const s=fromAgain?basicState():readBasicInputs();
  s.brewed=true;setBasicState(s);
  const brw=basicBrewer(s);
  tool=brw.id;renderChips();populateRecipes();
  loadRecipe(brw.recipe);
  $('roast').value=s.roast;
  $('dose').value=s.dose;
  $('ratioInput').value=basicRatio(s);
  $('water').value=Math.round(s.dose*basicRatio(s));
  computeSchedule();
  startCountdown();
}
function basicQuickLog(){
  const s=basicState();
  const log=loadLog();
  log.unshift({date:new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'}),
    recipe:recipe?recipe.name:'Basic brew',recipeId:recipe?recipe.id:basicBrewer(s).recipe,ratio:basicRatio(s),tool:s.brewer||'v60',
    grindSetting:'',beans:'',roast:s.roast,dose:s.dose,water:Math.round(s.dose*basicRatio(s)),
    time:fmtT(finishedAt||0),rating:3,note:'',tags:[],insights:[],beanAge:null,
    trace:brewTrace.filter((_,i)=>i%3===0).slice(0,120)});
  saveLog(log.slice(0,50));
  renderLog();
}
function wireModes(){
  $('mpBasic').onclick=()=>{$('modePick').style.display='none';setMode('basic');};
  $('mpPrint').onclick=()=>{$('modePick').style.display='none';setMode('print');};
  $('btnBasicBrew').onclick=()=>askStartConfirm(()=>startBasic(false));
  $('btnAgain').onclick=()=>askStartConfirm(()=>startBasic(true));
  $('btnBasicChange').onclick=()=>{basicEditing=true;renderBasic();};
  $('hdrBasic').onclick=()=>setMode('basic');
  $('hdrPrint').onclick=()=>setMode('print');
  $('hdrUnit').onclick=()=>setUnit(!unitF);
  $('scStart').onclick=confirmStartProceed;
  $('scClose').onclick=closeStartConfirm;                                    // × in the corner
  $('startConfirm').addEventListener('click',e=>{if(e.target===$('startConfirm'))closeStartConfirm();});  // tap outside the card
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('startConfirm').style.display==='flex')closeStartConfirm();});  // Esc
  $('mpLogo').onclick=cycleTheme;   // start-screen logo cycles the look
  // tap the in-app header logo → back to the start screen
  document.querySelector('header h1').onclick=()=>{$('modePick').style.display='flex';};
  // Cups and beans are two views of the same brew: edit either, the other follows.
  const refresh=(fromCups)=>{
    if(fromCups){
      const raw=parseFloat($('bCups').value);
      // Mid-typing the field is briefly empty. Leave the partner field and the
      // summary alone rather than flashing 0 g at someone who just hit backspace.
      if(!(raw>0))return;
      const s=readBasicInputs();
      const cups=Math.min(basicBrewer(basicState()).maxDose*basicRatio(basicState())/CUP_G,Math.max(0.25,raw));
      s.dose=doseForCups(cups,s);$('bDose').value=beansToField(s.dose);
      setBasicState(s);$('bSum').innerHTML=basicSummary(s);
    }else{
      const raw=parseFloat($('bDose').value);
      if(!(raw>0))return;
      const s=readBasicInputs();syncCupsField(s);
      setBasicState(s);$('bSum').innerHTML=basicSummary(s);
    }
  };
  document.querySelectorAll('#bRoast .chip').forEach(c=>{
    c.onclick=()=>{document.querySelectorAll('#bRoast .chip').forEach(x=>x.classList.toggle('on',x===c));refresh(false);};
  });
  document.querySelectorAll('#bStr .chip').forEach(c=>{
    c.onclick=()=>{document.querySelectorAll('#bStr .chip').forEach(x=>x.classList.toggle('on',x===c));
      refresh(true);};   // strength changes the ratio; hold the cups steady, re-derive the beans
  });
  $('bCups').oninput=()=>refresh(true);
  $('bDose').oninput=()=>refresh(false);
}
function initMode(){
  const m=Store.get(MODEKEY,null);
  if(m===null){$('modePick').style.display='flex';return;}   // first run: pick once
  setMode(m);
}
/* ============================ 9. INIT ============================ */
let methodOpen=false;
function wireMethodToggle(){
  $('btnMethodToggle').onclick=()=>{
    methodOpen=!methodOpen;
    $('stepList').style.display=methodOpen?'block':'none';
    $('btnMethodToggle').textContent=methodOpen?'Hide full method ▴':'Show full method ▾';
    if(methodOpen&&brewing)renderLiveMethod(elapsed(),Math.max(0,displayedWeight()));
  };
}
function wireSetup(){
  $('recipeSel').onchange=e=>{
    const v=e.target.value;
    if(v==='__edit__'){e.target.value=recipe.id;openEditor('edit');return;}       // ratio, grind + steps, seeded from this method
    if(v==='__scratch__'){e.target.value=recipe.id;openEditor('scratch');return;} // blank bloom + 2-pour skeleton
    loadRecipe(v);
  };
  $('dose').oninput=()=>{const d=parseFloat($('dose').value),r=curRatio();if(d)$('water').value=Math.round(d*r);computeSchedule();syncCustomized();renderOzHint();saveSettings();};
  $('doseCups').oninput=()=>{const raw=parseFloat($('doseCups').value),r=curRatio();if(!(raw>0)){$('dose').value=0;$('water').value=0;computeSchedule();syncCustomized();renderOzHint();saveSettings();return;}const d=Math.max(5,Math.round(raw*CUP_G/r));$('dose').value=d;$('water').value=Math.round(d*r);computeSchedule();syncCustomized();renderOzHint();saveSettings();};
  $('btnChangeSetup').onclick=()=>{setupEditing=true;updateSetupCards();$('beansCard').scrollIntoView({behavior:'smooth',block:'start'});};
  $('ratioInput').oninput=()=>{const d=parseFloat($('dose').value),r=curRatio();if(d)$('water').value=Math.round(d*r);computeSchedule();syncCustomized();saveSettings();};
  $('water').oninput=()=>{const d=parseFloat($('dose').value),w=parseFloat($('water').value);if(d&&w)$('ratioInput').value=Math.round(w/d*10)/10;computeSchedule();syncCustomized();saveSettings();};
  $('btnRatioReset').onclick=()=>{
    $('ratioInput').value=recipe.ratio;
    const d=parseFloat($('dose').value);if(d)$('water').value=Math.round(d*recipe.ratio);
    computeSchedule();syncCustomized();saveSettings();
  };
  $('grindSetting').oninput=saveSettings;
  $('roast').addEventListener('change',updateBeansSummary);
  $('roastDate').addEventListener('change',updateBeansSummary);
  $('roasterSel').onchange=()=>{
    if($('roasterSel').value==='__newR'){showLibAdd('roaster');return;}
    $('libAddRow').style.display='none';
    beansConfirmed=false;   // new roaster → beans need re-confirming
    if($('roasterSel').value==='__favs'){renderBeans(null);updateSetupCards();return;}  // transient view, don't save
    if($('roasterSel').value===''){renderBeans(null);updateSetupCards();saveSettings();return;}  // back to prompt
    ensureRoasterInstalled($('roasterSel').value);
    renderBeans(null);updateSetupCards();saveSettings();
  };
  $('beanSel').onchange=()=>{
    if($('beanSel').value==='__newB'){showLibAdd('bean');return;}
    // in the Favorited Beans view, picking a favorite STAYS in the view
    if($('roasterSel').value==='__favs'){
      if(!$('beanSel').value)return;      // still on the placeholder
      beansConfirmed=false;
      applyBeanSelection();updateBeansSummary();updateSetupCards();saveSettings();
      return;
    }
    $('libAddRow').style.display='none';
    applyBeanSelectionAndFold();saveSettings();
  };
  $('btnFavBean').onclick=toggleFavBean;
  $('btnConfirmBeans').onclick=()=>{
    const beanOk=$('beanSel').value&&$('beanSel').value!=='__newB';
    if(!beanOk){toast('Pick a bean first');return;}
    if(!$('roast').value){                 // rotating beans start with no roast set
      toast('Choose a roast level for this bean');
      const rs=$('roast');rs.focus();rs.classList.add('bad');setTimeout(()=>rs.classList.remove('bad'),1800);
      return;
    }
    beansConfirmed=true;setupEditing=false;
    updateBeansSummary();updateSetupCards();saveSettings();
    const bc=$('brewerCard');           // nudge toward the next step if it's still open
    if(bc&&bc.style.display!=='none')bc.scrollIntoView({behavior:'smooth',block:'start'});
  };
  $('libAddBtn').onclick=commitLibAdd;
  $('roast').addEventListener('change',()=>{renderTempAdvice();renderAge();computeSchedule();saveSettings();});
  $('roastDate').onchange=()=>{renderAge();saveSettings();};
  $('unitC').onclick=()=>setUnit(false);
  $('unitFbtn').onclick=()=>setUnit(true);
  $('sndOn').onclick=()=>{audioInit();setSound(true);sfxTick();}   // audible confirmation
  $('sndOff').onclick=()=>setSound(false);
  // iOS: unlock audio on the very first interaction anywhere, so the countdown
  // isn't the first time we touch Web Audio (which iOS can swallow).
  const firstGestureUnlock=()=>{audioInit();
    ['touchend','pointerdown','click'].forEach(ev=>document.removeEventListener(ev,firstGestureUnlock));};
  ['touchend','pointerdown','click'].forEach(ev=>document.addEventListener(ev,firstGestureUnlock,{once:false,passive:true}));
  $('wG').onclick=()=>setWeightUnit('g');
  $('wOz').onclick=()=>setWeightUnit('oz');
  $('bUg').onclick=()=>setWeightUnit('g');        // inline g/tbsp toggle on the Beans field
  $('bUtbsp').onclick=()=>setWeightUnit('tbsp');
  {const av=$('appVersion');if(av)av.textContent='Pourcast v'+APP_VERSION;}
  $('themeMax').onclick=()=>setTheme('max');
  $('themeSage').onclick=()=>setTheme('sage');
  $('themeBurnt').onclick=()=>setTheme('burnt');
  if(!THEMES_ENABLED){                                   // single-skin: hide every switcher affordance
    const hint=document.querySelector('.mp-look-hint');if(hint)hint.style.display='none';
    const lr=$('lookRow');if(lr)lr.style.display='none';
    const lg=$('mpLogo');if(lg){lg.style.cursor='default';lg.removeAttribute('title');}
  }
  $('btnSettings').onclick=()=>{
    const c=$('settingsCard');
    c.style.display=c.style.display==='none'?'block':'none';
  };
  $('settingsClose').onclick=()=>{$('settingsCard').style.display='none';};
  // Tap the header Bluetooth badge → open the scale panel over the CURRENT screen,
  // so you can connect without being kicked back to the start screen.
  const openScaleSettings=()=>{refreshScaleModal();$('scaleModal').style.display='flex';};
  const closeScaleModal=()=>{$('scaleModal').style.display='none';};
  $('hdrDot').onclick=openScaleSettings;
  $('hdrDot').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openScaleSettings();}};
  $('smConnect').onclick=()=>{if(ble.connected)closeScaleModal();else connectScale(false);};
  $('smConnectAll').onclick=()=>connectScale(true);
  $('smConnectAll').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();connectScale(true);}};
  $('smClose').onclick=closeScaleModal;
  $('scaleModal').onclick=e=>{if(e.target===$('scaleModal'))closeScaleModal();};
  $('btnConnect').onclick=()=>connectScale(false);
  $('btnConnectAll').onclick=()=>connectScale(true);
  $('btnConnectAll').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();connectScale(true);}};
  // Simulator stays available for testing via console: simToggle()
  window.simToggle=simToggle;
  $('scaleStatus').onclick=()=>{
    const el=$('bleDebug');
    el.style.display=el.style.display==='none'?'block':'none';
    el.textContent=bleLog.length?bleLog.join('\n'):'(no Bluetooth events yet, tap Connect scale)';
  };
  $('btnStart').onclick=()=>askStartConfirm(startCountdown);
  $('btnNext').onclick=advance;
  $('btnPause').onclick=togglePause;

  $('btnBack').onclick=confirmExit;
}
wireSetup();
wireToolScroll();    // brewer strip arrows
wireRating();
wireEditor();
wireMethodToggle();
wireModes();
restoreSettings();   // builds chips + recipes, then overlays saved values
renderLog();
initMode();          // basic vs brew print, first run shows the picker
initScaleSupport();  // iPhones/iPads can't do Web Bluetooth; say so up front
initInstallUI();     // "Install Pourcast" affordance (one-tap on Android, guided on iOS)

/* ---- Installable PWA: register the service worker + surface an install button ---- */
function initInstallUI(){
  // register the service worker (offline + installability); localhost & https only
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  }
  // static markup lives in index.html: one bar on the homepage (front door) + one on the main screens
  const wraps=[].slice.call(document.querySelectorAll('.install-wrap'));
  if(!wraps.length)return;
  const removeAll=()=>document.querySelectorAll('.install-wrap').forEach(w=>w.remove());
  const showAll=()=>document.querySelectorAll('.install-wrap').forEach(w=>{w.style.display='flex';});
  const dismiss=()=>{localStorage.setItem('pourcast-install-dismissed','1');removeAll();};

  // already installed (opened from the home screen)? then never nag.
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(standalone||localStorage.getItem('pourcast-install-dismissed')==='1'){removeAll();return;}

  const ua=navigator.userAgent||'';
  const isIOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

  let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;showAll();});   // Android/desktop: show once installable
  window.addEventListener('appinstalled',dismiss);

  wraps.forEach(wrap=>{
    const btn=wrap.querySelector('.install-btn'),x=wrap.querySelector('.install-x');
    if(x)x.onclick=dismiss;
    if(isIOS){
      wrap.style.display='flex';   // iOS has no install API; show it and reveal Add-to-Home-Screen steps on tap
      if(btn)btn.onclick=()=>{
        const ex=wrap.querySelector('.install-hint');if(ex){ex.remove();return;}
        const h=document.createElement('div');h.className='install-hint';
        h.innerHTML='In <b>Safari</b>, tap the <b>Share</b> icon, then <b>Add to Home Screen</b>.';
        wrap.appendChild(h);
      };
    }else if(btn){
      btn.onclick=async()=>{if(!deferred)return;deferred.prompt();try{await deferred.userChoice;}catch(_){}deferred=null;removeAll();};
    }
  });
}


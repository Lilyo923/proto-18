/* =============================================================================
   BRAD BITT, MAIS LE JEU — LA BANDE-ANNONCE

   Elle se lance depuis le menu et tourne dans le navigateur, montage compris.
   Rien n'est pre-calcule : les plans de jeu font TOURNER LE MOTEUR. Le decor
   defile, les Serra se reveillent, Brad court pour de vrai. Ce qui est a
   l'ecran est le jeu, pas une image du jeu.

   ---------------------------------------------------------------------------
   LE MONTAGE EST CALE SUR LA MUSIQUE, PAS SUR UNE HORLOGE

   La piste `bande-annonce` a ete analysee, pas devinee : 70,003 BPM, ecart
   moyen de 7,6 ms a une grille parfaite sur 177 temps, premiere mesure a
   0,0379 s. Un temps dure 0,857110 s, une mesure 3,428440 s, et le montage
   dure exactement 20 mesures.

   Chaque plan est donc place par son NUMERO DE TEMPS, pas par une duree en
   secondes : `b: 20` veut dire « au 21e temps », soit 17,18 s. Deplacer un
   plan, c'est changer un entier.

   Et surtout : l'horloge du montage est `audio.currentTime`, jamais un
   compteur interne. Un compteur interne derive — une image sautee, un onglet
   ralenti, et l'image ne tombe plus avec le son. On avance donc localement
   pour la fluidite, mais on se recale sur la piste des que l'ecart depasse
   RESYNC. Sans piste (fichier absent, lecture refusee), le compteur interne
   prend le relais : le montage tourne quand meme, en silence.

   ---------------------------------------------------------------------------
   COMMENT LE RETOUCHER

   Tout est dans `PLANS_BA`. Un objet par plan, avec son temps de depart. Le
   plan dure jusqu'au suivant — il n'y a aucune duree a tenir a jour, donc
   aucune duree a desynchroniser.
   ========================================================================== */
'use strict';

const BA = {
  piste: 'bande-annonce',
  t0: 0.0379,               // premier temps de la premiere mesure, en secondes
  battement: 0.857110,      // 70,003 BPM
  temps: 80,                // 20 mesures de 4 temps
  resync: 0.06,             // au-dela de cet ecart, on se recale sur la piste
  fondu: 0.28,              // apparition d'un carton
};
const MES_BA = 4 * BA.battement;

/* L'instant, en secondes, du temps numero b (0 = premier temps du morceau). */
function instantBA(b) { return BA.t0 + b * BA.battement; }
const DUREE_BA = instantBA(BA.temps);

/* -----------------------------------------------------------------------------
   LE MONTAGE

   `b`      : le temps ou le plan commence (0 a 79)
   `genre`  : logo · jeu · boss · base · titre · silhouette · dates · studios
   `flash`  : un eclair blanc sur la coupure, pour les entrees en force
-------------------------------------------------------------------------- */

const PLANS_BA = [
  /* --- INTRO : mesures 1 a 4, la musique monte -------------------------- */
  { b: 0,  genre: 'logo', quoi: 'imagine' },
  { b: 6,  genre: 'logo', quoi: 'hwr' },
  { b: 12, genre: 'jeu', niveau: 'niveau1', x: 40, marche: true },

  /* --- REFRAIN : mesures 5 a 16, le montage ----------------------------- */
  { b: 16, genre: 'jeu', niveau: 'niveau4', x: 177, flash: true },
  { b: 18, genre: 'jeu', niveau: 'niveau2', x: 114 },
  { b: 20, genre: 'titre', haut: '10 NIVEAUX', bas: 'FARFELUS' },
  { b: 24, genre: 'jeu', niveau: 'niveau1', x: 51 },
  { b: 26, genre: 'jeu', niveau: 'niveau3', x: 135 },
  { b: 28, genre: 'jeu', niveau: 'niveau5', x: 54 },
  { b: 30, genre: 'jeu', niveau: 'niveau6', x: 149 },
  { b: 32, genre: 'titre', haut: 'DES BOSS', bas: 'QUI NE RIGOLENT PAS' },
  { b: 36, genre: 'boss', niveau: 'niveau3', flash: true },
  { b: 38, genre: 'boss', niveau: 'niveau6' },
  { b: 40, genre: 'boss', niveau: 'niveau9' },
  { b: 42, genre: 'jeu', niveau: 'niveau9', x: 171 },
  { b: 44, genre: 'titre', haut: 'UNE BASE, UNE BOUTIQUE', bas: 'ET UNE SALLE D\'ARCADE' },
  { b: 48, genre: 'base' },
  { b: 52, genre: 'jeu', niveau: 'niveau7', x: 204 },     // la tour Eiffel est dans le cadre
  { b: 54, genre: 'jeu', niveau: 'niveau8', x: 124 },
  // Rafale : un plan par temps, la ou la musique cogne le plus.
  { b: 56, genre: 'jeu', niveau: 'niveau4', x: 117, flash: true },
  { b: 57, genre: 'jeu', niveau: 'niveau6', x: 131 },
  { b: 58, genre: 'jeu', niveau: 'niveau7', x: 120 },
  { b: 59, genre: 'jeu', niveau: 'niveau9', x: 123 },
  // Et on retient son souffle une mesure entiere.
  { b: 60, genre: 'silhouette' },

  /* --- OUTRO : mesures 17 a 20, la musique redescend -------------------- */
  { b: 64, genre: 'titre', haut: 'BRAD BITT', bas: 'mais le jeu', logo: true },
  { b: 68, genre: 'dates', etiquette: 'BÊTA OUVERTE', valeur: '27 — 29 NOVEMBRE 2026' },
  { b: 72, genre: 'dates', etiquette: 'SORTIE', valeur: '9 JANVIER 2027' },
  { b: 76, genre: 'studios' },
];

const bandeAnnonce = {
  actif: false,
  t: 0,                     // horloge du montage, en secondes
  plan: null,               // le plan affiche
  indice: -1,
  age: 0,                   // depuis combien de temps ce plan est a l'ecran
  flash: 0,
  sansSon: false,           // la piste n'a pas pu demarrer
};

/* -----------------------------------------------------------------------------
   LANCEMENT ET SORTIE
-------------------------------------------------------------------------- */

function lancerBandeAnnonce() {
  bandeAnnonce.actif = true;
  bandeAnnonce.t = 0;
  bandeAnnonce.plan = null;
  bandeAnnonce.indice = -1;
  bandeAnnonce.age = 0;
  bandeAnnonce.flash = 0;
  bandeAnnonce.sansSon = false;
  CINEMA = true;                       // ni ATH, ni bandeau de mise au point
  scene = 'bandeannonce';

  audio.arreterMusique(0);
  audio.jouerMusiqueDifferee(sourceMusique(BA.piste), 0);
  rembobinerBA();
  appliquerPlanBA(PLANS_BA[0], 0);
}

/* La piste a peut-etre deja servi : on la ramene a zero. Elle n'est pas
   forcement chargee au moment ou l'on demande — d'ou le second essai differe,
   sans quoi la bande-annonce demarrerait au milieu du morceau. */
function rembobinerBA() {
  const el = audio.pistes.get(sourceMusique(BA.piste));
  if (el) { try { el.currentTime = 0; } catch (e) { /* pas encore pret */ } }
  else setTimeout(rembobinerBA, 120);
}

function pisteBA() {
  const el = audio.pistes.get(sourceMusique(BA.piste));
  return (el && audio.musique === el) ? el : null;
}

function quitterBandeAnnonce() {
  bandeAnnonce.actif = false;
  CINEMA = false;
  audio.arreterMusique(0.5);
  const el = audio.pistes.get(sourceMusique(BA.piste));
  if (el) { try { el.pause(); el.currentTime = 0; } catch (e) { /* ignore */ } }
  relacherTout();
  retourAuMenu();
  // retourAuMenu() coupe la musique : le menu remet la sienne de lui-meme au
  // premier passage de majDemo. On ne force rien ici.
}

// Echap ou Entree : on sort. Toute autre touche laisse le montage tranquille.
function validerBandeAnnonce() { quitterBandeAnnonce(); }
function annulerBandeAnnonce() { quitterBandeAnnonce(); }

/* -----------------------------------------------------------------------------
   L'HORLOGE

   On avance de dt, puis on se recale sur la piste. Le recalage est doux tant
   que l'ecart est petit (sinon l'image saute a chaque correction) et sec au-dela
   d'un quart de seconde — la, c'est que la lecture a vraiment decroche.
-------------------------------------------------------------------------- */

function majHorlogeBA(dt) {
  bandeAnnonce.t += dt;
  const el = pisteBA();
  if (!el || el.paused || el.readyState < 2) { bandeAnnonce.sansSon = !el; return; }
  bandeAnnonce.sansSon = false;
  const ecart = el.currentTime - bandeAnnonce.t;
  if (Math.abs(ecart) > 0.25) bandeAnnonce.t = el.currentTime;
  else if (Math.abs(ecart) > BA.resync) bandeAnnonce.t += ecart * 0.25;
}

function majBandeAnnonce(dt) {
  if (!bandeAnnonce.actif) return;
  majHorlogeBA(dt);
  bandeAnnonce.age += dt;
  if (bandeAnnonce.flash > 0) bandeAnnonce.flash -= dt;

  // Le plan qui doit etre a l'ecran maintenant.
  let i = 0;
  while (i + 1 < PLANS_BA.length && bandeAnnonce.t >= instantBA(PLANS_BA[i + 1].b)) i++;
  if (i !== bandeAnnonce.indice) {
    appliquerPlanBA(PLANS_BA[i], i);
    // Un plan saute (onglet en arriere-plan) ne doit pas rejouer son entree
    // depuis le debut : on le prend a l'age qu'il devrait avoir.
    bandeAnnonce.age = Math.max(0, bandeAnnonce.t - instantBA(PLANS_BA[i].b));
  }

  if (bandeAnnonce.t >= DUREE_BA) { quitterBandeAnnonce(); return; }
  simulerPlanBA(dt);
}

/* -----------------------------------------------------------------------------
   LES PLANS DE JEU

   Un plan de jeu charge son niveau, pose Brad a l'endroit voulu, cadre, et
   laisse tourner. Charger un niveau coute entre 0,02 et 0,22 ms : on peut donc
   changer de decor sur un temps sans le moindre a-coup.
-------------------------------------------------------------------------- */

/* Le sol sous une abscisse : le solide le plus BAS qui la recouvre, c'est-a-dire
   celui sur lequel un joueur se tiendrait. Prendre le plus haut poserait Brad
   sur une corniche, ou sur un plafond. */
function solSousBA(px) {
  let sol = null;
  for (const s of solides) {
    if (px < s.x || px > s.x + s.w) continue;
    if (!sol || s.y > sol.y) sol = s;
  }
  return sol;
}

function poserBradBA(xTuile) {
  const px = xTuile * TUILE;
  let sol = solSousBA(px + brad.w / 2);
  // Rien sous cette abscisse : on cherche le sol le plus proche a droite.
  for (let d = 1; !sol && d <= 40; d++) sol = solSousBA(px + d * TUILE);
  brad.x = px;
  brad.y = sol ? sol.y - brad.h : NIVEAU_H - HAUTEUR / 2;
  brad.vx = 0; brad.vy = 0; brad.auSol = true;
  suivreZoneBA();
  cadrerBA();
  reveillerLeCadreBA();
}

/* Les Serra dorment jusqu'a ce que Brad approche — c'est voulu dans le jeu :
   sinon vingt-huit ennemis patrouillent depuis le chargement et ne sont plus
   nulle part quand on arrive. Mais un plan de bande-annonce dure deux
   secondes : on n'a pas le temps de les reveiller en marchant. On reveille
   donc ceux qui sont DANS LE CADRE, et eux seuls. Ils feront ce qu'ils font
   toujours ; simplement, ils le feront tout de suite. */
function reveillerLeCadreBA() {
  for (const e of ennemis) {
    if (e.etat === 'mort') continue;
    const sx = e.x - cam.x;
    if (sx > -60 && sx < LARGEUR + 60) e.dort = false;
  }
}

/* LA ZONE AFFICHEE, A LA MAIN.

   `majTransition` n'est pas appelee pendant un plan : elle declencherait un
   fondu au noir en plein montage des que Brad franchit une limite de zone.
   Mais c'est elle qui tient `zoneAffichee` a jour — et `zoneAffichee` ne sert
   pas qu'a la palette : `ennemiHorsZone` s'en sert pour decider quels ennemis
   dessiner.

   Sans cette ligne, la zone restait a 0 pour tout le montage. Consequence
   observee : Brad au milieu de la piste de danse, dans le decor de la file
   d'attente, et TOUS LES SERRA INVISIBLES — cinq d'entre eux etaient dans le
   cadre, aucun n'etait dessine. On la met donc a jour sechement, sans fondu. */
function suivreZoneBA() {
  if (typeof zoneDe === 'function') zoneAffichee = zoneDe(brad.x);
}

function cadrerBA() {
  cam.x = Math.max(0, Math.min(NIVEAU_L - LARGEUR, brad.x + brad.w / 2 - LARGEUR / 2));
  cam.y = Math.max(0, Math.min(NIVEAU_H - HAUTEUR, brad.y + brad.h - HAUTEUR * 0.66));
}

/* Brad ne doit jamais mourir pendant un plan : une bande-annonce qui bascule
   sur l'ecran de mort au milieu d'un montage, c'est fini. */
function rendreBradIntouchable() {
  brad.pvMax = 99; brad.pv = 99;
  brad.invincible = 9999;
}

function appliquerPlanBA(p, i) {
  bandeAnnonce.plan = p;
  bandeAnnonce.indice = i;
  bandeAnnonce.age = 0;
  if (p.flash) bandeAnnonce.flash = 0.16;

  if (p.genre === 'jeu' || p.genre === 'boss') {
    relancerNiveau(p.niveau);            // remet scene a 'jeu' : on la reprend
    scene = 'bandeannonce';
    rendreBradIntouchable();
    if (p.genre === 'boss') {
      /* Un boss n'apparait que lorsque Brad FRANCHIT la ligne d'entree de son
         arene. On entre donc d'abord, on laisse une demi-seconde pour qu'il
         surgisse — puis on RAMENE Brad a cote de lui.

         Sans ce second saut, le plan ratait : entre la ligne d'entree et le
         boss il y a une trentaine de tuiles, soit trois secondes et demie de
         course. Le plan en dure moins de deux : on ne voyait que Brad courant
         seul vers un adversaire hors du cadre. */
      poserBradBA(ARENE ? ARENE.x1 / TUILE + 4 : p.x || 40);
      for (let k = 0; k < 60; k++) pasDeSimulationBA(1 / 120);
      if (arene.boss) {
        poserBradBA((arene.boss.x - 96) / TUILE);
        for (let k = 0; k < 12; k++) pasDeSimulationBA(1 / 120);
        cadrerBA();
      }
    } else {
      poserBradBA(p.x);
    }
    return;
  }

  if (p.genre === 'base') {
    // PAS entrerHub() : il relance la musique de la base, ce qui couperait la
    // bande-annonce en deux.
    reinitialiserHub();
    scene = 'bandeannonce';
  }
}

/* Une image de simulation de niveau. On ne touche ni a majTransition (un
   changement de zone en plein plan ferait un fondu au noir hors montage) ni a
   la porte : le plan s'arrete de lui-meme au temps suivant. */
function pasDeSimulationBA(dt) {
  majMobiles(dt); majTerrain(dt); majBrad(dt); majEnnemis(dt);
  majArene(dt); majBoules(dt); majRamassages(dt); majCamera(dt); majEffets(dt);
  suivreZoneBA();
  // Ceinture : si quoi que ce soit a tente de changer de scene (mort, porte,
  // dialogue), on reprend la main immediatement.
  if (scene !== 'bandeannonce') scene = 'bandeannonce';
}

function simulerPlanBA(dt) {
  const p = bandeAnnonce.plan;
  if (!p) return;

  if (p.genre === 'base') { hub.t += dt; hub.braddy.phase += dt; return; }
  if (p.genre !== 'jeu' && p.genre !== 'boss') return;

  // Brad avance : c'est ce qui fait defiler le decor et reveille les Serra.
  // Un plan « marche » le laisse au pas, pour les moments calmes.
  entrees.droite = true;
  entrees.gauche = false;
  entrees.courir = !p.marche;
  entrees.attaque = p.genre === 'boss' && Math.floor(bandeAnnonce.age * 4) % 3 === 0;
  if (p.genre === 'boss' && Math.floor(bandeAnnonce.age * 4) % 3 === 0) {
    attaquePresseeCeTick = true;
  }
  // Un saut par mesure : sans ça, Brad glisse au sol et le plan est plat.
  const veutSauter = brad.auSol && Math.floor(bandeAnnonce.age / 1.1) !==
                                   Math.floor((bandeAnnonce.age - dt) / 1.1);
  if (veutSauter) { entrees.saut = true; sautPresseCeTick = true; }
  else if (!brad.auSol && brad.vy < 0) entrees.saut = true;
  else entrees.saut = false;

  rendreBradIntouchable();
  pasDeSimulationBA(dt);
}

/* -----------------------------------------------------------------------------
   RENDU
-------------------------------------------------------------------------- */

function dessinerBandeAnnonce() {
  const p = bandeAnnonce.plan;
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  if (!p) return;

  switch (p.genre) {
    case 'jeu':
    case 'boss':        rendreNiveau(); break;
    case 'base':        dessinerHub(); break;
    case 'logo':        planLogoBA(p); break;
    case 'titre':       planTitreBA(p); break;
    case 'silhouette':  planSilhouetteBA(p); break;
    case 'dates':       planDatesBA(p); break;
    case 'studios':     planStudiosBA(p); break;
  }

  voileBA();
  if (bandeAnnonce.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (bandeAnnonce.flash / 0.16 * 0.55).toFixed(3) + ')';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  }
  indicationBA();
}

/* Le tout premier plan monte du noir, le tout dernier y redescend : une
   bande-annonce ne commence pas et ne finit pas sur une image nue. */
function voileBA() {
  const t = bandeAnnonce.t;
  let noir = 0;
  if (t < 1.2) noir = 1 - t / 1.2;
  const reste = DUREE_BA - t;
  if (reste < 1.6) noir = Math.max(noir, 1 - reste / 1.6);
  if (noir <= 0) return;
  ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, noir).toFixed(3) + ')';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}

function indicationBA() {
  if (bandeAnnonce.t < 1.5 || bandeAnnonce.t > DUREE_BA - 2) return;
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillText('Échap', LARGEUR - 8, HAUTEUR - 8);
  ctx.textAlign = 'left';
}

/* L'apparition d'un carton : sec, cale sur le temps. Le texte grandit de 4 %
   en 0,28 s puis ne bouge plus — assez pour que l'oeil sente la coupure, assez
   peu pour rester lisible. */
function entreeCarton() {
  const a = Math.min(1, bandeAnnonce.age / BA.fondu);
  return { alpha: a, echelle: 1.04 - 0.04 * a };
}

function planLogoBA(p) {
  const e = entreeCarton();
  ctx.save();
  ctx.globalAlpha = e.alpha;
  if (p.quoi === 'hwr') {
    dessinerLogoHwr(LARGEUR / 2, HAUTEUR / 2 - 8, 104);
  } else if (logos.imagine) {
    const w = 260, h = logos.imagine.height * w / logos.imagine.width;
    ctx.drawImage(logos.imagine, LARGEUR / 2 - w / 2, HAUTEUR / 2 - 8 - h / 2, w, h);
  }
  ctx.restore();
  ctx.globalAlpha = e.alpha * 0.55;
  texteCentre(p.quoi === 'hwr' ? 'HwR Engine' : 'IMAGINe Studio',
              HAUTEUR / 2 + 74, '11px system-ui, sans-serif', 'rgba(255,255,255,.6)');
  ctx.globalAlpha = 1;
}

function planTitreBA(p) {
  const e = entreeCarton();
  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.translate(LARGEUR / 2, HAUTEUR / 2);
  ctx.scale(e.echelle, e.echelle);
  ctx.translate(-LARGEUR / 2, -HAUTEUR / 2);

  if (p.logo) {
    texteCentre(p.haut, 158, 'bold 42px system-ui, sans-serif', '#f2f3f8');
    texteCentre(p.bas, 190, 'italic 17px system-ui, sans-serif', '#e8b62c');
  } else {
    texteCentre(p.haut, 162, 'bold 27px system-ui, sans-serif', '#e8b62c');
    texteCentre(p.bas, 196, 'bold 19px system-ui, sans-serif', '#f2f3f8');
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Deux filets qui s'ecartent sur le premier temps : le carton respire.
  const l = 60 + 150 * Math.min(1, bandeAnnonce.age / 0.5);
  ctx.fillStyle = 'rgba(232,182,44,.3)';
  ctx.fillRect(LARGEUR / 2 - l / 2, 126, l, 1);
  ctx.fillRect(LARGEUR / 2 - l / 2, 216, l, 1);
}

/* Kirby 67 a CONTRE-JOUR. On ne montre ni son visage ni son arene : la
   bande-annonce sort avant la bêta, et la fin du jeu reste une surprise.

   Un contre-jour, c'est une forme SOMBRE devant une source lumineuse — pas une
   forme claire sur du noir. Le premier essai peignait la silhouette en blanc :
   on obtenait une tache blanche qui ne ressemblait a personne. On peint donc la
   lueur derriere, et le personnage par-dessus, presque noir. */
function planSilhouetteBA(p) {
  const a = Math.min(1, bandeAnnonce.age / 0.6);

  const g = ctx.createRadialGradient(LARGEUR / 2, 168, 8, LARGEUR / 2, 168, 250);
  g.addColorStop(0,    'rgba(150,236,255,' + (0.95 * a).toFixed(3) + ')');
  g.addColorStop(0.22, 'rgba(58,192,220,'  + (0.62 * a).toFixed(3) + ')');
  g.addColorStop(0.6,  'rgba(22,64,104,'   + (0.30 * a).toFixed(3) + ')');
  g.addColorStop(1,    'rgba(5,6,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  // Un sol, pour qu'il se tienne quelque part.
  ctx.fillStyle = 'rgba(4,5,10,.92)';
  ctx.fillRect(0, 252, LARGEUR, HAUTEUR - 252);

  const img = sprites.kirby;
  if (img) {
    // La planche fait 4 colonnes x 3 lignes : on en prend une seule cellule.
    const cw = img.width / 4, ch = img.height / 3;
    const ech = 4.4;
    const x = Math.round(LARGEUR / 2 - cw * ech / 2);
    const y = Math.round(254 - ch * ech);
    const sombre = teinter(img, '#04050b');
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(sombre, 0, 0, cw, ch, x, y, Math.round(cw * ech), Math.round(ch * ech));
    ctx.restore();
  }
  ctx.globalAlpha = a;
  texteCentre('IL VOUS ATTEND', 300, 'bold 15px system-ui, sans-serif', '#f2f3f8');
  ctx.globalAlpha = 1;
}

function planDatesBA(p) {
  const e = entreeCarton();
  ctx.globalAlpha = e.alpha;
  texteCentre(p.etiquette, 152, '12px system-ui, sans-serif', 'rgba(232,182,44,.9)');
  ctx.fillStyle = 'rgba(232,182,44,.3)';
  ctx.fillRect(LARGEUR / 2 - 54, 162, 108, 1);
  texteCentre(p.valeur, 196, 'bold 24px system-ui, sans-serif', '#f2f3f8');
  ctx.globalAlpha = 1;
}

function planStudiosBA(p) {
  const e = entreeCarton();
  ctx.globalAlpha = e.alpha;
  if (logos.imagine) {
    const w = 168, h = logos.imagine.height * w / logos.imagine.width;
    ctx.drawImage(logos.imagine, LARGEUR / 2 - w / 2, 116, w, h);
  }
  dessinerLogoHwr(LARGEUR / 2, 218, 68);
  texteCentre('IMAGINe Studio  ×  HwR Engine', 272,
              '11px system-ui, sans-serif', 'rgba(255,255,255,.55)');
  texteCentre('bradbitt', 291, 'italic 10px system-ui, sans-serif',
              'rgba(255,255,255,.3)');
  ctx.globalAlpha = 1;
}

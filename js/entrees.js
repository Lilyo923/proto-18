/* =============================================================================
   BRAD BITT, MAIS LE JEU — entrees

   On ecoute a la fois event.code (touche physique, claviers QWERTY) et
   event.key (caractere produit, claviers AZERTY). Un joueur francais qui
   utilise Z Q S D est pris en charge sans aucune configuration.

   Toutes les entrees passent par la scene courante : le meme appui sur Espace
   demarre le jeu, valide un menu ou fait sauter Brad selon l'endroit ou l'on
   se trouve.
   ========================================================================== */
'use strict';

const entrees = {
  gauche: false, droite: false, saut: false, courir: false,
  attaque: false, onde: false,
};

// Fronts montants, consommes par la simulation puis remis a faux.
let sautPresseCeTick = false;
let attaquePresseeCeTick = false;
let ondePresseeCeTick = false;
let parlerPresseCeTick = false;

const MAP_CODE = {
  ArrowLeft: 'gauche', KeyA: 'gauche',
  ArrowRight: 'droite', KeyD: 'droite',
  ArrowUp: 'saut', Space: 'saut', KeyW: 'saut',
  ShiftLeft: 'courir', ShiftRight: 'courir',
  KeyX: 'attaque', KeyJ: 'attaque',
  KeyC: 'onde', KeyK: 'onde',
  KeyE: 'parler',
};
const MAP_TOUCHE = {
  q: 'gauche', a: 'gauche',
  d: 'droite',
  z: 'saut', w: 'saut',
  x: 'attaque', j: 'attaque',
  c: 'onde', k: 'onde',
  e: 'parler',
};

const FRONTS = { saut: 1, attaque: 1, onde: 1, parler: 1 };
const TOUCHES_DEFILEMENT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function actionDe(e) {
  return MAP_CODE[e.code] || MAP_TOUCHE[(e.key || '').toLowerCase()] || null;
}

function marquerFront(action) {
  if (action === 'saut') sautPresseCeTick = true;
  else if (action === 'attaque') attaquePresseeCeTick = true;
  else if (action === 'onde') ondePresseeCeTick = true;
  else if (action === 'parler') parlerPresseCeTick = true;
}

function relacherTout() {
  Object.keys(entrees).forEach(k => { entrees[k] = false; });
}

/* Le corps du gestionnaire est une FONCTION NOMMEE, et pas seulement pour la
   lisibilite : la manette s'en sert. Elle fabrique des evenements de la meme
   forme ({ code, key }) et les passe ici, ce qui lui donne d'un coup toute la
   navigation du jeu — menus, boutique, jukebox, pause, combat final,
   generique, bande-annonce — sans en reecrire une ligne. */
function auClavier(e) {
  if (!e.preventDefault) e.preventDefault = () => {};
  if (e.code === 'F1') { e.preventDefault(); basculerPanneau(); return; }
  if (TOUCHES_DEFILEMENT.includes(e.code)) e.preventDefault();

  const lettre = (e.key || '').toLowerCase();
  const valider = e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
  const annuler = e.code === 'Escape';

  switch (scene) {
    case 'accueil':
      if (valider) lancerDemarrage();
      return;

    case 'logos':
    case 'chargement':
      return;                                   // rien a faire pendant un chargement

    /* Les deux ecrans partagent la meme navigation ET la meme confirmation :
       « Nouvelle partie » depuis le menu, « Effacer la sauvegarde » depuis les
       options. Le test de `confirmation` doit donc couvrir les deux — quand il
       ne valait que pour le menu, les fleches continuaient de deplacer la
       selection derriere le dialogue ouvert. */
    case 'menu':
    case 'options':
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        else if (annuler) repondreConfirmation(false);
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') menuDeplacer(-1);
      else if (e.code === 'ArrowDown' || lettre === 's') menuDeplacer(1);
      else if (e.code === 'ArrowLeft' || lettre === 'q') menuAjuster(-1);
      else if (e.code === 'ArrowRight' || lettre === 'd') menuAjuster(1);
      else if (valider) menuValider();
      else if (annuler) menuRetour();
      return;

    case 'credits':
      if (valider || annuler) menuRetour();
      return;

    case 'pause':
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        else if (annuler) repondreConfirmation(false);
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') deplacerPause(-1);
      else if (e.code === 'ArrowDown' || lettre === 's') deplacerPause(1);
      else if (valider) validerPause();
      else if (annuler) reprendreJeu();
      return;

    case 'jukebox': {
      if (annuler) { fermerPoste(); return; }
      if (jukebox.onglet === 1) {
        // Onglet code : le clavier physique tape directement dans le champ.
        if (e.code === 'Backspace') { e.preventDefault(); effaceCode(); return; }
        if (valider) { validerCode(); return; }
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          jukebox.onglet = 0; audio.bruit('menu'); return;
        }
        if (/^[a-z0-9]$/.test(lettre)) { tapeCode(lettre.toUpperCase()); return; }
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        jukebox.index = (jukebox.index - 1 + PISTES_JUKEBOX.length) % PISTES_JUKEBOX.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        jukebox.index = (jukebox.index + 1) % PISTES_JUKEBOX.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
                 lettre === 'q' || lettre === 'd') {
        jukebox.onglet = jukebox.onglet ? 0 : 1; audio.bruit('menu');
      } else if (valider) {
        choisirPiste(PISTES_JUKEBOX[jukebox.index].cle);
      }
      return;
    }

    case 'difficulte':
      if (e.code === 'ArrowLeft' || lettre === 'q') {
        indexDifficulte = (indexDifficulte - 1 + DIFFICULTES.length) % DIFFICULTES.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowRight' || lettre === 'd') {
        indexDifficulte = (indexDifficulte + 1) % DIFFICULTES.length;
        audio.bruit('menu');
      } else if (valider) validerDifficulte();
      else if (annuler) { scene = 'menu'; audio.bruit('menu'); }
      return;

    case 'dialogue':
      if (valider) avancerDialogue();
      else if (annuler) passerDialogue();
      return;

    case 'hub': {
      // Une confirmation ouverte prend la main sur tout le reste : sinon les
      // touches de deplacement continueraient de faire marcher Brad derriere
      // la question posee.
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        else if (annuler) repondreConfirmation(false);
        return;
      }
      // Le hub se joue : on laisse passer les commandes de deplacement, et le
      // saut sert d'action devant un poste (majHub le consomme).
      if (annuler) { retourAuMenu(); relacherTout(); return; }
      const ah = actionDe(e);
      if (!ah) return;
      if (FRONTS[ah] && !entrees[ah]) marquerFront(ah);
      entrees[ah] = true;
      return;
    }

    case 'boutique':
      if (annuler) { confirmation ? repondreConfirmation(false) : fermerPoste(); return; }
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        indexBoutique = (indexBoutique - 1 + articlesBoutique().length) % articlesBoutique().length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        indexBoutique = (indexBoutique + 1) % articlesBoutique().length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || lettre === 'q' || lettre === 'd') {
        /* La boutique a deux ou trois onglets selon que les Secrets sont
           decouverts : la bascule ne peut plus etre un simple « 1 moins ». */
        const n = ongletsBoutique().length;
        const pas = (e.code === 'ArrowLeft' || lettre === 'q') ? -1 : 1;
        ongletBoutique = ((ongletBoutique + pas) % n + n) % n;
        indexBoutique = 0; audio.bruit('menu');
      } else if (valider) acheterArticleCourant();
      return;

    case 'vestiaire':
      if (annuler) { fermerPoste(); return; }
      if (e.code === 'ArrowLeft' || lettre === 'q') {
        indexVestiaire = (indexVestiaire - 1 + UNIFORMES.length) % UNIFORMES.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowRight' || lettre === 'd') {
        indexVestiaire = (indexVestiaire + 1) % UNIFORMES.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        indexVestiaire = Math.max(0, indexVestiaire - 4); audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        indexVestiaire = Math.min(UNIFORMES.length - 1, indexVestiaire + 4); audio.bruit('menu');
      } else if (valider) porterUniformeCourant();
      return;

    case 'carte':
      if (annuler) { fermerPoste(); return; }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        indexCarte = (indexCarte - 1 + ORDRE_NIVEAUX.length) % ORDRE_NIVEAUX.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        indexCarte = (indexCarte + 1) % ORDRE_NIVEAUX.length;
        audio.bruit('menu');
      } else if (valider) lancerNiveauCourant();
      return;

    case 'arcade': {
      if (annuler) { fermerPoste(); return; }
      if (arcade.etat !== 'jeu') {
        if (valider) demarrerArcade();
        return;
      }
      const aa = actionDe(e);
      if (!aa) return;
      if (FRONTS[aa] && !entrees[aa]) marquerFront(aa);
      entrees[aa] = true;
      return;
    }

    /* LE COMBAT FINAL A SES PROPRES COMMANDES.

       On n'y saute pas : on se deplace sur une place, en quatre directions.
       Les touches de saut deviennent donc « avancer », et Espace devient
       l'esquive. Le mappage vit ici, dans son propre tableau, plutot que dans
       MAP_CODE : le reste du jeu ne doit pas voir passer une direction qu'il
       ne sait pas interpreter. */
    case 'final': {
      if (annuler) {
        if (finale.mort || finale.fini) { audio.arreterMusique(0.5); entrerHub(false); return; }
        ouvrirPause();
        return;
      }
      if (finale.mort) {
        if (valider) demarrerCombatFinal(false);
        return;
      }
      const af = actionFinale(e);
      if (!af) return;
      if (!entreesFinal[af]) marquerFrontFinal(af);
      entreesFinal[af] = true;
      return;
    }

    /* Le generique. Trois touches seulement : valider (passer a la fin, puis
       choisir), les fleches pour choisir, et Echap qui renvoie au menu. */
    case 'generique':
      if (annuler) { quitterGenerique('menu'); return; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
          lettre === 'q' || lettre === 'd' || lettre === 'a') {
        deplacerGenerique(e.code === 'ArrowLeft' || lettre === 'q' || lettre === 'a' ? -1 : 1);
      } else if (valider) validerGenerique();
      return;

    /* La bande-annonce ne se pilote pas : elle se regarde, ou on en sort.
       Toute autre touche est ignoree — appuyer sur une fleche au milieu d'un
       montage ne doit rien faire bouger. */
    case 'bandeannonce':
      if (valider || annuler) quitterBandeAnnonce();
      return;

    case 'pret':
      if (valider) commencerNiveau();
      else if (annuler) retourAuMenu();
      return;

    case 'mort':
      if (valider || lettre === 'x') relancerApresMort();
      else if (annuler) { audio.arreterMusique(0.5); entrerHub(false); }
      return;

    case 'fin':
      // Un seul chemin, clavier comme clic : rentrerALaBase() coupe la musique,
      // entre dans le hub et fait commenter le retour par le BRADDY3000. Passer
      // par entrerHub() directement sauterait la replique.
      if (valider || annuler) rentrerALaBase();
      return;
  }

  // --- Scene 'jeu' ---------------------------------------------------------
  if (annuler) {
    // Echap n'abandonne plus le niveau d'un coup : il ouvre le menu de pause,
    // qui previent que quitter ne sauvegarde rien.
    ouvrirPause();
    return;
  }
  if (lettre === 'r') { preparerNiveau(niveauCourant); relacherTout(); return; }

  const a = actionDe(e);
  if (!a) return;
  if (FRONTS[a] && !entrees[a]) marquerFront(a);
  entrees[a] = true;
}
addEventListener('keydown', auClavier);

function auRelachement(e) {
  if (scene === 'final') {
    const af = actionFinale(e);
    if (af) entreesFinal[af] = false;
    return;
  }
  const a = actionDe(e);
  if (a) entrees[a] = false;
}
addEventListener('keyup', auRelachement);

addEventListener('blur', () => { relacherTout(); relacherFinal(); });

/* --- Souris ---------------------------------------------------------------
   Le menu etant dessine dans le canvas, il faut convertir les coordonnees de
   l'ecran vers la resolution interne de 640x360.
------------------------------------------------------------------------- */

function versCanvas(ev) {
  const r = canvas.getBoundingClientRect();
  const nx = (ev.clientX - r.left) * (LARGEUR / r.width);
  const ny = (ev.clientY - r.top) * (HAUTEUR / r.height);
  if (Math.abs(nx - souris.x) > 0.5 || Math.abs(ny - souris.y) > 0.5) souris.bouge = true;
  souris.x = nx;
  souris.y = ny;
  souris.dansCanvas = true;
}

canvas.addEventListener('pointermove', ev => {
  versCanvas(ev);
  if (souris.glissement) { ev.preventDefault(); majGlissement(); }
});

canvas.addEventListener('pointerleave', () => {
  souris.dansCanvas = false;
  souris.survol = null;
  souris.glissement = null;
});

addEventListener('pointerup', () => { souris.glissement = null; });
addEventListener('pointercancel', () => { souris.glissement = null; });

canvas.addEventListener('pointerdown', ev => {
  versCanvas(ev);
  const z = zoneSousSouris();
  if (z) { ev.preventDefault(); activerZone(z); return; }
  // Un clic n'importe ou sur l'ecran d'accueil demarre aussi : le bouton est
  // une invitation, pas un passage oblige.
  if (scene === 'accueil') { lancerDemarrage(); return; }
  if (scene === 'dialogue') { ev.preventDefault(); avancerDialogue(); return; }
  // Idem sur l'ecran de mort : au doigt, il n'y a pas de touche Espace a
  // presser. N'importe ou sur l'ecran relance.
  if (scene === 'mort') { ev.preventDefault(); relancerApresMort(); }
});

/* --- Commandes tactiles --------------------------------------------------- */

const zoneTactile = document.getElementById('tactile');
const estTactile = matchMedia('(pointer: coarse)').matches;

zoneTactile.querySelectorAll('.tbtn').forEach(btn => {
  const a = btn.dataset.touche;
  /* Le combat final n'a pas les memes actions : le bouton de saut y devient
     l'esquive. Les quatre boutons tactiles suffisent a le jouer — le
     deplacement en profondeur reste au clavier, mais tout ce qui fait mal
     s'esquive lateralement ou d'un bond. */
  const versFinal = { gauche: 'gauche', droite: 'droite', saut: 'esquive',
                      attaque: 'attaque', onde: 'onde' };
  const presser = ev => {
    ev.preventDefault();
    if (scene === 'final') {
      const af = versFinal[a];
      if (!af) return;
      if (!entreesFinal[af]) marquerFrontFinal(af);
      entreesFinal[af] = true;
      return;
    }
    if (scene !== 'jeu' && scene !== 'hub' && scene !== 'arcade') return;
    if (FRONTS[a] && !entrees[a]) marquerFront(a);
    entrees[a] = true;
  };
  const relacher = ev => {
    ev.preventDefault();
    entrees[a] = false;
    if (versFinal[a]) entreesFinal[versFinal[a]] = false;
  };
  btn.addEventListener('pointerdown', presser);
  btn.addEventListener('pointerup', relacher);
  btn.addEventListener('pointercancel', relacher);
  btn.addEventListener('pointerleave', relacher);
});

/* Les boutons tactiles ne servent que pendant le jeu : ailleurs ils
   masqueraient inutilement le menu. */
function majAffichageTactile() {
  const jouable = scene === 'jeu' || scene === 'hub' || scene === 'final' ||
                  (scene === 'arcade' && arcade.etat === 'jeu');
  const visible = estTactile && jouable && !enPortrait();
  if (zoneTactile.hidden === visible) zoneTactile.hidden = !visible;
}

/* --- Orientation ----------------------------------------------------------
   Le jeu est cadre en 16:9 : en portrait, l'image occupe une bande minuscule
   et les commandes recouvrent la moitie de l'ecran. On demande donc la
   rotation avant tout — y compris avant le bouton « Jouer », pour que le
   joueur ne demarre pas dans une configuration injouable.
------------------------------------------------------------------------- */

const ecranRotation = document.getElementById('rotation');

function enPortrait() {
  return estTactile && innerHeight > innerWidth;
}

function majOrientation() {
  const demander = enPortrait();
  if (ecranRotation.hidden === demander) ecranRotation.hidden = !demander;
  if (demander) relacherTout();
}

addEventListener('resize', majOrientation);
addEventListener('orientationchange', () => setTimeout(majOrientation, 120));
majOrientation();

/* =============================================================================
   LA MANETTE

   Elle ne duplique RIEN. Chaque bouton est traduit en un evenement de la meme
   forme que celui d'un clavier — { code, key } — et passe a `auClavier` /
   `auRelachement`. La manette herite donc d'un coup de toute la navigation du
   jeu : les menus, la boutique, le jukebox, la pause, le combat final, le
   generique, la bande-annonce. Ajouter un ecran plus tard, c'est le rendre
   jouable a la manette sans y penser.

   Le mappage suit la disposition commune aux manettes reconnues par le
   navigateur (« standard gamepad ») :

     croix directionnelle et stick gauche  ->  fleches
     bouton du bas   (A / croix)           ->  Espace   saut, valider
     bouton de droite(B / rond)            ->  Echap    retour, pause
     bouton de gauche(X / carre)           ->  X        frapper
     bouton du haut  (Y / triangle)        ->  C        onde de choc
     gachettes hautes L1 / R1              ->  Maj      courir
     Start                                 ->  Echap    pause

   Un navigateur ne signale une manette qu'apres une premiere pression : c'est
   volontaire (empreinte numerique), et il n'y a rien a faire de plus que
   d'interroger `navigator.getGamepads()` a chaque image.
========================================================================== */

const MANETTE_ZONE_MORTE = 0.45;      // en deca, le stick est considere au repos

/* bouton (index standard) -> l'evenement clavier equivalent */
const MANETTE_BOUTONS = {
  0:  { code: 'Space',      key: ' ' },          // A / croix
  1:  { code: 'Escape',     key: 'Escape' },     // B / rond
  2:  { code: 'KeyX',       key: 'x' },          // X / carre
  3:  { code: 'KeyC',       key: 'c' },          // Y / triangle
  4:  { code: 'ShiftLeft',  key: 'Shift' },      // L1
  5:  { code: 'ShiftLeft',  key: 'Shift' },      // R1
  9:  { code: 'Escape',     key: 'Escape' },     // Start
  12: { code: 'ArrowUp',    key: 'ArrowUp' },
  13: { code: 'ArrowDown',  key: 'ArrowDown' },
  14: { code: 'ArrowLeft',  key: 'ArrowLeft' },
  15: { code: 'ArrowRight', key: 'ArrowRight' },
};

/* L'etat precedent, pour n'envoyer un evenement qu'au CHANGEMENT. Sans ça, un
   bouton maintenu rejouerait son evenement soixante fois par seconde : le menu
   defilerait a toute vitesse et Brad sauterait en boucle. */
const manette = { boutons: {}, axes: {}, branchee: false };

function evenementManette(enfonce, touche) {
  if (enfonce) auClavier({ code: touche.code, key: touche.key });
  else auRelachement({ code: touche.code, key: touche.key });
}

function etatManette(i, enfonce, touche) {
  if (!!manette.boutons[i] === !!enfonce) return;
  manette.boutons[i] = enfonce;
  evenementManette(enfonce, touche);
}

function majManette() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  let g = null;
  const liste = navigator.getGamepads();
  for (let i = 0; i < liste.length; i++) {
    if (liste[i] && liste[i].connected) { g = liste[i]; break; }
  }
  if (!g) {
    // Manette debranchee en cours de partie : on relache tout ce qu'elle
    // tenait, sinon Brad continuerait de courir vers la droite pour toujours.
    if (manette.branchee) {
      for (const i of Object.keys(manette.boutons)) {
        if (manette.boutons[i] && MANETTE_BOUTONS[i]) {
          evenementManette(false, MANETTE_BOUTONS[i]);
        }
        manette.boutons[i] = false;
      }
      manette.branchee = false;
      relacherTout();
    }
    return;
  }
  manette.branchee = true;

  for (const i of Object.keys(MANETTE_BOUTONS)) {
    const b = g.buttons[i];
    etatManette(i, !!b && (b.pressed || b.value > 0.5), MANETTE_BOUTONS[i]);
  }

  // Le stick gauche double la croix directionnelle. On le traite comme quatre
  // boutons virtuels pour que le reste du jeu n'ait rien a savoir d'un axe.
  const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
  etatManette('sg', ax < -MANETTE_ZONE_MORTE, MANETTE_BOUTONS[14]);
  etatManette('sd', ax > MANETTE_ZONE_MORTE, MANETTE_BOUTONS[15]);
  etatManette('sh', ay < -MANETTE_ZONE_MORTE, MANETTE_BOUTONS[12]);
  etatManette('sb', ay > MANETTE_ZONE_MORTE, MANETTE_BOUTONS[13]);
}

addEventListener('gamepadconnected', () => { manette.branchee = true; });

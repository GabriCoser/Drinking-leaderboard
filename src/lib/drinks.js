// Punteggio coerente per TUTTI i drink: 1 punto ogni 4 g di alcol puro.
// grammi = ml * (abv/100) * 0.789  ->  una "unità alcolica" (12 g) vale 3 punti.
// I drink analcolici (abv 0) valgono 0 punti.
export function pointsFor(ml, abv) {
  const m = Number(ml), a = Number(abv)
  if (!(m > 0) || !(a > 0)) return 0
  return Math.max(1, Math.round(m * (a / 100) * 0.789 / 4))
}
export const CATEGORIES = [
  ['halloween', '🎃 Pozioni di Halloween'],
  ['birra', '🍺 Birre'],
  ['vino', '🍷 Vino & Bollicine'],
  ['cocktail', '🍹 Cocktail'],
  ['shot', '🥃 Shot & Amari'],
  ['altro', '💧 Analcolici & Altro'],
]
// categorie visibili solo con un certo tema evento
export const THEMED_CATEGORIES = { halloween: 'halloween' }
// desc (opzionale): cos'è davvero il drink, mostrato sotto il nome
const d = (id, name, emoji, ml, abv, category, desc) => ({ id, name, emoji, ml, abv, category, ...(desc ? { desc } : {}), points: pointsFor(ml, abv) })
export const DEFAULT_DRINKS = [
  // Pozioni di Halloween (visibili solo negli eventi a tema Halloween)
  d('hw_pumpkin_ale', 'Birra della Zucca Stregata', '🎃', 400, 6, 'halloween', 'Pumpkin ale: birra ambrata speziata alla zucca'),
  d('hw_witch', 'Pozione della Strega', '🧪', 160, 9, 'halloween', 'Midori Sour: liquore al melone, vodka e limone'),
  d('hw_vampire', 'Sangue di Vampiro', '🩸', 200, 10, 'halloween', 'Bloody Mary: vodka e succo di pomodoro speziato'),
  d('hw_dracula_kiss', 'Bacio di Dracula', '💋', 150, 10, 'halloween', 'Prosecco con liquore ai lamponi'),
  d('hw_graveyard_punch', 'Punch del Cimitero', '⚰️', 200, 8, 'halloween', 'Punch rosso alla frutta con rum'),
  d('hw_corpse_reviver', 'Resuscita Cadaveri', '💀', 90, 22, 'halloween', 'Corpse Reviver n°2: gin, Cointreau, Lillet e limone'),
  d('hw_zombie', 'Zombie', '🧟', 250, 16, 'halloween', 'Cocktail tiki: tre rum, succhi tropicali e granatina'),
  d('hw_brain', 'Shot Cervello di Zombie', '🧠', 35, 17, 'halloween', 'Liquore alla pesca, Baileys e gocce di granatina'),
  d('hw_black_shot', "Shot dell'Abisso", '🖤', 40, 40, 'halloween', 'Shot di vodka nera'),
  d('hw_potion_zero', 'Pozione analcolica', '🔮', 250, 0, 'halloween', 'Mocktail alla frutta, zero alcol'),
  // Birre
  d('radler', 'Radler', '🍺', 330, 2, 'birra'),
  d('beer_small', 'Birra piccola', '🍺', 200, 5, 'birra'),
  d('beer_bottle', 'Birra in bottiglia', '🍾', 330, 5, 'birra'),
  d('beer_medium', 'Birra media', '🍺', 400, 5, 'birra'),
  d('beer_pint', 'Pinta', '🍺', 500, 5, 'birra'),
  d('weiss', 'Weiss', '🍺', 500, 5.4, 'birra'),
  d('ipa', 'IPA artigianale', '🍺', 400, 6.5, 'birra'),
  d('beer_strong', 'Doppio malto', '🍺', 400, 7.5, 'birra', 'Birra forte, 7-8%'),
  d('sidro', 'Sidro', '🍏', 330, 4.5, 'birra'),
  d('beer_zero', 'Birra analcolica', '🍺', 330, 0, 'birra'),
  // Vino & Bollicine
  d('champagne', 'Flûte spumante', '🥂', 100, 12, 'vino'),
  d('prosecco', 'Calice prosecco', '🥂', 150, 11, 'vino'),
  d('bellini', 'Bellini / Rossini', '🍑', 150, 7.5, 'vino'),
  d('wine_white', 'Calice vino bianco', '🥂', 150, 11.5, 'vino'),
  d('lambrusco', 'Calice lambrusco', '🍷', 150, 10, 'vino'),
  d('wine', 'Calice vino rosso', '🍷', 150, 13, 'vino'),
  d('vin_brule', 'Vin brulé', '🍷', 150, 10, 'vino'),
  d('passito', 'Vino dolce / passito', '🍷', 75, 15, 'vino', 'Bicchierino da dessert'),
  // Cocktail
  d('hugo', 'Hugo', '🍹', 200, 7, 'cocktail', 'Prosecco, sciroppo di sambuco e menta'),
  d('aperol', 'Aperol Spritz', '🍹', 200, 8, 'cocktail'),
  d('select', 'Select Spritz', '🍹', 200, 8, 'cocktail'),
  d('campari', 'Campari Spritz', '🍹', 200, 10, 'cocktail'),
  d('americano', 'Americano', '🍸', 100, 15, 'cocktail', 'Campari, vermouth rosso e soda'),
  d('sbagliato', 'Negroni sbagliato', '🍸', 90, 18, 'cocktail', 'Campari, vermouth rosso e prosecco'),
  d('negroni', 'Negroni', '🍸', 90, 27, 'cocktail', 'Gin, Campari e vermouth rosso'),
  d('martini', 'Martini Dry', '🍸', 90, 30, 'cocktail', 'Gin e vermouth dry'),
  d('gin_tonic', 'Gin Tonic', '🍸', 200, 10, 'cocktail'),
  d('gin_lemon', 'Gin Lemon', '🍸', 200, 10, 'cocktail'),
  d('vodka_tonic', 'Vodka Tonic', '🍸', 200, 10, 'cocktail'),
  d('vodka_lemon', 'Vodka Lemon', '🍸', 200, 10, 'cocktail'),
  d('moscow_mule', 'Moscow Mule', '🍸', 200, 10, 'cocktail', 'Vodka, ginger beer e lime'),
  d('mojito', 'Mojito', '🍹', 180, 10, 'cocktail'),
  d('cuba_libre', 'Cuba Libre', '🥃', 180, 11, 'cocktail'),
  d('rum_cola', 'Rum Cola', '🥃', 180, 11, 'cocktail'),
  d('rum_pera', 'Rum e pera', '🍐', 180, 11, 'cocktail'),
  d('tequila_sunrise', 'Tequila Sunrise', '🌅', 200, 10, 'cocktail', "Tequila, succo d'arancia e granatina"),
  d('sex_beach', 'Sex on the Beach', '🍹', 200, 9, 'cocktail', 'Vodka, liquore alla pesca, arancia e mirtillo'),
  d('pina_colada', 'Piña Colada', '🍹', 150, 10, 'cocktail'),
  d('cosmopolitan', 'Cosmopolitan', '🍸', 100, 20, 'cocktail', 'Vodka, Cointreau, mirtillo rosso e lime'),
  d('margarita', 'Margarita', '🍸', 130, 17, 'cocktail'),
  d('daiquiri', 'Daiquiri', '🍸', 90, 20, 'cocktail', 'Rum bianco, lime e zucchero'),
  d('espresso_martini', 'Espresso Martini', '🍸', 120, 15, 'cocktail', 'Vodka, liquore al caffè ed espresso'),
  d('old_fashioned', 'Old Fashioned', '🥃', 90, 26, 'cocktail', 'Bourbon, zucchero e angostura'),
  d('caipirinha', 'Caipirinha', '🍹', 100, 25, 'cocktail', 'Cachaça, lime e zucchero di canna'),
  d('long_island', 'Long Island Iced Tea', '🍹', 300, 13, 'cocktail', 'Vodka, gin, rum, tequila, triple sec e cola'),
  // Shot & Amari
  d('b52', 'Shot B-52', '🔥', 45, 26, 'shot', 'Liquore al caffè, Baileys e Grand Marnier'),
  d('baileys', 'Baileys', '🥃', 50, 17, 'shot'),
  d('amaretto', 'Amaretto', '🥃', 40, 28, 'shot'),
  d('limoncello', 'Limoncello', '🍋', 40, 28, 'shot'),
  d('mirto', 'Mirto', '🫐', 40, 30, 'shot', 'Liquore sardo alle bacche di mirto'),
  d('amaro', 'Amaro', '🥃', 45, 30, 'shot'),
  d('jager', 'Jägermeister', '🦌', 40, 35, 'shot'),
  d('jagerbomb', 'Jägerbomb', '💣', 190, 7.4, 'shot', 'Shot di Jägermeister in energy drink'),
  d('shot_sambuca', 'Shot sambuca', '🥃', 40, 38, 'shot'),
  d('shot_tequila', 'Shot tequila', '🥃', 40, 38, 'shot'),
  d('shot', 'Shot vodka', '🥃', 40, 40, 'shot'),
  d('fernet', 'Fernet', '🥃', 40, 40, 'shot'),
  d('grappa', 'Grappa', '🥃', 40, 40, 'shot'),
  d('whisky', 'Whisky liscio', '🥃', 45, 40, 'shot'),
  d('rum_liscio', 'Rum liscio', '🥃', 45, 40, 'shot'),
  // Analcolici & Altro
  d('water', "Bicchiere d'acqua", '💧', 250, 0, 'altro'),
  d('mocktail', 'Cocktail analcolico', '🧃', 250, 0, 'altro'),
]

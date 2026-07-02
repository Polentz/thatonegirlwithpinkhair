let count = 0;

let startX;
let startY;

let paths = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    startX = windowWidth / 2;
    startY = windowHeight / 2;
}

function draw() {
    background(255, 255, 255);

    if (count < blocks.length) {
        let guide = new Path(startX, startY, mouseX, mouseY);
        guide.show();
    }

    for (let i = 0; i < paths.length; i++ ) {
        paths[i].show();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    startX = windowWidth / 2;
    startY = windowHeight / 2;
}

function resetMap() {
    paths = [];
    document.querySelectorAll(".block").remove();
    count = 0;
}

function mousePressed() {
    if (count < blocks.length) {
        let newEndX = mouseX;
        let newEndY = mouseY;

        let p = new Path(startX, startY, newEndX, newEndY);

        paths.push(p);

        startX = newEndX;
        startY = newEndY;

        placeItem(mouseX, mouseY); 
    }
}

class Path {
    constructor(x1, y1, x2, y2) {
        this.startX = x1;
        this.startY = y1;

        this.endX = x2;
        this.endY = y2;
    }

    show() {
        stroke(0,0,0);
        strokeWeight(1);
        line(this.startX, this.startY, this.endX, this.endY)
    }
}


let blocks = [
  
    "La mia via di casa è fredda e piena di nebbia bianca e lattiginosa, la porta il naviglio, la portano gli scarichi delle auto.",
    "Ci sono un negozio di vinili, 3 tra carrozzerie auto ricambi e meccanici, una spa per cani, un bar karaoke.",
    "È sporca, sembra Parigi a tratti. Metto cartelli per dire a tutti di raccogliere gli escrementi degli animali e non gettare bottiglie e spazzatura nel nostro giardino.",
    "Non mi sono ancora abituata a vivere a Ovest.",

    "Ieri sera, rientrando, ho pensato a quel momento in cui la via verso casa è diventata tale.",
    "Prima era solo una via - un percorso che comincia e si snoda - ma a un certo punto è diventata chiaramente la via verso casa.",

    "Non so bene decifrare il momento in cui questo accade - forse quando l'arrivo si sta avvicinando?",
    "O quando si comincia il viaggio?",
    "- ma mi piacerebbe provare a notare quel piccolo momento di svolta.",
    "Ieri sera l'ho riconosciuto nel ristorante, a pochi passi dal portone, che ha cambiato l'illuminazione esterna.",
    "La via verso casa ora ha una luce calda.", 

    "Chiederò l'autista di attendermi un minuto al che lui risponderà va bene, ma non mettere troppo.",
    "Prenderò un foglio dalla mia borsa e scriverò velocemente il mio numero. Lo lascerò nella mano della ragazza e le sorriderò.",
    "Poi tornerò sul bus, con il sedile vuoto accanto a me ma non proverò la tristezza.",
    "Mi piace viaggiare, mi piace il sedile vuoto accanto…",

    "Sono a Firenze, Palazzo Pitti sembra scivolare davanti all'ingresso della casa degli alabardieri: è di pietra, dentro filtra pochissima luce. Potrebbe esserci il sole o L'aurora boreale, oppure cadere una neve nucleare e sarebbe lo stesso.",
    "I gatti  di quella casa hanno il nome dei traditori: Giuda e Salomè. Il grande camino spento assorbe le fitte parole mie e di Franz, che prima era Marta.",
    "Non è stato difficile chiamarlo al maschile. Parliamo di allodole, di caccia, del canto che segna il giorno, di musica che fa crescere l'alba //",

    "// la città sembra un ricco che si è fatto criogenizzare in un'epoca di splendore rinascimentale e souvenir di cattivo gusto. È notte, abbiamo appena rifiutato del Popper, camminiamo lungo l'Arno.",
    "È notte, abbiamo appena rifiutato del Popper, camminiamo lungo l'Arno.",
    "Franz mi chiede se La città mi piaccia",
    "Non mi piace, solo oltre il fiume qualcosa sembra essere reale e i volti meno ricalcati da affreschi fuori tempo. A un certo punto mi blocco, inizio a fissare un edificio illuminato, non riesco a distogliere lo sguardo, come sotto incantesimo. 'Quelli sono gli Uffizi', mi dice. Lì dentro, penso, c'è un pulsare che non si spegne, che non si vende.",

    "Il mio compagno è venuto a prendermi dopo il lungo viaggio. Andiamo nel nostro ristorante sushi preferito. Ascolta per tutta sera i miei racconti, i suoi occhi sono i nidi di faggio in cui trovo rifugio.",

    "Scelgo il sentiero dietro ai fiori appassiti, perché sono testimoni di una trasformazione.",
]


function placeItem(x,y) {

    let DOM_DIV = document.createElement('div');  
    DOM_DIV.innerHTML = blocks[count];

    DOM_DIV.style.top = y + 'px';
    DOM_DIV.style.left = x + 'px';

    let class_name = "block";
    DOM_DIV.setAttribute("class", class_name);

    if (count < blocks.length) {
        document.querySelector(".blocks").append(DOM_DIV);
        count++;
    }
}
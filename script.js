// Función para cargar los datos
async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

// Función para dibujar gráficos concatenados para LINIA COMPLETA
async function drawFullLinePlot(trams, resumData) {
    document.getElementById('plot').innerHTML = '<h2>Espai-temps previsió rehabilitació de la línia completa</h2>';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    let pkMinGlobal = Infinity;
    let pkMaxGlobal = -Infinity;
    trams.forEach(tram => {
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        if (via1Data.length > 0 || via2Data.length > 0) {
            const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
            const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
            pkMinGlobal = Math.min(pkMin, pkMinGlobal);
            pkMaxGlobal = Math.max(pkMax, pkMaxGlobal);
        }
    });

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        const labelContainer = document.createElement('div');
        labelContainer.style.writingMode = 'vertical-lr';
        labelContainer.style.transform = 'rotate(270deg)';
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.textContent = tram;

        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${500 + (pkMaxGlobal - pkMinGlobal) * 2}px`; // Ajustar la altura basada en la longitud
        plotContainer.style.flexGrow = '1';

        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        document.getElementById('plot').appendChild(container);

        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === trams.length - 1, pkMinGlobal, pkMaxGlobal);
    }
}

// Función para dibujar gráficos de tramos individuales y añadir tarjetas informativas
async function drawSinglePlot(tram, resumData) {
    document.getElementById('plot').innerHTML = '';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Ajustar la altura de los gráficos individuales para evitar scroll
    const adjustedHeight = 600; 

    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, adjustedHeight);

    // Añadir las tarjetas informativas
    const totalLength = resumData
        .filter(d => d.TRAM === tram)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBefore2025 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBetween2025And2030 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.gap = '20px';
    infoContainer.style.marginTop = '20px';

    const createCard = (title, value) => {
        const card = document.createElement('div');
        card.style.border = '1px solid #ccc';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        card.style.flex = '1';

        const cardTitle = document.createElement('h3');
        cardTitle.textContent = title;
        cardTitle.style.margin = '0 0 10px 0';

        const cardValue = document.createElement('p');
        cardValue.textContent = `${value.toFixed(0)} m`;
        cardValue.style.fontSize = '18px';
        cardValue.style.fontWeight = 'bold';

        card.appendChild(cardTitle);
        card.appendChild(cardValue);

        return card;
    };

    infoContainer.appendChild(createCard('LONGITUD TOTAL DE VIA DEL TRAMO', totalLength));
    infoContainer.appendChild(createCard('LONGITUD TOTAL DE VIA DEL TRAMO CON AÑO DE REHABILITACIÓN < 2025', lengthBefore2025));
    infoContainer.appendChild(createCard('LONGITUD TOTAL DE VIA DEL TRAMO CON AÑO DE REHABILITACIÓN ENTRE 2025 Y 2030', lengthBetween2025And2030));

    document.getElementById('plot').appendChild(infoContainer);
}

// Inicializar la página y los eventos
async function init() {
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    if (!tramButtonsContainer) {
        console.error('No se encontró el contenedor de botones de tramo en el DOM.');
        return;
    }

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawFullLinePlot(trams, resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Añadir botones para cada tramo
    trams.forEach(tram => {
        if (tram) {
            const button = document.createElement('button');
            button.className = 'tram-button';
            button.textContent = tram;
            button.addEventListener('click', () => {
                selectTramButton(button);
                drawSinglePlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Dibujar el gráfico de "LINIA COMPLETA" por defecto
    selectTramButton(liniaCompletaButton);
    drawFullLinePlot(trams, resumData);
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});

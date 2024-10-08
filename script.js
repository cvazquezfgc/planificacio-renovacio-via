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
    // Limpiar el contenedor de gráficos y añadir el título global
    document.getElementById('plot').innerHTML = `
        <h2 style="text-align: center; font-size: 24px; font-family: Arial, sans-serif; margin-bottom: 20px;">
            Espai-temps previsió rehabilitació de la línia completa
        </h2>`;

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Definir altura unitaria por kilómetro
    const unitHeightPerKm = 70; // Ajustado para más espacio entre PKs en pantalla

    // Dibujar los gráficos concatenados hasta el penúltimo tramo
    for (let i = 0; i < trams.length - 1; i++) {
        const tram = trams[i];
        await drawTram(tram, resumData, estacionsData, unitHeightPerKm, false);
    }

    // Dibujar el último tramo GR-TB de forma separada
    const lastTram = 'GR-TB';  // Asegurarse que el último tramo se añade de forma separada
    await drawTram(lastTram, resumData, estacionsData, unitHeightPerKm, true); // Último gráfico con espacio
}

// Función para dibujar cada tramo
async function drawTram(tram, resumData, estacionsData, unitHeightPerKm, isLast = false) {
    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

    const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
    const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
    const tramoHeight = (pkMax - pkMin) * unitHeightPerKm;

    // Crear y añadir el contenedor del gráfico y las etiquetas de tramo
    const container = createPlotContainer(tram, tramoHeight);
    document.getElementById('plot').appendChild(container);

    // Definir si el último gráfico tiene etiquetas horizontales
    const addHorizontalLabels = isLast;

    await drawPlot(tram, resumData, estacionsData, container.id, addHorizontalLabels, pkMin, pkMax, tramoHeight);
}

// Crear contenedor de gráfico
function createPlotContainer(tram, tramoHeight) {
    const container = document.createElement('div');
    container.id = `plot-${tram}`;
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.marginBottom = '20px';

    const labelContainer = document.createElement('div');
    labelContainer.style.transform = 'rotate(270deg)';
    labelContainer.style.textAlign = 'center';
    labelContainer.style.marginRight = '10px';
    labelContainer.style.fontSize = '16px';
    labelContainer.style.fontWeight = 'bold';
    labelContainer.textContent = tram;

    const plotContainer = document.createElement('div');
    plotContainer.id = `plot-${tram}-chart`;
    plotContainer.style.height = `${tramoHeight}px`;
    plotContainer.style.flexGrow = '1';

    container.appendChild(labelContainer);
    container.appendChild(plotContainer);

    return container;
}

// Función para dibujar gráficos de tramos individuales y añadir tarjetas informativas
async function drawSinglePlot(tram, resumData) {
    // Añadir el título del gráfico individual
    document.getElementById('plot').innerHTML = `
        <div style="text-align: center; font-size: 24px; font-family: Arial, sans-serif; margin: 20px 0;">
            Espai-temps previsió rehabilitació tram ${tram}
        </div>`;

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, 400); // Ajustar la altura de los gráficos individuales

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

    // Crear tarjetas informativas con valores formateados
    const createCard = (title, value, color = 'black') => {
        const card = document.createElement('div');
        card.style.border = `2px solid ${color}`;
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        card.style.flex = '1';
        card.style.textAlign = 'center'; // Asegura que el texto esté centrado

        const cardTitle = document.createElement('h3');
        cardTitle.textContent = title;
        cardTitle.style.margin = '0 0 10px 0';

        const cardValue = document.createElement('p');
        cardValue.textContent = `${value.toLocaleString()} m`; // Formato con separador de miles
        cardValue.style.fontSize = '24px'; // Aumenta el tamaño de la fuente
        cardValue.style.fontWeight = 'bold';

        card.appendChild(cardTitle);
        card.appendChild(cardValue);

        return card;
    };

    // Añadir las tres tarjetas informativas
    infoContainer.appendChild(createCard('Longitud total', totalLength));
    infoContainer.appendChild(createCard('Rehabilitació abans de 2025', lengthBefore2025, 'red'));
    infoContainer.appendChild(createCard('Rehabilitació entre 2025 i 2030', lengthBetween2025And2030, 'orange'));

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
        console.error('No se encontraron tramos     en los datos cargados.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    if (!tramButtonsContainer) {
        console.error('No se encontró el contenedor de botones de tramo en el DOM.');
        return;
    }

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

    // Añadir una línea separadora y el botón para "LINIA COMPLETA"
    const separator = document.createElement('div');
    separator.style.width = '2px';
    separator.style.height = '30px';
    separator.style.backgroundColor = 'black';
    separator.style.margin = '0 15px';
    tramButtonsContainer.appendChild(separator);

    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawFullLinePlot(trams, resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Dibujar el gráfico del primer tramo de la lista por defecto
    const firstTramButton = tramButtonsContainer.querySelector('.tram-button');
    selectTramButton(firstTramButton);
    drawSinglePlot(trams[0], resumData);
}

// Función para seleccionar el botón activo
function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Función para añadir líneas y sombreado
function addLinesAndShading(pkMin, pkMax) {
    let shapes = [];
    for (let year = 1995; year <= 2069; year++) {
        // Añadir líneas verticales para cada año
        shapes.push({
            type: 'line',
            x0: year,
            x1: year,
            y0: pkMin,
            y1: pkMax,
            line: {
                color: 'lightgray',
                width: 0.8,
                layer: 'below'
            }
        });

        // Añadir sombreado cada 5 años
        if (year % 5 === 0) {
            shapes.push({
                type: 'rect',
                x0: year,
                x1: year + 1,
                y0: pkMin,
                y1: pkMax,
                fillcolor: 'rgba(211, 211, 211, 0.3)',
                layer: 'below',
                line: {
                    width: 0
                }
            });
        }
    }

    // Añadir sombreado rojo antes de 2025
    shapes.push({
        type: 'rect',
        x0: 1995,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        fillcolor: 'rgba(255, 0, 0, 0.1)',
        layer: 'below',
        line: {
            width: 0
        }
    });

    // Añadir línea roja en 2025
    shapes.push({
        type: 'line',
        x0: 2025,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        line: {
            color: 'red',
            width: 2,
            layer: 'above'
        }
    });

    return shapes;
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});


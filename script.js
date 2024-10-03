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

async function init() {
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    // Contenedor de botones de tramo
    const tramButtonsContainer = document.getElementById('tramButtons');

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

    // Seleccionar y dibujar "LINIA COMPLETA" por defecto
    selectTramButton(liniaCompletaButton);
    drawFullLinePlot(trams, resumData);
}

function selectTramButton(button) {
    // Deseleccionar todos los botones
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    // Marcar el botón seleccionado
    button.classList.add('selected');
}

async function drawFullLinePlot(trams, resumData) {
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    // Cargar los datos de las estaciones una vez
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Obtener pkMin y pkMax global para mantener la misma escala
    let pkMinGlobal = Infinity;
    let pkMaxGlobal = -Infinity;
    trams.forEach(tram => {
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        if (via1Data.length > 0 || via2Data.length > 0) {
            const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
            const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
            if (pkMin < pkMinGlobal) pkMinGlobal = pkMin;
            if (pkMax > pkMaxGlobal) pkMaxGlobal = pkMax;
        }
    });

    // Dibujar los gráficos concatenados de cada tramo
    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        // Crear un contenedor para cada gráfico
        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        // Crear un contenedor para la etiqueta del tramo
        const labelContainer = document.createElement('div');
        labelContainer.style.writingMode = 'vertical-lr'; // Cambiar orientación del texto
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.style.height = '500px';
        labelContainer.textContent = tram;

        // Crear un contenedor para el gráfico
        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `500px`; // Mantener una altura constante
        plotContainer.style.flexGrow = '1';

        // Añadir la etiqueta y el gráfico al contenedor principal
        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        // Añadir el contenedor del gráfico al área principal de gráficos
        document.getElementById('plot').appendChild(container);

        // Llamar a la función para dibujar cada tramo
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === trams.length - 1, pkMinGlobal, pkMaxGlobal);
    }
}

async function drawSinglePlot(tram, resumData) {
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    // Cargar los datos de las estaciones
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Llamar a la función para dibujar el tramo individual
    await drawPlot(tram, resumData, estacionsData, 'plot', true);
}

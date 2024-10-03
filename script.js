async function loadData(url) {
    console.log(`Cargando datos desde: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Datos cargados exitosamente desde: ${url}`);
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

async function init() {
    console.log('Inicializando la aplicación...');
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Verificar los datos cargados
    console.log('Datos del resumen:', resumData);

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    console.log('Tramos encontrados:', trams);

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

    console.log('Botones de tramos añadidos correctamente.');
    // Dibujar el gráfico de "LINIA COMPLETA" por defecto
    selectTramButton(liniaCompletaButton);
    drawFullLinePlot(trams, resumData);
}

function selectTramButton(button) {
    // Deseleccionar todos los botones
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    // Marcar el botón seleccionado
    button.classList.add('selected');
    console.log(`Botón seleccionado: ${button.textContent}`);
}

async function drawFullLinePlot(trams, resumData) {
    console.log('Dibujando gráficos concatenados para LINIA COMPLETA...');
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
            pkMinGlobal = Math.min(pkMin, pkMinGlobal);
            pkMaxGlobal = Math.max(pkMax, pkMaxGlobal);
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
        labelContainer.style.writingMode = 'vertical-rl'; // Cambiar orientación del texto (de abajo hacia arriba)
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
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === 0, pkMinGlobal, pkMaxGlobal);
    }
}

async function drawSinglePlot(tram, resumData) {
    console.log(`Dibujando gráfico para el tramo: ${tram}`);
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

async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addTitle = true, pkMinGlobal = null, pkMaxGlobal = null) {
    console.log(`Dibujando gráfico para el tramo: ${tram}`);
    // Añadir traza de ejemplo
    const traces = [{
        x: [1995, 2000, 2005, 2010],
        y: [10, 15, 13, 17],
        type: 'scatter',
        name: 'Ejemplo'
    }];

    // Configuración del layout del gráfico
    const layout = {
        title: addTitle ? `Espai-temps previsió rehabilitació del tram ${tram}` : '',
        xaxis: {
            title: addTitle ? 'Any previsió rehabilitació' : '',
            range: [1995, 2070],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: -45,
            showticklabels: true
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            range: [0, 20], // Rango de ejemplo
        },
        showlegend: true,
        margin: {
            l: 150,
            r: 150,
            t: 80, // Incrementar el margen superior para evitar que se corte el título
            b: 50
        },
        height: 500 // Altura para cada tramo
    };

    // Dibujar la gráfica de ejemplo
    Plotly.newPlot(containerId, traces, layout);
}

// Inicializar la página y los eventos
document.addEventListener('DOMContentLoaded', () => {
    console.log('Contenido DOM cargado, iniciando script...');
    init();
});

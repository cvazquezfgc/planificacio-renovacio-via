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
async function drawFullLinePlotManual(trams, resumData) {
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
    const unitHeightPerKm = 50;

    // Dibujar gráficos manualmente concatenados
    const tram1 = trams[0];
    const tram2 = trams[1];

    // Representar manualmente los dos primeros gráficos
    await drawSinglePlotManual(tram1, resumData, estacionsData, false, unitHeightPerKm);
    await drawSinglePlotManual(tram2, resumData, estacionsData, true, unitHeightPerKm);

    // Ahora manejar el caso de GR-TB manualmente
    const tram3 = 'GR-TB'; // O el tramo problemático
    await drawSinglePlotManual(tram3, resumData, estacionsData, true, unitHeightPerKm);
}

// Función para dibujar gráficos de tramos individuales manualmente (sin bucle for)
async function drawSinglePlotManual(tram, resumData, estacionsData, addHorizontalLabels = false, unitHeightPerKm = 50) {
    let traces = [];
    let stationAnnotations = [];
    let shapes = [];

    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

    const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
    const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
    const plotHeight = (pkMax - pkMin) * unitHeightPerKm;

    traces.push({
        x: via1Data.map(d => d.PREVISIÓ),
        y: via1Data.map(d => d.PKFinal - d.PKInici),
        base: via1Data.map(d => d.PKInici),
        type: 'bar',
        name: 'Vía 1',
        orientation: 'v',
        width: 0.5,
        offset: 0,
        marker: { color: 'rgba(31, 119, 180, 1)' },
        hoverinfo: 'text',
        hovertext: via1Data.map(d => `${Math.round(d.length)} m`)
    });

    traces.push({
        x: via2Data.map(d => d.PREVISIÓ),
        y: via2Data.map(d => d.PKFinal - d.PKInici),
        base: via2Data.map(d => d.PKInici),
        type: 'bar',
        name: 'Vía 2',
        orientation: 'v',
        width: 0.5,
        offset: 0.5,
        marker: { color: 'rgba(255, 127, 14, 1)' },
        hoverinfo: 'text',
        hovertext: via2Data.map(d => `${Math.round(d.length)} m`)
    });

    const estaciones = estacionsData.filter(d => d.Tram === tram);
    stationAnnotations.push(...estaciones.map(d => ({
        x: 2069,
        y: parseFloat(d['PK']),
        text: `<b>${d['Abreviatura']}</b>`,
        showarrow: false,
        font: { color: 'black', size: 14, family: 'Arial, sans-serif' },
        xanchor: 'left',
        yanchor: 'middle',
        bgcolor: 'white',
        bordercolor: 'gray',
        borderwidth: 2,
        borderpad: 5,
        opacity: 1
    })));

    shapes.push(...estaciones.map(d => ({
        type: 'line',
        x0: 1995,
        x1: 2069,
        y0: parseFloat(d['PK']),
        y1: parseFloat(d['PK']),
        line: { color: 'darkgray', width: 1.5, layer: 'below' }
    })));

    const layout = {
        title: '', // No título individual en LINIA COMPLETA
        xaxis: {
            title: addHorizontalLabels ? 'Any previsió rehabilitació' : '',
            range: [1995, 2070],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: addHorizontalLabels ? -45 : 0,
            showticklabels: addHorizontalLabels
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            range: [pkMax, pkMin],
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: true,
        legend: {
            orientation: 'v',
            x: 1.05,
            xanchor: 'left',
            y: 0.5,
            yanchor: 'middle'
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest',
        margin: {
            l: 150,
            r: 150,
            t: 20,
            b: addHorizontalLabels ? 50 : 20
        },
        height: plotHeight
    };

    // Dibujar el gráfico
    Plotly.newPlot(`plot-${tram}-chart`, traces, layout);
}

// Inicializar la página y eventos
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
        drawFullLinePlotManual(trams, resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    const firstTramButton = tramButtonsContainer.querySelector('.tram-button');
    selectTramButton(firstTramButton);
    drawSinglePlot(trams[0], resumData);
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});

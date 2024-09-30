async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
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
        console.error('Error al cargar los datos para llenar los botones de tramo.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    const trams = [...new Set(resumData.map(d => d.TRAM))];

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawPlot('LINIA COMPLETA', resumData);
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
                drawPlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Seleccionar y dibujar la "LINIA COMPLETA" por defecto
    selectTramButton(liniaCompletaButton);
    drawPlot('LINIA COMPLETA', resumData);
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

function groupConsecutiveSegments(data) {
    const groupedData = [];
    let currentGroup = null;

    data.forEach(segment => {
        const pkInici = parseFloat(segment['PK inici']);
        const pkFinal = parseFloat(segment['PK final']);
        const previsio = segment['PREVISIÓ REHABILITACIÓ'];

        if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio) {
            currentGroup.PKFinal = pkFinal;
            currentGroup.length += (pkFinal - pkInici) * 1000;
        } else {
            if (currentGroup) {
                groupedData.push(currentGroup);
            }
            currentGroup = {
                PKInici: pkInici,
                PKFinal: pkFinal,
                PREVISIO: previsio,
                length: (pkFinal - pkInici) * 1000,
                via: segment.Via
            };
        }
    });

    if (currentGroup) {
        groupedData.push(currentGroup);
    }

    return groupedData;
}

async function drawPlot(tram, resumData) {
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);

    if (!resumData || !estacionsData) {
        console.error('Los datos no pudieron ser cargados.');
        return;
    }

    let traces = [];
    let stationAnnotations = [];
    let shapes = [];
    let pkMin = Infinity;
    let pkMax = -Infinity;

    if (tram === 'LINIA COMPLETA') {
        // Concatenar todos los tramos
        const trams = [...new Set(resumData.map(d => d.TRAM))];
        trams.forEach(currentTram => {
            const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === currentTram);
            const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === currentTram);
            const estaciones = estacionsData.filter(d => d.Tram === currentTram);

            if (via1Data.length > 0 || via2Data.length > 0) {
                const via1 = groupConsecutiveSegments(via1Data);
                const via2 = groupConsecutiveSegments(via2Data);

                const tramPkMin = Math.min(...[...via1, ...via2].map(d => d.PKInici));
                const tramPkMax = Math.max(...[...via1, ...via2].map(d => d.PKFinal));

                pkMin = Math.min(pkMin, tramPkMin);
                pkMax = Math.max(pkMax, tramPkMax);

                // Añadir las barras de Vía 1 y Vía 2
                addBarTraces(traces, via1, via2, currentTram);
            }
        });
    } else {
        // Visualizar un único tramo
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        const estaciones = estacionsData.filter(d => d.Tram === tram);

        if (via1Data.length === 0 && via2Data.length === 0) {
            console.error(`No se encontraron datos para el tramo ${tram}.`);
            Plotly.newPlot('plot', [], { title: `No hay datos disponibles para el tramo ${tram}` });
            return;
        }

        const via1 = groupConsecutiveSegments(via1Data);
        const via2 = groupConsecutiveSegments(via2Data);

        pkMin = Math.min(...[...via1, ...via2].map(d => d.PKInici));
        pkMax = Math.max(...[...via1, ...via2].map(d => d.PKFinal));

        // Añadir las barras de Vía 1 y Vía 2
        addBarTraces(traces, via1, via2, tram);
    }

    // Configuración del gráfico
    const layout = {
        title: `Espai-temps previsió rehabilitació del tram ${tram}`,
        xaxis: {
            title: 'Any previsió rehabilitació',
            range: [1998, 2069],
        },
        yaxis: {
            title: 'PK',
            range: [pkMax, pkMin],
            autorange: 'reversed'
        },
        shapes: shapes,
        annotations: stationAnnotations,
        margin: { l: 160, r: 180, t: 80, b: 150 },
        showlegend: true,
        hovermode: 'closest'
    };

    Plotly.newPlot('plot', traces, layout);
}

function addBarTraces(traces, via1, via2, tram) {
    // Añadir las barras de Vía 1 y Vía 2 al array de "traces"
    traces.push({
        x: via1.map(d => d.PREVISIO),
        y: via1.map(d => d.PKFinal - d.PKInici),
        base: via1.map(d => d.PKInici),
        type: 'bar',
        name: `Vía 1 - ${tram}`,
        width: 0.5,
        offset: 0.0,
        orientation: 'v',
        marker: {
            color: 'rgba(31, 119, 180, 1)'
        },
        hoverinfo: 'text',
        hovertext: via1.map(d => `${Math.round(d.length)} m`),
        textposition: 'outside'
    });

    traces.push({
        x: via2.map(d => d.PREVISIO),
        y: via2.map(d => d.PKFinal - d.PKInici),
        base: via2.map(d => d.PKInici),
        type: 'bar',
        name: `Vía 2 - ${tram}`,
        width: 0.5,
        offset: 0.5,
        orientation: 'v',
        marker: {
            color: 'rgba(255, 127, 14, 1)'
        },
        hoverinfo: 'text',
        hovertext: via2.map(d => `${Math.round(d.length)} m`),
        textposition: 'outside'
    });
}

document.addEventListener('DOMContentLoaded', init);

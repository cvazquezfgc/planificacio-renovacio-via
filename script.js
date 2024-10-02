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
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    // Contenedor de botones
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
                drawPlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Seleccionar y dibujar la "LINIA COMPLETA" por defecto
    selectTramButton(liniaCompletaButton);
    drawFullLinePlot(trams, resumData);
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

async function drawFullLinePlot(trams, resumData) {
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];
        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.height = '400px';
        document.getElementById('plot').appendChild(container);

        // Llamar a la función de dibujo para cada tramo
        await drawPlot(tram, resumData, container.id, i === trams.length - 1);
    }
}

async function drawPlot(tram, resumData, containerId = 'plot', isLast = true) {
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);

    if (!resumData || !estacionsData) {
        console.error('No se pudieron cargar los datos necesarios.');
        return;
    }

    let traces = [];
    let stationAnnotations = [];
    let shapes = [];
    let pkMin = Infinity;
    let pkMax = -Infinity;

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

    function createTracesForVia(viaData, viaName, color) {
        const via = groupConsecutiveSegments(viaData);

        return via.map(segment => ({
            x: [segment.PREVISIO],
            y: [segment.PKFinal - segment.PKInici],
            base: segment.PKInici,
            type: 'bar',
            name: viaName,
            orientation: 'v',
            width: 0.4,
            marker: {
                color: color
            },
            hoverinfo: 'text',
            hovertext: `Longitud: ${Math.round(segment.length)} m`,
            hoverlabel: {
                bgcolor: color,
                font: {
                    color: 'white'
                }
            }
        }));
    }

    function addLinesAndShading(pkMin, pkMax) {
        for (let year = 1995; year <= 2069; year++) {
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
    }

    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
    const estaciones = estacionsData.filter(d => d.Tram === tram);

    if (via1Data.length > 0 || via2Data.length > 0) {
        pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
        pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));

        // Añadir las trazas para ambas vías
        traces = traces.concat(createTracesForVia(via1Data, 'Vía 1', 'rgba(31, 119, 180, 1)'));
        traces = traces.concat(createTracesForVia(via2Data, 'Vía 2', 'rgba(255, 127, 14, 1)'));

        // Añadir anotaciones y líneas de referencia para las estaciones
        stationAnnotations.push(...estaciones.map(d => ({
            x: 2069,
            y: parseFloat(d['PK']),
            text: `<b>${d['Abreviatura']}</b>`,
            showarrow: false,
            font: {
                color: 'black',
                size: 14,
                family: 'Arial, sans-serif'
            },
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
            line: {
                color: 'darkgray',
                width: 1.5,
                layer: 'below'
            }
        })));

        // Añadir líneas y sombreado también para el tramo específico
        addLinesAndShading(pkMin, pkMax);
    }

    // Configuración del gráfico
    const layout = {
        title: isLast ? `Espai-temps previsió rehabilitació del tram ${tram}` : '',
        xaxis: {
            title: isLast ? 'Any previsió rehabilitació' : '',
            range: [1995, 2069],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: -45,
            showticklabels: isLast
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: isLast,
        legend: {
            orientation: 'h'
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest'
    };

    // Dibujar la gráfica
    Plotly.newPlot(containerId, traces, layout);
}

// Inicializar la página y eventos
document.addEventListener('DOMContentLoaded', init);

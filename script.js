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
    document.getElementById('plot').innerHTML = '<h2 style="text-align: center; font-size: 24px;">Espai-temps previsió rehabilitació de la línia completa</h2>';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Unidad de altura fija por kilómetro (la mitad del alto de los botones de tramos)
    const unitHeightPerKm = 60;

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

        const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
        const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
        const plotHeight = (pkMax - pkMin) * unitHeightPerKm;

        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        const labelContainer = document.createElement('div');
        labelContainer.style.transform = 'rotate(270deg)'; // Cambiar orientación del texto a 270 grados
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.textContent = tram;

        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${plotHeight}px`; // Ajustar la altura basada en la longitud del tramo
        plotContainer.style.flexGrow = '1';

        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        document.getElementById('plot').appendChild(container);

        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === trams.length - 1, pkMin, pkMax);
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

    // Ajustar la altura para que se vea todo sin scroll
    const plotHeight = 400;

    // Dibujar gráfico
    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, plotHeight);

    // Añadir la representación esquemática del tramo
    drawTramoRepresentation(tram, resumData);
}

// Función para dibujar un gráfico específico
async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addHorizontalLabels = false, pkMinGlobal = null, pkMaxGlobal = null, plotHeight = 500) {
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

            if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio && currentGroup.via === segment.Via) {
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

    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

    const via1 = groupConsecutiveSegments(via1Data);
    const via2 = groupConsecutiveSegments(via2Data);

    if (via1.length > 0 || via2.length > 0) {
        pkMin = Math.min(...via1.concat(via2).map(d => d.PKInici));
        pkMax = Math.max(...via1.concat(via2).map(d => d.PKFinal));

        if (pkMinGlobal !== null) pkMin = pkMinGlobal;
        if (pkMaxGlobal !== null) pkMax = pkMaxGlobal;

        traces.push({
            x: via1.map(d => d.PREVISIO),
            y: via1.map(d => d.PKFinal - d.PKInici),
            base: via1.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 1',
            orientation: 'v',
            width: 0.5,
            offset: 0,
            marker: {
                color: 'rgba(31, 119, 180, 1)'
            },
            hoverinfo: 'text',
            hovertext: via1.map(d => `${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(31, 119, 180, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        traces.push({
            x: via2.map(d => d.PREVISIO),
            y: via2.map(d => d.PKFinal - d.PKInici),
            base: via2.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 2',
            orientation: 'v',
            width: 0.5,
            offset: 0.5,
            marker: {
                color: 'rgba(255, 127, 14, 1)'
            },
            hoverinfo: 'text',
            hovertext: via2.map(d => `${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(255, 127, 14, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        // Añadir anotaciones y líneas de referencia para las estaciones
        const estaciones = estacionsData.filter(d => d.Tram === tram);

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

        // Añadir líneas y sombreado para los años y la línea roja para 2025
        shapes = shapes.concat(addLinesAndShading(pkMin, pkMax));
    }

    // Configuración del layout del gráfico
    const layout = {
        title: addHorizontalLabels ? '' : `Espai-temps previsió rehabilitació del tram ${tram}`,
        titlefont: {
            size: 18,
            family: 'Arial, sans-serif',
            color: 'black'
        },
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
            valign: 'middle'
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest',
        margin: {
            l: 150,
            r: 150,
            t: 60, // Ajustar el margen superior para el título
            b: addHorizontalLabels ? 50 : 20
        },
        height: plotHeight // Ajustar la altura del gráfico
    };

    // Dibujar la gráfica
    Plotly.newPlot(containerId, traces, layout);
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

// Función para dibujar la representación esquemática del tramo
function drawTramoRepresentation(tram, resumData) {
    // Limpiar la sección de representación anterior
    const plotElement = document.getElementById('plot');
    const representationContainer = document.createElement('div');
    representationContainer.style.marginTop = '20px';
    representationContainer.style.display = 'flex';
    representationContainer.style.flexDirection = 'column';
    representationContainer.style.alignItems = 'center';

    // Contenedor para las líneas paralelas
    const linesContainer = document.createElement('div');
    linesContainer.style.width = '90%';
    linesContainer.style.display = 'flex';
    linesContainer.style.justifyContent = 'space-between';
    linesContainer.style.marginBottom = '10px';

    // Definir las dos líneas paralelas para representar ambas vías
    const createLine = (width, color) => {
        const line = document.createElement('div');
        line.style.width = width;
        line.style.height = '20px';
        line.style.backgroundColor = color;
        line.style.borderRadius = '10px';
        line.style.marginBottom = '5px';
        return line;
    };

    const pkMin = Math.min(...resumData.filter(d => d.TRAM === tram).map(d => parseFloat(d['PK inici'])));
    const pkMax = Math.max(...resumData.filter(d => d.TRAM === tram).map(d => parseFloat(d['PK final'])));

    const totalLength = pkMax - pkMin;

    // Crear líneas completas para ambas vías
    const line1 = createLine('100%', 'lightgray');
    const line2 = createLine('100%', 'lightgray');
    linesContainer.appendChild(line1);
    linesContainer.appendChild(line2);

    // Crear segmentos resaltados
    const createHighlightedSegment = (container, segments, color) => {
        segments.forEach(segment => {
            const segmentWidth = ((segment.PKFinal - segment.PKInici) / totalLength) * 100;
            const leftOffset = ((segment.PKInici - pkMin) / totalLength) * 100;

            const highlightedSegment = document.createElement('div');
            highlightedSegment.style.position = 'absolute';
            highlightedSegment.style.left = `${leftOffset}%`;
            highlightedSegment.style.width = `${segmentWidth}%`;
            highlightedSegment.style.height = '20px';
            highlightedSegment.style.backgroundColor = color;
            highlightedSegment.style.borderRadius = '10px';
            container.appendChild(highlightedSegment);
        });
    };

    const via1SegmentsBefore2025 = resumData
        .filter(d => d.TRAM === tram && d.Via === '1' && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    const via2SegmentsBefore2025 = resumData
        .filter(d => d.TRAM === tram && d.Via === '2' && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    // Añadir segmentos resaltados en rojo para rehabilitaciones antes de 2025
    createHighlightedSegment(line1, via1SegmentsBefore2025, 'red');
    createHighlightedSegment(line2, via2SegmentsBefore2025, 'red');

    // Añadir segmentos resaltados en naranja para rehabilitaciones entre 2025 y 2030
    const via1SegmentsBetween2025And2030 = resumData
        .filter(d => d.TRAM === tram && d.Via === '1' && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    const via2SegmentsBetween2025And2030 = resumData
        .filter(d => d.TRAM === tram && d.Via === '2' && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    createHighlightedSegment(line1, via1SegmentsBetween2025And2030, 'darkorange');
    createHighlightedSegment(line2, via2SegmentsBetween2025And2030, 'darkorange');

    representationContainer.appendChild(linesContainer);

    // Añadir los textos informativos
    const lengthBefore2025 = via1SegmentsBefore2025.concat(via2SegmentsBefore2025).reduce((sum, d) => sum + (d.PKFinal - d.PKInici) * 1000, 0);
    const lengthBetween2025And2030 = via1SegmentsBetween2025And2030.concat(via2SegmentsBetween2025And2030).reduce((sum, d) => sum + (d.PKFinal - d.PKInici) * 1000, 0);

    const infoTextBefore2025 = document.createElement('div');
    infoTextBefore2025.style.color = 'red';
    infoTextBefore2025.style.fontSize = '20px';
    infoTextBefore2025.style.fontWeight = 'bold';
    infoTextBefore2025.textContent = `<2025: ${lengthBefore2025.toFixed(0)} m (${((lengthBefore2025 / totalLength) * 100).toFixed(1)}%)`;

      const infoTextBetween2025And2030 = document.createElement('div');
    infoTextBetween2025And2030.style.color = 'darkorange';
    infoTextBetween2025And2030.style.fontSize = '20px';
    infoTextBetween2025And2030.style.fontWeight = 'bold';
    infoTextBetween2025And2030.textContent = `2025-2030: ${lengthBetween2025And2030.toFixed(0)} m (${((lengthBetween2025And2030 / totalLength) * 100).toFixed(1)}%)`;

    representationContainer.appendChild(infoTextBefore2025);
    representationContainer.appendChild(infoTextBetween2025And2030);

    // Añadir todo al contenedor principal
    plotElement.appendChild(representationContainer);
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
    liniaCompletaButton.style.marginLeft = '20px';
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
            tramButtonsContainer.insertBefore(button, liniaCompletaButton); // Insertar antes del botón de LINIA COMPLETA
        }
    });

    // Dibujar el gráfico del primer tramo de la lista por defecto
    const firstTramButton = tramButtonsContainer.querySelector('.tram-button');
    if (firstTramButton) {
        firstTramButton.click();
    }
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});


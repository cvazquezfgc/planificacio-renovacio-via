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
    document.getElementById('plot').innerHTML = '<h2 style="text-align:center; font-size:18px; font-family:Arial, sans-serif;">Espai-temps previsió rehabilitació de la línia completa</h2>';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    const unitHeightPerKm = 50; // Definir una altura fija por kilómetro para todos los gráficos concatenados
    let cumulativeHeight = 0;

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        const pkMin = Math.min(...resumData.filter(d => d.TRAM === tram).map(d => parseFloat(d['PK inici'])));
        const pkMax = Math.max(...resumData.filter(d => d.TRAM === tram).map(d => parseFloat(d['PK final'])));
        const tramoHeight = (pkMax - pkMin) * unitHeightPerKm;

        // Crear un contenedor para cada gráfico
        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        // Crear un contenedor para la etiqueta del tramo
        const labelContainer = document.createElement('div');
        labelContainer.style.writingMode = 'vertical-lr';
        labelContainer.style.transform = 'rotate(270deg)';
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.textContent = tram;

        // Crear un contenedor para el gráfico
        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${tramoHeight}px`;
        plotContainer.style.flexGrow = '1';

        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        document.getElementById('plot').appendChild(container);

        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === trams.length - 1, pkMin, pkMax);
    }
}

// Función para dibujar gráficos de tramos individuales y añadir representación esquemática
async function drawSinglePlot(tram, resumData) {
    document.getElementById('plot').innerHTML = '';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    const title = document.createElement('h2');
    title.style.textAlign = 'center';
    title.textContent = `Espai-temps previsió rehabilitació tram ${tram}`;
    document.getElementById('plot').appendChild(title);

    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, 600); // Reducir la altura del gráfico individual

    // Dibujar la representación esquemática del tramo
    drawTramoRepresentation(tram, resumData);
}

// Función para dibujar la representación esquemática del tramo
function drawTramoRepresentation(tram, resumData) {
    const plotElement = document.getElementById('plot');
    const representationContainer = document.createElement('div');
    representationContainer.style.marginTop = '20px';
    representationContainer.style.display = 'flex';
    representationContainer.style.flexDirection = 'column';
    representationContainer.style.alignItems = 'center';

    // Contenedor para las líneas paralelas (una para cada vía)
    const linesContainer = document.createElement('div');
    linesContainer.style.width = '90%';
    linesContainer.style.position = 'relative';

    const createLine = (viaText, color) => {
        const lineContainer = document.createElement('div');
        lineContainer.style.position = 'relative';
        lineContainer.style.marginBottom = '20px';

        const label = document.createElement('div');
        label.textContent = viaText;
        label.style.position = 'absolute';
        label.style.left = '-50px';
        label.style.top = '0';
        label.style.fontWeight = 'bold';

        const line = document.createElement('div');
        line.style.width = '100%';
        line.style.height = '20px';
        line.style.backgroundColor = color;
        line.style.borderRadius = '10px';
        lineContainer.appendChild(label);
        lineContainer.appendChild(line);

        return { lineContainer, line };
    };

    const via1 = createLine('Vía 1', '#D3D3D3'); // Gris claro
    const via2 = createLine('Vía 2', '#D3D3D3'); // Gris claro

    linesContainer.appendChild(via1.lineContainer);
    linesContainer.appendChild(via2.lineContainer);

    // Función para crear segmentos resaltados
    const createHighlightedSegment = (line, segments, color) => {
        segments.forEach(segment => {
            const segmentElement = document.createElement('div');
            const pkTotal = pkMax - pkMin;

            const segmentStartPercent = ((segment.PKInici - pkMin) / pkTotal) * 100;
            const segmentWidthPercent = ((segment.PKFinal - segment.PKInici) / pkTotal) * 100;

            segmentElement.style.position = 'absolute';
            segmentElement.style.left = `${segmentStartPercent}%`;
            segmentElement.style.width = `${segmentWidthPercent}%`;
            segmentElement.style.height = '20px';
            segmentElement.style.backgroundColor = color;
            segmentElement.style.borderRadius = segment.PKInici === pkMin || segment.PKFinal === pkMax ? '10px' : '0px';
            line.appendChild(segmentElement);
        });
    };

    // Obtener los segmentos de Vía 1 y Vía 2
    const via1SegmentsBefore2025 = resumData.filter(d => d.TRAM === tram && parseInt(d.Via) === 1 && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    const via2SegmentsBefore2025 = resumData.filter(d => d.TRAM === tram && parseInt(d.Via) === 2 && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    const via1SegmentsBetween2025And2030 = resumData.filter(d => d.TRAM === tram && parseInt(d.Via) === 1 && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    const via2SegmentsBetween2025And2030 = resumData.filter(d => d.TRAM === tram && parseInt(d.Via) === 2 && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .map(d => ({ PKInici: parseFloat(d['PK inici']), PKFinal: parseFloat(d['PK final']) }));

    // Añadir los segmentos resaltados en rojo y naranja oscuro
    createHighlightedSegment(via1.line, via1SegmentsBefore2025, 'red');
    createHighlightedSegment(via2.line, via2SegmentsBefore2025, 'red');
    createHighlightedSegment(via1.line, via1SegmentsBetween2025And2030, '#D35400'); // Naranja oscuro
    createHighlightedSegment(via2.line, via2SegmentsBetween2025And2030, '#D35400'); // Naranja oscuro

    // Añadir la representación esquemática al contenedor
    representationContainer.appendChild(linesContainer);

    // Añadir el texto informativo sobre la longitud total a rehabilitar
    const totalLength = resumData.filter(d => d.TRAM === tram)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

        const lengthBefore2025 = resumData.filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBetween2025And2030 = resumData.filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    // Añadir la información en texto bajo las líneas
    const infoTextBefore2025 = document.createElement('div');
    infoTextBefore2025.style.color = 'red';
    infoTextBefore2025.style.fontSize = '20px';
    infoTextBefore2025.style.fontWeight = 'bold';
    infoTextBefore2025.textContent = `<2025: ${lengthBefore2025.toLocaleString()} m (${((lengthBefore2025 / totalLength) * 100).toFixed(1)}%)`;

    const infoTextBetween2025And2030 = document.createElement('div');
    infoTextBetween2025And2030.style.color = '#D35400'; // Naranja oscuro
    infoTextBetween2025And2030.style.fontSize = '20px';
    infoTextBetween2025And2030.style.fontWeight = 'bold';
    infoTextBetween2025And2030.textContent = `2025-2030: ${lengthBetween2025And2030.toLocaleString()} m (${((lengthBetween2025And2030 / totalLength) * 100).toFixed(1)}%)`;

    representationContainer.appendChild(infoTextBefore2025);
    representationContainer.appendChild(infoTextBetween2025And2030);

    // Añadir todo al contenedor principal
    plotElement.appendChild(representationContainer);
}

// Función para dibujar un gráfico específico
async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addHorizontalLabels = false, pkMin = null, pkMax = null, plotHeight = 500) {
    let traces = [];
    let stationAnnotations = [];
    let shapes = [];

    if (pkMin === null || pkMax === null) {
        pkMin = Math.min(...resumData.filter(d => d.TRAM === tram).map(d => parseFloat(d['PK inici'])));
        pkMax = Math.max(...resumData.filter(d => d.TRAM === tram).map(d => parseFloat(d['PK final'])));
    }

    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

    const groupConsecutiveSegments = (data) => {
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
    };

    const via1 = groupConsecutiveSegments(via1Data);
    const via2 = groupConsecutiveSegments(via2Data);

    if (via1.length > 0 || via2.length > 0) {
        // Crear trazas para las vías
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
            t: 20,
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

    // Añadir la línea vertical de separación y el botón para "LINIA COMPLETA"
    const separator = document.createElement('div');
    separator.style.borderLeft = '2px solid black';
    separator.style.height = '30px';
    separator.style.margin = '0 15px';

    tramButtonsContainer.appendChild(separator);

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
            tramButtonsContainer.insertBefore(button, separator); // Insertar antes del separador y botón de LINIA COMPLETA
        }
    });

    // Dibujar el gráfico del primer tramo de la lista por defecto
    const firstTramButton = tramButtonsContainer.querySelector('.tram-button');
    if (firstTramButton) {
        firstTramButton.click();
    }
}

// Función para seleccionar un botón de tramo
function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});


